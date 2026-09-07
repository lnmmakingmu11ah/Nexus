/**
 * planMaterializer.ts — Turn an approved blueprint into goals, milestones, tasks, and deps.
 */

import {
  AIPlannedGoal,
  Goal,
  GoalDependency,
  MasterBlueprint,
  Milestone,
  PlannedTask,
  UserConfig,
} from '../types';
import { matchGoalByName, mapToPassiveCategory } from './blueprintNormalizer';
import { buildAdaptiveTimeline, buildTimelineMilestones, buildSmartDailyPlan, buildSmartWeeklyFocus, buildSmartMonthlyMilestones } from './timelinePlanner';
import { getInitialTaskParams, computeEngagementTier } from './zeroToHero';
import { applyDailyCapToGoals, capFromProfile } from './dailyCap';

export interface MaterializedPlan {
  goals: Goal[];
  milestones: Milestone[];
  tasks: PlannedTask[];
  dependencies: GoalDependency[];
}

export function materializeBlueprintPlan(
  blueprint: MasterBlueprint,
  partialConfig: UserConfig,
  selectedGoals: AIPlannedGoal[]
): MaterializedPlan {
  const tier = partialConfig.behaviorProfile?.engagementTier || computeEngagementTier(partialConfig.behaviorProfile);
  const ts = Date.now();

  const newGoals: Goal[] = selectedGoals.map((pg, idx) => {
    const id = `goal-ai-${ts}-${idx}`;
    const cat = mapToPassiveCategory(pg.category, pg.name, pg.description);
    const adaptive = buildAdaptiveTimeline(
      String(pg.name || `Goal ${idx + 1}`),
      String(pg.description || ''),
      partialConfig.behaviorProfile,
      '',
      pg.timelineRange
    );
    const taskParams = getInitialTaskParams(tier, pg);
    const isWeekly = pg.targetFrequency === 'weekly';

    return {
      id,
      name: pg.name || `Goal ${idx + 1}`,
      description: pg.autoAddedReason
        ? `${pg.description || ''}\n\n(NEXUS note: ${pg.autoAddedReason})`.trim()
        : pg.description || '',
      category: cat,
      frequency: isWeekly ? 'weekly' : 'daily',
      reminderTime: pg.reminderTime || '08:30',
      reminderEnabled: true,
      priority: 'active' as const,
      proofPreference: 'auto' as const,
      basePoints: taskParams.basePoints,
      effects: Array.isArray(pg.effects) && pg.effects.length
        ? pg.effects.map((effect) => ({
            category: mapToPassiveCategory(effect.category, pg.name, pg.description),
            weight: Number(effect.weight) || 4,
          }))
        : [{ category: cat, weight: 4 }],
      isLifePathAligned: true,
      isCognitiveTraining: cat === 'smarts',
      createdAt: new Date().toISOString(),
      planStatus: 'active' as const,
      fromIntake: true,
      autoAdded: pg.autoAdded,
      difficulty: tier === 'struggling' ? 'low' : tier === 'disciplined' ? 'medium' : 'low',
      baselineTimelineRange: adaptive.timelineRange,
      timelineRange: adaptive.timelineRange,
      timelineSummary: pg.timelineSummary || adaptive.timelineSummary,
      timelineMap: Array.isArray(pg.timelineMap) && pg.timelineMap.length ? pg.timelineMap : adaptive.timelineMap,
      estimatedDaysToMastery: pg.estimatedDaysToMastery || adaptive.estimatedDaysToMastery,
      likelihoodPercent: pg.chanceOfAchievement || (tier === 'struggling' ? 55 : tier === 'disciplined' ? 78 : 65),
      adaptiveTimelineUpdatedAt: new Date().toISOString(),
      dailyPlanItems: Array.isArray((pg as any).dailyPlanItems) && (pg as any).dailyPlanItems.length >= 3
        ? (pg as any).dailyPlanItems
        : buildSmartDailyPlan(pg.name || `Goal ${idx + 1}`, Boolean(partialConfig.userIdentity?.primaryBlockers?.length || partialConfig.userIdentity?.setbacks?.length)),
      weeklyFocus: Array.isArray((pg as any).weeklyFocus) && (pg as any).weeklyFocus.length >= 2
        ? (pg as any).weeklyFocus
        : buildSmartWeeklyFocus(pg.name || `Goal ${idx + 1}`),
      monthlyMilestone: Array.isArray((pg as any).monthlyMilestone) && (pg as any).monthlyMilestone.length >= 2
        ? (pg as any).monthlyMilestone
        : buildSmartMonthlyMilestones(pg.name || `Goal ${idx + 1}`),
    };
  });

  const cap = capFromProfile(partialConfig.behaviorProfile);
  const cappedGoals = applyDailyCapToGoals(newGoals, cap);

  for (const pg of selectedGoals) {
    const goal = matchGoalByName(pg.name, cappedGoals);
    if (!goal) continue;
    const stackTarget = pg.linkedGoalName ? matchGoalByName(pg.linkedGoalName, cappedGoals) : undefined;
    if (stackTarget && stackTarget.id !== goal.id) {
      goal.linkedGoalId = stackTarget.id;
      goal.stackingNote = `Stacks after: ${stackTarget.name}`;
    }
  }
  for (const stack of blueprint.goalStackUps || []) {
    const primary = matchGoalByName(stack.primaryGoal, cappedGoals);
    if (!primary) continue;
    for (const supportingName of stack.supportingGoals || []) {
      const supporting = matchGoalByName(supportingName, cappedGoals);
      if (supporting && supporting.id !== primary.id) {
        supporting.linkedGoalId = primary.id;
        supporting.stackingNote = stack.rationale || `Supports ${primary.name}`;
      }
    }
  }

  const newMilestones: Milestone[] = [];
  cappedGoals.forEach((goal, gi) => {
    const pg = selectedGoals[gi];
    const map = Array.isArray(goal.timelineMap) && goal.timelineMap.length ? goal.timelineMap : [];
    const helperMilestones = buildTimelineMilestones(goal.id, goal.timelineRange || pg?.timelineRange, goal.name);
    if (map.length >= 4) {
      map.slice(0, helperMilestones.length).forEach((segment, idx) => {
        if (helperMilestones[idx]) {
          helperMilestones[idx] = { ...helperMilestones[idx], title: segment };
        }
      });
    }
    newMilestones.push(...helperMilestones);
  });

  const newTasks: PlannedTask[] = [];
  cappedGoals.forEach((goal, gi) => {
    if (goal.priority === 'parking_lot' || goal.frequency === 'weekly') return;
    const pg = selectedGoals[gi];
    const ms = newMilestones.find((m) => m.goalId === goal.id);
    if (!ms) return;
    const taskParams = getInitialTaskParams(tier, pg);
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      const ds = date.toISOString().split('T')[0];
      const planItem = goal.dailyPlanItems?.[d % (goal.dailyPlanItems.length || 7)];
      const taskTitle = planItem?.title || goal.name;
      const taskDescription = planItem?.description || goal.description;
      const durationMinutes = planItem?.durationMinutes || taskParams.durationMinutes;

      newTasks.push({
        id: `task-${goal.id}-${d}-${ts}`,
        milestoneId: ms.id,
        goalId: goal.id,
        title: taskTitle,
        description: taskDescription,
        scheduledDate: ds,
        durationMinutes,
        hardness: taskParams.hardness,
        isRecurring: true,
        recurrencePattern: 'daily',
        status: 'pending',
      });
    }
  });

  const newDeps: GoalDependency[] = (blueprint.goalCorrelations || []).flatMap((gc, idx) => {
    const names = Array.isArray(gc.goals) ? gc.goals : [];
    if (names.length < 2) return [];
    const g1 = matchGoalByName(names[0], cappedGoals);
    const g2 = matchGoalByName(names[1], cappedGoals);
    if (!g1 || !g2 || g1.id === g2.id) return [];
    return [{
      id: `dep-${ts}-${idx}`,
      fromGoalId: g1.id,
      toGoalId: g2.id,
      type: 'shared_infrastructure' as const,
      rationale: gc.insight || 'Reinforces daily habit momentum',
    }];
  });

  return { goals: cappedGoals, milestones: newMilestones, tasks: newTasks, dependencies: newDeps };
}

export function filterIntakePlanArtifacts(
  goals: Goal[],
  milestones: Milestone[],
  tasks: PlannedTask[],
  dependencies: GoalDependency[]
) {
  const intakeGoalIds = new Set(goals.filter((g) => g.fromIntake).map((g) => g.id));
  return {
    goals: goals.filter((g) => !g.fromIntake),
    milestones: milestones.filter((m) => !intakeGoalIds.has(m.goalId)),
    tasks: tasks.filter((t) => !intakeGoalIds.has(t.goalId)),
    dependencies: dependencies.filter(
      (d) => !intakeGoalIds.has(d.fromGoalId) && !intakeGoalIds.has(d.toGoalId)
    ),
  };
}
