import { getActuarialBaseline } from '../constants';
import { DailyGoalLog, Goal, LifeExpectancyFactor, UserConfig } from '../types';

export interface LifeExpectancyResult {
  actuarialBaselineYears: number;
  totalEstimatedYears: number;
  totalEstimatedAge: number;
  remainingYears: number;
  remainingDays: number;
  factorContributions: Array<{
    factorId: string;
    name: string;
    coefficientYears: number;
    source: string;
  }>;
  dailyGainsDays: number; // Daily accumulated life gain in days based on goal completions
  habitSignals: Array<{
    goalName: string;
    category: string;
    daysCompleted: number;
    verifiedDays: number;
    estimatedDays: number;
    explanation: string;
  }>;
  changeNarrative: string[];
}

export function calculateLifeExpectancy(
  userConfig: UserConfig,
  factors: LifeExpectancyFactor[],
  goals: Goal[],
  recentLogs: DailyGoalLog[],
  todayStr: string
): LifeExpectancyResult {
  const actuarialBaseline = getActuarialBaseline(userConfig.age, userConfig.sex);

  // Sum factor coefficients
  let totalCoefficientYears = 0;
  const factorContributions = factors.map((f) => {
    totalCoefficientYears += f.coefficientYears;
    return {
      factorId: f.id,
      name: f.name,
      coefficientYears: f.coefficientYears,
      source: f.source,
    };
  });

  // Calculate daily goal completions in past 30 days to derive daily movement
  // e.g., each completed Health or Self-Care goal yields ~0.02 days of life delta (roughly ~0.5 hours)
  const logsForToday = recentLogs.filter((l) => l.date === todayStr && l.completed);
  let dailyGainsDays = 0;
  const thirtyDayStart = new Date(todayStr);
  thirtyDayStart.setDate(thirtyDayStart.getDate() - 29);
  const recentCompletedLogs = recentLogs.filter((log) => {
    const d = new Date(log.date);
    return log.completed && d >= thirtyDayStart && d <= new Date(todayStr);
  });
  const categoryDayValue: Record<string, number> = {
    health: 0.03,
    selfCare: 0.02,
    spiritual: 0.015,
    happiness: 0.01,
    smarts: 0.01,
  };

  logsForToday.forEach((log) => {
    const goal = goals.find((g) => g.id === log.goalId);
    if (goal) {
      dailyGainsDays += categoryDayValue[goal.category] || 0.01;
    }
  });

  const habitSignals = goals
    .filter((goal) => !goal.archived)
    .map((goal) => {
      const goalLogs = recentCompletedLogs.filter((log) => log.goalId === goal.id);
      const verifiedDays = goalLogs.filter((log) => log.proofVerified || log.verificationStatus === 'verified').length;
      const estimatedDays = Number((goalLogs.length * (categoryDayValue[goal.category] || 0.01)).toFixed(2));
      const proofPhrase = verifiedDays > 0 ? `${verifiedDays} verified` : 'unverified';
      return {
        goalName: goal.name,
        category: goal.category,
        daysCompleted: goalLogs.length,
        verifiedDays,
        estimatedDays,
        explanation: `${goal.name}: ${goalLogs.length} completions in 30 days (${proofPhrase}) moved the habit delta by about ${estimatedDays} days.`,
      };
    })
    .filter((signal) => signal.daysCompleted > 0)
    .sort((a, b) => b.estimatedDays - a.estimatedDays)
    .slice(0, 5);

  const verifiedTotal = recentCompletedLogs.filter((log) => log.proofVerified || log.verificationStatus === 'verified').length;
  const changeNarrative = [
    recentCompletedLogs.length > 0
      ? `${recentCompletedLogs.length} completed habits in the last 30 days are feeding the estimate.`
      : 'No recent completed habits are moving the estimate yet.',
    verifiedTotal > 0
      ? `${verifiedTotal} of those completions were verified, so the confidence story is stronger.`
      : 'None of the recent completions are verified yet, so the estimate stays cautious.',
    dailyGainsDays > 0
      ? `Today added roughly ${dailyGainsDays.toFixed(2)} projected days from completed routines.`
      : 'Today has not changed the daily habit delta yet.',
  ];

  const totalEstimatedAge = Number((actuarialBaseline + totalCoefficientYears + dailyGainsDays / 365.25).toFixed(1));
  const remainingYears = Math.max(0, Number((totalEstimatedAge - userConfig.age).toFixed(1)));
  const remainingDays = Math.round(remainingYears * 365.25);

  return {
    actuarialBaselineYears: Number(actuarialBaseline.toFixed(1)),
    totalEstimatedYears: Number(totalCoefficientYears.toFixed(1)),
    totalEstimatedAge,
    remainingYears,
    remainingDays,
    factorContributions,
    dailyGainsDays: Number(dailyGainsDays.toFixed(3)),
    habitSignals,
    changeNarrative,
  };
}
