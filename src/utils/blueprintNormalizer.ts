/**
 * blueprintNormalizer.ts — Deterministic post-processing for AI blueprints.
 * Ensures pillar coverage, links setbacks to goals, and improves goal matching.
 */

import { CategoryKey, CategoryScores, UserIdentity } from '../types';
import { STRUGGLING_CAP } from './dailyCap';
import { heuristicIdentityFromTranscript, mergeIdentity } from './userIdentity';

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
  transcript: { sender: 'user' | 'ai'; text: string }[] = [],
  identity?: UserIdentity
): IntakeCoverage {
  const safeTranscript = Array.isArray(transcript) ? transcript : [];
  const userMessages = safeTranscript.filter((m) => m && m.sender === 'user').map((m) => m.text || '');
  const lastUser = userMessages[userMessages.length - 1] || '';
  const id = mergeIdentity(identity, heuristicIdentityFromTranscript(safeTranscript, identity));

  const pillars = {} as Record<CategoryKey, boolean>;
  for (const key of ALL_PILLARS) {
    pillars[key] = Boolean(id.pillarNotes?.[key] && String(id.pillarNotes[key]).trim().length > 2);
  }

  const profile = {
    name: Boolean(id.name),
    location: Boolean(id.city || id.country),
    work: Boolean(id.work),
    relationships: Boolean(id.relationships),
  };

  const lifeGoals = (id.lifeGoals || []).length > 0;
  const setbacks = (id.setbacks || []).length > 0;
  const dailyCapacity = Boolean(id.dailyCapacity || id.preferredTime);
  const uncoveredPillars = ALL_PILLARS.filter((p) => !pillars[p]);

  let nextPriority: IntakeCoverage['nextPriority'] = 'profile';
  if (!profile.name || (!profile.location && !profile.work)) {
    nextPriority = 'profile';
  } else if (!lifeGoals) {
    nextPriority = 'lifeGoals';
  } else if (uncoveredPillars.length > 2) {
    nextPriority = 'pillars';
  } else if (!setbacks) {
    nextPriority = 'setbacks';
  } else if (!dailyCapacity) {
    nextPriority = 'capacity';
  } else {
    nextPriority = 'complete';
  }

  // Extraction can lag a turn; don't stall the funnel forever if they already talked a lot.
  if (nextPriority !== 'complete' && userMessages.length >= 14) nextPriority = 'complete';

  return {
    profile,
    lifeGoals,
    pillars,
    setbacks,
    dailyCapacity,
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
INTAKE STATUS (follow this — do NOT repeat covered topics. Coverage comes from structured identity, not keyword matching):
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
      targetFrequency: 'weekly',
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

/** Extra pillar fillers become weekly so a new plan never dumps 8 daily habits. */
export function capDailyPlannedGoals(goals: NormalizedPlannedGoal[], maxDaily = STRUGGLING_CAP): NormalizedPlannedGoal[] {
  const daily = goals.filter((g) => (g.targetFrequency || 'daily') !== 'weekly');
  const weekly = goals.filter((g) => g.targetFrequency === 'weekly');
  if (daily.length <= maxDaily) return goals;

  const keep = daily.slice(0, maxDaily);
  const overflow = daily.slice(maxDaily).map((g) => ({
    ...g,
    targetFrequency: 'weekly' as const,
    autoAdded: true,
    autoAddedReason: `${g.autoAddedReason || 'Parked as weekly'} — daily list stays at ${maxDaily} so a rough week cannot dump eight habits.`.trim(),
  }));
  return [...keep, ...overflow, ...weekly];
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
  transcript: { sender: 'user' | 'ai'; text: string }[] = [],
  identity?: UserIdentity
): { category: CategoryKey; goalType: string }[] {
  const safe = Array.isArray(transcript) ? transcript : [];
  const substantial = safe
    .filter((m) => m && m.sender === 'user')
    .map((m) => (m.text || '').trim())
    .filter((t) => t.length >= 24);
  return substantial.slice(0, 3).map((goalType) => ({ category: 'smarts' as CategoryKey, goalType: goalType.slice(0, 80) }));
}

export function normalizeBlueprint(
  blueprint: Record<string, unknown>,
  transcript: { sender: 'user' | 'ai'; text: string }[] = [],
  identity?: UserIdentity
): Record<string, unknown> {
  const coverage = analyzeIntakeCoverage(transcript, identity);
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
  plannedGoals = capDailyPlannedGoals(plannedGoals, STRUGGLING_CAP);

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
