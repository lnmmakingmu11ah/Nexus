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

  // Determine milestone styling based on streak length
  let milestoneTitle = `${toast.streakDays}-DAY STREAK UNLOCKED!`;
  let icon = <Flame className="w-5 h-5 text-orange-400 fill-orange-400/40 animate-bounce" />;
  let badgeStyle = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  let cardBorder = 'border-orange-500/50 shadow-orange-950/30';
  let gradientBg = 'from-orange-950/90 via-zinc-950/95 to-zinc-950/95';
  let defaultMsg = `Outstanding momentum! You've maintained '${toast.goalName}' consistently for ${toast.streakDays} consecutive days.`;

  if (toast.streakDays >= 30) {
    milestoneTitle = '30-DAY LEGENDARY STREAK! ⭐';
    icon = <Star className="w-5 h-5 text-amber-300 fill-amber-300/60 animate-spin-slow" />;
    badgeStyle = 'bg-amber-500/25 text-amber-300 border-amber-500/50';
    cardBorder = 'border-amber-400/60 shadow-amber-950/40 ring-1 ring-amber-400/30';
    gradientBg = 'from-amber-950/90 via-zinc-950/95 to-zinc-950/95';
    defaultMsg = `Phenomenal dedication! Reaching 30 days on '${toast.goalName}' builds permanent life habits.`;
  } else if (toast.streakDays >= 14) {
    milestoneTitle = '14-DAY MILESTONE HIT! 🏆';
    icon = <Trophy className="w-5 h-5 text-emerald-400 fill-emerald-400/30 animate-pulse" />;
    badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    cardBorder = 'border-emerald-500/50 shadow-emerald-950/30';
    gradientBg = 'from-emerald-950/90 via-zinc-950/95 to-zinc-950/95';
    defaultMsg = `2 full weeks of unbroken consistency! Your discipline for '${toast.goalName}' is truly impressive.`;
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
