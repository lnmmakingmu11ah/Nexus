import { DailyGoalLog, Goal } from '../types';

export interface GamificationSummary {
  totalPoints: number;
  todayPoints: number;
  verifiedPoints: number;
  level: number;
  levelProgress: number;
  pointsToNextLevel: number;
}

const LEVEL_SIZE = 100;

export function calculateNexusPoints(
  goals: Goal[],
  dailyLogs: DailyGoalLog[],
  todayStr: string
): GamificationSummary {
  const goalMap = new Map(goals.map((goal) => [goal.id, goal]));

  let totalPoints = 0;
  let todayPoints = 0;
  let verifiedPoints = 0;

  dailyLogs.forEach((log) => {
    if (!log.completed) return;

    const goal = goalMap.get(log.goalId);
    const base = goal?.basePoints || 5;
    const weeklyBonus = goal?.frequency === 'weekly' ? 10 : 0;
    const verificationBonus = log.proofVerified ? 5 : 0;
    const earned = base + weeklyBonus + verificationBonus;

    totalPoints += earned;
    verifiedPoints += verificationBonus;
    if (log.date === todayStr) todayPoints += earned;
  });

  const level = Math.floor(totalPoints / LEVEL_SIZE) + 1;
  const levelProgress = totalPoints % LEVEL_SIZE;

  return {
    totalPoints,
    todayPoints,
    verifiedPoints,
    level,
    levelProgress,
    pointsToNextLevel: LEVEL_SIZE - levelProgress,
  };
}
