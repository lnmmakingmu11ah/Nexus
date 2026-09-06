/**
 * blueprintNormalizer.ts — Deterministic post-processing for AI blueprints.
 * Ensures passive category mapping, diagnostic coverage, Phase 1 blocker neutralization,
 * and multi-tier progressive roadmap structure.
 */

import { CategoryKey, CategoryScores, UserIdentity } from '../types';
import { STRUGGLING_CAP } from './dailyCap';
import { heuristicIdentityFromTranscript, mergeIdentity } from './userIdentity';

export const ALL_PILLARS: CategoryKey[] = ['health', 'smarts', 'selfCare', 'happiness', 'spiritual'];

/**
 * Maps any user goal domain (financial, career, technical, wellness, etc.)
 * to a passive tracking category purely for background metrics and chart display.
 */
export function mapToPassiveCategory(
  rawCategory?: string,
  title = '',
  description = ''
): CategoryKey {
  const text = `${rawCategory || ''} ${title} ${description}`.toLowerCase();

  if (ALL_PILLARS.includes(rawCategory as CategoryKey)) {
    return rawCategory as CategoryKey;
  }

  if (/health|physic|body|fitness|workout|gym|run|walk|cardio|lift|muscle|fat loss|weight|diet|nutrition|sleep|stamina/i.test(text)) {
    return 'health';
  }
  if (/spiritual|spirit|purpose|meaning|meditat|mindful|pray|faith|soul|inner peace|gratitude|values|stoic/i.test(text)) {
    return 'spiritual';
  }
  if (/self-?care|rest|recover|burnout|unwind|recharge|boundary|boundaries|hygiene|skincare|mental health/i.test(text)) {
    return 'selfCare';
  }
  if (/happiness|joy|fun|hobby|social|friend|family|relationship|date|dates|art|music|creative|play/i.test(text)) {
    return 'happiness';
  }
  // Default passive monitoring tag for career, money, skills, learning, business, tech, or uncategorized ambitions
  return 'smarts';
}

export interface IntakeCoverage {
  diagnostic: {
    specificGoal: boolean;      // 1. Specific Goal & Scope
    currentBaseline: boolean;   // 2. Current Baseline
    primaryBlocker: boolean;    // 3. Primary Blocker / Setback
    timeCommitment: boolean;    // 4. Time & Resource Commitment
  };
  diagnosticComplete: boolean;

  profile: { name: boolean; location: boolean; work: boolean; relationships: boolean };
  lifeGoals: boolean;
  pillars: Record<CategoryKey, boolean>;
  setbacks: boolean;
  dailyCapacity: boolean;
  userTurnCount: number;
  lastUserTopic: string;
  uncoveredPillars: CategoryKey[];
  nextPriority: 'specificGoal' | 'currentBaseline' | 'primaryBlocker' | 'timeCommitment' | 'profile' | 'lifeGoals' | 'pillars' | 'setbacks' | 'capacity' | 'complete';
}

export function analyzeIntakeCoverage(
  transcript: { sender: 'user' | 'ai'; text: string }[] = [],
  identity?: UserIdentity
): IntakeCoverage {
  const safeTranscript = Array.isArray(transcript) ? transcript : [];
  const userMessages = safeTranscript.filter((m) => m && m.sender === 'user').map((m) => m.text || '');
  const lastUser = userMessages[userMessages.length - 1] || '';
  const userCombinedText = userMessages.join('\n').toLowerCase();
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

  // 1. Specific Goal & Scope
  const hasSpecificGoal = (id.lifeGoals || []).length > 0 ||
    /want to|wanna|goal is|trying to|dream of|become a|build a|lose \d+|make \d+|earn|learn|master|reach/i.test(userCombinedText);

  // 2. Current Baseline
  const hasCurrentBaseline = Boolean(id.currentBaseline) ||
    /starting from|currently at|right now i|baseline|zero savings|starting scratch|beginner|intermediate|advanced|have \d+|no experience/i.test(userCombinedText);

  // 3. Primary Blocker / Setback
  const hasPrimaryBlocker = (id.primaryBlockers || []).length > 0 || (id.setbacks || []).length > 0 ||
    /holding me back|blocker|struggle|lazy|laziness|procrastinat|lack of|poor time|distraction|phone|discipline|focus|burnout|afraid|fear/i.test(userCombinedText);

  // 4. Time & Resource Commitment
  const hasTimeCommitment = Boolean(id.dailyCapacity || id.preferredTime) ||
    /\d+\s*(?:hour|hr|min|minute)s?|commit|hours? a day|hours? per week|every day|weekends/i.test(userCombinedText);

  const diagnosticComplete = hasSpecificGoal && hasCurrentBaseline && hasPrimaryBlocker && hasTimeCommitment;

  const lifeGoals = hasSpecificGoal;
  const setbacks = hasPrimaryBlocker;
  const dailyCapacity = hasTimeCommitment;
  const uncoveredPillars = ALL_PILLARS.filter((p) => !pillars[p]);

  let nextPriority: IntakeCoverage['nextPriority'] = 'specificGoal';
  if (!hasSpecificGoal) {
    nextPriority = 'specificGoal';
  } else if (!hasCurrentBaseline) {
    nextPriority = 'currentBaseline';
  } else if (!hasPrimaryBlocker) {
    nextPriority = 'primaryBlocker';
  } else if (!hasTimeCommitment) {
    nextPriority = 'timeCommitment';
  } else {
    nextPriority = 'complete';
  }


  return {
    diagnostic: {
      specificGoal: hasSpecificGoal,
      currentBaseline: hasCurrentBaseline,
      primaryBlocker: hasPrimaryBlocker,
      timeCommitment: hasTimeCommitment,
    },
    diagnosticComplete,
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
  const d = coverage.diagnostic;
  return `
GOAL SCOUT DIAGNOSTIC INTAKE STATUS:
1. Specific Goal & Scope: ${d.specificGoal ? 'COLLECTED' : 'PENDING (Ask exact outcome/result desired)'}
2. Current Baseline: ${d.currentBaseline ? 'COLLECTED' : 'PENDING (Ask starting state / current level)'}
3. Primary Blocker / Setback: ${d.primaryBlocker ? 'COLLECTED' : 'PENDING (Ask what holds them back / causes failure)'}
4. Time & Resource Commitment: ${d.timeCommitment ? 'COLLECTED' : 'PENDING (Ask daily/weekly hours dedicated)'}

- User messages so far: ${coverage.userTurnCount}
- Last topic user mentioned: "${coverage.lastUserTopic || 'none yet'}"
- NEXT QUESTION PRIORITY: ${coverage.nextPriority === 'complete' ? 'READY TO SYNTHESIZE PLAN (Output <<READY_FOR_PLAN>>)' : coverage.nextPriority}
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
  isBehavioralBlocker?: boolean;
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
  transitionCondition?: string;
  checkpoints?: { period: string; targetOutputMetric: string; description?: string }[];
  microProgression?: { dayRange: string; action: string; enablesNext: string }[];
  progressionRationale?: string;
  estimatedDaysToMastery?: number;
  linkedGoalName?: string;
  chanceOfAchievement?: number;
  willpowerStrain?: string;
  goalScope?: string;
  [key: string]: unknown;
}

/**
 * Passive passthrough. The user's input goals are the ONLY foundation for the roadmap.
 * We do not force or inject unwanted default filler goals.
 */
export function ensurePillarCoverage(
  plannedGoals: NormalizedPlannedGoal[],
  _coverage?: IntakeCoverage
): NormalizedPlannedGoal[] {
  return plannedGoals;
}

/** Caps daily habits so new users aren't overwhelmed on day 1 */
export function capDailyPlannedGoals(goals: NormalizedPlannedGoal[], maxDaily = STRUGGLING_CAP): NormalizedPlannedGoal[] {
  const daily = goals.filter((g) => (g.targetFrequency || 'daily') !== 'weekly');
  const weekly = goals.filter((g) => g.targetFrequency === 'weekly');
  if (daily.length <= maxDaily) return goals;

  const keep = daily.slice(0, maxDaily);
  const overflow = daily.slice(maxDaily).map((g) => ({
    ...g,
    targetFrequency: 'weekly' as const,
    autoAdded: false,
    autoAddedReason: `Scheduled as weekly focus habit to prevent initial overload and preserve execution consistency.`,
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
  _coverage?: IntakeCoverage
): CategoryScores {
  const defaults: CategoryScores = { health: 50, spiritual: 50, smarts: 50, selfCare: 50, happiness: 50 };
  return { ...defaults, ...baselines } as CategoryScores;
}

export function extractGoalHintsFromTranscript(
  transcript: { sender: 'user' | 'ai'; text: string }[] = [],
  _identity?: UserIdentity
): { category: CategoryKey; goalType: string }[] {
  const safe = Array.isArray(transcript) ? transcript : [];
  const substantial = safe
    .filter((m) => m && m.sender === 'user')
    .map((m) => (m.text || '').trim())
    .filter((t) => t.length >= 16);
  return substantial.slice(0, 4).map((goalType) => ({
    category: mapToPassiveCategory(undefined, goalType),
    goalType: goalType.slice(0, 100),
  }));
}

export function ensureRoadblockCoverage(
  roadblocks: NormalizedRoadblock[],
  extractedSetbacks: string[] = [],
  goals: { name: string }[] = []
): NormalizedRoadblock[] {
  const result = [...roadblocks];
  const existingRoadblocksLower = new Set(result.map((r) => (r.roadblock || '').toLowerCase()));

  for (const setback of extractedSetbacks) {
    const sLower = (setback || '').toLowerCase().trim();
    if (!sLower) continue;
    const isAlreadyCovered = Array.from(existingRoadblocksLower).some(
      (r) => r.includes(sLower) || sLower.includes(r)
    );
    if (!isAlreadyCovered) {
      let solution = 'Phase 1 Blocker Neutralization: Deploy low-friction micro-habits (15-30 min) to break inertia and establish daily consistency before ramping volume.';
      let isBehavioralBlocker = false;

      if (/pmo|porn|adult|masturbat/i.test(sLower)) {
        solution = 'Phase 1 Blocker Neutralization: Install digital friction (DNS filters/blockers), remove devices from bedroom, and deploy immediate physical replacement (e.g. 20 pushups or cold reset).';
        isBehavioralBlocker = true;
      } else if (/laziness|lazy|sloth|unmotivated|motivation|discipline|low discipline/i.test(sLower)) {
        solution = 'Phase 1 Blocker Neutralization: 2-minute rule micro-activation. Start with the lowest possible activation energy task daily (15 min maximum) to build momentum without relying on motivation.';
        isBehavioralBlocker = true;
      } else if (/procrastinat|avoidance|delay/i.test(sLower)) {
        solution = "Phase 1 Blocker Neutralization: Single-task 25-minute Pomodoro blocks with clear implementation intentions ('At [time], I sit and write the first sentence').";
        isBehavioralBlocker = true;
      } else if (/phone|screen|doomscroll|social media|distraction|focus|lack of focus/i.test(sLower)) {
        solution = 'Phase 1 Blocker Neutralization: Physical isolation of phone during focus sessions, grayscale mode enabled, and strict 30-minute morning distraction-free window.';
        isBehavioralBlocker = true;
      } else if (/inconsisten|busy|time|poor time management|overwhelm/i.test(sLower)) {
        solution = 'Phase 1 Blocker Neutralization: Anchor the core habit directly after a fixed daily routine, and define an emergency 5-minute minimum version for chaotic days.';
        isBehavioralBlocker = true;
      }

      result.push({
        roadblock: setback,
        solution,
        affectedGoals: goals.slice(0, 2).map((g) => g.name),
        isBehavioralBlocker,
      });
      existingRoadblocksLower.add(sLower);
    }
  }
  return result;
}

export function normalizeBlueprint(
  blueprint: Record<string, unknown>,
  transcript: { sender: 'user' | 'ai'; text: string }[] = [],
  identity?: UserIdentity
): Record<string, unknown> {
  const coverage = analyzeIntakeCoverage(transcript, identity);
  let plannedGoals = (Array.isArray(blueprint.plannedGoals) ? blueprint.plannedGoals : []) as NormalizedPlannedGoal[];

  // NEVER drop user goals. Passively map each goal category for chart/score tracking
  plannedGoals = plannedGoals
    .filter((g) => g && (g.name || g.title))
    .map((g) => {
      const name = String(g.name || g.title || 'Focused Habit');
      const cat = mapToPassiveCategory(g.category as string, name, g.description);
      return {
        ...g,
        name,
        category: cat,
        goalScope: g.goalScope || 'lifetime',
        targetFrequency: g.targetFrequency || 'daily',
        basePoints: g.basePoints || 5,
        effects: Array.isArray(g.effects) && g.effects.length
          ? g.effects.map((effect: any) => ({
              category: mapToPassiveCategory(effect?.category, name, g.description),
              weight: Number(effect?.weight) || 4,
            }))
          : [{ category: cat, weight: 4 }],
      };
    });

  plannedGoals = capDailyPlannedGoals(plannedGoals, STRUGGLING_CAP);

  const allSetbacks = Array.from(
    new Set([
      ...((Array.isArray(blueprint.extractedSetbacks) ? blueprint.extractedSetbacks : []) as string[]),
      ...(identity?.primaryBlockers || []),
      ...(identity?.setbacks || []),
    ])
  );

  let rawRoadblocks = (Array.isArray(blueprint.roadblocks) ? blueprint.roadblocks : []) as NormalizedRoadblock[];
  rawRoadblocks = ensureRoadblockCoverage(rawRoadblocks, allSetbacks, plannedGoals);

  const roadblocks = linkRoadblocksToGoals(
    rawRoadblocks,
    plannedGoals
  );

  const categoryBaselines = calibrateBaselines(
    blueprint.categoryBaselines as Partial<CategoryScores>,
    coverage
  );

  let lifetimeMegaGoals = (Array.isArray(blueprint.lifetimeMegaGoals) ? blueprint.lifetimeMegaGoals : []) as {
    title: string;
    description?: string;
    timelineEstimate?: string;
    category?: string;
  }[];

  if (identity?.lifeGoals?.length) {
    const existingTitles = new Set(lifetimeMegaGoals.map((g) => (g.title || '').toLowerCase()));
    for (const lg of identity.lifeGoals) {
      if (lg && lg.trim() && !existingTitles.has(lg.toLowerCase())) {
        lifetimeMegaGoals.push({
          title: lg.trim(),
          description: 'Major lifetime vision target identified from Goal Scout',
          timelineEstimate: 'Multi-Year Master Target',
          category: mapToPassiveCategory(undefined, lg),
        });
        existingTitles.add(lg.toLowerCase());
      }
    }
  }

  // Diagnostic summary
  const diagnosticSummary = {
    specificGoal: identity?.lifeGoals?.[0] || String(blueprint.masterVision || '').slice(0, 120),
    currentBaseline: identity?.currentBaseline || 'Initial baseline',
    primaryBlockers: allSetbacks.slice(0, 4),
    timeCommitment: identity?.dailyCapacity || 'Standard daily focus session',
  };

  return {
    ...blueprint,
    masterVision: blueprint.masterVision || `Achieve ${diagnosticSummary.specificGoal} with structured daily execution and progressive mastery.`,
    executiveSummary: blueprint.executiveSummary || blueprint.masterVision || `Strategic roadmap targeting ${diagnosticSummary.specificGoal} by neutralizing initial friction, building core capability, and scaling consistent execution.`,
    plannedGoals,
    roadblocks,
    lifetimeMegaGoals,
    macroPhases: blueprint.macroPhases,
    checkpoints: blueprint.checkpoints,
    microProgression: blueprint.microProgression,
    diagnosticSummary,
    extractedSetbacks: allSetbacks.length ? allSetbacks : blueprint.extractedSetbacks,
    categoryBaselines,
    intakeSummary: {
      diagnosticComplete: coverage.diagnosticComplete,
      profileComplete: coverage.profile.name && (coverage.profile.location || coverage.profile.work),
      lifeGoalsDiscussed: coverage.diagnostic.specificGoal,
      setbacksDiscussed: coverage.diagnostic.primaryBlocker,
    },
  };
}
