/**
 * zeroToHero.ts — Engagement tiers, adaptive task difficulty, micro-rewards for struggling users.
 */

import { BehaviorProfile, DailyGoalLog, Goal, PlannedTask, TaskHardness } from '../types';

export type EngagementTier = 'struggling' | 'building' | 'disciplined';

export interface TaskParams {
  hardness: TaskHardness;
  durationMinutes: number;
  basePoints: number;
}

/** Micro-badges unlocked easily for struggling users; disciplined users need bigger wins */
export const MICRO_BADGE_IDS = [
  'micro_first_win',
  'micro_two_day',
  'micro_made_bed',
  'micro_showed_up',
  'micro_tiny_step',
] as const;

export const DISCIPLINED_ONLY_BADGE_IDS = [
  'consistency_king',
  'fortnight_master',
  'monthly_titan',
  'century_club',
] as const;

export function computeEngagementTier(profile?: BehaviorProfile): EngagementTier {
  if (!profile) return 'building';

  const rates = Object.values(profile.completionRateByCategory || {});
  const overall = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0.5;
  const streak = profile.avgStreakBeforeDropoff || 0;
  const cap = profile.currentDailyCap || 2;

  if (overall >= 0.72 && streak >= 7 && cap >= 4) return 'disciplined';
  if (overall < 0.45 || streak <= 2 || cap <= 2) return 'struggling';
  return 'building';
}

export function getInitialTaskParams(
  tier: EngagementTier,
  goal: Partial<Goal>,
  streak = 0
): TaskParams {
  // Struggling: tiny, easy, high reward per minute (dopamine hooks)
  if (tier === 'struggling') {
    return {
      hardness: 1,
      durationMinutes: Math.min(10, goal.name?.toLowerCase().includes('meditat') ? 5 : 8),
      basePoints: 6,
    };
  }

  // Building: moderate ramp
  if (tier === 'building') {
    const hardness: TaskHardness = streak >= 7 ? 2 : 1;
    return {
      hardness,
      durationMinutes: streak >= 14 ? 15 : 12,
      basePoints: 5,
    };
  }

  // Disciplined: meaningful work, fewer micro-wins
  const hardness: TaskHardness = streak >= 21 ? 3 : 2;
  return {
    hardness,
    durationMinutes: goal.category === 'health' ? 25 : 20,
    basePoints: 4,
  };
}

/** Progressive hardness bump after consistent completion */
export function bumpTaskDifficulty(
  task: PlannedTask,
  completionRate30d: number,
  tier: EngagementTier
): PlannedTask {
  if (tier === 'struggling') {
    // Only bump after strong consistency
    if (completionRate30d >= 0.75 && task.hardness < 2) {
      return { ...task, hardness: 2 as TaskHardness, durationMinutes: Math.min(task.durationMinutes + 3, 15) };
    }
    return task;
  }

  if (tier === 'building' && completionRate30d >= 0.65 && task.hardness < 3) {
    return { ...task, hardness: (task.hardness + 1) as TaskHardness, durationMinutes: task.durationMinutes + 5 };
  }

  if (tier === 'disciplined' && completionRate30d >= 0.8 && task.hardness < 4) {
    return { ...task, hardness: (task.hardness + 1) as TaskHardness };
  }

  return task;
}

/** Apply lapse recovery: shrink tasks for re-entry */
export function applyLapseRecoveryToTasks(
  tasks: PlannedTask[],
  goalIds: string[],
  tier: EngagementTier,
  adjustedPlan?: string
): PlannedTask[] {
  const shrink = tier === 'struggling' || /micro|tiny|2.?min|small step/i.test(adjustedPlan || '');
  if (!shrink) return tasks;

  return tasks.map((t) => {
    if (!goalIds.includes(t.goalId) || t.status !== 'pending') return t;
    return {
      ...t,
      hardness: 1 as TaskHardness,
      durationMinutes: Math.max(2, Math.min(5, t.durationMinutes)),
      motivationalNote: adjustedPlan || 'Just show up — 2 minutes counts today.',
    };
  });
}

/** Check if a completion qualifies for a micro-reward badge (struggling tier) */
export function evaluateMicroRewards(
  tier: EngagementTier,
  logs: DailyGoalLog[],
  goals: Goal[],
  unlocked: Set<string>
): string[] {
  if (tier !== 'struggling') return [];

  const newBadges: string[] = [];
  const completions = logs.filter((l) => l.completed).length;

  if (!unlocked.has('micro_first_win') && completions >= 1) {
    newBadges.push('micro_first_win');
  }

  if (!unlocked.has('micro_showed_up') && completions >= 1) {
    newBadges.push('micro_showed_up');
  }

  // Any goal completed 2 days in a row
  if (!unlocked.has('micro_two_day')) {
    const byGoal = new Map<string, string[]>();
    logs.filter((l) => l.completed).forEach((l) => {
      if (!byGoal.has(l.goalId)) byGoal.set(l.goalId, []);
      byGoal.get(l.goalId)!.push(l.date);
    });
    for (const dates of byGoal.values()) {
      const sorted = [...new Set(dates)].sort();
      for (let i = 1; i < sorted.length; i++) {
        const a = new Date(sorted[i - 1]);
        const b = new Date(sorted[i]);
        if ((b.getTime() - a.getTime()) / 86400000 === 1) {
          newBadges.push('micro_two_day');
          break;
        }
      }
    }
  }

  // "Made bed" style — selfCare goal completed once
  if (!unlocked.has('micro_made_bed')) {
    const selfCareDone = logs.some((l) => {
      if (!l.completed) return false;
      const g = goals.find((x) => x.id === l.goalId);
      return g?.category === 'selfCare';
    });
    if (selfCareDone) newBadges.push('micro_made_bed');
  }

  if (!unlocked.has('micro_tiny_step') && completions >= 3) {
    newBadges.push('micro_tiny_step');
  }

  return newBadges.filter((id) => !unlocked.has(id));
}

/** Disciplined users need higher bars for streak badges */
export function getStreakBadgeThreshold(baseThreshold: number, tier: EngagementTier): number {
  if (tier === 'disciplined') return Math.round(baseThreshold * 1.4);
  if (tier === 'struggling') return Math.max(2, Math.round(baseThreshold * 0.5));
  return baseThreshold;
}

export function getXpMultiplier(tier: EngagementTier, streakDays: number): number {
  // Struggling users get boosted XP on small wins
  if (tier === 'struggling') {
    if (streakDays >= 7) return 1.5;
    return 2.0;
  }
  if (tier === 'disciplined') {
    if (streakDays >= 30) return 2.5;
    if (streakDays >= 14) return 2.0;
    if (streakDays >= 7) return 1.5;
    return 1.0;
  }
  // building
  if (streakDays >= 14) return 1.75;
  if (streakDays >= 7) return 1.35;
  return 1.1;
}
