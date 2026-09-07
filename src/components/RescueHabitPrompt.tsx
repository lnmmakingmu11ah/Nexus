import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Clock, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { DailyGoalLog, Goal } from '../types';

interface RescueHabitPromptProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string;
  scoreData?: any;
  onToggleGoal: (goalId: string) => void;
}

/** Returns consecutive missed days count for a goal (not counting today) */
function getMissedDays(goal: Goal, dailyLogs: DailyGoalLog[], todayStr: string): number {
  if (!goal || !dailyLogs) return 0;
  let missed = 0;
  const today = todayStr ? new Date(todayStr) : new Date();
  if (isNaN(today.getTime())) return 0;

  for (let i = 1; i <= 7; i++) {
    try {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (isNaN(d.getTime())) break;
      const dateStr = d.toISOString().split('T')[0];
      const log = dailyLogs.find((l) => l.date === dateStr && l.goalId === goal.id);
      if (log?.completed) break;
      missed++;
    } catch {
      break;
    }
  }
  return missed;
}


/** Generate a 2-minute micro-habit suggestion for a goal */
function getMicroHabit(goal: Goal): string {
  const name = goal.name.toLowerCase();
  if (name.includes('read') || name.includes('book') || name.includes('learn')) {
    return 'Read just 2 pages or watch a 2-min summary video';
  }
  if (name.includes('workout') || name.includes('gym') || name.includes('exercise') || name.includes('run')) {
    return 'Do 10 jumping jacks or a 2-min stretch — movement counts!';
  }
  if (name.includes('meditat') || name.includes('mindful') || name.includes('breathe')) {
    return 'Close your eyes and take 5 deep, slow breaths right now';
  }
  if (name.includes('journal') || name.includes('write') || name.includes('gratitude')) {
    return 'Write one sentence about today — anything counts';
  }
  if (name.includes('study') || name.includes('course') || name.includes('skill')) {
    return 'Watch one 2-min lesson or review yesterday\'s notes for 2 minutes';
  }
  if (name.includes('network') || name.includes('connect') || name.includes('social')) {
    return 'Send a single kind message or voice note to someone';
  }
  if (name.includes('business') || name.includes('money') || name.includes('invest')) {
    return 'Spend 2 minutes reviewing your finances or one investing concept';
  }
  if (name.includes('diet') || name.includes('nutrition') || name.includes('eat')) {
    return 'Drink a full glass of water and eat one piece of fruit';
  }
  return `Do the absolute minimum version of "${goal.name}" for just 2 minutes`;
}

export const RescueHabitPrompt: React.FC<RescueHabitPromptProps> = ({
  goals,
  dailyLogs,
  todayStr,
  scoreData,
  onToggleGoal,
}) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  // 1. TIMING RULE: Only appear when user is close to finishing a day (5:00 PM / 17:00 onwards).
  // If it's still early in the day (morning / early afternoon), it does NOT pop up.
  const currentHour = new Date().getHours();
  const isCloseToEndOfDay = currentHour >= 17;

  // 2. Set of goal IDs already accomplished today
  const completedTodayIds = useMemo(() => {
    return new Set(
      (dailyLogs || []).filter((l) => l.date === todayStr && l.completed).map((l) => l.goalId)
    );
  }, [dailyLogs, todayStr]);

  const atRiskGoals = useMemo(() => {
    // If early in the day, do not pop up!
    if (!isCloseToEndOfDay) return [];

    return (goals || [])
      .filter((g) => {
        if (!g || g.archived || dismissed.has(g.id)) return false;
        // If user already accomplished this goal today, it does NOT pop up!
        if (completedTodayIds.has(g.id)) return false;

        const currentStreak = scoreData?.streakData?.[g.id]?.streak || 0;
        const missed = getMissedDays(g, dailyLogs, todayStr);

        // At risk if user has an active streak (>= 1) or missed days (>= 1)
        return currentStreak >= 1 || missed >= 1;
      })
      .map((g) => {
        const currentStreak = scoreData?.streakData?.[g.id]?.streak || 0;
        const missed = getMissedDays(g, dailyLogs, todayStr);
        return {
          goal: g,
          streak: currentStreak,
          missed,
        };
      })
      // Sort by highest streak first (most critical to preserve)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 2); // Show max 2 rescue cards at once
  }, [goals, dailyLogs, todayStr, dismissed, completedTodayIds, scoreData, isCloseToEndOfDay]);

  if (!isCloseToEndOfDay || atRiskGoals.length === 0) return null;

  const handleAccept = (goalId: string) => {
    setAccepted((prev) => new Set(prev).add(goalId));
    // Mark as completed in the app
    setTimeout(() => {
      onToggleGoal(goalId);
      setDismissed((prev) => new Set(prev).add(goalId));
    }, 800);
  };

  const handleDismiss = (goalId: string) => {
    setDismissed((prev) => new Set(prev).add(goalId));
  };

  return (
    <div className="space-y-2.5 my-1">
      <AnimatePresence>
        {atRiskGoals.map(({ goal, streak, missed }) => {
          const microHabit = getMicroHabit(goal);
          const isAccepted = accepted.has(goal.id);

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative rounded-2xl border border-amber-500/35 hover:border-amber-400/50 bg-gradient-to-br from-zinc-950/95 via-zinc-900/90 to-black/95 p-4 sm:p-5 shadow-xl shadow-black/70 overflow-hidden transition-all duration-300"
            >
              {/* Golden amber pulse accent */}
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

              <button
                onClick={() => handleDismiss(goal.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
                aria-label="Dismiss rescue habit prompt"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 shrink-0 mt-0.5 shadow-sm">
                  <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
                      Evening Streak Rescue
                    </span>
                    {streak > 0 ? (
                      <span className="text-[10px] font-mono text-amber-300/90 font-semibold">
                        · 🔥 {streak}d streak at risk tonight
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400">
                        · {missed} day{missed !== 1 ? 's' : ''} slipping
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{goal.name}</p>
                  <div className="mt-2.5 p-2 rounded-xl bg-zinc-950/80 border border-amber-500/20 flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-300 leading-snug">{microHabit}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pl-11">
                {isAccepted ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marked done! Streak preserved 🔥</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAccept(goal.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-xs font-extrabold transition-all shadow-md shadow-amber-500/25 active:scale-95 cursor-pointer"
                  >
                    <span>✅ Do 2-min version</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
