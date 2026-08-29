/**
 * One ruthless daily cap. Struggling weeks never see 8 habits.
 */

import { DailyGoalLog, Goal, BehaviorProfile } from '../types';
import { computeEngagementTier, EngagementTier } from './zeroToHero';

export const HARD_MAX_DAILY = 5;
export const STRUGGLING_CAP = 2;

export function completionRateForWindow(logs: DailyGoalLog[], goals: Goal[], days: number): number {
  const ids = new Set(goals.filter((g) => isDailyFocusEligible(g)).map((g) => g.id));
  if (!ids.size) return 0.5;
  const window: string[] = [];
  const d = new Date();
  for (let i = 0; i < days; i++) {
    const c = new Date(d);
    c.setDate(d.getDate() - i);
    window.push(c.toISOString().split('T')[0]);
  }
  let opp = 0;
  let done = 0;
  for (const ds of window) {
    for (const id of ids) {
      const log = logs.find((l) => l.goalId === id && l.date === ds);
      if (!log) continue;
      opp++;
      if (log.completed) done++;
    }
  }
  return opp > 0 ? done / opp : 0.5;
}

export function isDailyFocusEligible(goal: Goal): boolean {
  if (goal.archived) return false;
  if (goal.planStatus === 'paused' || goal.planStatus === 'completed') return false;
  if (goal.priority === 'parking_lot') return false;
  if (goal.frequency === 'weekly') return false;
  return true;
}

export function computeRuthlessDailyCap(opts: {
  daysSinceOnboarding: number;
  rate30d: number;
  rate7d: number;
  engagementTier?: EngagementTier;
}): number {
  const { daysSinceOnboarding, rate30d, rate7d, engagementTier } = opts;

  let cap = STRUGGLING_CAP;
  if (daysSinceOnboarding >= 21 && rate30d >= 0.68) cap = 3;
  if (daysSinceOnboarding >= 45 && rate30d >= 0.75) cap = 4;
  if (daysSinceOnboarding >= 75 && rate30d >= 0.82) cap = HARD_MAX_DAILY;

  if (engagementTier === 'struggling' || rate7d < 0.4) cap = Math.min(cap, STRUGGLING_CAP);
  else if (rate7d < 0.55) cap = Math.min(cap, 3);

  return Math.max(1, Math.min(HARD_MAX_DAILY, cap));
}

export function selectDailyFocusGoals(
  goals: Goal[],
  logs: DailyGoalLog[],
  cap: number,
  todayStr: string
): Goal[] {
  const eligible = goals.filter(isDailyFocusEligible);
  const scored = eligible.map((g) => {
    const recent = logs.filter((l) => l.goalId === g.id).slice(-14);
    const hits = recent.filter((l) => l.completed).length;
    const todayDone = logs.some((l) => l.goalId === g.id && l.date === todayStr && l.completed);
    const hour = Number((g.reminderTime || '12:00').split(':')[0]);
    let score = 0;
    if (g.priority === 'active') score += 30;
    if (g.isLifePathAligned) score += 8;
    if (todayDone) score += 40;
    score += Math.min(20, hits * 2);
    score += (24 - Math.abs(8 - hour)) * 0.4;
    return { g, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, cap)).map((s) => s.g);
}

export function applyDailyCapToGoals(
  goals: Goal[],
  cap: number,
  logs: DailyGoalLog[] = [],
  todayStr?: string
): Goal[] {
  const eligible = goals.filter(isDailyFocusEligible);
  if (eligible.length <= cap) return goals;
  const keep = todayStr
    ? selectDailyFocusGoals(goals, logs, cap, todayStr)
    : eligible.slice(0, cap);
  const keepIds = new Set(keep.map((g) => g.id));
  return goals.map((g) => {
    if (!isDailyFocusEligible(g)) return g;
    if (keepIds.has(g.id)) return { ...g, priority: 'active' as const, planStatus: g.planStatus === 'paused' ? 'active' : g.planStatus };
    return { ...g, priority: 'parking_lot' as const };
  });
}

export function capFromProfile(profile?: BehaviorProfile): number {
  if (!profile) return STRUGGLING_CAP;
  const tier = profile.engagementTier || computeEngagementTier(profile);
  return computeRuthlessDailyCap({
    daysSinceOnboarding: profile.daysSinceOnboarding || 0,
    rate30d: averageRates(profile.completionRateByCategory),
    rate7d: profile.completionRate7d ?? averageRates(profile.completionRateByCategory),
    engagementTier: tier,
  });
}

function averageRates(rates?: Record<string, number>): number {
  const vals = Object.values(rates || {});
  if (!vals.length) return 0.5;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
