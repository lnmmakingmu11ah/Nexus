import React from 'react';
import {
  X,
  Target,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Zap,
  TrendingUp,
  ArrowRight,
  Flame,
  ShieldCheck,
  Compass,
  Folder,
  Sparkles,
} from 'lucide-react';
import { DailyGoalLog, Goal, Milestone, PlannedTask, UserConfig } from '../types';
import { getGoalPathway } from '../utils/goalPathways';

interface GoalPathwayModalProps {
  goal: Goal;
  plannedTasks: PlannedTask[];
  milestones: Milestone[];
  dailyLogs: DailyGoalLog[];
  userConfig: UserConfig;
  todayStr: string;
  onClose: () => void;
  onToggleGoal: (goalId: string) => void;
}

export const GoalPathwayModal: React.FC<GoalPathwayModalProps> = ({
  goal,
  plannedTasks,
  milestones,
  dailyLogs,
  userConfig,
  todayStr,
  onClose,
  onToggleGoal,
}) => {
  const pathway = getGoalPathway(goal, plannedTasks, milestones, dailyLogs, userConfig, todayStr);
  const isCompletedToday = pathway.todayTask.completed;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-start animate-fade-in">
      <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl max-w-2xl w-full p-5 sm:p-7 text-zinc-100 shadow-2xl shadow-black/90 space-y-6 relative my-4 sm:my-8 ring-1 ring-amber-500/20">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 rounded-full">
                🗺️ AI Execution Roadmap
              </span>
              <span className="text-[10px] font-mono uppercase text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Folder className="w-2.5 h-2.5 text-cyan-400" />
                <span>{pathway.folder}</span>
              </span>
              <span className="text-[10px] font-mono uppercase text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full capitalize">
                {pathway.domain} Domain
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {goal.name}
            </h2>

            {goal.description && (
              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                {goal.description}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
            aria-label="Close roadmap"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Today's Actionable Task Card */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isCompletedToday
            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
            : 'bg-zinc-900/80 border-amber-500/30 shadow-lg shadow-black/40'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Today’s Action Protocol</span>
            </span>

            <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>{pathway.todayTask.durationMinutes} mins</span>
              </span>
              <span>•</span>
              <span className="text-amber-300 font-semibold">
                Hardness: {pathway.todayTask.hardness}/5
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h4 className={`text-base font-bold transition-all ${
                isCompletedToday ? 'line-through text-zinc-400' : 'text-white'
              }`}>
                {pathway.todayTask.title}
              </h4>
              <p className="text-xs text-zinc-300 font-light leading-relaxed">
                {pathway.todayTask.description}
              </p>
            </div>

            <button
              onClick={() => onToggleGoal(goal.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0 active:scale-95 shadow-md ${
                isCompletedToday
                  ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-zinc-950 shadow-amber-500/20'
              }`}
            >
              {isCompletedToday ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                  <span>Done Today!</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 text-zinc-950" />
                  <span>Mark Done</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Tomorrow's Expected Task Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>Tomorrow’s Expected Task</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              ~{pathway.tomorrowTask.durationMinutes} mins scheduled
            </span>
          </div>

          <h4 className="text-sm font-bold text-zinc-100">
            {pathway.tomorrowTask.title}
          </h4>

          {/* Why Task A Enables Task B Callout */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
            <span className="text-[9px] font-mono font-bold uppercase text-amber-400 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-amber-400" />
              Why Today’s Action Unlocks Tomorrow
            </span>
            <p className="text-xs text-zinc-300/90 font-light leading-snug">
              {pathway.tomorrowTask.rationale}
            </p>
          </div>
        </div>

        {/* 3. Multi-Horizon Progression Stepper (Week, Month, Year/Mastery) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white font-bold text-xs uppercase tracking-wider">
              <Target className="w-4 h-4 text-amber-400" />
              <span>Multi-Horizon Progression Milestones</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              Where you should be over time
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Week's End Milestone */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {pathway.horizons.thisWeek.period}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Target Output Checkpoint</span>
              </div>
              <h5 className="text-xs font-bold text-white">{pathway.horizons.thisWeek.title}</h5>
              <p className="text-xs text-amber-200/90 font-mono font-medium">
                🎯 {pathway.horizons.thisWeek.targetMetric}
              </p>
              <p className="text-[11px] text-zinc-400 font-light">
                {pathway.horizons.thisWeek.description}
              </p>
            </div>

            {/* Month's End Checkpoint */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {pathway.horizons.thisMonth.period}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Phase 1 Benchmark</span>
              </div>
              <h5 className="text-xs font-bold text-white">{pathway.horizons.thisMonth.title}</h5>
              <p className="text-xs text-cyan-200/90 font-mono font-medium">
                🎯 {pathway.horizons.thisMonth.targetMetric}
              </p>
              <p className="text-[11px] text-zinc-400 font-light">
                {pathway.horizons.thisMonth.description}
              </p>
            </div>

            {/* Year & Master Mastery Horizon */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {pathway.horizons.masteryHorizon.period}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">Mastery Horizon</span>
              </div>
              <h5 className="text-xs font-bold text-white">{pathway.horizons.masteryHorizon.title}</h5>
              <p className="text-xs text-emerald-200/90 font-mono font-medium">
                🏆 {pathway.horizons.masteryHorizon.targetMetric}
              </p>
              <p className="text-[11px] text-zinc-400 font-light">
                {pathway.horizons.masteryHorizon.description}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Live Adaptive Velocity & Dynamic Timeline Tracker */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Velocity & Adaptive Calibration
              </h4>
            </div>

            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              pathway.adaptive.velocityStatus === 'accelerating'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : pathway.adaptive.velocityStatus === 'on_track'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {pathway.adaptive.velocityLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[9px] font-mono uppercase text-zinc-500 block">30d Consistency</span>
              <span className="text-base font-extrabold text-white font-mono">{pathway.adaptive.completionRate30d}%</span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[9px] font-mono uppercase text-zinc-500 block">Current Streak</span>
              <span className="text-base font-extrabold text-amber-400 font-mono">{pathway.adaptive.currentStreak}d</span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[9px] font-mono uppercase text-zinc-500 block">Horizon Target</span>
              <span className="text-xs font-extrabold text-emerald-400 font-mono leading-snug mt-1 block">
                {pathway.adaptive.projectedMasteryDate}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300 font-light leading-relaxed">
            <span className="font-semibold text-amber-300">How NEXUS tracks you: </span>
            {pathway.adaptive.adaptiveInsight}
          </div>
        </div>

        {/* Close Modal Footer */}
        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Close Roadmap
          </button>
        </div>
      </div>
    </div>
  );
};
