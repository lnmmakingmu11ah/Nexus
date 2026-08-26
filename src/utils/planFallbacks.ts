/**
 * planFallbacks.ts — Deterministic fallback templates.
 * Used when an AI call fails validation or errors out.
 * Ensures the app never surfaces broken state to the user.
 */

import { PlannedGoalDraft, Milestone, PlannedTask, BehaviorProfile, CategoryKey } from '../types';
import { buildAdaptiveTimeline, buildTimelineMilestones } from './timelinePlanner';

export function fallbackGoalDraft(title: string, category: CategoryKey): PlannedGoalDraft {
  const adaptive = buildAdaptiveTimeline(title, `Build a consistent daily habit around: ${title}`);
  return {
    title,
    targetDescription: `Build a consistent daily habit around: ${title}`,
    category,
    timelineRange: adaptive.timelineRange,
    timelineSummary: adaptive.timelineSummary,
    timelineMap: adaptive.timelineMap,
    confirmedByUser: false,
  };
}

export function fallbackMilestones(goalId: string, timelineMinDays = 60): Milestone[] {
  return buildTimelineMilestones(goalId, {
    minDays: Math.max(7, Math.floor(timelineMinDays * 0.7)),
    maxDays: Math.max(14, timelineMinDays),
  });
}

export function fallbackTask(milestoneId: string, goalId: string, scheduledDate: string): PlannedTask {
  return {
    id: `task-fb-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    milestoneId, goalId,
    title: 'Complete your habit for today',
    description: 'Do the minimum viable version — consistency > intensity right now.',
    scheduledDate,
    durationMinutes: 20,
    hardness: 2,
    isRecurring: true,
    recurrencePattern: 'daily',
    status: 'pending',
  };
}

export function fallbackBehaviorProfile(): BehaviorProfile {
  return {
    completionRateByCategory: {
      health: 0.5, smarts: 0.5, spiritual: 0.5, selfCare: 0.5, happiness: 0.5,
    },
    completionRateByTaskType: {},
    successfulTimeSlots: ['08:00', '09:00'],
    failingTimeSlots: ['21:00', '22:00'],
    avgStreakBeforeDropoff: 5,
    lapseRecoveryDays: 2,
    responsiveNudgeTypes: ['encouragement'],
    lastComputedAt: new Date().toISOString(),
    daysSinceOnboarding: 0,
    currentDailyCap: 2,
  };
}

export function fallbackLapseRecovery(missedDays: number, goalName: string): string {
  if (missedDays === 1)
    return `one miss doesnt break anything \u2014 just pick back up today with ${goalName} and keep going 💪`;
  if (missedDays <= 3)
    return `missed a few on ${goalName} \u2014 no big deal. we adjust the plan not restart from zero. smallest step today counts`;
  return `been a rough patch with ${goalName} \u2014 lets shrink it way down for now and rebuild from there, no shame in that`;
}

export function fallbackIntakeChatReply(userText: string, phase: string): string {
  if (phase === 'discovery') return `got it! tell me more \u2014 what does success actually look like for that goal? like specifically 👀`;
  if (phase === 'disambiguation') return `okay so just to make sure im tracking \u2014 what would "done" look like for this one?`;
  if (phase === 'feasibility') return `let me be real with u about that timeline \u2014 can we talk through what's realistic here?`;
  return `okay noted \u2014 anything else u wanna add before we lock this in?`;
}
