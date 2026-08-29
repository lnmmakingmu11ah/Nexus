/**
 * Weekly rewrite of the living blueprint from real completion data.
 * Parks underperforming dailies so the next week cannot dump eight habits.
 */

import {
  DailyGoalLog,
  Goal,
  MasterBlueprint,
  UserConfig,
  WeeklyBlueprintRewrite,
} from '../types';
import { applyDailyCapToGoals, computeRuthlessDailyCap, completionRateForWindow, isDailyFocusEligible } from './dailyCap';
import { computeEngagementTier } from './zeroToHero';

export function daysSince(iso?: string): number {
  if (!iso) return 999;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export function shouldRewriteBlueprint(config: UserConfig, logs: DailyGoalLog[]): boolean {
  if (!config.onboarded || !config.masterBlueprint) return false;
  if (daysSince(config.lastBlueprintRewriteAt) < 7) return false;
  if (daysSince(config.onboardedAt) < 7) return false;
  if (logs.length < 4) return false;
  return true;
}

export function rewriteBlueprintFromCompletions(
  goals: Goal[],
  logs: DailyGoalLog[],
  config: UserConfig
): {
  goals: Goal[];
  rewrite: WeeklyBlueprintRewrite;
  blueprint: MasterBlueprint | undefined;
  dailyCap: number;
} {
  const rate7d = completionRateForWindow(logs, goals, 7);
  const rate30d = completionRateForWindow(logs, goals, 30);
  const daysSinceOnboarding = Math.max(0, Math.floor(daysSince(config.onboardedAt)));
  const tier = config.behaviorProfile?.engagementTier || computeEngagementTier(config.behaviorProfile);
  const cap = computeRuthlessDailyCap({ daysSinceOnboarding, rate30d, rate7d, engagementTier: tier });

  const eligible = goals.filter(
    (g) =>
      !g.archived &&
      g.frequency !== 'weekly' &&
      g.planStatus !== 'paused' &&
      g.planStatus !== 'completed'
  );
  const ranked = eligible
    .map((g) => {
      const windowLogs = logs.filter((l) => l.goalId === g.id);
      const last14 = windowLogs.filter((l) => daysSince(l.date) <= 14);
      const done = last14.filter((l) => l.completed).length;
      const rate = last14.length ? done / last14.length : 0;
      return { g, rate, done };
    })
    .sort((a, b) => b.rate - a.rate);

  const keep = ranked.filter((r) => r.rate >= 0.35 || r.done > 0).slice(0, cap);
  const keepIds = new Set(keep.map((k) => k.g.id));

  let nextGoals = goals.map((g) => {
    if (g.archived || g.frequency === 'weekly') return g;
    if (keepIds.has(g.id)) {
      return { ...g, priority: 'active' as const, planStatus: g.planStatus === 'paused' ? 'active' as const : g.planStatus };
    }
    if (eligible.some((e) => e.id === g.id)) {
      return { ...g, priority: 'parking_lot' as const };
    }
    return g;
  });

  nextGoals = applyDailyCapToGoals(nextGoals, cap);

  const parkedGoalIds = nextGoals.filter((g) => g.priority === 'parking_lot').map((g) => g.id);
  const activatedGoalIds = nextGoals.filter((g) => g.priority === 'active' && keepIds.has(g.id)).map((g) => g.id);

  const parkedNames = nextGoals.filter((g) => parkedGoalIds.includes(g.id)).map((g) => g.name).slice(0, 6);
  const keepNames = nextGoals.filter((g) => activatedGoalIds.includes(g.id)).map((g) => g.name);

  const summary =
    rate7d < 0.45
      ? `Rough week (${Math.round(rate7d * 100)}% done). Daily cap is ${cap}. Keeping ${keepNames.join(', ') || 'the smallest wins'}${parkedNames.length ? `. Parked: ${parkedNames.join(', ')}` : ''}.`
      : `Week rewrite: cap ${cap}. Focus ${keepNames.join(', ') || 'core habits'}${parkedNames.length ? `. Resting: ${parkedNames.join(', ')}` : ''}.`;

  const rewrite: WeeklyBlueprintRewrite = {
    at: new Date().toISOString(),
    summary,
    parkedGoalIds,
    activatedGoalIds,
    dailyCap: cap,
  };

  const blueprint = config.masterBlueprint
    ? {
        ...config.masterBlueprint,
        pillarAutoFillNotes: [config.masterBlueprint.pillarAutoFillNotes, summary].filter(Boolean).join(' | ').slice(-800),
      }
    : undefined;

  return { goals: nextGoals, rewrite, blueprint, dailyCap: cap };
}
