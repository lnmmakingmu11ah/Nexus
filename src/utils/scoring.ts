import { CategoryKey, CategoryScores, DailyGoalLog, Goal, UserConfig, DailyJournal } from '../types';

/**
 * Calculates consecutive completion days (streak) for a goal up to a target date.
 * If 1 day was missed recently, streak drops slightly but doesn't instantly zero out
 * until threshold is crossed.
 */
export function calculateGoalStreak(
  goalId: string,
  dailyLogs: DailyGoalLog[],
  targetDateStr: string,
  absenceThresholdDays: number = 3
): { currentStreak: number; consecutiveMissedDays: number } {
  // Sort logs by date descending
  const goalLogsMap = new Map<string, boolean>();
  dailyLogs.forEach((log) => {
    if (log.goalId === goalId) {
      goalLogsMap.set(log.date, log.completed);
    }
  });

  const currentDate = new Date(targetDateStr);
  let streak = 0;
  let consecutiveMisses = 0;
  let checkedDays = 0;

  // Look back up to 60 days
  for (let i = 0; i < 60; i++) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];

    const completed = goalLogsMap.get(dateKey);

    if (i === 0 && completed === undefined) {
      // Today not logged yet, don't count as miss yet for streak lookback
      continue;
    }

    if (completed === true) {
      if (consecutiveMisses > 0 && consecutiveMisses < absenceThresholdDays) {
        // Minor miss dented streak but did not break it completely
        streak = Math.max(0, streak - consecutiveMisses * 2);
      }
      consecutiveMisses = 0;
      streak++;
    } else {
      consecutiveMisses++;
      if (consecutiveMisses >= absenceThresholdDays) {
        // Absence threshold crossed: streak completely resets
        streak = 0;
        break;
      }
    }
    checkedDays++;
  }

  return {
    currentStreak: Math.max(0, streak),
    consecutiveMissedDays: consecutiveMisses,
  };
}

/**
 * Calculates the highest historical streak ever attained for a goal across all daily logs.
 */
export function calculateGoalBestStreak(
  goalId: string,
  dailyLogs: DailyGoalLog[],
  todayStr: string,
  absenceThresholdDays: number = 3
): number {
  const datesSet = new Set<string>();
  datesSet.add(todayStr);
  dailyLogs.forEach((log) => {
    if (log.goalId === goalId) {
      datesSet.add(log.date);
    }
  });

  let maxStreak = 0;
  datesSet.forEach((dateStr) => {
    const { currentStreak } = calculateGoalStreak(goalId, dailyLogs, dateStr, absenceThresholdDays);
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }
  });

  return maxStreak;
}

/**
 * Calculates streak multiplier between 1.0 and maxStreakMultiplier (e.g. 1.8x)
 */
export function getStreakMultiplier(
  streak: number,
  maxMultiplier: number = 1.8,
  rampDays: number = 10
): number {
  if (streak <= 0) return 1.0;
  const progress = Math.min(1, streak / rampDays);
  return Number((1.0 + progress * (maxMultiplier - 1.0)).toFixed(2));
}

export interface ScoreCalculationResult {
  date: string;
  scores: CategoryScores;
  composite: number;
  streakData: Record<string, { streak: number; multiplier: number; missedDays: number }>;
  absenceDecays: Record<CategoryKey, number>;
  totalCompleted: number;
  totalGoals: number;
}

/**
 * Calculates Category Scores for a specific target date based on completions,
 * misses, streak multipliers, and extended absence decays.
 */
export function calculateScoresForDate(
  targetDateStr: string,
  goals: Goal[],
  dailyLogs: DailyGoalLog[],
  userConfig: UserConfig,
  journals?: DailyJournal[]
): ScoreCalculationResult {
  const activeGoals = goals.filter(
    (g) => !g.archived && g.priority !== 'parking_lot' && g.planStatus !== 'paused' && g.planStatus !== 'completed'
  );
  const activeCategoryGoals = activeGoals.filter((g) => !g.archived);

  // Initialize with baseline values
  const rawScores: CategoryScores = { ...userConfig.categoryBaselines };
  const absenceDecays: Record<CategoryKey, number> = {
    health: 0,
    spiritual: 0,
    smarts: 0,
    selfCare: 0,
    happiness: 0,
  };

  const streakData: Record<string, { streak: number; multiplier: number; missedDays: number }> = {};
  let totalCompleted = 0;

  // Logs for target date
  const logsForTargetDateMap = new Map<string, DailyGoalLog>();
  dailyLogs.forEach((log) => {
    if (log.date === targetDateStr) {
      logsForTargetDateMap.set(log.goalId, log);
    }
  });

  // 1. Calculate streak & completion effects per goal
  activeCategoryGoals.forEach((goal) => {
    const { currentStreak, consecutiveMissedDays } = calculateGoalStreak(
      goal.id,
      dailyLogs,
      targetDateStr,
      userConfig.absenceThresholdDays
    );

    const multiplier = getStreakMultiplier(
      currentStreak,
      userConfig.maxStreakMultiplier,
      userConfig.streakRampDays
    );

    streakData[goal.id] = {
      streak: currentStreak,
      multiplier,
      missedDays: consecutiveMissedDays,
    };

    const log = logsForTargetDateMap.get(goal.id);
    const isCompleted = log?.completed === true;

    if (isCompleted) {
      totalCompleted++;
    }

    // Apply effects to non-Spiritual categories (Spiritual Resonance is calculated derivatively below)
    goal.effects.forEach((effect) => {
      // Spiritual Resonance is calculated derivatively from aligned actions, not directly modified here
      if (effect.category === 'spiritual') return;

      // Smarts strictly ONLY moves from explicit cognitive training goals!
      if (effect.category === 'smarts' && !goal.isCognitiveTraining) return;

      if (isCompleted) {
        // Positive gain = effect.weight * basePoints * multiplier
        const boost = effect.weight * goal.basePoints * multiplier;
        rawScores[effect.category] += boost;
      } else {
        // Missed goal penalty:
        // First 1-2 misses apply small negative weight (30% of base weight)
        // Past threshold (>=3 missed days), full negative weight applies
        if (consecutiveMissedDays >= userConfig.absenceThresholdDays) {
          const fullPenalty = Math.abs(effect.weight) * goal.basePoints * 1.2;
          rawScores[effect.category] -= fullPenalty;
          absenceDecays[effect.category] += userConfig.dailyDecayRate;
        } else if (log && !log.completed) {
          const minorPenalty = Math.abs(effect.weight) * goal.basePoints * 0.3;
          rawScores[effect.category] -= minorPenalty;
        }
      }
    });
  });

  // 2. Universal 24-Hour Absence Decay across ALL 5 categories:
  // When user goes 24+ hours without journaling or completing goals that feed a category, it decays ~2 pts/day.
  const ALL_CATEGORIES: CategoryKey[] = ['health', 'spiritual', 'smarts', 'selfCare', 'happiness'];

  // Map category to latest active date on or before target date
  const latestActivityMap: Record<CategoryKey, string | null> = {
    health: null,
    spiritual: null,
    smarts: null,
    selfCare: null,
    happiness: null,
  };

  // 2a. Check goal completions across all logged history up to targetDate
  dailyLogs.forEach((log) => {
    if (log.completed && log.date <= targetDateStr) {
      const g = goals.find((item) => item.id === log.goalId);
      if (g) {
        ALL_CATEGORIES.forEach((cat) => {
          const matchesCategory =
            g.category === cat ||
            g.effects.some((eff) => eff.category === cat && eff.weight > 0) ||
            (cat === 'spiritual' && g.isLifePathAligned) ||
            (cat === 'smarts' && g.isCognitiveTraining);

          if (matchesCategory) {
            if (!latestActivityMap[cat] || log.date > latestActivityMap[cat]!) {
              latestActivityMap[cat] = log.date;
            }
          }
        });
      }
    }
  });

  // 2b. Check journal entries across history up to targetDate
  if (journals && journals.length > 0) {
    journals.forEach((j) => {
      if (j.date <= targetDateStr && ((j.entry && j.entry.trim().length > 0) || typeof j.mood === 'number')) {
        const entryText = (j.entry || '').toLowerCase();
        // Any journal reflection affirms self-care and spiritual awareness
        if (!latestActivityMap.selfCare || j.date > latestActivityMap.selfCare!) {
          latestActivityMap.selfCare = j.date;
        }
        if (!latestActivityMap.spiritual || j.date > latestActivityMap.spiritual!) {
          latestActivityMap.spiritual = j.date;
        }
        if (typeof j.mood === 'number' && j.mood >= 3) {
          if (!latestActivityMap.happiness || j.date > latestActivityMap.happiness!) {
            latestActivityMap.happiness = j.date;
          }
        }
        if (/\b(gym|workout|lift|run|running|sprint|cardio|walk|walking|sleep|slept|diet|nutrition|fasting|meal|protein|stretch|hydrate|water|recovery)\b/i.test(entryText)) {
          if (!latestActivityMap.health || j.date > latestActivityMap.health!) {
            latestActivityMap.health = j.date;
          }
        }
        if (/\b(study|studied|reading|read|book|books|learn|learning|coded|coding|program|math|research|paper|class|course|lesson|exam|skill|mastery|insight)\b/i.test(entryText)) {
          if (!latestActivityMap.smarts || j.date > latestActivityMap.smarts!) {
            latestActivityMap.smarts = j.date;
          }
        }
        if (/\b(meditat|prayer|pray|gratitude|grateful|thankful|purpose|calling|aligned|life path|peace|presence|mindful|soul|destiny|vision)\b/i.test(entryText)) {
          if (!latestActivityMap.spiritual || j.date > latestActivityMap.spiritual!) {
            latestActivityMap.spiritual = j.date;
          }
        }
        if (/\b(happy|joy|joyful|smile|smiled|laugh|laughed|love|loved|blessed|excited|excitement|proud|fulfill|celebrat|great day|awesome)\b/i.test(entryText)) {
          if (!latestActivityMap.happiness || j.date > latestActivityMap.happiness!) {
            latestActivityMap.happiness = j.date;
          }
        }
      }
    });
  }

  // 2c. Compute inactivity days per category & apply decay (2 pts/day)
  const targetDateObj = new Date(`${targetDateStr}T00:00:00`);
  const decayRate = userConfig.dailyDecayRate || 2.0;

  // Determine earliest app usage date
  const allKnownDates = [
    ...goals.map((g) => g.createdAt?.split('T')[0]).filter(Boolean),
    ...dailyLogs.map((l) => l.date).filter(Boolean),
    ...((journals || []).map((j) => j.date).filter(Boolean)),
  ].sort();
  const earliestDateStr = allKnownDates[0] || targetDateStr;
  const earliestDateObj = new Date(`${earliestDateStr}T00:00:00`);

  ALL_CATEGORIES.forEach((cat) => {
    const lastActiveStr = latestActivityMap[cat];
    let inactiveDays = 0;

    if (lastActiveStr) {
      const lastActiveObj = new Date(`${lastActiveStr}T00:00:00`);
      const diffMs = targetDateObj.getTime() - lastActiveObj.getTime();
      inactiveDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    } else {
      // Never logged any activity for this category — calculate days since user joined
      const diffMs = targetDateObj.getTime() - earliestDateObj.getTime();
      const daysSinceStart = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      inactiveDays = Math.max(1, daysSinceStart);
    }

    if (inactiveDays > 0) {
      const totalDecay = inactiveDays * decayRate;
      rawScores[cat] -= totalDecay;
      absenceDecays[cat] = (absenceDecays[cat] || 0) + totalDecay;
    }
  });

  // 3. Spiritual Resonance Calculation (DERIVATIVE METRIC):
  // "calculated from how much of the day's completed, aligned-tagged actions relate to the user's stated life path"
  const alignedGoals = activeCategoryGoals.filter((g) => g.isLifePathAligned);
  const completedAlignedGoals = alignedGoals.filter((g) => logsForTargetDateMap.get(g.id)?.completed === true);

  if (alignedGoals.length > 0) {
    const alignmentRatio = completedAlignedGoals.length / alignedGoals.length;
    let spiritualBonus = 0;
    completedAlignedGoals.forEach((g) => {
      const mult = streakData[g.id]?.multiplier || 1.0;
      const weight = g.effects.find((e) => e.category === 'spiritual')?.weight || 3;
      spiritualBonus += weight * g.basePoints * mult * 0.8;
    });

    rawScores.spiritual = Math.min(
      100,
      Math.max(0, rawScores.spiritual * 0.4 + alignmentRatio * 45 + spiritualBonus)
    );
  }

  // 4. Journaling & NEXUS Reflection Impact:
  // User's journal entries and mood directly modulate the 5 passive monitoring categories
  if (journals && journals.length > 0) {
    const journalForDate = journals.find((j) => j.date === targetDateStr);
    if (journalForDate) {
      // 4a. Mood scale (1-5) directly modulates happiness and selfCare
      if (typeof journalForDate.mood === 'number') {
        const mood = journalForDate.mood;
        if (mood >= 5) {
          rawScores.happiness += 10;
          rawScores.selfCare += 6;
          rawScores.spiritual += 4;
        } else if (mood === 4) {
          rawScores.happiness += 5;
          rawScores.selfCare += 3;
          rawScores.spiritual += 2;
        } else if (mood === 2) {
          rawScores.happiness -= 6;
          rawScores.selfCare -= 3;
        } else if (mood <= 1) {
          rawScores.happiness -= 12;
          rawScores.selfCare -= 6;
        }
      }

      // 4b. Keyword sentiment & focus extraction from journal entry text
      const entryText = (journalForDate.entry || '').toLowerCase();
      if (entryText.length > 0) {
        // Deliberate daily reflection affirms inner alignment and self-care
        rawScores.spiritual += 3;
        rawScores.selfCare += 2;

        // Health keywords: workout, gym, run, sleep, nutrition, diet, walk, fitness
        if (/\b(gym|workout|lift|run|running|sprint|cardio|walk|walking|sleep|slept|diet|nutrition|fasting|meal|protein|stretch|hydrate|water|recovery)\b/i.test(entryText)) {
          rawScores.health += 8;
        }

        // Smarts keywords: study, read, book, learn, coding, code, analysis, research, course
        if (/\b(study|studied|reading|read|book|books|learn|learning|coded|coding|program|math|research|paper|class|course|lesson|exam|skill|mastery|insight)\b/i.test(entryText)) {
          rawScores.smarts += 8;
        }

        // Spiritual / Purpose keywords: meditate, prayer, gratitude, thankful, purpose, soul, aligned, life path
        if (/\b(meditat|prayer|pray|gratitude|grateful|thankful|purpose|calling|aligned|life path|peace|presence|mindful|soul|destiny|vision)\b/i.test(entryText)) {
          rawScores.spiritual += 8;
        }

        // Self-Care keywords: relax, unwind, rest, nature, boundaries, calm, recharge
        if (/\b(relax|relaxed|unwind|rest|rested|massage|spa|nature|calm|recharge|reset|self-care|break|breathe|breathing|boundaries)\b/i.test(entryText)) {
          rawScores.selfCare += 8;
        }

        // Happiness keywords: happy, joy, smile, laugh, love, blessed, excited, proud, celebrate
        if (/\b(happy|joy|joyful|smile|smiled|laugh|laughed|love|loved|blessed|excited|excitement|proud|fulfill|celebrat|great day|awesome)\b/i.test(entryText)) {
          rawScores.happiness += 8;
        }

        // Stress / Burnout signals: modulate downward to match genuine psychological state
        if (/\b(exhausted|burnout|burned out|overwhelmed|stressed|anxious|anxiety|depressed|sad|drained)\b/i.test(entryText)) {
          rawScores.happiness -= 5;
          rawScores.selfCare -= 4;
        }
      }

      // 4c. NEXUS AI coaching dialogue affirmed
      if (journalForDate.aiReflection && journalForDate.aiReflection.length > 0) {
        rawScores.smarts += 3;
        rawScores.spiritual += 3;
      }
    }
  }

  // Clamp all scores between 0 and 100
  const finalScores: CategoryScores = {
    health: Math.min(100, Math.max(0, Math.round(rawScores.health))),
    spiritual: Math.min(100, Math.max(0, Math.round(rawScores.spiritual))),
    smarts: Math.min(100, Math.max(0, Math.round(rawScores.smarts))),
    selfCare: Math.min(100, Math.max(0, Math.round(rawScores.selfCare))),
    happiness: Math.min(100, Math.max(0, Math.round(rawScores.happiness))),
  };

  // Composite Life Score = average of 5 categories
  const composite = Math.round(
    (finalScores.health +
      finalScores.spiritual +
      finalScores.smarts +
      finalScores.selfCare +
      finalScores.happiness) /
      5
  );

  return {
    date: targetDateStr,
    scores: finalScores,
    composite,
    streakData,
    absenceDecays,
    totalCompleted,
    totalGoals: activeCategoryGoals.length,
  };
}

export interface CriticalCategoryInfo {
  category: CategoryKey;
  name: string;
  score: number;
  reason: string;
  actionRecommendation: string;
  icon: string;
}

export function getCriticalCategories(scores: CategoryScores, threshold = 35): CriticalCategoryInfo[] {
  const critical: CriticalCategoryInfo[] = [];
  const recs: Record<CategoryKey, { name: string; reason: string; action: string; icon: string }> = {
    health: {
      name: 'Physical Health',
      reason: 'No workouts, movement, or nutrition habits logged recently.',
      action: 'Log a 15-minute walk, hydrate, or complete a workout habit today.',
      icon: '💪',
    },
    spiritual: {
      name: 'Spiritual Resonance',
      reason: 'No aligned life-path habits or reflective journaling logged.',
      action: 'Spend 5–10 mins in mindful meditation, prayer, or write an alignment entry in your Journal.',
      icon: '✨',
    },
    smarts: {
      name: 'Cognitive Smarts',
      reason: 'No deliberate study, reading, or mental challenge logged.',
      action: 'Do a 15-minute reading session, learn a new concept, or run a cognitive drill.',
      icon: '🧠',
    },
    selfCare: {
      name: 'Self-Care Vitality',
      reason: 'Neglecting rest, recovery routines, and healthy boundaries.',
      action: 'Unplug for 20 minutes, take a restorative walk in nature, stretch, or do a reset routine.',
      icon: '🛡️',
    },
    happiness: {
      name: 'Happiness & Joy',
      reason: 'Low recent mood affirmations, gratitude, or rewarding completions.',
      action: 'Write down 3 things you are grateful for today, celebrate a win, or connect with a friend.',
      icon: '😊',
    },
  };

  (Object.keys(scores) as CategoryKey[]).forEach((cat) => {
    if (scores[cat] <= threshold) {
      critical.push({
        category: cat,
        name: recs[cat].name,
        score: scores[cat],
        reason: recs[cat].reason,
        actionRecommendation: recs[cat].action,
        icon: recs[cat].icon,
      });
    }
  });

  return critical;
}

