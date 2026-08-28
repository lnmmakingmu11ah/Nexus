import React, { useEffect, useState } from 'react';
import { Flame, Trophy, Star, Sparkles, X, CheckCircle2 } from 'lucide-react';

export interface StreakToastData {
  id: string;
  goalName: string;
  streakDays: number;
  message?: string;
}

interface StreakToastProps {
  toasts: StreakToastData[];
  onDismiss: (id: string) => void;
}

export const StreakToastContainer: React.FC<StreakToastProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <SingleStreakToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const SingleStreakToast: React.FC<{
  toast: StreakToastData;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation
    const animTimer = setTimeout(() => setVisible(true), 10);
    // Auto dismiss after 6s
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 6000);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onDismiss]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  // Determine milestone styling and rewards based on streak length
  let milestoneTitle = `${toast.streakDays}-DAY STREAK UNLOCKED! ⚡`;
  let icon = <Flame className="w-5 h-5 text-orange-400 fill-orange-400/40 animate-bounce" />;
  let badgeStyle = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  let cardBorder = 'border-orange-500/50 shadow-orange-950/30';
  let gradientBg = 'from-orange-950/90 via-zinc-950/95 to-zinc-950/95';
  let defaultMsg = `Outstanding momentum! You've maintained '${toast.goalName}' consistently for ${toast.streakDays} consecutive days.`;
  let xpRewardLabel = '+1.25x XP Multiplier Active';

  if (toast.streakDays >= 100) {
    milestoneTitle = '💎 100-DAY CENTURION LEGEND!';
    icon = <Sparkles className="w-5 h-5 text-cyan-300 fill-cyan-300/60 animate-spin-slow" />;
    badgeStyle = 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50';
    cardBorder = 'border-cyan-400/60 shadow-cyan-950/40 ring-2 ring-cyan-400/40';
    gradientBg = 'from-cyan-950/90 via-zinc-950/95 to-zinc-950/95';
    defaultMsg = `100 straight days of pure mastery on '${toast.goalName}'. You are unstoppable!`;
    xpRewardLabel = '🔥 MAX 2.5x XP Boost Active';
  } else if (toast.streakDays >= 60) {
    milestoneTitle = '🦁 60-DAY TITAN STREAK!';
    icon = <Trophy className="w-5 h-5 text-pink-400 fill-pink-400/40 animate-bounce" />;
    badgeStyle = 'bg-pink-500/25 text-pink-300 border-pink-500/50';
    cardBorder = 'border-pink-400/60 shadow-pink-950/40 ring-1 ring-pink-400/30';
    gradientBg = 'from-pink-950/90 via-zinc-950/95 to-zinc-950/95';
    defaultMsg = `2 full months without missing a beat on '${toast.goalName}'. New identity solidified.`;
    xpRewardLabel = '🔥 2.5x XP Multiplier Active';
  } else if (toast.streakDays >= 30) {
    milestoneTitle = '⭐ 30-DAY LEGENDARY STREAK!';
    icon = <Star className="w-5 h-5 text-amber-300 fill-amber-300/60 animate-spin-slow" />;
    badgeStyle = 'bg-amber-500/25 text-amber-300 border-amber-500/50';
    cardBorder = 'border-amber-400/60 shadow-amber-950/40 ring-1 ring-amber-400/30';
    gradientBg = 'from-amber-950/90 via-zinc-950/95 to-zinc-950/95';
    defaultMsg = `Phenomenal dedication! Reaching 30 days on '${toast.goalName}' builds permanent life habits.`;
    xpRewardLabel = '🔥 2.5x XP Multiplier Active';
  } else if (toast.streakDays >= 14) {
    milestoneTitle = '🏆 14-DAY MILESTONE HIT!';
    icon = <Trophy className="w-5 h-5 text-emerald-400 fill-emerald-400/30 animate-pulse" />;
    badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    cardBorder = 'border-emerald-500/50 shadow-emerald-950/30';
    gradientBg = 'from-emerald-950/90 via-zinc-950/95 to-zinc-950/95';
    defaultMsg = `2 full weeks of unbroken consistency! Your discipline for '${toast.goalName}' is truly impressive.`;
    xpRewardLabel = '⚡ 2.0x XP Multiplier Active';
  } else if (toast.streakDays >= 7) {
    milestoneTitle = '👑 7-DAY WARRIOR STREAK!';
    icon = <Flame className="w-5 h-5 text-yellow-400 fill-yellow-400/40 animate-bounce" />;
    badgeStyle = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    cardBorder = 'border-yellow-500/50 shadow-yellow-950/30';
    gradientBg = 'from-yellow-950/90 via-zinc-950/95 to-zinc-950/95';
    defaultMsg = `A full week down on '${toast.goalName}'! You're creating real neuro-pathways.`;
    xpRewardLabel = '⚡ 1.5x XP Multiplier Active';
  } else if (toast.streakDays >= 3) {
    milestoneTitle = '⚡ 3-DAY MOMENTUM STREAK!';
    icon = <Flame className="w-5 h-5 text-amber-400 fill-amber-400/40 animate-bounce" />;
    badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    cardBorder = 'border-amber-500/50 shadow-amber-950/30';
    gradientBg = 'from-amber-950/90 via-zinc-950/95 to-zinc-950/95';
    defaultMsg = `3 days straight on '${toast.goalName}'! The hardest step is behind you.`;
    xpRewardLabel = '⚡ 1.25x XP Multiplier Active';
  }

  return (
    <div
      className={`pointer-events-auto bg-gradient-to-r ${gradientBg} border ${cardBorder} shadow-2xl rounded-2xl p-4 transition-all duration-300 transform ${
        visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 shrink-0 mt-0.5">
            {icon}
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border tracking-wider uppercase ${badgeStyle}`}
              >
                <Sparkles className="w-3 h-3" />
                <span>{milestoneTitle}</span>
              </span>
            </div>

            <h4 className="text-sm font-semibold text-white tracking-tight leading-snug">
              {toast.goalName}
            </h4>

            <p className="text-xs text-zinc-300 font-light mt-1 leading-relaxed">
              {toast.message || defaultMsg}
            </p>

            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-mono font-semibold text-white">
              <span>{xpRewardLabel}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle Auto-dismiss progress bar */}
      <div className="mt-3 w-full bg-zinc-800/80 rounded-full h-1 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-[6000ms] ease-linear ${
            visible ? 'w-0' : 'w-full'
          } ${
            toast.streakDays >= 30
              ? 'bg-amber-400'
              : toast.streakDays >= 14
              ? 'bg-emerald-400'
              : 'bg-orange-400'
          }`}
        />
      </div>
    </div>
  );
};
