import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Clock, CheckCircle2, X, ChevronRight } from 'lucide-react';
import { DailyGoalLog, Goal } from '../types';

interface RescueHabitPromptProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string;
  onToggleGoal: (goalId: string) => void;
}

/** Returns consecutive missed days count for a goal (not counting today) */
function getMissedDays(goal: Goal, dailyLogs: DailyGoalLog[], todayStr: string): number {
  let missed = 0;
  const today = new Date(todayStr);
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const log = dailyLogs.find((l) => l.date === dateStr && l.goalId === goal.id);
    if (log?.completed) break;
    missed++;
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
  onToggleGoal,
}) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const atRiskGoals = useMemo(() => {
    return goals
      .filter((g) => !g.archived && !dismissed.has(g.id))
      .map((g) => ({ goal: g, missed: getMissedDays(g, dailyLogs, todayStr) }))
      .filter(({ missed }) => missed >= 2)
      .slice(0, 2); // Show max 2 rescue cards at once
  }, [goals, dailyLogs, todayStr, dismissed]);

  if (atRiskGoals.length === 0) return null;

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
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {atRiskGoals.map(({ goal, missed }) => {
          const microHabit = getMicroHabit(goal);
          const isAccepted = accepted.has(goal.id);

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/60 via-zinc-900/80 to-zinc-950/80 p-4 overflow-hidden"
            >
              {/* Pulse accent */}
              <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />

              <button
                onClick={() => handleDismiss(goal.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-zinc-800/80 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 shrink-0 mt-0.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono font-bold uppercase text-rose-400 tracking-wider">Streak at risk</span>
                    <span className="text-[10px] font-mono text-zinc-500">· {missed} days missed</span>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{goal.name}</p>
                  <div className="mt-2 flex items-start gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-300 leading-snug">{microHabit}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pl-11">
                {isAccepted ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Marked done! Streak saved 🔥</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAccept(goal.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors shadow-md shadow-amber-500/30 active:scale-95"
                  >
                    <span>✅ Do 2-min version</span>
                    <ChevronRight className="w-3 h-3" />
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
