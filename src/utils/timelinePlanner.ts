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

export function inferDomain(text: string): 'wealth' | 'skill' | 'fitness' | 'habit' | 'general' {
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

function mapForDays(days: number, domain: ReturnType<typeof inferDomain>, hasBlocker = false): string[] {
  if (hasBlocker) {
    if (domain === 'wealth') {
      return [
        'Phase 1 (Days 1–30): Blocker Neutralization — build friction against spending leaks and log daily finances (15 min/day)',
        'Phase 2 (Months 2–12): Cashflow Systems — optimize primary income engine and automate regular investing',
        'Phase 3 (Years 1–5+): Wealth Accumulation — compound capital, scale business/investments, and protect assets',
      ];
    }
    if (domain === 'skill') {
      return [
        'Phase 1 (Days 1–30): Blocker Neutralization — daily 15–20 min micro-sprints to kill procrastination and build inertia-breaking momentum',
        'Phase 2 (Months 2–6): Capability Depth — ramp to 45–60 min deep practice and build real portfolio artifacts',
        'Phase 3 (Months 6+): Mastery & Scaling — deploy skill in production, ship projects, and monetize expertise',
      ];
    }
    if (domain === 'fitness') {
      return [
        'Phase 1 (Days 1–30): Blocker Neutralization — non-negotiable 15–20 min daily movement to lock in the routine and break sedentariness',
        'Phase 2 (Months 2–6): Progressive Overload — structured training volume, nutrition tracking, and strength gains',
        'Phase 3 (Months 6+): Peak Physique & Maintenance — durable conditioning, athletic performance, and lifestyle identity',
      ];
    }
    return [
      'Phase 1 (Days 1–30): Blocker Neutralization — micro-habits (15 min/day) to build initial momentum and eliminate activation friction',
      'Phase 2 (Months 2–6): Intensity Ramp — systematically scale workload intensity once consistency is solid',
      'Phase 3 (Months 6+): Compounding Mastery — sustained execution and high-leverage application',
    ];
  }

  if (domain === 'wealth') {
    if (days >= YEAR * 10) {
      return [
        'Phase 1 (Years 0–2): Income Engine & Surplus Creation',
        'Phase 2 (Years 2–5): Systematic Capital Allocation & Asset Building',
        'Phase 3 (Years 5–10): Compounding & Leverage Scaling',
        'Phase 4 (Years 10+): Wealth Preservation & Legacy',
      ];
    }
    return [
      'Phase 1 (Months 0–6): Foundation & Cashflow Optimization',
      'Phase 2 (Months 6–24): Income Growth & High-Yield Investing',
      'Phase 3 (Years 2+): Scaled Assets & Wealth Accumulation',
    ];
  }

  if (domain === 'skill') {
    if (days >= YEAR * 3) {
      return [
        'Phase 1 (Months 0–6): Core Foundations & Deliberate Practice Sprints',
        'Phase 2 (Months 6–18): Project Execution & Tangible Proof of Work',
        'Phase 3 (Months 18–36): Deep Mastery & Advanced Specialization',
        'Phase 4 (Years 3+): High-Leverage Application & Industry Impact',
      ];
    }
    return [
      'Phase 1 (Days 1–30): Habit & Core Syntax Foundation',
      'Phase 2 (Months 2–6): Fluency, Project Building & Capability Lift',
      'Phase 3 (Months 6+): High-Impact Output & Real-World Mastery',
    ];
  }

  if (domain === 'fitness') {
    return days >= YEAR
      ? [
          'Phase 1 (Months 0–3): Baseline Movement & Consistency Lock-in',
          'Phase 2 (Months 3–9): Progressive Overload & Hypertrophy/Endurance',
          'Phase 3 (Months 9–24): Peak Physique Transformation & Resilience',
        ]
      : [
          'Phase 1 (Weeks 1–4): Baseline Activation & Daily Showing Up',
          'Phase 2 (Weeks 5–12): Volume Ramp & Form Progression',
          'Phase 3 (Months 3+): Peak Conditioning & Automated Habit',
        ];
  }

  if (domain === 'habit') {
    return [
      'Phase 1 (Days 1–30): Micro-Friction Removal & 2-Minute Activation',
      'Phase 2 (Days 30–90): Automaticity & Intensity Scaling',
      'Phase 3 (Days 90+): Identity Shift & Lifelong Resilience',
    ];
  }

  return days >= YEAR
    ? [
        'Phase 1 (Months 0–3): Foundation & Momentum Kickstart',
        'Phase 2 (Months 3–12): Capability Lift & System Scaling',
        'Phase 3 (Years 1+): Compounding High-Performance Output',
      ]
    : [
        'Phase 1 (Days 1–30): Foundation & Micro-Wins',
        'Phase 2 (Days 30–90): Streak Stabilization & Workload Scale',
        'Phase 3 (Days 90+): Durable Mastery & Effortless Execution',
      ];
}

function milestoneLabels(days: number, domain: ReturnType<typeof inferDomain>, hasBlocker = false): string[] {
  const base = mapForDays(days, domain, hasBlocker);
  return base;
}

function buildMilestones(goalId: string, days: number, domain: ReturnType<typeof inferDomain>, hasBlocker = false): Milestone[] {
  const labels = milestoneLabels(days, domain, hasBlocker);
  const count = labels.length;
  const milestones: Milestone[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.round((days * i) / count);
    const to = Math.round((days * (i + 1)) / count);
    let condition = 'Demonstrate at least 80% weekly consistency and achieve stage output targets.';
    if (i === 0 && hasBlocker) {
      condition = 'Complete Phase 1 Blocker Neutralization: 21 consecutive days of low-friction micro-execution with zero multi-day lapses.';
    } else if (i === count - 1) {
      condition = 'Final Mastery Target: Sustainable independent execution with measurable real-world output.';
    } else if (i === 0) {
      condition = 'Phase 1 Foundation: 14 consecutive days of habit execution and core routine locked in.';
    }

    milestones.push({
      id: `ms-${goalId}-${i + 1}`,
      goalId,
      title: labels[i] || `Phase ${i + 1}`,
      completionCondition: condition,
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

export function buildMacroPhases(
  title: string,
  days: number,
  hasBlocker = false
): { phaseNumber: number; title: string; timeline: string; transitionCondition: string; description: string }[] {
  const domain = inferDomain(title);
  const labels = mapForDays(days, domain, hasBlocker);
  return labels.map((label, idx) => {
    const num = idx + 1;
    let transition = 'Transition to next phase once 80%+ execution consistency is proven over 14 consecutive days.';
    let desc = `Execute stage actions and build compound capabilities for ${title}.`;

    if (idx === 0) {
      if (hasBlocker) {
        transition = 'Transition Condition: Zero multi-day lapses for 21 days; friction eliminated; micro-habit automated.';
        desc = 'Phase 1 Blocker Neutralization: Focus on low-friction micro-habits (15–30 min/day) to build momentum and break inertia.';
      } else {
        transition = 'Transition Condition: 14 consecutive days of foundation habit completion without failure.';
        desc = 'Phase 1 Baseline & Routine: Establish core execution anchors and verify daily capacity.';
      }
    } else if (idx === 1) {
      transition = 'Transition Condition: Produce intermediate project artifact or achieve second-stage capability benchmark.';
      desc = 'Phase 2 Workload & System Scale: Systematically increase focus duration, depth, and practical output.';
    } else {
      transition = 'Transition Condition: Mastery criteria satisfied with sustainable long-term execution.';
      desc = 'Phase 3 Compounding & Mastery: Full-scale real-world execution, resilience against disruptions, and high-leverage compounding.';
    }

    return {
      phaseNumber: num,
      title: label,
      timeline: idx === 0 ? 'Month 1' : idx === 1 ? 'Months 2–6' : 'Months 6+',
      transitionCondition: transition,
      description: desc,
    };
  });
}

export function buildCheckpoints(
  title: string,
  _days: number
): { period: string; targetOutputMetric: string; description: string }[] {
  const domain = inferDomain(title);
  if (domain === 'wealth') {
    return [
      {
        period: 'Months 1–3',
        targetOutputMetric: '100% financial tracking rate + 10% reduction in discretionary waste + initial emergency buffer setup',
        description: 'Neutralize spending leaks and install automated daily financial accountability logging.',
      },
      {
        period: 'Months 4–6',
        targetOutputMetric: 'First $1,000+ incremental side income or 15% savings rate automated into growth assets',
        description: 'Deploy the primary income expansion project and automate recurring investments.',
      },
      {
        period: 'Months 7–12',
        targetOutputMetric: 'Systemized cashflow asset generating consistent returns + 6-month resilience runway',
        description: 'Scale income stream to durable baseline and reinvest all surplus systematically.',
      },
    ];
  }

  if (domain === 'skill') {
    return [
      {
        period: 'Months 1–3',
        targetOutputMetric: 'Core fundamentals completed + 3 micro-projects built and published',
        description: 'Eliminate startup friction, build daily deliberate practice habit, and ship basic prototypes.',
      },
      {
        period: 'Months 4–6',
        targetOutputMetric: '1 comprehensive full-scale production project shipped + 50+ hours of deep work logged',
        description: 'Deepen technical capabilities and solve real-world problems end-to-end.',
      },
      {
        period: 'Months 7–12',
        targetOutputMetric: 'Demonstrated mastery portfolio / professional credential / monetized skill offering',
        description: 'Transition from learning to market-facing leverage and advanced execution.',
      },
    ];
  }

  if (domain === 'fitness') {
    return [
      {
        period: 'Months 1–3',
        targetOutputMetric: '30 consecutive workout sessions logged + 100% adherence to hydration/sleep baseline',
        description: 'Lock in physical consistency and build exercise habit automaticity.',
      },
      {
        period: 'Months 4–6',
        targetOutputMetric: '10-20% strength improvement or measurable body composition milestone reached',
        description: 'Progressive overload protocols and structured nutritional adherence.',
      },
      {
        period: 'Months 7–12',
        targetOutputMetric: 'Target athletic conditioning or physique standard locked in and effortlessly maintained',
        description: 'Sustainable lifestyle integration with zero relapse risk.',
      },
    ];
  }

  return [
    {
      period: 'Months 1–3',
      targetOutputMetric: '90%+ habit streak + foundation deliverables completed',
      description: 'Break inertia, eliminate psychological blockers, and establish daily momentum.',
    },
    {
      period: 'Months 4–6',
      targetOutputMetric: '2x workload intensity sustained with measurable progress output',
      description: 'Systematically ramp volume and tackle complex project components.',
    },
    {
      period: 'Months 7–12',
      targetOutputMetric: 'Full milestone target achieved with automated operational consistency',
      description: 'Solidify gains, compound results, and protect long-term progress.',
    },
  ];
}

export function buildMicroProgression(
  title: string,
  hasBlocker = false
): { dayRange: string; focus: string; dailyActions: string[]; progressionMechanism: string }[] {
  return [
    {
      dayRange: 'Days 1–14',
      focus: hasBlocker ? 'Blocker Neutralization & Micro-Habit Anchor' : 'Foundation & Habit Lock-In',
      dailyActions: [
        `Dedicate 15–20 minutes daily to ${title} immediately after your morning anchor cue`,
        'Log completion instantly and remove environmental distractions before starting',
        'Focus purely on showing up and starting — 0 pressure for perfection',
      ],
      progressionMechanism: 'Doing 15 minutes of low-friction work today eliminates inertia and neural resistance, creating the psychological safety required for tomorrow’s consistency.',
    },
    {
      dayRange: 'Days 15–30',
      focus: 'Capability Building & Volume Expansion',
      dailyActions: [
        `Scale focus session to 30–45 minutes of deliberate practice on ${title}`,
        'Complete one specific mini-deliverable or chapter each session',
        'Review and eliminate remaining friction points in your daily routine',
      ],
      progressionMechanism: 'The baseline habit locked in during Days 1–14 now frees cognitive willpower, allowing you to handle deeper, more challenging execution without feeling drained.',
    },
    {
      dayRange: 'Month 2+',
      focus: 'Real-World Project Execution & Compounding',
      dailyActions: [
        `Execute 45–60+ minute focused deep work blocks tackling real milestones for ${title}`,
        'Ship tangible weekly output metrics and review progress against checkpoints',
        'Maintain emergency 10-minute fallback versions on high-chaos days to protect streaks',
      ],
      progressionMechanism: 'Real-world project execution builds tangible portfolio proof and compound momentum, turning daily actions from effortful tasks into an automatic identity.',
    },
  ];
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
  const hasBlocker = /lazy|laziness|procrastinat|lack of focus|low discipline|distraction|phone|struggle/i.test(text);

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

  const timelineMap = mapForDays(estimatedDaysToMastery, domain, hasBlocker);
  const timelineSummary = summaryForDays(estimatedDaysToMastery);
  const milestones = buildMilestones(`timeline-${Date.now()}`, estimatedDaysToMastery, domain, hasBlocker);

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
  const hasBlocker = /lazy|laziness|procrastinat|lack of focus|low discipline|distraction/i.test(title);
  return buildMilestones(goalId, days, domain, hasBlocker);
}

export function formatTimelineDays(days?: number): string {
  if (!days || !Number.isFinite(days)) return '';
  if (days < 60) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const years = days / 365;
  return years >= 10 ? `${Math.round(years)} years` : `${years.toFixed(1)} years`;
}
