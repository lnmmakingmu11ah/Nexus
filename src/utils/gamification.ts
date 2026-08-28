import { DailyGoalLog, Goal } from '../types';

export interface GamificationSummary {
  totalPoints: number;
  todayPoints: number;
  verifiedPoints: number;
  streakBonusPoints: number;
  level: number;
  levelTitle: string;
  levelProgress: number;
  pointsToNextLevel: number;
  todayStreakMultiplier: number;
  dailySweepToday: boolean;
}

const LEVEL_TITLES: Record<number, string> = {
  1:  'Rookie',
  2:  'Grinder',
  3:  'Consistent',
  4:  'Disciplined',
  5:  'Focused',
  6:  'Momentum Builder',
  7:  'Habit Architect',
  8:  'Streak Machine',
  9:  'Elite',
  10: 'NEXUS Legend',
};

function getLevelTitle(level: number): string {
  if (level >= 10) return LEVEL_TITLES[10];
  return LEVEL_TITLES[level] || `Level ${level}`;
}

const LEVEL_THRESHOLDS = [0, 50, 120, 220, 350, 500, 700, 950, 1250, 1600, 2000];

export function getLevelFromXP(xp: number): { level: number; progress: number; toNext: number } {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      const isMax = i === LEVEL_THRESHOLDS.length - 1;
      const base = LEVEL_THRESHOLDS[i];
      const next = isMax ? base + 500 : LEVEL_THRESHOLDS[i + 1];
      const rangeSize = next - base;
      const progress = Math.min(100, Math.round(((xp - base) / rangeSize) * 100));
      return { level: i + 1, progress, toNext: next - xp };
    }
  }
  return { level: 1, progress: 0, toNext: LEVEL_THRESHOLDS[1] };
}

export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.5;
  if (streakDays >= 14) return 2.0;
  if (streakDays >= 7)  return 1.5;
  if (streakDays >= 3)  return 1.25;
  return 1.0;
}

export function getStreakRewardLabel(streakDays: number): string {
  if (streakDays >= 30) return '🔥 30-day legend! 2.5x XP!';
  if (streakDays >= 14) return '🏆 2-week beast! 2x XP!';
  if (streakDays >= 7)  return '👑 7-day warrior! 1.5x XP!';
  if (streakDays >= 3)  return '⚡ 3-day streak! 1.25x XP!';
  return '';
}

export function calculateNexusPoints(
  goals: Goal[],
  dailyLogs: DailyGoalLog[],
  todayStr: string
): GamificationSummary {
  const goalMap = new Map(goals.map((goal) => [goal.id, goal]));

  let totalPoints = 0;
  let todayPoints = 0;
  let verifiedPoints = 0;
  let streakBonusPoints = 0;

  const goalStreakMap = new Map<string, number>();
  const activeGoals = goals.filter((g) => !g.archived);
  for (const goal of activeGoals) {
    const logs = dailyLogs
      .filter((l) => l.goalId === goal.id && l.completed)
      .map((l) => l.date)
      .sort()
      .reverse();
    let streak = 0;
    const checkDate = new Date(todayStr);
    for (let d = 0; d < 365; d++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (logs.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    goalStreakMap.set(goal.id, streak);
  }

  dailyLogs.forEach((log) => {
    if (!log.completed) return;
    const goal = goalMap.get(log.goalId);
    const base = goal?.basePoints || 5;
    const weeklyBonus = goal?.frequency === 'weekly' ? 10 : 0;
    const verificationBonus = log.proofVerified ? 8 : 0;
    const streak = goalStreakMap.get(log.goalId) || 0;
    const multiplier = log.date === todayStr ? getStreakMultiplier(streak) : 1.0;
    const earned = Math.round((base + weeklyBonus + verificationBonus) * multiplier);
    const bonus = Math.round((base + weeklyBonus + verificationBonus) * (multiplier - 1));

    totalPoints += earned;
    verifiedPoints += verificationBonus;
    if (log.date === todayStr) {
      todayPoints += earned;
      streakBonusPoints += bonus;
    }
  });

  const activeDailyGoals = activeGoals.filter((g) => g.frequency === 'daily');
  const completedTodayIds = new Set(
    dailyLogs.filter((l) => l.date === todayStr && l.completed).map((l) => l.goalId)
  );
  const dailySweepToday =
    activeDailyGoals.length > 0 &&
    activeDailyGoals.every((g) => completedTodayIds.has(g.id));
  if (dailySweepToday) {
    totalPoints += 25;
    todayPoints += 25;
    streakBonusPoints += 25;
  }

  const { level, progress, toNext } = getLevelFromXP(totalPoints);

  let todayMaxStreak = 0;
  for (const goalId of completedTodayIds) {
    const s = goalStreakMap.get(goalId) || 0;
    if (s > todayMaxStreak) todayMaxStreak = s;
  }

  return {
    totalPoints,
    todayPoints,
    verifiedPoints,
    streakBonusPoints,
    level,
    levelTitle: getLevelTitle(level),
    levelProgress: progress,
    pointsToNextLevel: toNext,
    todayStreakMultiplier: getStreakMultiplier(todayMaxStreak),
    dailySweepToday,
  };
}
