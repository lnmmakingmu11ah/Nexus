/**
 * taskScheduler.ts — Deterministic daily task scheduler.
 * AI adds framing on top — it does NOT decide scheduling.
 */

import { Goal, Milestone, PlannedTask, GoalDependency, BehaviorProfile } from '../types';
import { buildDependencyGraph, getUnlockedGoals } from './dependencyGraph';

export interface SchedulerConfig {
  maxNewTasksPerDay: number;
}

const MAX_DAILY_HARDNESS_LOAD = 18; // e.g. 3 tasks × avg hardness 6

// ── Adaptive daily cap ────────────────────────────────────────────

/**
 * Calculates the adaptive daily task cap.
 * Starts at 2, adds 1 every ~2 weeks, max 7.
 * Quality gate: drops if completion rate falls below 60%.
 */
export function computeAdaptiveDailyCap(
  daysSinceOnboarding: number,
  overallCompletionRate: number
): number {
  const baseRamp = Math.min(7, 2 + Math.floor(daysSinceOnboarding / 14));
  if (overallCompletionRate < 0.6 && daysSinceOnboarding > 7) {
    return Math.max(2, baseRamp - 1);
  }
  return baseRamp;
}

// ── Priority scoring ──────────────────────────────────────────────

function priorityScore(
  task: PlannedTask,
  daysUntilDeadline: number,
  isUnlocked: boolean
): number {
  let s = 0;
  if (daysUntilDeadline <= 7) s += 40;
  else if (daysUntilDeadline <= 14) s += 30;
  else if (daysUntilDeadline <= 30) s += 20;
  else s += 5;
  if (isUnlocked) s += 20;
  if (task.hardness <= 2) s += 10; // favour easy tasks when building momentum
  return s;
}

// ── Main scheduler ────────────────────────────────────────────────

export function getTasksForDate(
  date: string,
  goals: Goal[],
  milestones: Milestone[],
  tasks: PlannedTask[],
  dependencies: GoalDependency[],
  config: SchedulerConfig,
  profile?: BehaviorProfile
): PlannedTask[] {
  const graph = buildDependencyGraph(goals, dependencies);
  const completedGoalIds = goals.filter(g => g.planStatus === 'completed').map(g => g.id);
  const unlockedGoalIds = new Set(getUnlockedGoals(graph, completedGoalIds));

  const milestoneMap = new Map<string, Milestone>();
  milestones.forEach(m => milestoneMap.set(m.id, m));

  const today = new Date(date);
  const activeGoalIds = new Set(
    goals
      .filter(
        (g) =>
          !g.archived &&
          g.planStatus !== 'completed' &&
          g.planStatus !== 'paused' &&
          g.priority !== 'parking_lot'
      )
      .map((g) => g.id)
  );

  // Candidates: tasks scheduled today OR overdue recurring tasks
  const scheduledToday = tasks.filter(
    (t) => t.scheduledDate === date && t.status === 'pending' && activeGoalIds.has(t.goalId)
  );
  const scheduledGoalIds = new Set(scheduledToday.map(t => t.goalId));
  const overdueRecurring = tasks.filter(t =>
    t.isRecurring &&
    t.status === 'pending' &&
    activeGoalIds.has(t.goalId) &&
    !scheduledGoalIds.has(t.goalId) &&
    t.scheduledDate < date
  );

  const candidates = [...scheduledToday, ...overdueRecurring];

  const scored = candidates.map(task => {
    const milestone = milestoneMap.get(task.milestoneId);
    let daysUntilDeadline = 999;
    if (milestone?.targetDateRange?.latest) {
      const deadline = new Date(milestone.targetDateRange.latest);
      daysUntilDeadline = Math.max(0, Math.floor((deadline.getTime() - today.getTime()) / 86400000));
    }
    let score = priorityScore(task, daysUntilDeadline, unlockedGoalIds.has(task.goalId));
    if (profile?.engagementTier === 'struggling' && task.hardness <= 2) score += 18;
    if (profile?.engagementTier === 'disciplined' && task.hardness >= 3) score += 8;
    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Apply daily cap + hardness load ceiling
  const selected: PlannedTask[] = [];
  let hardnessLoad = 0;
  for (const { task } of scored) {
    if (selected.length >= config.maxNewTasksPerDay) break;
    if (hardnessLoad + task.hardness > MAX_DAILY_HARDNESS_LOAD) continue;
    selected.push(task);
    hardnessLoad += task.hardness;
  }
  return selected;
}

// ── Lapse detection ───────────────────────────────────────────────

export function detectLapse(tasks: PlannedTask[], today: string, thresholdDays = 2): boolean {
  const d = new Date(today);
  for (let i = 1; i <= thresholdDays; i++) {
    const prev = new Date(d);
    prev.setDate(prev.getDate() - i);
    const ds = prev.toISOString().split('T')[0];
    const dayTasks = tasks.filter(t => t.scheduledDate === ds);
    if (dayTasks.length > 0 && dayTasks.some(t => t.status === 'done')) return false;
    if (dayTasks.length === 0) return false;
  }
  return true;
}
