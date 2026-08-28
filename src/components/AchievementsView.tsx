import React, { useMemo } from 'react';
import { Award, Trophy, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { BadgesGrid } from './BadgesGrid';
import { UserConfig, Goal, DailyGoalLog, DailyJournal, CategoryKey } from '../types';
import { evaluateBadges, BADGE_DEFINITIONS } from '../utils/badges';
import { calculateNexusPoints } from '../utils/gamification';

interface AchievementsViewProps {
  userConfig: UserConfig;
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  journals: DailyJournal[];
  compositeScore: number;
  categoryScores: Record<CategoryKey, number>;
  onBack?: () => void;
  onUpdateUserConfig?: (updated: UserConfig) => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  userConfig,
  goals,
  dailyLogs,
  journals,
  compositeScore,
  categoryScores,
  onBack,
  onUpdateUserConfig,
}) => {
  const { unlockedBadgeIds, hasNewUnlocks } = useMemo(
    () => evaluateBadges(goals, dailyLogs, journals, compositeScore, categoryScores, userConfig),
    [goals, dailyLogs, journals, compositeScore, categoryScores, userConfig]
  );

  React.useEffect(() => {
    if (hasNewUnlocks && onUpdateUserConfig) {
      onUpdateUserConfig({ ...userConfig, unlockedBadges: unlockedBadgeIds });
    }
  }, [hasNewUnlocks, unlockedBadgeIds, userConfig, onUpdateUserConfig]);

  const unlocked = unlockedBadgeIds.length;
  const total = BADGE_DEFINITIONS.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const nexusPoints = useMemo(
    () => calculateNexusPoints(goals, dailyLogs, todayStr),
    [goals, dailyLogs, todayStr]
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white tracking-tight">Milestones & Badges</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Streak legends, proofs, and consistency wins — open anytime from Settings.
            </p>
          </div>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* NEXUS Level + Title */}
        <div className="rounded-2xl border border-emerald-500/25 bg-zinc-950/80 p-4">
          <div className="flex items-center gap-2 text-emerald-300 text-[10px] uppercase tracking-wider font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            NEXUS Level
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white">
            Lvl {nexusPoints.level}
            <span className="ml-2 text-sm font-normal text-emerald-400">{nexusPoints.levelTitle}</span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-700"
              style={{ width: `${nexusPoints.levelProgress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 font-mono">
            {nexusPoints.totalPoints} XP total · {nexusPoints.pointsToNextLevel} XP to next level
          </p>
        </div>

        {/* Badges Unlocked */}
        <div className="rounded-2xl border border-amber-500/25 bg-zinc-950/80 p-4">
          <div className="flex items-center gap-2 text-amber-300 text-[10px] uppercase tracking-wider font-semibold">
            <Award className="w-3.5 h-3.5" />
            Badges
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white">
            {unlocked}
            <span className="text-sm text-zinc-500 font-normal"> / {total}</span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((unlocked / Math.max(1, total)) * 100))}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 font-mono">
            {Math.round((unlocked / Math.max(1, total)) * 100)}% of all badges unlocked
          </p>
        </div>

        {/* Today's XP + Streak Multiplier */}
        <div className={`rounded-2xl border bg-zinc-950/80 p-4 ${nexusPoints.dailySweepToday ? 'border-yellow-500/40' : 'border-zinc-800'}`}>
          <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold ${nexusPoints.dailySweepToday ? 'text-yellow-300' : 'text-zinc-400'}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            {nexusPoints.dailySweepToday ? '🔥 Daily Sweep!' : 'Today\'s XP'}
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-white">
            +{nexusPoints.todayPoints}
            {nexusPoints.todayStreakMultiplier > 1 && (
              <span className="ml-2 text-sm font-bold text-orange-400">{nexusPoints.todayStreakMultiplier}x</span>
            )}
          </p>
          {nexusPoints.streakBonusPoints > 0 && (
            <p className="mt-1 text-[11px] text-orange-400 font-mono font-semibold">
              +{nexusPoints.streakBonusPoints} streak bonus XP 🔥
            </p>
          )}
          {nexusPoints.dailySweepToday && (
            <p className="mt-1 text-[11px] text-yellow-400 font-mono font-semibold">
              +25 XP for completing all daily goals! ⭐
            </p>
          )}
          {!nexusPoints.dailySweepToday && nexusPoints.streakBonusPoints === 0 && (
            <p className="mt-2 text-[11px] text-zinc-500 font-mono">
              Build a 3-day streak for 1.25x XP multiplier!
            </p>
          )}
        </div>
      </div>

      <BadgesGrid unlockedBadgeIds={unlockedBadgeIds} />
    </div>
  );
};
