import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Target, Sparkles, Sun, ChevronRight } from 'lucide-react';
import { Goal } from '../types';
import { NexusLogo } from './NexusLogo';

interface MorningLaunchpadProps {
  goals: Goal[];
  todayStr: string;
  userName?: string;
  onClose: () => void;
}

const DAILY_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "The difference between try and triumph is just a little umph!", author: "Marvin Phillips" },
];

const STORAGE_KEY_PREFIX = 'nexus_launchpad_shown_';

export function useMorningLaunchpad(goals: Goal[], todayStr: string) {
  const [showLaunchpad, setShowLaunchpad] = useState(false);

  useEffect(() => {
    const key = `${STORAGE_KEY_PREFIX}${todayStr}`;
    const alreadyShown = localStorage.getItem(key);
    if (!alreadyShown && goals.length > 0) {
      // Small delay so the app fully mounts before the modal appears
      const t = setTimeout(() => setShowLaunchpad(true), 1200);
      return () => clearTimeout(t);
    }
  }, [todayStr, goals.length]);

  const dismiss = () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${todayStr}`, '1');
    setShowLaunchpad(false);
  };

  return { showLaunchpad, dismissLaunchpad: dismiss };
}

export const MorningLaunchpad: React.FC<MorningLaunchpadProps> = ({
  goals,
  todayStr,
  userName = 'Champion',
  onClose,
}) => {
  // Pick quote deterministically by day
  const dayIndex = new Date(todayStr).getDay();
  const quote = DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];

  // Top 3 priority goals (incomplete today)
  const priorityGoals = goals
    .filter((g) => !g.archived)
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? '🌅 Good morning' : hour < 18 ? '☀️ Good afternoon' : '🌙 Good evening';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md px-3 py-4">
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative w-full max-w-sm bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Glow accent */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <NexusLogo size="sm" animated />
              <div>
                <p className="text-[11px] text-amber-400 font-mono font-semibold tracking-widest uppercase">Daily Launchpad</p>
                <p className="text-[13px] font-bold text-white">{greeting}, {userName.split(' ')[0]}!</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close launchpad"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Quote */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3.5">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] text-zinc-200 font-medium leading-snug italic">"{quote.text}"</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">— {quote.author}</p>
                </div>
              </div>
            </div>

            {/* Today's Priorities */}
            {priorityGoals.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-mono font-bold uppercase text-emerald-400 tracking-wider">Today's Priorities</span>
                </div>
                <div className="space-y-1.5">
                  {priorityGoals.map((goal, i) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/30 transition-colors"
                    >
                      <span className="text-[11px] font-mono text-zinc-500 shrink-0 w-4">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-zinc-100 truncate">{goal.name}</p>
                        {goal.dailyPlanItems && goal.dailyPlanItems[0] && (
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {goal.dailyPlanItems[0]}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sun summary */}
            <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <Sun className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-300 font-medium leading-snug">
                Every habit you complete today sharpens your five life categories. Let's build momentum!
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 pb-5">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 text-black font-extrabold text-sm tracking-wide shadow-lg shadow-amber-500/30 hover:opacity-90 transition-opacity active:scale-95"
            >
              🚀 Let's Conquer Today
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
