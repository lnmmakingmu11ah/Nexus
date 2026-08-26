import { Goal, DailyGoalLog, UserConfig } from '../types';

export interface GoalLikelihoodAnalysis {
  goalId: string;
  goalName: string;
  category: string;
  currentStreak: number;
  totalCompletions30d: number;
  completionRate30d: number; // 0 to 100
  likelihoodPercent: number; // 0 to 100
  estimatedMasteryDays: number; // e.g. 28 days or 25500 days (70 yrs)
  formattedTimeline: string; // e.g. "28 Days", "18 Months", "12.5 Years", "70 Years"
  willpowerStrain: 'Low' | 'Moderate' | 'High' | 'Extreme';
  statusLabel: 'High Success Probability' | 'On Track' | 'At Risk of Drop' | 'Critical Focus Needed';
  aiRecommendation: string;
}

export interface DailyEffortMetrics {
  date: string; // MM-DD
  fullDate: string; // YYYY-MM-DD
  willpowerIndex: number; // 0 to 100
  workEffort: number; // 0 to 100
  completedCount: number;
  totalCount: number;
  completionRate: number; // 0 to 100
  scoreDelta: number; // 1st derivative (change from yesterday)
  movingAvg7: number;
  movingAvg30: number;
}

export interface WillpowerSummary {
  overallWillpowerIndex: number; // 0-100
  overallWorkEffortScore: number; // 0-100
  burnoutRisk: 'Low' | 'Moderate' | 'High';
  goalLikelihoods: GoalLikelihoodAnalysis[];
  dailyMetrics: DailyEffortMetrics[];
}

/**
 * Formats timeline days into human readable Days, Months, or Years (supporting up to 70+ years)
 */
export function formatTimelineDisplay(days: number): string {
  if (days < 60) {
    return `${days} Days`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} Months`;
  } else {
    const years = Math.round((days / 365) * 10) / 10;
    return `${years} Years`;
  }
}

/**
 * Calculates Willpower Index, Work Effort, Goal Likelihoods and Derivative Metrics
 */
export function calculateWillpowerAnalytics(
  goals: Goal[],
  dailyLogs: DailyGoalLog[],
  todayStr: string,
  userConfig: UserConfig,
  rangeDays: number = 30
): WillpowerSummary {
  const activeGoals = goals.filter((g) => !g.archived);
  const activeCount = Math.max(1, activeGoals.length);

  // Group logs by date
  const logsByDate: Record<string, DailyGoalLog[]> = {};
  dailyLogs.forEach((l) => {
    if (!logsByDate[l.date]) logsByDate[l.date] = [];
    logsByDate[l.date].push(l);
  });

  // Date sequence
  const dates: string[] = [];
  const curr = new Date(todayStr);
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(curr);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Build daily metrics
  let prevComposite = 50;
  const rawDailyMetrics: Array<{
    date: string;
    fullDate: string;
    willpowerIndex: number;
    workEffort: number;
    completedCount: number;
    totalCount: number;
    completionRate: number;
    scoreDelta: number;
    rawScore: number;
  }> = [];

  dates.forEach((dateStr) => {
    const dayLogs = logsByDate[dateStr] || [];
    const completedLogs = dayLogs.filter((l) => l.completed);
    const completedCount = completedLogs.length;

    // Difficulty weight points
    let earnedPoints = 0;
    let highDiffCompleted = 0;
    let morningExecutions = 0;
    let proofVerifications = 0;

    completedLogs.forEach((l) => {
      const g = activeGoals.find((goal) => goal.id === l.goalId);
      const diffWeight = g?.difficulty === 'high' ? 3 : g?.difficulty === 'medium' ? 2 : 1;
      earnedPoints += (g?.basePoints || 5) * diffWeight;

      if (g?.difficulty === 'high') highDiffCompleted++;
      if (l.timestamp && new Date(l.timestamp).getHours() < 9) morningExecutions++;
      if (l.proofVerified) proofVerifications++;
    });

    const completionRate = Math.min(100, Math.round((completedCount / activeCount) * 100));

    // Willpower Index calculation (0 to 100)
    // Factor 1: completion rate (50%)
    // Factor 2: high difficulty bonus (20%)
    // Factor 3: morning discipline bonus (15%)
    // Factor 4: verified proof effort (15%)
    const diffBonus = Math.min(20, highDiffCompleted * 10);
    const morningBonus = Math.min(15, morningExecutions * 7.5);
    const proofBonus = Math.min(15, proofVerifications * 7.5);

    const willpowerIndex = Math.min(
      100,
      Math.round(completionRate * 0.5 + diffBonus + morningBonus + proofBonus)
    );

    // Work Effort Score calculation (0 to 100)
    // Based on earned points relative to target
    const targetPoints = activeGoals.reduce(
      (acc, g) => acc + (g.basePoints || 5) * (g.difficulty === 'high' ? 3 : 2),
      0
    );
    const workEffort = Math.min(
      100,
      Math.round((earnedPoints / Math.max(1, targetPoints)) * 100)
    );

    // Score delta (1st derivative)
    const rawScore = completionRate;
    const scoreDelta = Math.round((rawScore - prevComposite) * 10) / 10;
    prevComposite = rawScore;

    rawDailyMetrics.push({
      date: dateStr.slice(5),
      fullDate: dateStr,
      willpowerIndex,
      workEffort,
      completedCount,
      totalCount: activeCount,
      completionRate,
      scoreDelta,
      rawScore,
    });
  });

  // Calculate 7-day and 30-day moving averages
  const dailyMetrics: DailyEffortMetrics[] = rawDailyMetrics.map((dm, idx) => {
    // 7-day MA
    const slice7 = rawDailyMetrics.slice(Math.max(0, idx - 6), idx + 1);
    const avg7 = Math.round(slice7.reduce((a, c) => a + c.rawScore, 0) / slice7.length);

    // 30-day MA
    const slice30 = rawDailyMetrics.slice(Math.max(0, idx - 29), idx + 1);
    const avg30 = Math.round(slice30.reduce((a, c) => a + c.rawScore, 0) / slice30.length);

    return {
      ...dm,
      movingAvg7: avg7,
      movingAvg30: avg30,
    };
  });

  // Overall metrics averages
  const overallWillpowerIndex = Math.round(
    dailyMetrics.reduce((a, b) => a + b.willpowerIndex, 0) / Math.max(1, dailyMetrics.length)
  );
  const overallWorkEffortScore = Math.round(
    dailyMetrics.reduce((a, b) => a + b.workEffort, 0) / Math.max(1, dailyMetrics.length)
  );

  // Burnout Risk logic
  let burnoutRisk: 'Low' | 'Moderate' | 'High' = 'Low';
  if (overallWorkEffortScore > 85 && overallWillpowerIndex < 50) {
    burnoutRisk = 'High';
  } else if (overallWorkEffortScore > 70 && overallWillpowerIndex < 65) {
    burnoutRisk = 'Moderate';
  }

  // Goal achievement likelihood calculation per active goal
  const goalLikelihoods: GoalLikelihoodAnalysis[] = activeGoals.map((goal) => {
    const goalLogs = dailyLogs.filter((l) => l.goalId === goal.id && l.completed);
    const completions30d = goalLogs.length;
    const completionRate30d = Math.min(100, Math.round((completions30d / Math.max(1, rangeDays)) * 100));

    // Calculate current streak
    let currentStreak = 0;
    const sortedLogs = [...goalLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let checkDate = new Date(todayStr);

    for (let i = 0; i < 60; i++) {
      const dStr = checkDate.toISOString().split('T')[0];
      const hasLog = sortedLogs.some((l) => l.date === dStr);
      if (hasLog) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Today not logged yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Likelihood Formula:
    // Base = 30d completion rate * 0.6
    // Streak boost = min(30, currentStreak * 2.5)
    // Difficulty adjustment = High: -10% (requires higher willpower), Low: +10%
    const diffMod = goal.difficulty === 'high' ? -10 : goal.difficulty === 'low' ? 10 : 0;
    let likelihoodPercent = Math.min(
      99,
      Math.max(10, Math.round(completionRate30d * 0.6 + Math.min(30, currentStreak * 2.5) + diffMod + 15))
    );

    // Willpower Strain
    const willpowerStrain: 'Low' | 'Moderate' | 'High' | 'Extreme' =
      goal.difficulty === 'high' ? 'High' : goal.difficulty === 'medium' ? 'Moderate' : 'Low';

    // Check for explicit multi-year mentions in goal name or description
    const textLower = `${goal.name} ${goal.description || ''}`.toLowerCase();
    let explicitYears = 0;
    const yearMatch = textLower.match(/(\d+)\s*(year|yr|decade)/);
    if (yearMatch) {
      const num = parseInt(yearMatch[1], 10);
      if (yearMatch[2].startsWith('decade')) {
        explicitYears = num * 10;
      } else {
        explicitYears = num;
      }
    } else if (textLower.includes('lifetime') || textLower.includes('70 year') || textLower.includes('life goal')) {
      explicitYears = 50;
    }

    // Status label & timeline
    let statusLabel: GoalLikelihoodAnalysis['statusLabel'] = 'On Track';
    let estimatedMasteryDays = 30;
    let aiRecommendation = '';

    if (explicitYears > 0) {
      // Long-term goal multi-year timeline calculation
      estimatedMasteryDays = Math.round(explicitYears * 365);
      if (likelihoodPercent >= 80) {
        statusLabel = 'High Success Probability';
        aiRecommendation = `On target for your ${explicitYears}-year vision! Daily momentum is maintaining optimal trajectory.`;
      } else if (likelihoodPercent >= 50) {
        statusLabel = 'On Track';
        aiRecommendation = `Steady progress toward your ${explicitYears}-year horizon. Keep daily consistency tight.`;
      } else {
        statusLabel = 'Critical Focus Needed';
        aiRecommendation = `Low consistency detected for your ${explicitYears}-year goal. Break it into micro-habits to build initial momentum.`;
      }
    } else if (likelihoodPercent >= 80) {
      statusLabel = 'High Success Probability';
      estimatedMasteryDays = Math.max(7, Math.round(30 - currentStreak * 0.8));
      aiRecommendation = 'Sustained momentum! Goal is becoming an automated neural identity habit.';
    } else if (likelihoodPercent >= 50) {
      statusLabel = 'On Track';
      estimatedMasteryDays = Math.max(14, Math.round(60 - currentStreak * 0.5));
      aiRecommendation = 'Steady consistency. Focus on morning execution to lock in habit stability.';
    } else if (likelihoodPercent >= 30) {
      statusLabel = 'At Risk of Drop';
      estimatedMasteryDays = 120;
      aiRecommendation = 'Habit stack this goal after an anchor habit to reduce friction.';
    } else {
      statusLabel = 'Critical Focus Needed';
      estimatedMasteryDays = 180;
      aiRecommendation = 'High friction detected. Reduce daily requirement to a 2-minute micro-habit.';
    }

    const formattedTimeline = formatTimelineDisplay(estimatedMasteryDays);

    return {
      goalId: goal.id,
      goalName: goal.name,
      category: goal.category,
      currentStreak,
      totalCompletions30d: completions30d,
      completionRate30d,
      likelihoodPercent,
      estimatedMasteryDays,
      formattedTimeline,
      willpowerStrain,
      statusLabel,
      aiRecommendation,
    };
  });

  return {
    overallWillpowerIndex,
    overallWorkEffortScore,
    burnoutRisk,
    goalLikelihoods,
    dailyMetrics,
  };
}
