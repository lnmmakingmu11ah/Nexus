/**
 * behaviorProfile.ts — Pure computation of BehaviorProfile from DailyGoalLog data.
 * No AI calls — stats the AI consumes as injected context.
 */

import { BehaviorProfile, CategoryKey, DailyGoalLog, Goal, PlannedTask } from '../types';
import { fallbackBehaviorProfile } from './planFallbacks';
import { computeEngagementTier } from './zeroToHero';
import { completionRateForWindow, computeRuthlessDailyCap } from './dailyCap';

const CATS: CategoryKey[] = ['health', 'smarts', 'spiritual', 'selfCare', 'happiness'];

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function last30Days(): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 30; i++) {
    const c = new Date(d); c.setDate(d.getDate() - i);
    out.push(c.toISOString().split('T')[0]);
  }
  return out;
}

export function computeBehaviorProfile(
  logs: DailyGoalLog[] = [],
  goals: Goal[] = [],
  plannedTasks: PlannedTask[] = [],
  onboardedAt?: string
): BehaviorProfile {
  try {
    const daysSinceOnboarding = onboardedAt
      ? Math.floor((Date.now() - new Date(onboardedAt).getTime()) / 86400000)
      : 0;

    const window = last30Days();

    // 1. Completion rate by category
    const completionRateByCategory = {} as Record<CategoryKey, number>;
    CATS.forEach(cat => {
      const gs = goals.filter(g => g.category === cat && !g.archived);
      if (!gs.length) { completionRateByCategory[cat] = 0.5; return; }
      let opp = 0, done = 0;
      gs.forEach(g => window.forEach(ds => {
        const log = logs.find(l => l.goalId === g.id && l.date === ds);
        if (log) { opp++; if (log.completed) done++; }
      }));
      completionRateByCategory[cat] = opp > 0 ? Math.round((done / opp) * 100) / 100 : 0.5;
    });

    const overallRate = avg(Object.values(completionRateByCategory));

    // 2. Time slot success/fail
    const goalToSlot = new Map<string, string>();
    goals.forEach(g => { if (g.reminderTime) goalToSlot.set(g.id, g.reminderTime.split(':')[0] + ':00'); });
    const slotStats = new Map<string, { done: number; total: number }>();
    logs.forEach(log => {
      const slot = goalToSlot.get(log.goalId);
      if (!slot) return;
      if (!slotStats.has(slot)) slotStats.set(slot, { done: 0, total: 0 });
      const s = slotStats.get(slot)!;
      s.total++;
      if (log.completed) s.done++;
    });
    const successfulTimeSlots: string[] = [];
    const failingTimeSlots: string[] = [];
    slotStats.forEach((s, slot) => {
      if (s.total < 3) return;
      const r = s.done / s.total;
      if (r >= 0.65) successfulTimeSlots.push(slot);
      else if (r <= 0.35) failingTimeSlots.push(slot);
    });

    // 3. Avg streak before dropoff
    const streakLengths: number[] = [];
    goals.forEach(g => {
      const gl = logs.filter(l => l.goalId === g.id).sort((a, b) => a.date.localeCompare(b.date));
      let streak = 0;
      let prev: string | null = null;
      gl.forEach(log => {
        if (!log.completed) { if (streak > 0) streakLengths.push(streak); streak = 0; prev = null; return; }
        if (!prev) { streak = 1; prev = log.date; return; }
        const diff = (new Date(log.date).getTime() - new Date(prev).getTime()) / 86400000;
        if (diff === 1) streak++;
        else { if (streak > 0) streakLengths.push(streak); streak = 1; }
        prev = log.date;
      });
      if (streak > 0) streakLengths.push(streak);
    });
    const avgStreakBeforeDropoff = streakLengths.length ? Math.round(avg(streakLengths)) : 5;

    // 4. Lapse recovery days
    const recoveries: number[] = [];
    goals.forEach(g => {
      const gl = logs.filter(l => l.goalId === g.id).sort((a, b) => a.date.localeCompare(b.date));
      let lapseStart: string | null = null;
      gl.forEach(log => {
        if (!log.completed && !lapseStart) { lapseStart = log.date; }
        else if (log.completed && lapseStart) {
          const days = Math.floor((new Date(log.date).getTime() - new Date(lapseStart).getTime()) / 86400000);
          if (days > 0 && days < 30) recoveries.push(days);
          lapseStart = null;
        }
      });
    });
    const lapseRecoveryDays = recoveries.length ? Math.round(avg(recoveries)) : 2;

    // 5. Completion rate by task hardness tier
    const completionRateByTaskType: Record<string, number> = {};
    const tg = new Map<string, { done: number; total: number }>();
    plannedTasks.forEach(t => {
      const k = `h${t.hardness}`;
      if (!tg.has(k)) tg.set(k, { done: 0, total: 0 });
      const s = tg.get(k)!; s.total++;
      if (t.status === 'done') s.done++;
    });
    tg.forEach((s, k) => { completionRateByTaskType[k] = s.total > 0 ? s.done / s.total : 0.5; });

    const rate7d = completionRateForWindow(logs, goals, 7);
    const engagementTier = computeEngagementTier({
      completionRateByCategory,
      completionRateByTaskType,
      successfulTimeSlots: [],
      failingTimeSlots: [],
      avgStreakBeforeDropoff: 0,
      lapseRecoveryDays: 2,
      responsiveNudgeTypes: [],
      lastComputedAt: '',
      daysSinceOnboarding,
      currentDailyCap: 2,
    });
    const currentDailyCap = computeRuthlessDailyCap({
      daysSinceOnboarding,
      rate30d: overallRate,
      rate7d,
      engagementTier,
    });

    return {
      completionRateByCategory,
      completionRateByTaskType,
      successfulTimeSlots: successfulTimeSlots.slice(0, 5),
      failingTimeSlots: failingTimeSlots.slice(0, 5),
      avgStreakBeforeDropoff,
      lapseRecoveryDays,
      responsiveNudgeTypes: [],
      lastComputedAt: new Date().toISOString(),
      daysSinceOnboarding,
      currentDailyCap,
      completionRate7d: Math.round(rate7d * 100) / 100,
      engagementTier,
    };
  } catch (err) {
    console.error('computeBehaviorProfile error, using fallback:', err);
    return fallbackBehaviorProfile();
  }
}
