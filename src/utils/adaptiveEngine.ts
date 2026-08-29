/**
 * adaptiveEngine.ts — Persistent adaptive timelines, likelihood tracking, and warnings.
 * Runs whenever behavior profile updates; writes back to Goal storage.
 */

import {
  AdaptiveTimelineWarning,
  BehaviorProfile,
  DailyGoalLog,
  Goal,
  MasterBlueprint,
  PlannedTask,
} from '../types';
import { buildAdaptiveTimeline, formatTimelineDays } from './timelinePlanner';
import { detectLapse } from './taskScheduler';
import { applyLapseRecoveryToTasks, bumpTaskDifficulty, computeEngagementTier } from './zeroToHero';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function goalStreak(goalId: string, logs: DailyGoalLog[]): number {
  const dates = new Set(logs.filter((l) => l.goalId === goalId && l.completed).map((l) => l.date));
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().split('T')[0];
    if (dates.has(ds)) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function completionRate30d(goalId: string, logs: DailyGoalLog[]): number {
  const window: string[] = [];
  const d = new Date();
  for (let i = 0; i < 30; i++) {
    const c = new Date(d);
    c.setDate(d.getDate() - i);
    window.push(c.toISOString().split('T')[0]);
  }
  let opp = 0;
  let done = 0;
  window.forEach((ds) => {
    const log = logs.find((l) => l.goalId === goalId && l.date === ds);
    if (log) {
      opp++;
      if (log.completed) done++;
    }
  });
  return opp > 0 ? done / opp : 0.5;
}

export function computeGoalLikelihood(
  goal: Goal,
  logs: DailyGoalLog[],
  profile?: BehaviorProfile
): number {
  const streak = goalStreak(goal.id, logs);
  const rate30 = completionRate30d(goal.id, logs);
  const tier = profile?.engagementTier || computeEngagementTier(profile);

  let score = 50;
  score += Math.min(25, streak * 2.5);
  score += Math.round(rate30 * 20);
  if (tier === 'disciplined') score += 8;
  if (tier === 'struggling') score -= 12;

  const daysSinceUpdate = goal.adaptiveTimelineUpdatedAt
    ? Math.floor((Date.now() - new Date(goal.adaptiveTimelineUpdatedAt).getTime()) / 86400000)
    : 999;
  const recentMiss = rate30 < 0.35 && daysSinceUpdate < 14;
  if (recentMiss) score -= 15;

  return clamp(Math.round(score), 5, 98);
}

export function applyAdaptiveTimelinesToGoals(
  goals: Goal[],
  logs: DailyGoalLog[],
  profile?: BehaviorProfile
): { goals: Goal[]; warnings: AdaptiveTimelineWarning[] } {
  const warnings: AdaptiveTimelineWarning[] = [];
  const now = new Date().toISOString();
  const tier = profile?.engagementTier || computeEngagementTier(profile);

  const updatedGoals = goals.map((goal) => {
    if (goal.archived || goal.planStatus === 'completed') return goal;

    const baseline =
      goal.baselineTimelineRange ||
      goal.timelineRange ||
      { minDays: 90, maxDays: 365 };

    const adaptive = buildAdaptiveTimeline(
      goal.name,
      goal.description || '',
      profile,
      '',
      baseline
    );

    const nextLikelihood = computeGoalLikelihood(goal, logs, profile);
    const isFirstSync = goal.estimatedDaysToMastery == null;

    if (isFirstSync) {
      return {
        ...goal,
        baselineTimelineRange: goal.baselineTimelineRange || baseline,
        timelineRange: adaptive.timelineRange,
        timelineSummary: goal.timelineSummary || adaptive.timelineSummary,
        timelineMap: goal.timelineMap?.length ? goal.timelineMap : adaptive.timelineMap,
        estimatedDaysToMastery: adaptive.estimatedDaysToMastery,
        likelihoodPercent: nextLikelihood,
        adaptiveTimelineUpdatedAt: now,
        difficulty:
          tier === 'struggling' ? 'low' : tier === 'disciplined' ? (goal.difficulty || 'medium') : 'low',
      };
    }

    const previousDays = goal.estimatedDaysToMastery as number;
    const currentDays = adaptive.estimatedDaysToMastery;
    const previousLikelihood = goal.likelihoodPercent ?? nextLikelihood;

    const daysDelta = currentDays - previousDays;
    const likelihoodDelta = nextLikelihood - previousLikelihood;
    const changed = Math.abs(daysDelta) >= 7 || Math.abs(likelihoodDelta) >= 8;

    if (!changed) {
      if (!goal.baselineTimelineRange) {
        return { ...goal, baselineTimelineRange: baseline };
      }
      return goal;
    }

    const improved = daysDelta < -7 || likelihoodDelta >= 8;
    const slipped = daysDelta > 7 || likelihoodDelta <= -8;

    if (improved || slipped) {
      const prevLabel = formatTimelineDays(previousDays);
      const currLabel = formatTimelineDays(currentDays);
      warnings.push({
        id: `tl-${goal.id}-${Date.now()}`,
        goalId: goal.id,
        goalName: goal.name,
        message: improved
          ? `Your discipline is paying off! "${goal.name}" timeline moved from ${prevLabel} → ${currLabel}. Success chance: ${nextLikelihood}%.`
          : `You've been neglecting "${goal.name}". Timeline extended ${prevLabel} → ${currLabel}. Success chance dropped to ${nextLikelihood}%. Small steps today still count.`,
        previousDays,
        currentDays,
        previousLikelihood,
        currentLikelihood: nextLikelihood,
        direction: improved ? 'improved' : 'slipped',
        createdAt: now,
        read: false,
      });
    }

    return {
      ...goal,
      baselineTimelineRange: goal.baselineTimelineRange || baseline,
      timelineRange: adaptive.timelineRange,
      timelineSummary: adaptive.timelineSummary,
      timelineMap: adaptive.timelineMap,
      estimatedDaysToMastery: currentDays,
      likelihoodPercent: nextLikelihood,
      adaptiveTimelineUpdatedAt: now,
      difficulty:
        tier === 'struggling' ? 'low' : tier === 'disciplined' ? (goal.difficulty || 'medium') : 'low',
    };
  });

  return { goals: updatedGoals, warnings };
}

export function syncBlueprintFromGoals(
  blueprint: MasterBlueprint | undefined,
  goals: Goal[]
): MasterBlueprint | undefined {
  if (!blueprint) return undefined;
  const plannedGoals = (blueprint.plannedGoals || []).map((pg) => {
    const live = goals.find((g) => g.name.toLowerCase() === pg.name.toLowerCase());
    if (!live?.timelineRange) return pg;
    return {
      ...pg,
      timelineRange: live.timelineRange,
      timelineSummary: live.timelineSummary,
      timelineMap: live.timelineMap,
      estimatedDaysToMastery: live.estimatedDaysToMastery,
      chanceOfAchievement: live.likelihoodPercent ?? pg.chanceOfAchievement,
    };
  });
  return { ...blueprint, plannedGoals, status: 'ready' as const };
}

export function mergeAdaptiveWarnings(
  existing: AdaptiveTimelineWarning[] | undefined,
  incoming: AdaptiveTimelineWarning[],
  max = 20
): AdaptiveTimelineWarning[] {
  const kept = [...(existing || [])];
  incoming.forEach((warning) => {
    const sameDay = kept.some(
      (w) =>
        w.goalId === warning.goalId &&
        w.direction === warning.direction &&
        w.createdAt.slice(0, 10) === warning.createdAt.slice(0, 10)
    );
    if (!sameDay) kept.push(warning);
  });
  return kept.slice(-max);
}

export function adaptPendingTasks(
  tasks: PlannedTask[],
  profile?: BehaviorProfile,
  today = new Date().toISOString().split('T')[0]
): PlannedTask[] {
  const tier = profile?.engagementTier || computeEngagementTier(profile);
  const rates = Object.values(profile?.completionRateByCategory || {});
  const overall = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0.5;

  let next = tasks.map((task) => {
    if (task.status !== 'pending') return task;
    return bumpTaskDifficulty(task, overall, tier);
  });

  if (detectLapse(tasks, today, 2)) {
    const pendingGoalIds = [
      ...new Set(next.filter((t) => t.status === 'pending' && t.scheduledDate >= today).map((t) => t.goalId)),
    ];
    next = applyLapseRecoveryToTasks(next, pendingGoalIds, tier);
  }

  return next;
}
