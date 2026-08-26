import React from 'react';
import { Layers, ArrowRight, CheckCircle2, Sparkles, X, Flame } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_NAMES, Goal } from '../types';

interface HabitStackPromptProps {
  completedGoal: Goal;
  nextGoal: Goal;
  stackingNote?: string;
  onCompleteNextGoal: () => void;
  onClose: () => void;
}

export const HabitStackPrompt: React.FC<HabitStackPromptProps> = ({
  completedGoal,
  nextGoal,
  stackingNote,
  onCompleteNextGoal,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950/95 backdrop-blur-2xl border border-amber-400/40 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl shadow-amber-950/60 relative space-y-6 overflow-hidden ring-1 ring-amber-500/25">
        {/* Glow Accent Background */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Habit Stack Activated
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">Maintain the Momentum!</h3>
          </div>
        </div>

        {/* Stack Connection Visual */}
        <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl space-y-3">
          {/* Finished Step */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-300 line-through font-medium">{completedGoal.name}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              DONE!
            </span>
          </div>

          {/* Connection Link */}
          <div className="flex items-center justify-center space-x-2 text-purple-400 text-xs py-0.5">
            <div className="h-px bg-purple-500/30 flex-1" />
            <div className="flex items-center space-x-1 px-2 py-0.5 bg-purple-950/90 rounded-full border border-purple-500/40 font-mono text-[10px]">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>CHAINED NEXT HABIT</span>
            </div>
            <div className="h-px bg-purple-500/30 flex-1" />
          </div>

          {/* Next Goal Step */}
          <div className="bg-zinc-900 border border-purple-500/40 p-3 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">{nextGoal.name}</span>
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded text-white font-medium"
                style={{ backgroundColor: CATEGORY_COLORS[nextGoal.category] }}
              >
                {CATEGORY_NAMES[nextGoal.category]}
              </span>
            </div>
            {nextGoal.description && (
              <p className="text-[11px] text-zinc-400 font-light line-clamp-2">
                {nextGoal.description}
              </p>
            )}
          </div>
        </div>

        {/* Stacking Note / Cue */}
        {stackingNote && (
          <div className="bg-purple-950/30 border border-purple-500/30 p-3 rounded-xl text-xs text-purple-200 space-y-1">
            <span className="text-[10px] uppercase font-mono text-purple-400 font-semibold tracking-wider">
              Transition Cue & Habit Anchor:
            </span>
            <p className="font-light italic">"{stackingNote}"</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={() => {
              onCompleteNextGoal();
              onClose();
            }}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center space-x-2 group"
          >
            <span>⚡ Complete {nextGoal.name} Now</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
          >
            I'll Do It Later
          </button>
        </div>
      </div>
    </div>
  );
};
