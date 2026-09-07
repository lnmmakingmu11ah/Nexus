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

  if (domain === 'habit') {
    return [
      {
        period: 'Months 1–3',
        targetOutputMetric: '21-day consecutive streak logged + zero multi-day lapses',
        description: 'Neutralize primary cue triggers, remove friction, and build neural habit automaticity.',
      },
      {
        period: 'Months 4–6',
        targetOutputMetric: '60+ days habit adherence + emergency minimum version executed on high-stress days',
        description: 'Habit survives routine disruptions, travel, and schedule stress without dropping below baseline.',
      },
      {
        period: 'Months 7–12',
        targetOutputMetric: 'Permanent identity integration + complementary habit stacks unlocked',
        description: 'The behavior is completely automated with zero willpower expenditure required.',
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
  const domain = inferDomain(title);

  if (domain === 'wealth') {
    const phase1Actions = hasBlocker
      ? [
          'Track every expense today in a spreadsheet or app — log even small purchases',
          'Read 20 pages of a wealth/investing book (e.g. "Rich Dad Poor Dad" or "The Psychology of Money")',
          'Identify one recurring unnecessary expense to cut this week',
        ]
      : [
          'Read 20–30 pages of a foundational wealth book (Rich Dad Poor Dad / The Millionaire Fastlane)',
          'Write down 3 potential income streams or business ideas you could start with near-zero capital',
          'Open a spreadsheet: log your current income, expenses, and net savings rate',
        ];
    return [
      {
        dayRange: 'Days 1–14',
        focus: hasBlocker ? 'Financial Friction Removal & Awareness' : 'Financial Literacy & Idea Generation',
        dailyActions: phase1Actions,
        progressionMechanism: 'Building financial awareness today (spending visibility, reading fundamentals) gives you the mental model needed to make your first smart money move tomorrow.',
      },
      {
        dayRange: 'Days 15–30',
        focus: 'First Income or Investment Action',
        dailyActions: [
          'Research one specific investment vehicle: index funds, real estate, or a side business model',
          'Start the smallest possible income experiment: sell one item online, offer one freelance service, or open an investment account',
          'Set up automatic savings: transfer even $10–50 into a separate growth account',
        ],
        progressionMechanism: 'Taking real financial action — no matter how small — closes the gap between theory and execution, building the identity of someone who invests and earns proactively.',
      },
      {
        dayRange: 'Month 2+',
        focus: 'System Building & Compounding Cashflow',
        dailyActions: [
          'Dedicate 45–60 min to your primary income-growth project (business, freelancing, skill monetization)',
          'Review investments weekly: track returns, reinvest surplus, and cut underperformers',
          'Read one case study of someone who achieved your target wealth level — extract 3 actionable tactics',
        ],
        progressionMechanism: 'Compound interest on both money and knowledge means showing up daily multiplies outcomes exponentially — each month of execution makes the next month easier.',
      },
    ];
  }

  if (domain === 'fitness') {
    const phase1Actions = hasBlocker
      ? [
          'Do a 15-minute brisk walk — no gym required, just leave the house and move',
          'Drink 2L of water today and log it',
          'Cook or prep one healthy meal instead of ordering out',
        ]
      : [
          'Complete your first structured workout session (follow a beginner program: StrongLifts 5x5, C25K, or bodyweight basics)',
          'Track your food intake today — even estimating calories builds awareness',
          'Set a sleep alarm: be in bed by 10:30pm to optimize recovery hormones',
        ];
    return [
      {
        dayRange: 'Days 1–14',
        focus: hasBlocker ? 'Movement Habit Installation' : 'Baseline Conditioning & Routine Lock-In',
        dailyActions: phase1Actions,
        progressionMechanism: 'Consistent daily movement — even just 15 minutes — resets your baseline energy, mood, and discipline, making every other goal easier to pursue.',
      },
      {
        dayRange: 'Days 15–30',
        focus: 'Progressive Overload & Nutrition Dialing',
        dailyActions: [
          'Add progressive resistance each week: increase weight, reps, or distance by 5–10%',
          'Hit your protein target daily: bodyweight in grams (e.g., 75kg = 75–120g protein)',
          'Log workout completion + weight/measurements weekly to verify progress',
        ],
        progressionMechanism: 'Progressive overload forces your body to adapt — each incremental increase in difficulty compounds into visible physical results over 30–60 days.',
      },
      {
        dayRange: 'Month 2+',
        focus: 'Peak Conditioning & Lifestyle Integration',
        dailyActions: [
          'Follow a periodized 4–5 day training split (Push/Pull/Legs or Upper/Lower)',
          'Meal prep 2–3 days ahead to eliminate decision fatigue and stick to nutrition targets',
          'Track key metrics monthly: photos, tape measurements, and performance benchmarks',
        ],
        progressionMechanism: 'Physical transformation is a lagging indicator — visible results at Month 2–3 compound everything you built in Phase 1, reinforcing the habit for life.',
      },
    ];
  }

  if (domain === 'skill') {
    const phase1Actions = hasBlocker
      ? [
          'Complete one 15-minute tutorial or lesson (YouTube, Udemy, or Coursera) — no skipping',
          'Open the editor/tool and write/build/create just one small thing',
          'Block one distraction: turn off notifications during your learning window',
        ]
      : [
          'Complete one structured lesson or chapter of your primary learning resource',
          'Build or write one small thing immediately after learning — apply the concept the same day',
          'Take handwritten notes: summarize key concepts in your own words for retention',
        ];
    return [
      {
        dayRange: 'Days 1–14',
        focus: hasBlocker ? 'Learning Habit Ignition' : 'Foundations & Daily Learning Routine',
        dailyActions: phase1Actions,
        progressionMechanism: 'Learning + immediate application wires knowledge into procedural memory faster than passive study, making Day 15 skills feel automatic rather than effortful.',
      },
      {
        dayRange: 'Days 15–30',
        focus: 'Skill Depth & First Real Projects',
        dailyActions: [
          'Scale to 45-minute deep practice sessions — tackle more complex exercises and problems',
          'Start your first real project: something you would show to another person or publish',
          'Find one community (Discord, Reddit, Slack) in your field and participate weekly',
        ],
        progressionMechanism: 'Shipping your first real project forces you to fill knowledge gaps you didn\'t know existed — the feedback loop from real output accelerates skill growth 3x faster than just studying.',
      },
      {
        dayRange: 'Month 2+',
        focus: 'Production-Grade Projects & Monetization',
        dailyActions: [
          'Work 60-min focused blocks on a portfolio-worthy project you can reference professionally',
          'Seek one piece of real feedback weekly: from a mentor, senior, or target employer/client',
          'Document your progress publicly (blog, LinkedIn, GitHub, portfolio) to build social proof',
        ],
        progressionMechanism: 'Public proof of work and real-world application compounds: each project begets the next, and visibility compounds into career opportunities, clients, and recognition.',
      },
    ];
  }

  if (domain === 'habit') {
    const phase1Actions = hasBlocker
      ? [
          'Set your phone to grayscale mode and move social apps off the home screen today',
          'Do a 5-minute journal entry: write what triggered today\'s poor habit and one replacement action',
          'Install one environmental blocker: Cold Turkey, app timer, or accountability partner',
        ]
      : [
          'Define your "minimum viable habit": the smallest possible version you can do even on your worst day',
          'Stack your new habit onto an existing routine (after coffee, after brushing teeth, etc.)',
          'Set up your environment the night before: lay out gear, open tabs, prepare everything',
        ];
    return [
      {
        dayRange: 'Days 1–14',
        focus: hasBlocker ? 'Blocker Elimination & Cue Installation' : 'Habit Architecture & Consistency',
        dailyActions: phase1Actions,
        progressionMechanism: 'Removing friction (environmental design) lowers the activation energy of good habits to near-zero, making consistency the path of least resistance.',
      },
      {
        dayRange: 'Days 15–30',
        focus: 'Automaticity & Willpower Independence',
        dailyActions: [
          'Run your habit at the same time and location every day — build contextual cues',
          'Track your streak visibly (habit app, paper chain) — the visual record builds identity',
          'Introduce one small difficulty increase to keep the habit engaging and growing',
        ],
        progressionMechanism: 'At Day 21+, the habit begins transitioning from effortful to automatic — your brain stops "deciding" and starts "just doing", freeing willpower for bigger goals.',
      },
      {
        dayRange: 'Month 2+',
        focus: 'Identity Integration & Anti-Fragile Resilience',
        dailyActions: [
          'Never miss twice — on hard days, execute a 5-minute minimum version to protect the streak',
          'Add complementary habits that reinforce the core one (habit stacking)',
          'Review monthly: is this habit still serving your goals? Adjust intensity or swap if needed',
        ],
        progressionMechanism: 'At Month 2, the habit is part of your identity. The question shifts from "did I do it?" to "who am I if I don\'t?" — the most powerful form of sustainable behavior change.',
      },
    ];
  }

  // General / fallback — still more specific than before
  const phase1Actions = hasBlocker
    ? [
        `Do 15 minutes of the smallest possible action toward "${title}" right now`,
        'Identify the one thing blocking you and write one concrete counter-action',
        'Remove one obstacle from your environment before tomorrow',
      ]
    : [
        `Research and write down the #1 most effective daily action for achieving "${title}"`,
        'Identify your 3 most important resources: best book, best course, best mentor in this area',
        'Block 30 minutes in your calendar for tomorrow\'s focused execution session',
      ];
  return [
    {
      dayRange: 'Days 1–14',
      focus: hasBlocker ? 'Friction Removal & Momentum Building' : 'Foundation & Direction Clarity',
      dailyActions: phase1Actions,
      progressionMechanism: 'Clarity of direction (knowing the best action) plus daily execution eliminates the most common failure mode: doing effort but not the right effort.',
    },
    {
      dayRange: 'Days 15–30',
      focus: 'Capability Building & Measurable Output',
      dailyActions: [
        'Scale to 30–45 minute focused sessions — produce one concrete deliverable each session',
        'Find a mentor, community, or accountability partner in your target area',
        'Set a measurable weekly metric to track real progress (not just time spent)',
      ],
      progressionMechanism: 'Moving from "showing up" to "producing output" shifts you from beginner to practitioner — output creates feedback, feedback creates calibration, calibration creates mastery.',
    },
    {
      dayRange: 'Month 2+',
      focus: 'Real-World Application & Compounding Results',
      dailyActions: [
        'Execute 60-min deep work blocks tackling the highest-leverage sub-goals',
        'Share or apply your progress publicly or professionally — social proof accelerates momentum',
        'Review monthly KPIs and adjust your strategy based on what\'s working',
      ],
      progressionMechanism: 'Month 2+ is where exponential returns begin — consistent daily execution from Phases 1 and 2 compounds into results that feel disproportionate to the effort.',
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

export interface SmartDailyPlanItem {
  day: number;
  title: string;
  description: string;
  durationMinutes: number;
  rationale: string;
}

export interface SmartWeeklyFocusItem {
  week: number;
  theme: string;
  keyAction: string;
  successCriteria: string;
}

export interface SmartMonthlyMilestoneItem {
  month: number;
  milestone: string;
  measurableOutput: string;
}

export function buildSmartDailyPlan(title: string, hasBlocker = false): SmartDailyPlanItem[] {
  const domain = inferDomain(title);

  if (domain === 'wealth') {
    return [
      {
        day: 1,
        title: 'Audit income, expenses & spending leaks',
        description: 'Open a spreadsheet or notes app. Categorize all expenses over the last 30 days and calculate your exact monthly net surplus.',
        durationMinutes: 25,
        rationale: 'Knowing your real financial baseline eliminates guesswork and reveals how much capital can be deployed into wealth generation.',
      },
      {
        day: 2,
        title: 'Read 20 pages of foundational wealth literature',
        description: 'Read Chapter 1–3 of "The Millionaire Fastlane" or "The Psychology of Money". Write down 3 core principles on asymmetric upside and cashflow.',
        durationMinutes: 30,
        rationale: 'Upgrading your mental models around leverage and risk prevents wasting time on low-yield traditional advice.',
      },
      {
        day: 3,
        title: 'Map 3 viable side income or business models',
        description: 'List 3 monetization models (e.g. niche digital service, high-ticket consulting, software micro-SaaS) matched to your specific skillset.',
        durationMinutes: 30,
        rationale: 'Directs your attention to tangible customer problems before building or investing money blindly.',
      },
      {
        day: 4,
        title: 'Setup automated savings / growth account',
        description: 'Open a dedicated high-yield account or investment brokerage. Automate a recurring transfer of at least $25–$100 on payday.',
        durationMinutes: 20,
        rationale: 'Automating capital accumulation removes daily willpower friction from wealth preservation.',
      },
      {
        day: 5,
        title: 'Draft a 1-page minimum viable service/product offer',
        description: 'Write out: Who has the pain? What exact result do you promise? What is the pricing and delivery mechanism?',
        durationMinutes: 40,
        rationale: 'Turns conceptual ideas into an executable offer you can present to real people.',
      },
      {
        day: 6,
        title: 'Direct outreach & market validation sprint',
        description: 'Reach out to 5 potential clients or interview 2 practitioners in your chosen niche to validate real demand.',
        durationMinutes: 45,
        rationale: 'Real market feedback gives instant signal on whether your idea has paying viability.',
      },
      {
        day: 7,
        title: 'Weekly financial recap & Week 2 execution roadmap',
        description: 'Log all milestones completed this week, calculate savings/revenue generated, and plan Week 2 outreach targets.',
        durationMinutes: 20,
        rationale: 'Consolidates habit momentum and ensures you enter Week 2 with zero startup hesitation.',
      },
    ];
  }

  if (domain === 'fitness') {
    return [
      {
        day: 1,
        title: 'Baseline fitness test & hydration protocol',
        description: 'Perform a 15-minute mobility and bodyweight benchmark (pushups, bodyweight squats, plank hold). Drink at least 2.5L water.',
        durationMinutes: 20,
        rationale: 'Establishes your day-zero physical metric so progressive overload can be calibrated accurately.',
      },
      {
        day: 2,
        title: 'Calculate macros & setup food logging',
        description: 'Determine your daily target calories and set protein to 1.6g–2.0g per kg of bodyweight in a tracking app.',
        durationMinutes: 25,
        rationale: 'Dietary intake accounts for 80% of physique changes; tracking removes emotional eating bias.',
      },
      {
        day: 3,
        title: 'Full-body strength session A (Foundation)',
        description: 'Execute 3 sets of compound movements (squat/hinge/push/pull) with controlled cadence and proper breathing.',
        durationMinutes: 40,
        rationale: 'Stimulates muscle protein synthesis and reinforces neuromuscular motor patterns.',
      },
      {
        day: 4,
        title: 'Active recovery walk & meal prep 2 days ahead',
        description: 'Walk 30 minutes outdoors to boost lymphatic drainage and cook protein sources for the next 48 hours.',
        durationMinutes: 35,
        rationale: 'Pre-cooked nutrition prevents impulse fast-food decisions when willpower is depleted.',
      },
      {
        day: 5,
        title: 'Full-body strength session B (Overload)',
        description: 'Execute second strength session focusing on opposing muscle groups. Strive for 1 extra rep per set compared to Session A.',
        durationMinutes: 45,
        rationale: 'Progressive overload signals the central nervous system and muscles to adapt and grow stronger.',
      },
      {
        day: 6,
        title: 'Cardiovascular conditioning & mobility flow',
        description: '20 minutes of steady-state Zone 2 cardio (incline walking/cycling) followed by 10 minutes hamstring and hip flexor stretches.',
        durationMinutes: 30,
        rationale: 'Zone 2 cardio improves mitochondrial density, expediting workout recovery throughout the week.',
      },
      {
        day: 7,
        title: 'Weekly body check-in & training schedule lock-in',
        description: 'Take progress photos, record body weight, note energy levels, and schedule next week workout slots on your calendar.',
        durationMinutes: 20,
        rationale: 'Visual and metric feedback cements commitment and ensures next week workouts are non-negotiable.',
      },
    ];
  }

  if (domain === 'skill') {
    return [
      {
        day: 1,
        title: 'Setup dedicated learning workspace & core curriculum',
        description: 'Install required software/tools. Choose one authoritative book, course, or syllabus and complete Chapter 1.',
        durationMinutes: 30,
        rationale: 'Eliminating environmental friction guarantees you start tomorrow study block immediately.',
      },
      {
        day: 2,
        title: 'Build your first hands-on prototype / practice exercise',
        description: 'Apply Chapter 1 concepts by building a small standalone exercise completely from scratch without copy-pasting.',
        durationMinutes: 35,
        rationale: 'Immediate practical application transfers information from short-term memory to procedural mastery.',
      },
      {
        day: 3,
        title: 'Deliberate practice sprint on core challenging concept',
        description: 'Identify the most confusing concept from Day 2. Spend 35 focused minutes drilling only that specific mechanism.',
        durationMinutes: 35,
        rationale: 'Targeting your skill frontier prevents comfortable plateauing and sparks genuine cognitive growth.',
      },
      {
        day: 4,
        title: 'Independent problem solving without tutorials',
        description: 'Solve a challenge problem or build a mini-feature completely without documentation or AI assistance for 30 minutes.',
        durationMinutes: 40,
        rationale: 'Struggle and retrieval practice strengthen neural connections far deeper than passive reading.',
      },
      {
        day: 5,
        title: 'Begin capstone portfolio project',
        description: 'Outline and scaffold an ambitious real-world project that demonstrates end-to-end competency in this skill.',
        durationMinutes: 45,
        rationale: 'Real portfolio artifacts provide tangible proof of skill to clients, employers, and yourself.',
      },
      {
        day: 6,
        title: 'Refactor code / review work with professional standards',
        description: 'Review your Day 5 progress against industry best practices. Clean up architecture, formatting, and edge cases.',
        durationMinutes: 35,
        rationale: 'Instills professional rigor and high standards into your daily execution habit.',
      },
      {
        day: 7,
        title: 'Document learnings & synthesize weekly retrospective',
        description: 'Write a 1-page summary of everything mastered this week and outline the core technical milestones for Week 2.',
        durationMinutes: 20,
        rationale: 'Feynman technique: teaching or writing your learnings cements deep conceptual understanding.',
      },
    ];
  }

  if (domain === 'habit') {
    return [
      {
        day: 1,
        title: 'Analyze habit cues & install environmental friction',
        description: 'Identify the exact trigger, time, and emotional state preceding your bad habit. Put physical barriers in place.',
        durationMinutes: 20,
        rationale: 'Environmental design outperforms willpower every single time — making bad habits difficult breaks automatic loops.',
      },
      {
        day: 2,
        title: '2-minute rule activation protocol',
        description: 'Execute the new habit for literally 2 minutes directly after a fixed daily routine (e.g. right after morning water).',
        durationMinutes: 15,
        rationale: 'Shrinking activation energy to near-zero prevents mental resistance and guarantees compliance.',
      },
      {
        day: 3,
        title: 'Focus isolation sprint in clean environment',
        description: 'Execute standard habit session with phone powered off in another room. Note any mental urge to distract yourself.',
        durationMinutes: 25,
        rationale: 'Experiencing deep focus without digital stimulation rewires dopamine sensitivity.',
      },
      {
        day: 4,
        title: 'Mindset journal: urge surfing & identity reinforcement',
        description: 'When temptation strikes, write down the sensation for 5 minutes without reacting. Confirm your new identity statement.',
        durationMinutes: 15,
        rationale: 'Urges peak and dissipate within 10 minutes; observing them neutrally eliminates panic and relapses.',
      },
      {
        day: 5,
        title: 'Standard habit execution with zero negotiation',
        description: 'Complete the scheduled habit at the exact time planned with zero mental debate or delay.',
        durationMinutes: 30,
        rationale: 'Eliminating the negotiation window builds internal self-trust and discipline.',
      },
      {
        day: 6,
        title: 'Emergency fallback drill for high-stress days',
        description: 'Define and practice your 5-minute "chaos version" habit so you never break the streak even on crisis days.',
        durationMinutes: 15,
        rationale: 'Knowing you have an emergency minimum prevents the "all-or-nothing" mental trap after a hectic day.',
      },
      {
        day: 7,
        title: '7-day streak celebration & Week 2 anchor check',
        description: 'Review your flawless or near-flawless week, celebrate identity transformation, and set Week 2 targets.',
        durationMinutes: 15,
        rationale: 'Positive dopamine reinforcement hardwires the brain to protect the streak moving forward.',
      },
    ];
  }

  // General / Default
  return [
    {
      day: 1,
      title: `Define the 30-day target deliverable for "${title}"`,
      description: 'Write down what success looks like in measurable numbers. Gather all necessary tools, books, and resources.',
      durationMinutes: 25,
      rationale: 'Absolute clarity on the target eliminates ambiguity and hesitation before beginning daily work.',
    },
    {
      day: 2,
      title: 'Execute first 25-minute deliberate work block',
      description: 'Complete the first foundational step without multitasking, browsing tabs, or phone interruptions.',
      durationMinutes: 25,
      rationale: 'Starting is the hardest part; completing Day 2 proves to your subconscious that progress is actively underway.',
    },
    {
      day: 3,
      title: 'Identify & eliminate the primary bottleneck',
      description: 'Identify the single friction point that caused hesitation yesterday. Fix it or restructure your routine.',
      durationMinutes: 30,
      rationale: 'Smoothing the process early prevents small irritations from ballooning into procrastination.',
    },
    {
      day: 4,
      title: 'Produce first tangible draft / artifact',
      description: 'Work for 35 minutes to produce a physical, digital, or measurable deliverable you can point to.',
      durationMinutes: 35,
      rationale: 'Tangible deliverables create momentum that abstract planning can never replicate.',
    },
    {
      day: 5,
      title: 'Expand execution depth to 40 minutes',
      description: 'Push deliberate practice duration to 40 minutes and tackle the next sequential component of the goal.',
      durationMinutes: 40,
      rationale: 'Gradually expanding deep work capacity builds mental stamina without inducing burnout.',
    },
    {
      day: 6,
      title: 'Critique and refine against benchmark standards',
      description: 'Compare your progress against a high-performing example in this domain. Polish and fix weak spots.',
      durationMinutes: 30,
      rationale: 'Self-correction elevates the quality of your output toward genuine mastery.',
    },
    {
      day: 7,
      title: 'Weekly output review & Week 2 goal sprint setup',
      description: 'Log everything completed, celebrate streak consistency, and schedule your exact time slots for Week 2.',
      durationMinutes: 20,
      rationale: 'Weekly retrospectives ensure continuous adaptation and perpetual forward velocity.',
    },
  ];
}

export function buildSmartWeeklyFocus(title: string): SmartWeeklyFocusItem[] {
  const domain = inferDomain(title);

  if (domain === 'wealth') {
    return [
      {
        week: 1,
        theme: 'Financial Baseline & Spending Leak Removal',
        keyAction: 'Complete full expense audit, automate emergency savings transfer, and read 2 foundational wealth chapters.',
        successCriteria: '100% daily financial tracking rate + zero unbudgeted impulse purchases.',
      },
      {
        week: 2,
        theme: 'High-Upside Skill & Income Idea Validation',
        keyAction: 'Research and write 3 potential business/side-income proposals; conduct 5 market validation inquiries.',
        successCriteria: 'At least 1 validated business idea or freelance offering with clear customer demand.',
      },
      {
        week: 3,
        theme: 'Minimum Viable Offer & Customer Acquisition',
        keyAction: 'Publish or pitch your offer to real prospects; set up scalable payment/investment infrastructure.',
        successCriteria: 'First proposal delivered or first automated investment tranche executed.',
      },
      {
        week: 4,
        theme: 'Cashflow Systems & Compounding Infrastructure',
        keyAction: 'Consolidate earnings, optimize profit margins, and review ROI of time invested versus revenue potential.',
        successCriteria: 'Initial revenue logged or 15%+ net monthly income allocated to compounding assets.',
      },
    ];
  }

  if (domain === 'fitness') {
    return [
      {
        week: 1,
        theme: 'Habit Anchor & Movement Baseline',
        keyAction: 'Complete 3 scheduled training sessions + log daily nutrition and hydration with zero skipped days.',
        successCriteria: '100% adherence to workout schedule and 2L+ daily water intake.',
      },
      {
        week: 2,
        theme: 'Progressive Overload & Calorie Calibration',
        keyAction: 'Increase training resistance/weights by 5% and hit daily protein target (1.6g/kg) on at least 6 days.',
        successCriteria: 'Weight/rep increases logged across all primary compound lifts.',
      },
      {
        week: 3,
        theme: 'Recovery Optimization & Sleep Rigor',
        keyAction: 'Enforce strict 10:30pm sleep schedule; integrate 2 Zone 2 active recovery walks and mobility sessions.',
        successCriteria: 'Average 7.5+ hours of sleep nightly with reduced muscle soreness.',
      },
      {
        week: 4,
        theme: 'Body Composition Checkpoint & Phase 2 Ramp',
        keyAction: 'Take progress photos, record tape measurements, and design the next 4-week progressive training block.',
        successCriteria: 'Measurable improvement in body measurements or athletic endurance benchmark.',
      },
    ];
  }

  if (domain === 'skill') {
    return [
      {
        week: 1,
        theme: 'Fundamentals & Syntax Foundation',
        keyAction: 'Complete core curriculum modules 1–3 and build 3 small hands-on code/content exercises.',
        successCriteria: 'All exercises running or completed independently without tutorial hand-holding.',
      },
      {
        week: 2,
        theme: 'Problem Solving & Deep Practice',
        keyAction: 'Tackle intermediate challenge problems and debug errors from memory to build mental models.',
        successCriteria: 'Solved at least 3 non-trivial challenges without consulting solution guides.',
      },
      {
        week: 3,
        theme: 'Capstone Prototype Construction',
        keyAction: 'Build and scaffold an end-to-end working project solving a practical real-world problem.',
        successCriteria: 'Functional working prototype deployed or demonstrable locally.',
      },
      {
        week: 4,
        theme: 'Polish, Code Quality & Public Shipping',
        keyAction: 'Refactor prototype to professional standards, write documentation, and share publicly.',
        successCriteria: 'Public repository, published portfolio piece, or demo video shared with peers.',
      },
    ];
  }

  return [
    {
      week: 1,
      theme: 'Foundation & Habit Architecture',
      keyAction: 'Establish daily execution ritual, remove environmental friction, and log 7 consecutive sessions.',
      successCriteria: '7 consecutive days logged with zero multi-day lapses.',
    },
    {
      week: 2,
      theme: 'Volume & Intensity Scale',
      keyAction: 'Ramp focus sessions from 20 to 35 minutes and produce intermediate deliverables.',
      successCriteria: 'First comprehensive project draft or capability milestone completed.',
    },
    {
      week: 3,
      theme: 'Quality Elevation & Refinement',
      keyAction: 'Critique and polish deliverables against high benchmark standards; fix weak areas.',
      successCriteria: 'Substantial, noticeable quality leap in output compared to Week 1.',
    },
    {
      week: 4,
      theme: 'Milestone Delivery & Consolidation',
      keyAction: 'Complete Phase 1 deliverable, review month-one progress, and plan next horizon targets.',
      successCriteria: 'Month 1 checkpoint metric achieved and confirmed.',
    },
  ];
}

export function buildSmartMonthlyMilestones(title: string): SmartMonthlyMilestoneItem[] {
  const domain = inferDomain(title);

  if (domain === 'wealth') {
    return [
      {
        month: 1,
        milestone: 'Financial Foundation & Cash Leakage Neutralized',
        measurableOutput: '100% daily financial accountability logged + emergency buffer funded + first $50+ invested.',
      },
      {
        month: 2,
        milestone: 'First Scalable Side Income Experiment Launched',
        measurableOutput: 'Minimum viable product/service live + initial customer outreach completed.',
      },
      {
        month: 3,
        milestone: 'Predictable Surplus & Recurring Revenue Engine',
        measurableOutput: 'First $500–$1,000+ side income earned or 20% recurring savings rate automated into growth assets.',
      },
      {
        month: 6,
        milestone: 'Compounding Cashflow & Scaled Asset Portfolio',
        measurableOutput: 'Multiple diversified capital streams active + 3–6 months resilience runway fully secured.',
      },
    ];
  }

  if (domain === 'fitness') {
    return [
      {
        month: 1,
        milestone: 'Consistency Lock-in & Habit Automaticity',
        measurableOutput: '20+ structured workout sessions completed + 100% adherence to daily protein target.',
      },
      {
        month: 2,
        milestone: 'Neuromuscular Strength & Conditioning Lift',
        measurableOutput: '10–15% measurable strength increase on compound movements + visible waistline reduction.',
      },
      {
        month: 3,
        milestone: 'Physical Transformation & Metabolic Shift',
        measurableOutput: 'Body composition change confirmed by side-by-side progress photos and athletic benchmark PRs.',
      },
      {
        month: 6,
        milestone: 'Peak Physique & Lifestyle Identity Integration',
        measurableOutput: 'Target body composition achieved and effortlessly maintained as an automatic daily lifestyle.',
      },
    ];
  }

  if (domain === 'skill') {
    return [
      {
        month: 1,
        milestone: 'Syntax & Core Competency Mastery',
        measurableOutput: 'Fundamentals finished + 3 mini-projects built and published to portfolio.',
      },
      {
        month: 2,
        milestone: 'Full-Scale Production Project Delivered',
        measurableOutput: '1 comprehensive, production-grade application or artifact built and demonstrated.',
      },
      {
        month: 3,
        milestone: 'Specialized Advanced Execution',
        measurableOutput: 'Advanced domain mechanics solved independently + public technical case study published.',
      },
      {
        month: 6,
        milestone: 'Market-Facing Leverage & Monetized Skill',
        measurableOutput: 'Professional-grade portfolio established / commercial freelance client secured / promotion earned.',
      },
    ];
  }

  return [
    {
      month: 1,
      monthName: 'Month 1',
      milestone: 'Foundation Phase Complete',
      measurableOutput: '30 consecutive days of habit execution + first core project deliverable completed.',
    } as any,
    {
      month: 2,
      milestone: 'Capability Depth & Workload Scaling',
      measurableOutput: 'Doubled deliberate practice volume sustained with measurable output checkpoints achieved.',
    },
    {
      month: 3,
      milestone: 'Core Objective Breakthrough',
      measurableOutput: 'Major milestone deliverables delivered and operational consistency fully locked in.',
    },
    {
      month: 6,
      milestone: 'Long-Term Compounding & Durable Mastery',
      measurableOutput: 'Sustainable high-leverage execution with permanent lifestyle integration.',
    },
  ];
}

