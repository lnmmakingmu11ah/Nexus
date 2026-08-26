import { BehaviorProfile, Milestone } from '../types';

export interface AdaptiveTimelineResult {
  timelineRange: { minDays: number; maxDays: number };
  estimatedDaysToMastery: number;
  timelineSummary: string;
  timelineMap: string[];
  milestones: Milestone[];
}

const DAY = 1;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const WEALTH_KEYWORDS = /millionaire|wealth|rich|financial freedom|net worth|invest|investing|portfolio|capital/i;
const SKILL_KEYWORDS = /master|mastery|career|business|build|launch|founder|skill|learn|study|degree|certification/i;
const FITNESS_KEYWORDS = /fit|fitness|fat loss|lose weight|bulk|muscle|marathon|run|lift|strength|endurance|cardio/i;
const HABIT_KEYWORDS = /discipline|routine|habit|consistency|procrastinat|burnout|lazy|focus|mindset|journal|meditat|pray/i;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function parseYearsFromText(text: string): number[] {
  const matches = text.matchAll(/(\d+(?:\.\d+)?)\s*(years?|yrs?|yr|months?|mos?|weeks?|wks?|decades?)/gi);
  const out: number[] = [];
  for (const match of matches) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(amount)) continue;
    if (unit.startsWith('decade')) out.push(amount * 10 * YEAR);
    else if (unit.startsWith('year') || unit.startsWith('yr')) out.push(amount * YEAR);
    else if (unit.startsWith('month') || unit.startsWith('mo')) out.push(amount * MONTH);
    else if (unit.startsWith('week') || unit.startsWith('wk')) out.push(amount * WEEK);
  }
  return out;
}

function completionFactor(profile?: BehaviorProfile): number {
  if (!profile) return 1;
  const rates = Object.values(profile.completionRateByCategory || {});
  const overallRate = rates.length ? avg(rates) : 0.5;
  let factor = 1;

  if (overallRate >= 0.8) factor *= 0.82;
  else if (overallRate >= 0.65) factor *= 0.9;
  else if (overallRate >= 0.45) factor *= 1.05;
  else factor *= 1.22;

  if ((profile.avgStreakBeforeDropoff || 0) >= 14) factor *= 0.88;
  else if ((profile.avgStreakBeforeDropoff || 0) <= 3) factor *= 1.12;

  if ((profile.lapseRecoveryDays || 0) >= 5) factor *= 1.12;
  else if ((profile.lapseRecoveryDays || 0) <= 2) factor *= 0.96;

  if ((profile.currentDailyCap || 0) >= 6) factor *= 0.88;
  else if ((profile.currentDailyCap || 0) <= 2) factor *= 1.1;

  return clamp(factor, 0.7, 1.45);
}

function inferDomain(text: string): 'wealth' | 'skill' | 'fitness' | 'habit' | 'general' {
  if (WEALTH_KEYWORDS.test(text)) return 'wealth';
  if (FITNESS_KEYWORDS.test(text)) return 'fitness';
  if (SKILL_KEYWORDS.test(text)) return 'skill';
  if (HABIT_KEYWORDS.test(text)) return 'habit';
  return 'general';
}

function baseRangeForDomain(domain: ReturnType<typeof inferDomain>): { minDays: number; maxDays: number } {
  switch (domain) {
    case 'wealth':
      return { minDays: 365 * 5, maxDays: 365 * 45 };
    case 'skill':
      return { minDays: 90, maxDays: 365 * 5 };
    case 'fitness':
      return { minDays: 60, maxDays: 365 * 2 };
    case 'habit':
      return { minDays: 30, maxDays: 365 };
    default:
      return { minDays: 90, maxDays: 365 * 3 };
  }
}

function summaryForDays(days: number): string {
  if (days < 60) return 'Weeks 0-8: stabilization and first wins';
  if (days < 180) return 'Months 0-6: foundation, rhythm, and repetition';
  if (days < 365) return 'Months 0-12: build consistency and raise the floor';
  if (days < YEAR * 3) return 'Year 0-3: foundation, momentum, and skill lift';
  if (days < YEAR * 7) return 'Years 0-7: build, compound, and recover from setbacks';
  return 'Years 0-10+: long-range compounding and resilience';
}

function mapForDays(days: number, domain: ReturnType<typeof inferDomain>): string[] {
  if (domain === 'wealth') {
    if (days >= YEAR * 10) {
      return [
        '0-2y: build income engine and save aggressively',
        '2-5y: create investable surplus and remove leakage',
        '5-10y: scale assets and compound consistently',
        '10y+: protect, diversify, and preserve gains',
      ];
    }
    return [
      '0-18m: build cashflow and spending control',
      '18m-4y: raise income and invest the surplus',
      '4y+: compound into durable wealth',
    ];
  }

  if (domain === 'skill') {
    if (days >= YEAR * 3) {
      return [
        '0-6m: learn the basics and remove friction',
        '6-18m: ship reps and tighten quality',
        '18m-3y: deepen mastery and build proof',
        '3y+: apply the skill at higher leverage',
      ];
    }
    return [
      '0-3m: start tiny and stay consistent',
      '3-12m: build fluency and confidence',
      '12m+: turn practice into output',
    ];
  }

  if (domain === 'fitness') {
    return days >= YEAR
      ? [
          '0-3m: rebuild baseline and consistency',
          '3-9m: progressive overload and capacity growth',
          '9m-2y: lock in durable physique changes',
        ]
      : [
          '0-6w: start safely and show up',
          '6-12w: raise volume and form quality',
          '12w+: stabilize into a routine',
        ];
  }

  if (domain === 'habit') {
    return [
      '0-30d: remove friction and start tiny',
      '30-90d: repeat until it feels normal',
      '90d+: protect the habit and adapt it',
    ];
  }

  return days >= YEAR
    ? [
        '0-3m: first consistent wins',
        '3-12m: build momentum and confidence',
        '1y+: compound the result',
      ]
    : [
        '0-30d: start small and concrete',
        '30-90d: keep the streak alive',
        '90d+: shift from effort to identity',
      ];
}

function milestoneLabels(days: number, domain: ReturnType<typeof inferDomain>): string[] {
  const count = days >= YEAR * 10 ? 5 : days >= YEAR * 3 ? 4 : 3;
  const base = mapForDays(days, domain);
  return base.slice(0, count).map((segment, idx) => `Phase ${idx + 1}: ${segment}`);
}

function buildMilestones(goalId: string, days: number, domain: ReturnType<typeof inferDomain>): Milestone[] {
  const count = days >= YEAR * 10 ? 5 : days >= YEAR * 3 ? 4 : 3;
  const labels = milestoneLabels(days, domain);
  const milestones: Milestone[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.round((days * i) / count);
    const to = Math.round((days * (i + 1)) / count);
    milestones.push({
      id: `ms-${goalId}-${i + 1}`,
      goalId,
      title: labels[i] || `Phase ${i + 1}`,
      completionCondition:
        i === count - 1
          ? 'The goal is sustainable and the user can keep it going without constant prompting'
          : 'Meet the stage target consistently and leave enough room for setbacks and recovery',
      orderIndex: i,
      status: i === 0 ? 'active' : 'pending',
      targetDateRange: {
        earliest: new Date(Date.now() + from * 86400000).toISOString().split('T')[0],
        latest: new Date(Date.now() + Math.max(from + 1, to) * 86400000).toISOString().split('T')[0],
      },
    });
  }
  return milestones;
}

export function buildAdaptiveTimeline(
  title: string,
  description = '',
  behaviorProfile?: BehaviorProfile,
  researchContext = '',
  explicitRange?: { minDays: number; maxDays: number }
): AdaptiveTimelineResult {
  const text = `${title} ${description} ${researchContext}`.trim();
  const domain = inferDomain(text);
  const baseRange = baseRangeForDomain(domain);
  const anchors = parseYearsFromText(text);
  const researchAnchorDays = anchors.length ? Math.round(avg(anchors)) : 0;

  const factor = completionFactor(behaviorProfile);
  const baseEstimate =
    researchAnchorDays > 0
      ? researchAnchorDays
      : Math.round((baseRange.minDays + baseRange.maxDays) / 2);

  let estimatedDaysToMastery = Math.round(baseEstimate * factor);

  if (explicitRange) {
    estimatedDaysToMastery = clamp(
      estimatedDaysToMastery,
      explicitRange.minDays,
      explicitRange.maxDays
    );
  } else {
    estimatedDaysToMastery = clamp(
      estimatedDaysToMastery,
      baseRange.minDays,
      baseRange.maxDays
    );
  }

  const minDays = explicitRange?.minDays
    ? clamp(Math.round(estimatedDaysToMastery * 0.6), 7, explicitRange.maxDays)
    : clamp(Math.round(estimatedDaysToMastery * 0.7), baseRange.minDays, baseRange.maxDays);
  const maxDays = explicitRange?.maxDays
    ? clamp(Math.round(estimatedDaysToMastery * 1.35), explicitRange.minDays, explicitRange.maxDays)
    : clamp(Math.round(estimatedDaysToMastery * 1.4), baseRange.minDays, baseRange.maxDays);

  const timelineRange = {
    minDays: Math.min(minDays, maxDays),
    maxDays: Math.max(minDays, maxDays),
  };

  const timelineMap = mapForDays(estimatedDaysToMastery, domain);
  const timelineSummary = summaryForDays(estimatedDaysToMastery);
  const milestones = buildMilestones(`timeline-${Date.now()}`, estimatedDaysToMastery, domain);

  return {
    timelineRange,
    estimatedDaysToMastery,
    timelineSummary,
    timelineMap,
    milestones,
  };
}

export function buildTimelineMilestones(goalId: string, range?: { minDays: number; maxDays: number }, title = ''): Milestone[] {
  const domain = inferDomain(title);
  const days = Math.max(range?.maxDays || 180, range?.minDays || 90);
  return buildMilestones(goalId, days, domain);
}

export function formatTimelineDays(days?: number): string {
  if (!days || !Number.isFinite(days)) return '';
  if (days < 60) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const years = days / 365;
  return years >= 10 ? `${Math.round(years)} years` : `${years.toFixed(1)} years`;
}
