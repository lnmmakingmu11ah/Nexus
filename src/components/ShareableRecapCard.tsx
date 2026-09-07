import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Download, X, Trophy, Flame, Target, TrendingUp } from 'lucide-react';
import { Goal, DailyGoalLog, UserConfig } from '../types';
import { ScoreCalculationResult } from '../utils/scoring';
import { NexusLogo } from './NexusLogo';

interface ShareableRecapCardProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  scoreData: ScoreCalculationResult;
  userConfig: UserConfig;
  todayStr: string;
  /** Week start date string YYYY-MM-DD */
  weekStartStr: string;
  onClose: () => void;
}

function getWeekStats(goals: Goal[], dailyLogs: DailyGoalLog[], weekStartStr: string) {
  const start = weekStartStr ? new Date(weekStartStr) : new Date();
  const validStart = isNaN(start.getTime()) ? new Date() : start;
  const days = Array.from({ length: 7 }, (_, i) => {
    try {
      const d = new Date(validStart);
      d.setDate(validStart.getDate() + i);
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }).filter(Boolean);


  let totalCompleted = 0;
  let totalScheduled = 0;
  const goalStreaks: { name: string; streak: number }[] = [];

  for (const goal of goals.filter((g) => !g.archived)) {
    let streak = 0;
    for (const day of days) {
      const log = dailyLogs.find((l) => l.date === day && l.goalId === goal.id);
      if (log?.completed) {
        streak++;
        totalCompleted++;
      }
      totalScheduled++;
    }
    goalStreaks.push({ name: goal.name, streak });
  }

  goalStreaks.sort((a, b) => b.streak - a.streak);
  const completionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
  return { completionRate, totalCompleted, totalScheduled, topGoals: goalStreaks.slice(0, 3) };
}

export const ShareableRecapCard: React.FC<ShareableRecapCardProps> = ({
  goals,
  dailyLogs,
  scoreData,
  userConfig,
  todayStr,
  weekStartStr,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const stats = getWeekStats(goals, dailyLogs, weekStartStr);
  const userName = userConfig.userName || 'Champion';

  const weekLabel = (() => {
    const start = new Date(weekStartStr);
    const end = new Date(weekStartStr);
    end.setDate(start.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
  })();

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      // Try native Web Share API first (works on Android)
      if (navigator.share) {
        await navigator.share({
          title: 'My NEXUS Weekly Progress',
          text: `🌟 Week of ${weekLabel}\n` +
            `✅ Completion: ${stats.completionRate}%\n` +
            `🔥 ${stats.totalCompleted} habits completed\n` +
            `📊 Life Score: ${scoreData.composite}%\n` +
            `\nTracked with NEXUS — Personal Growth OS`,
        });
      } else {
        // Fallback: copy to clipboard
        const text =
          `🌟 NEXUS Weekly Recap — ${weekLabel}\n` +
          `✅ ${stats.completionRate}% completion (${stats.totalCompleted}/${stats.totalScheduled} habits)\n` +
          `🏆 Top habit: ${stats.topGoals[0]?.name || 'N/A'} (${stats.topGoals[0]?.streak || 0}/7 days)\n` +
          `📈 Life Score: ${scoreData.composite}%\n` +
          `\nBuilding my best life with NEXUS 🚀`;
        await navigator.clipboard.writeText(text);
        alert('✅ Progress summary copied to clipboard! Paste it anywhere to share.');
      }
    } catch (e) {
      console.warn('Share failed:', e);
    } finally {
      setIsSharing(false);
    }
  }, [stats, scoreData, weekLabel]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md px-3 py-4">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="w-full max-w-sm space-y-3"
        >
          {/* Card to share */}
          <div
            ref={cardRef}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/40 shadow-2xl"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08),transparent_60%)] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <NexusLogo size="sm" animated={false} />
                <div>
                  <p className="text-[11px] text-amber-400 font-mono font-semibold tracking-widest uppercase">NEXUS · Weekly Recap</p>
                  <p className="text-[13px] font-bold text-white">{userName}'s Progress</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 font-mono">{weekLabel}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 px-5 py-4">
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3 text-center">
                <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-xl font-extrabold font-mono text-emerald-300">{stats.completionRate}%</p>
                <p className="text-[9px] text-zinc-500 font-mono uppercase">Done</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 text-center">
                <Flame className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-xl font-extrabold font-mono text-amber-300">{stats.totalCompleted}</p>
                <p className="text-[9px] text-zinc-500 font-mono uppercase">Habits</p>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-2xl p-3 text-center">
                <TrendingUp className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <p className="text-xl font-extrabold font-mono text-indigo-300">{scoreData.composite}%</p>
                <p className="text-[9px] text-zinc-500 font-mono uppercase">Life</p>
              </div>
            </div>

            {/* Top goals */}
            {stats.topGoals.length > 0 && (
              <div className="px-5 pb-4">
                <p className="text-[10px] font-mono font-bold uppercase text-zinc-500 mb-2 flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-amber-400" /> Top Habits
                </p>
                <div className="space-y-1.5">
                  {stats.topGoals.map((g, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <p className="text-[11px] text-zinc-300 truncate max-w-[70%]">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {g.name}
                      </p>
                      <div className="flex">
                        {Array.from({ length: 7 }, (_, d) => (
                          <div
                            key={d}
                            className={`w-2.5 h-2.5 rounded-sm ml-0.5 ${d < g.streak ? 'bg-emerald-400' : 'bg-zinc-800'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-800/60 flex items-center justify-between">
              <p className="text-[9px] text-zinc-600 font-mono">NEXUS Personal Growth OS</p>
              <p className="text-[9px] text-amber-400/60 font-mono">nexus.app</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Close
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="flex-2 flex-grow py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black text-sm font-bold shadow-lg shadow-amber-500/25 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Share2 className="w-4 h-4" />
              {isSharing ? 'Sharing…' : 'Share Progress'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
