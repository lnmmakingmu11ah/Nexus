/**
 * blueprintNormalizer.ts — Deterministic post-processing for AI blueprints.
 * Ensures pillar coverage, links setbacks to goals, and improves goal matching.
 */

import { CategoryKey, CategoryScores } from '../types';

export const ALL_PILLARS: CategoryKey[] = ['health', 'smarts', 'selfCare', 'happiness', 'spiritual'];

export interface IntakeCoverage {
  profile: { name: boolean; location: boolean; work: boolean; relationships: boolean };
  lifeGoals: boolean;
  pillars: Record<CategoryKey, boolean>;
  setbacks: boolean;
  dailyCapacity: boolean;
  userTurnCount: number;
  lastUserTopic: string;
  uncoveredPillars: CategoryKey[];
  nextPriority: 'profile' | 'lifeGoals' | 'pillars' | 'setbacks' | 'capacity' | 'complete';
}

const PILLAR_KEYWORDS: Record<CategoryKey, RegExp[]> = {
  health: [/\b(fitness|workout|gym|exercise|sleep|nutrition|diet|weight|body|physical|run|walk|health)\b/i],
  smarts: [/\b(learn|study|career|skill|read|code|cyber|job|work|degree|certif|intelligence|cognitive|smarts)\b/i],
  selfCare: [/\b(self.?care|rest|routine|stress|burnout|hydrat|groom|skincare|relax|recover)\b/i],
  happiness: [/\b(happy|joy|fun|hobby|relationship|friend|family|social|love|fulfill|content)\b/i],
  spiritual: [/\b(spirit|meditat|gratitude|purpose|values|faith|peace|mindful|meaning|soul|inner)\b/i],
};

const PROFILE_KEYWORDS = {
  location: /\b(live in|from|city|country|based in|located|town|state|region|africa|europe|america|asia)\b/i,
  work: /\b(work|job|career|student|studying|engineer|developer|freelance|employ|profession|company|business)\b/i,
  relationships: /\b(wife|husband|partner|girlfriend|boyfriend|friend|family|parent|kid|child|married|single|mom|dad)\b/i,
};

const SETBACK_KEYWORDS =
  /\b(procrastinat|addict|struggle|fail|quit|stop|block|lazy|overwhelm|anxiet|depress|distract|habit|can't|cannot|used to|pattern|relapse|avoid)\b/i;

const LIFE_GOAL_KEYWORDS =
  /\b(want to|dream|goal|life|future|become|achieve|legacy|vision|aspir|someday|always wanted|my plan|build a|master|learn)\b/i;

/** Foundational habits auto-added when a pillar was never discussed */
export const PILLAR_DEFAULT_GOALS: Record<
  CategoryKey,
  { name: string; description: string; reminderTime: string }
> = {
  health: {
    name: 'Daily Movement (20 min walk)',
    description: 'A gentle daily walk to build physical consistency — NEXUS added this because health was not discussed.',
    reminderTime: '07:30',
  },
  smarts: {
    name: 'Daily Learning (10 pages or 20 min)',
    description: 'Focused reading or study to keep your mind sharp — NEXUS added this because learning goals were not discussed.',
    reminderTime: '08:30',
  },
  selfCare: {
    name: 'Sleep & Recovery Target (7 hrs)',
    description: 'Protect 7 hours of sleep as a non-negotiable self-care anchor — NEXUS added this because rest was not discussed.',
    reminderTime: '22:00',
  },
  happiness: {
    name: 'One Joyful Thing Today',
    description: 'Do one thing purely for fun or connection each day — NEXUS added this because happiness/joy was not discussed.',
    reminderTime: '18:00',
  },
  spiritual: {
    name: '5-Min Gratitude or Stillness',
    description: 'A brief gratitude note or quiet moment to connect with purpose — NEXUS added this because spirituality was not discussed.',
    reminderTime: '21:00',
  },
};

export function analyzeIntakeCoverage(
  transcript: { sender: 'user' | 'ai'; text: string }[]
): IntakeCoverage {
  const userMessages = transcript.filter((m) => m.sender === 'user').map((m) => m.text);
  const allUserText = userMessages.join(' ').toLowerCase();
  const lastUser = userMessages[userMessages.length - 1] || '';

  const pillars = {} as Record<CategoryKey, boolean>;
  for (const key of ALL_PILLARS) {
    pillars[key] = PILLAR_KEYWORDS[key].some((re) => re.test(allUserText));
  }

  const profile = {
    name: userMessages.length > 0 && userMessages[0].length < 40,
    location: PROFILE_KEYWORDS.location.test(allUserText),
    work: PROFILE_KEYWORDS.work.test(allUserText),
    relationships: PROFILE_KEYWORDS.relationships.test(allUserText),
  };

  const uncoveredPillars = ALL_PILLARS.filter((p) => !pillars[p]);

  let nextPriority: IntakeCoverage['nextPriority'] = 'profile';
  if (!profile.name || (!profile.location && !profile.work && userMessages.length < 2)) {
    nextPriority = 'profile';
  } else if (!LIFE_GOAL_KEYWORDS.test(allUserText) && userMessages.length < 4) {
    nextPriority = 'lifeGoals';
  } else if (uncoveredPillars.length > 0 && userMessages.length < 8) {
    nextPriority = 'pillars';
  } else if (!SETBACK_KEYWORDS.test(allUserText) && userMessages.length < 10) {
    nextPriority = 'setbacks';
  } else if (
    !/\b(minute|hour|time|morning|night|evening|schedule|daily|capacity)\b/i.test(allUserText) &&
    userMessages.length < 12
  ) {
    nextPriority = 'capacity';
  } else {
    nextPriority = 'complete';
  }

  return {
    profile,
    lifeGoals: LIFE_GOAL_KEYWORDS.test(allUserText),
    pillars,
    setbacks: SETBACK_KEYWORDS.test(allUserText),
    dailyCapacity: /\b(minute|hour|time|morning|night|daily)\b/i.test(allUserText),
    userTurnCount: userMessages.length,
    lastUserTopic: lastUser.slice(0, 120),
    uncoveredPillars,
    nextPriority,
  };
}

export function buildIntakeCoverageBlock(coverage: IntakeCoverage): string {
  const missingProfile = [
    !coverage.profile.location && 'where they live (city/country)',
    !coverage.profile.work && 'what they do (work/study)',
    !coverage.profile.relationships && 'key relationships (optional, light touch)',
  ].filter(Boolean);

  return `
INTAKE STATUS (follow this — do NOT repeat covered topics):
- User turns so far: ${coverage.userTurnCount}
- Last thing they said (STAY ON THIS TOPIC): "${coverage.lastUserTopic || 'none yet'}"
- Profile collected: name=${coverage.profile.name}, location=${coverage.profile.location}, work=${coverage.profile.work}, relationships=${coverage.profile.relationships}
- Life goals discussed: ${coverage.lifeGoals ? 'YES' : 'NOT YET — ask about their LIFE vision, not yearly targets'}
- Pillar coverage: health=${coverage.pillars.health}, smarts=${coverage.pillars.smarts}, selfCare=${coverage.pillars.selfCare}, happiness=${coverage.pillars.happiness}, spiritual=${coverage.pillars.spiritual}
- Setbacks/struggles discussed: ${coverage.setbacks ? 'YES' : 'NOT YET'}
- Daily time capacity: ${coverage.dailyCapacity ? 'YES' : 'NOT YET'}
- NEXT PRIORITY THIS TURN: ${coverage.nextPriority}
${missingProfile.length ? `- Still need profile: ${missingProfile.join(', ')}` : ''}
${coverage.uncoveredPillars.length ? `- Pillars not yet touched: ${coverage.uncoveredPillars.join(', ')} — weave ONE in naturally when relevant` : ''}
`.trim();
}

/** Fuzzy match a goal name reference to an actual goal in the plan */
export function matchGoalByName<T extends { name: string; id?: string }>(
  refName: string,
  goals: T[]
): T | undefined {
  if (!refName || !goals.length) return undefined;
  const ref = refName.toLowerCase().trim();

  // Exact match
  const exact = goals.find((g) => g.name.toLowerCase() === ref);
  if (exact) return exact;

  // Contains match (both directions)
  const contains = goals.find(
    (g) => g.name.toLowerCase().includes(ref) || ref.includes(g.name.toLowerCase())
  );
  if (contains) return contains;

  // Word overlap score
  const refWords = ref.split(/\s+/).filter((w) => w.length > 3);
  let best: { goal: T; score: number } | null = null;
  for (const g of goals) {
    const gWords = g.name.toLowerCase().split(/\s+/);
    const score = refWords.filter((w) => gWords.some((gw) => gw.includes(w) || w.includes(gw))).length;
    if (score > 0 && (!best || score > best.score)) best = { goal: g, score };
  }
  return best && best.score >= 1 ? best.goal : undefined;
}

export interface NormalizedRoadblock {
  roadblock: string;
  solution: string;
  affectedGoals?: string[];
}

export interface NormalizedPlannedGoal {
  name: string;
  description: string;
  category: CategoryKey;
  reminderTime?: string;
  basePoints: number;
  targetFrequency: 'daily' | 'weekly';
  effects?: { category: CategoryKey; weight: number }[];
  autoAdded?: boolean;
  autoAddedReason?: string;
  timelineRange?: { minDays: number; maxDays: number };
  timelineSummary?: string;
  timelineMap?: string[];
  timelinePhase1?: string;
  timelinePhase2?: string;
  timelinePhase3?: string;
  estimatedDaysToMastery?: number;
  linkedGoalName?: string;
  chanceOfAchievement?: number;
  willpowerStrain?: string;
  goalScope?: string;
  [key: string]: unknown;
}

export function ensurePillarCoverage(
  plannedGoals: NormalizedPlannedGoal[],
  coverage?: IntakeCoverage
): NormalizedPlannedGoal[] {
  const result = [...plannedGoals];
  const present = new Set(result.map((g) => g.category));

  for (const pillar of ALL_PILLARS) {
    if (present.has(pillar)) continue;
    const def = PILLAR_DEFAULT_GOALS[pillar];
    const reason =
      coverage && !coverage.pillars[pillar]
        ? `You didn't mention ${pillar === 'selfCare' ? 'self-care' : pillar === 'smarts' ? 'learning/career' : pillar} during our chat — I added a small starter habit so all areas of your life stay balanced.`
        : `Added to ensure balanced growth across all five life pillars.`;

    result.push({
      name: def.name,
      description: def.description,
      category: pillar,
      reminderTime: def.reminderTime,
      basePoints: 4,
      targetFrequency: 'daily',
      effects: [{ category: pillar, weight: 3 }],
      autoAdded: true,
      autoAddedReason: reason,
      goalScope: 'lifetime',
      chanceOfAchievement: 75,
      willpowerStrain: 'Low',
    });
  }
  return result;
}

export function linkRoadblocksToGoals(
  roadblocks: NormalizedRoadblock[],
  goals: { name: string }[]
): NormalizedRoadblock[] {
  return roadblocks.map((rb) => {
    if (rb.affectedGoals?.length) return rb;
    const rbLower = rb.roadblock.toLowerCase();
    const matched = goals
      .filter((g) => {
        const gLower = g.name.toLowerCase();
        const gWords = gLower.split(/\s+/).filter((w) => w.length > 3);
        return gWords.some((w) => rbLower.includes(w)) || rbLower.split(/\s+/).some((w) => w.length > 4 && gLower.includes(w));
      })
      .map((g) => g.name)
      .slice(0, 3);
    return { ...rb, affectedGoals: matched.length ? matched : goals.slice(0, 2).map((g) => g.name) };
  });
}

export function calibrateBaselines(
  baselines: Partial<CategoryScores> | undefined,
  coverage: IntakeCoverage
): CategoryScores {
  const defaults: CategoryScores = { health: 45, spiritual: 45, smarts: 45, selfCare: 45, happiness: 45 };
  const result = { ...defaults, ...baselines } as CategoryScores;

  for (const pillar of ALL_PILLARS) {
    if (!coverage.pillars[pillar]) {
      result[pillar] = Math.min(result[pillar] ?? 45, 30);
    }
  }
  return result;
}

export function extractGoalHintsFromTranscript(
  transcript: { sender: 'user' | 'ai'; text: string }[]
): { category: CategoryKey; goalType: string }[] {
  const userText = transcript
    .filter((m) => m.sender === 'user')
    .map((m) => m.text)
    .join(' ');
  const hints: { category: CategoryKey; goalType: string }[] = [];

  const patterns: { re: RegExp; category: CategoryKey }[] = [
    { re: /\b(cybersecurity|cyber security|learn to code|programming|study|degree|certification|career)\b/i, category: 'smarts' },
    { re: /\b(gym|workout|run|fitness|lose weight|muscle|exercise)\b/i, category: 'health' },
    { re: /\b(meditat|spiritual|gratitude|purpose|faith)\b/i, category: 'spiritual' },
    { re: /\b(sleep|rest|self.?care|stress|burnout)\b/i, category: 'selfCare' },
    { re: /\b(happy|hobby|relationship|social|fun)\b/i, category: 'happiness' },
  ];

  for (const { re, category } of patterns) {
    const m = userText.match(re);
    if (m) hints.push({ category, goalType: m[0] });
  }

  if (hints.length === 0 && userText.length > 20) {
    hints.push({ category: 'smarts', goalType: userText.slice(0, 80) });
  }
  return hints.slice(0, 4);
}

export function normalizeBlueprint(
  blueprint: Record<string, unknown>,
  transcript: { sender: 'user' | 'ai'; text: string }[]
): Record<string, unknown> {
  const coverage = analyzeIntakeCoverage(transcript);
  let plannedGoals = (Array.isArray(blueprint.plannedGoals) ? blueprint.plannedGoals : []) as NormalizedPlannedGoal[];

  plannedGoals = plannedGoals
    .filter((g) => g && g.name && ALL_PILLARS.includes(g.category as CategoryKey))
    .map((g) => ({
      ...g,
      goalScope: g.goalScope || 'lifetime',
      targetFrequency: g.targetFrequency || 'daily',
      basePoints: g.basePoints || 5,
      effects: g.effects || [{ category: g.category, weight: 4 }],
    }));

  plannedGoals = ensurePillarCoverage(plannedGoals, coverage);

  const roadblocks = linkRoadblocksToGoals(
    (Array.isArray(blueprint.roadblocks) ? blueprint.roadblocks : []) as NormalizedRoadblock[],
    plannedGoals
  );

  const categoryBaselines = calibrateBaselines(
    blueprint.categoryBaselines as Partial<CategoryScores>,
    coverage
  );

  const autoAddedNotes = plannedGoals
    .filter((g) => g.autoAdded)
    .map((g) => `${g.name}: ${g.autoAddedReason}`)
    .join(' ');

  return {
    ...blueprint,
    plannedGoals,
    roadblocks,
    categoryBaselines,
    pillarAutoFillNotes: autoAddedNotes || undefined,
    intakeSummary: {
      profileComplete: coverage.profile.name && (coverage.profile.location || coverage.profile.work),
      lifeGoalsDiscussed: coverage.lifeGoals,
      setbacksDiscussed: coverage.setbacks,
      pillarsCovered: coverage.pillars,
    },
  };
}
