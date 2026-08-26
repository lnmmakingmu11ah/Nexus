import { CategoryKey, CategoryScores, DailyGoalLog, Goal, UserConfig } from '../types';

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
  userConfig: UserConfig
): ScoreCalculationResult {
  const activeGoals = goals.filter((g) => !g.archived);
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

  // 2. Extended App Absence Decay check:
  // If user hasn't logged ANY goal for 3+ consecutive days, apply active daily decay across neglected categories
  activeCategoryGoals.forEach((goal) => {
    const missedDays = streakData[goal.id]?.missedDays || 0;
    if (missedDays >= userConfig.absenceThresholdDays) {
      goal.effects.forEach((eff) => {
        if (eff.category !== 'spiritual') {
          const extraDaysPastThreshold = missedDays - userConfig.absenceThresholdDays + 1;
          const totalDecay = extraDaysPastThreshold * userConfig.dailyDecayRate;
          rawScores[eff.category] -= totalDecay;
          absenceDecays[eff.category] += totalDecay;
        }
      });
    }
  });

  // 3. Spiritual Resonance Calculation (DERIVATIVE METRIC):
  // "calculated from how much of the day's completed, aligned-tagged actions relate to the user's stated life path"
  const alignedGoals = activeCategoryGoals.filter((g) => g.isLifePathAligned);
  const completedAlignedGoals = alignedGoals.filter((g) => logsForTargetDateMap.get(g.id)?.completed === true);

  const spiritualBaseline = userConfig.categoryBaselines.spiritual;
  if (alignedGoals.length === 0) {
    rawScores.spiritual = spiritualBaseline;
  } else {
    const alignmentRatio = completedAlignedGoals.length / alignedGoals.length;
    // Boost spiritual score derived from aligned completions + streak momentum
    let spiritualBonus = 0;
    completedAlignedGoals.forEach((g) => {
      const mult = streakData[g.id]?.multiplier || 1.0;
      const weight = g.effects.find((e) => e.category === 'spiritual')?.weight || 3;
      spiritualBonus += weight * g.basePoints * mult * 0.8;
    });

    rawScores.spiritual = Math.min(
      100,
      Math.max(0, spiritualBaseline * 0.4 + alignmentRatio * 45 + spiritualBonus)
    );
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
