/**
 * goalPathways.ts — Multi-horizon roadmap projection & goal-to-task linkage.
 * Connects high-level ambitions to:
 * - Today's Actionable Task
 * - Tomorrow's Expected Task
 * - This Week's Target Checkpoint (Days 1–7)
 * - This Month's Milestone (Days 8–30)
 * - Year & Master Mastery Horizon (Months 6–12+)
 * - Live Adaptive Velocity & Dynamic Timeline Recalibration
 */

import { DailyGoalLog, Goal, Milestone, PlannedTask, UserConfig } from '../types';
import {
  buildCheckpoints,
  buildMacroPhases,
  buildMicroProgression,
  inferDomain,
} from './timelinePlanner';

export interface GoalHorizonTarget {
  period: string;
  badge: string;
  title: string;
  targetMetric: string;
  description: string;
  progressionNote?: string;
  status: 'current' | 'upcoming' | 'mastery';
}

export interface GoalPathwayData {
  goalId: string;
  goalName: string;
  category: string;
  domain: string;
  folder: string;
  priority: string;
  // Today's task
  todayTask: {
    id: string;
    title: string;
    description?: string;
    durationMinutes: number;
    hardness: number;
    completed: boolean;
    isGenerated: boolean;
  };
  // Tomorrow's expected task
  tomorrowTask: {
    id: string;
    title: string;
    description?: string;
    durationMinutes: number;
    hardness: number;
    rationale: string;
  };
  // Multi-horizon progression targets
  horizons: {
    thisWeek: GoalHorizonTarget;
    thisMonth: GoalHorizonTarget;
    masteryHorizon: GoalHorizonTarget;
  };
  // Adaptive metrics
  adaptive: {
    estimatedDaysToMastery: number;
    projectedMasteryDate: string;
    completionRate30d: number;
    currentStreak: number;
    velocityStatus: 'accelerating' | 'on_track' | 'recalibrating';
    velocityLabel: string;
    adaptiveInsight: string;
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function computeGoalCompletionRate(goalId: string, dailyLogs: DailyGoalLog[]): number {
  const windowDays = 30;
  const d = new Date();
  let completed = 0;
  let logged = 0;

  for (let i = 0; i < windowDays; i++) {
    const cur = new Date(d);
    cur.setDate(d.getDate() - i);
    const ds = formatDate(cur);
    const log = dailyLogs.find((l) => l.goalId === goalId && l.date === ds);
    if (log) {
      logged++;
      if (log.completed) completed++;
    }
  }

  if (logged === 0) return 0;
  return Math.round((completed / logged) * 100);
}

export function computeCurrentGoalStreak(goalId: string, dailyLogs: DailyGoalLog[], todayStr: string): number {
  const dates = new Set(dailyLogs.filter((l) => l.goalId === goalId && l.completed).map((l) => l.date));
  let streak = 0;
  const d = new Date(todayStr);

  for (let i = 0; i < 365; i++) {
    const ds = formatDate(d);
    if (dates.has(ds)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getGoalPathway(
  goal: Goal,
  plannedTasks: PlannedTask[],
  _milestones: Milestone[],
  dailyLogs: DailyGoalLog[],
  userConfig: UserConfig,
  todayStr: string
): GoalPathwayData {
  const tomorrow = new Date(todayStr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);

  const domain = inferDomain(goal.name + ' ' + (goal.description || ''));
  const hasBlocker = Boolean(userConfig.userIdentity?.primaryBlockers?.length || userConfig.userIdentity?.setbacks?.length);

  // Micro-progression steps from timeline engine
  const microSteps = buildMicroProgression(goal.name, hasBlocker);
  const macroPhases = buildMacroPhases(goal.name, goal.estimatedDaysToMastery || 180, hasBlocker);
  const domainCheckpoints = buildCheckpoints(goal.name, goal.estimatedDaysToMastery || 180);

  // 1. Resolve Today's Task
  const existingTodayTask = plannedTasks.find(
    (t) => t.goalId === goal.id && t.scheduledDate === todayStr
  );
  const todayLog = dailyLogs.find((l) => l.goalId === goal.id && l.date === todayStr);
  const isCompletedToday = todayLog?.completed === true || existingTodayTask?.status === 'done';

  const todayTaskTitle = existingTodayTask?.title ||
    microSteps[0]?.dailyActions?.[0] ||
    `Complete daily focus block for ${goal.name}`;

  const todayTask = {
    id: existingTodayTask?.id || `auto-today-${goal.id}`,
    title: todayTaskTitle,
    description: existingTodayTask?.description || goal.description || 'Show up and execute your primary focus session.',
    durationMinutes: existingTodayTask?.durationMinutes || 25,
    hardness: existingTodayTask?.hardness || (goal.difficulty === 'high' ? 4 : goal.difficulty === 'low' ? 2 : 3),
    completed: isCompletedToday,
    isGenerated: !existingTodayTask,
  };

  // 2. Resolve Tomorrow's Expected Task
  const existingTomorrowTask = plannedTasks.find(
    (t) => t.goalId === goal.id && t.scheduledDate === tomorrowStr
  );

  const tomorrowTaskTitle = existingTomorrowTask?.title ||
    microSteps[0]?.dailyActions?.[1] ||
    `Deepen deliberate practice & log checkpoint metric for ${goal.name}`;

  const tomorrowTask = {
    id: existingTomorrowTask?.id || `auto-tomorrow-${goal.id}`,
    title: tomorrowTaskTitle,
    description: existingTomorrowTask?.description || 'Build upon today’s momentum with zero activation friction.',
    durationMinutes: existingTomorrowTask?.durationMinutes || 30,
    hardness: existingTomorrowTask?.hardness || (goal.difficulty === 'high' ? 4 : 3),
    rationale: microSteps[0]?.progressionMechanism ||
      'Completing today’s baseline habit eliminates neural resistance, unlocking higher willpower for tomorrow’s execution.',
  };

  // 3. Multi-Horizon Targets (Week, Month, Mastery Horizon)
  const thisWeek: GoalHorizonTarget = {
    period: 'End of This Week (Days 1–7)',
    badge: 'Weekly Milestone',
    title: 'Habit Anchor & Initial Output',
    targetMetric: '5+ execution sessions completed + zero broken streaks',
    description: microSteps[0]?.focus || 'Lock in baseline consistency and eliminate startup procrastination.',
    progressionNote: 'Focus strictly on showing up and starting — 0 pressure for perfection.',
    status: 'current',
  };

  const thisMonth: GoalHorizonTarget = {
    period: 'End of This Month (Days 8–30)',
    badge: 'Monthly Checkpoint',
    title: macroPhases[0]?.title || 'Phase 1 Foundation & System Scale',
    targetMetric: domainCheckpoints[0]?.targetOutputMetric || '30 consecutive days logged + 1st core project deliverable',
    description: macroPhases[0]?.description || 'Scale execution duration and complete intermediate project milestones.',
    progressionNote: macroPhases[0]?.transitionCondition || 'Verify daily capacity and build automaticity.',
    status: 'upcoming',
  };

  const estimatedDays = Math.max(30, goal.estimatedDaysToMastery || 180);
  const masteryTargetDate = new Date();
  masteryTargetDate.setDate(masteryTargetDate.getDate() + estimatedDays);

  const masteryHorizon: GoalHorizonTarget = {
    period: `Mastery Target (${formatMonthYear(masteryTargetDate)})`,
    badge: 'Master Horizon',
    title: macroPhases[2]?.title || 'Full-Scale Compounding & Real-World Mastery',
    targetMetric: domainCheckpoints[2]?.targetOutputMetric || 'Master milestone locked in with automatic lifestyle integration',
    description: macroPhases[2]?.description || 'Durable long-term results, high leverage output, and complete goal fulfillment.',
    progressionNote: `Projected timeline: ~${estimatedDays} days of consistent compounding.`,
    status: 'mastery',
  };

  // 4. Live Adaptive Metrics
  const completionRate = computeGoalCompletionRate(goal.id, dailyLogs);
  const streak = computeCurrentGoalStreak(goal.id, dailyLogs, todayStr);

  let velocityStatus: 'accelerating' | 'on_track' | 'recalibrating' = 'on_track';
  let velocityLabel = 'Steady Cadence (On Track)';
  let adaptiveInsight = 'Your current execution pace matches your projected mastery horizon.';

  if (streak >= 5 || completionRate >= 75) {
    velocityStatus = 'accelerating';
    velocityLabel = 'Accelerating (+18% Velocity)';
    adaptiveInsight = `Your high consistency (${completionRate}% / ${streak}d streak) is compressing the timeline. Mastery target is moving closer!`;
  } else if (completionRate < 45 && dailyLogs.length >= 7) {
    velocityStatus = 'recalibrating';
    velocityLabel = 'Adaptive Adjustment Needed';
    adaptiveInsight = 'Recent friction detected. NEXUS recommends a 15-minute micro-habit to restore streak momentum without burnout.';
  }

  return {
    goalId: goal.id,
    goalName: goal.name,
    category: goal.category,
    domain,
    folder: goal.folder || 'General',
    priority: goal.priority || 'active',
    todayTask,
    tomorrowTask,
    horizons: {
      thisWeek,
      thisMonth,
      masteryHorizon,
    },
    adaptive: {
      estimatedDaysToMastery: estimatedDays,
      projectedMasteryDate: formatMonthYear(masteryTargetDate),
      completionRate30d: completionRate,
      currentStreak: streak,
      velocityStatus,
      velocityLabel,
      adaptiveInsight,
    },
  };
}

/**
 * Ensures that every active goal has scheduled planned tasks for today & tomorrow
 * so that all goals are integrated into the execution planner.
 */
export function ensureTasksForGoals(
  goals: Goal[],
  plannedTasks: PlannedTask[],
  todayStr: string
): PlannedTask[] {
  const updatedTasks = [...plannedTasks];
  const tomorrow = new Date(todayStr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  let hasNew = false;

  goals.filter((g) => !g.archived).forEach((goal) => {
    const hasToday = updatedTasks.some((t) => t.goalId === goal.id && t.scheduledDate === todayStr);
    const hasTomorrow = updatedTasks.some((t) => t.goalId === goal.id && t.scheduledDate === tomorrowStr);

    const domain = inferDomain(goal.name);
    const micro = buildMicroProgression(goal.name, false);

    if (!hasToday) {
      updatedTasks.push({
        id: `task-${goal.id}-${todayStr}`,
        milestoneId: `ms-${goal.id}-0`,
        goalId: goal.id,
        title: micro[0]?.dailyActions?.[0] || `Daily focus on ${goal.name}`,
        description: goal.description || 'Show up and execute primary daily habit.',
        scheduledDate: todayStr,
        durationMinutes: 25,
        hardness: goal.difficulty === 'high' ? 4 : goal.difficulty === 'low' ? 2 : 3,
        isRecurring: true,
        recurrencePattern: 'daily',
        status: 'pending',
      });
      hasNew = true;
    }

    if (!hasTomorrow) {
      updatedTasks.push({
        id: `task-${goal.id}-${tomorrowStr}`,
        milestoneId: `ms-${goal.id}-0`,
        goalId: goal.id,
        title: micro[0]?.dailyActions?.[1] || `Follow-up execution on ${goal.name}`,
        description: 'Advance to the next incremental deliverable.',
        scheduledDate: tomorrowStr,
        durationMinutes: 30,
        hardness: goal.difficulty === 'high' ? 4 : 3,
        isRecurring: true,
        recurrencePattern: 'daily',
        status: 'pending',
      });
      hasNew = true;
    }
  });

  return hasNew ? updatedTasks : plannedTasks;
}
