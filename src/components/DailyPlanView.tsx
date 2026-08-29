import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, SkipForward, Calendar, Clock, Flame,
  ChevronRight, AlertCircle, Loader2, TrendingUp, RotateCcw
} from 'lucide-react';
import { PlannedTask, Milestone, Goal, BehaviorProfile, TaskHardness, GoalDependency } from '../types';
import { aiClient } from '../services/aiClient';
import { savePlannedTasks } from '../utils/storage';
import { detectLapse, getTasksForDate } from '../utils/taskScheduler';
import { fallbackLapseRecovery } from '../utils/planFallbacks';
import { applyLapseRecoveryToTasks, computeEngagementTier } from '../utils/zeroToHero';

interface DailyPlanViewProps {
  tasks: PlannedTask[];
  milestones: Milestone[];
  goals: Goal[];
  goalDependencies?: GoalDependency[];
  behaviorProfile?: BehaviorProfile;
  userConfig: { userName?: string; behaviorProfile?: BehaviorProfile; lastBlueprintRewrite?: { summary?: string; dailyCap?: number } };
  onTasksUpdated: (tasks: PlannedTask[]) => void;
  onGoalCompleted?: (goalId: string) => void;
}


const HARDNESS_CONFIG: Record<TaskHardness, { label: string; color: string; dot: string }> = {
  1: { label: 'trivial', color: 'text-slate-400', dot: 'bg-slate-400' },
  2: { label: 'easy', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  3: { label: 'moderate', color: 'text-amber-400', dot: 'bg-amber-400' },
  4: { label: 'hard', color: 'text-orange-400', dot: 'bg-orange-400' },
  5: { label: 'extreme', color: 'text-red-400', dot: 'bg-red-400' },
};

export const DailyPlanView: React.FC<DailyPlanViewProps> = ({
  tasks, milestones, goals, goalDependencies = [], behaviorProfile, userConfig, onTasksUpdated, onGoalCompleted,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const cap = behaviorProfile?.currentDailyCap || 2;
  const scheduledToday = getTasksForDate(
    today,
    goals,
    milestones,
    tasks,
    goalDependencies,
    { maxNewTasksPerDay: cap },
    behaviorProfile
  );
  const scheduledIds = new Set(scheduledToday.map((t) => t.id));
  const todayTasks = tasks.filter(
    (t) =>
      t.scheduledDate === today &&
      (t.status === 'done' || t.status === 'skipped' || scheduledIds.has(t.id))
  );
  const doneTasks = todayTasks.filter(t => t.status === 'done');
  const pendingTasks = todayTasks.filter(t => t.status === 'pending');
  const skippedTasks = todayTasks.filter(t => t.status === 'skipped');

  const [framedTasks, setFramedTasks] = useState<Map<string, { framedTitle: string; motivationalNote: string }>>(new Map());
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [lapseMsg, setLapseMsg] = useState<string | null>(null);
  const [lapseLoading, setLapseLoading] = useState(false);

  const goalMap = new Map<string, Goal>(goals.map(g => [g.id, g]));
  const milestoneMap = new Map<string, Milestone>(milestones.map(m => [m.id, m]));

  // Check lapse on mount
  useEffect(() => {
    if (tasks.length > 0 && detectLapse(tasks, today, 2)) {
      loadLapseRecovery();
    }
  }, []);

  // Load AI framing for pending tasks (non-blocking)
  useEffect(() => {
    if (pendingTasks.length === 0) return;
    const needsFraming = pendingTasks.filter(t => !t.framedTitle);
    if (needsFraming.length === 0) return;

    setLoadingFrames(true);
    const taskData = needsFraming.map(t => ({
      title: t.title,
      description: t.description,
      hardness: t.hardness,
      goalName: goalMap.get(t.goalId)?.name || 'habit',
    }));

    aiClient.frameTasks({ tasks: taskData, behaviorProfile, userName: userConfig.userName })
      .then(result => {
        const map = new Map<string, { framedTitle: string; motivationalNote: string }>();
        result.framedTasks.forEach(ft => map.set(ft.title, { framedTitle: ft.framedTitle, motivationalNote: ft.motivationalNote }));
        setFramedTasks(map);
        // Persist framing
        const updatedTasks = tasks.map(t => {
          const frame = map.get(t.title);
          return frame ? { ...t, framedTitle: frame.framedTitle, motivationalNote: frame.motivationalNote } : t;
        });
        onTasksUpdated(updatedTasks);
        savePlannedTasks(updatedTasks);
      })
      .catch(() => { /* framing is cosmetic — silent fail */ })
      .finally(() => setLoadingFrames(false));
  }, [pendingTasks.length]);

  const loadLapseRecovery = async () => {
    if (lapseLoading) return;
    setLapseLoading(true);
    const mostMissedGoal = goals.find(g => g.planStatus === 'active')?.name || 'your goals';
    const missedDays = 2;
    try {
      const result = await aiClient.lapseRecovery({ missedCount: missedDays, goalName: mostMissedGoal, behaviorProfile });
      setLapseMsg(result.message);
      const tier = behaviorProfile?.engagementTier || computeEngagementTier(behaviorProfile);
      const shrunk = applyLapseRecoveryToTasks(
        tasks,
        goals.filter((g) => !g.archived).map((g) => g.id),
        tier,
        result.adjustedPlan
      );
      if (shrunk.some((t, i) => t.durationMinutes !== tasks[i]?.durationMinutes || t.hardness !== tasks[i]?.hardness)) {
        onTasksUpdated(shrunk);
        savePlannedTasks(shrunk);
      }
    } catch {
      setLapseMsg(fallbackLapseRecovery(missedDays, mostMissedGoal));
    } finally {
      setLapseLoading(false);
    }
  };

  const markDone = (taskId: string) => {
    const now = new Date().toISOString();
    const task = tasks.find(t => t.id === taskId);
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: 'done' as const, completedAt: now } : t);
    onTasksUpdated(updated);
    savePlannedTasks(updated);
    if (task?.goalId && onGoalCompleted) {
      onGoalCompleted(task.goalId);
    }
  };

  const markSkipped = (taskId: string, reason?: string) => {
    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, status: 'skipped' as const, skippedReason: reason || 'user skipped' } : t
    );
    onTasksUpdated(updated);
    savePlannedTasks(updated);
  };

  const reschedule = (taskId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, scheduledDate: tomorrowStr, status: 'pending' as const } : t
    );
    onTasksUpdated(updated);
    savePlannedTasks(updated);
  };

  if (todayTasks.length === 0) {
    return (
      <div className="text-center py-8 text-white/40 text-sm">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>no tasks planned for today yet</p>
        <p className="text-xs mt-1">use the Goal Intake chat below to build your plan</p>
      </div>
    );
  }

  const completionPct = todayTasks.length > 0 ? Math.round((doneTasks.length / todayTasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Lapse recovery banner */}
      {lapseMsg && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-300/90 leading-relaxed">{lapseMsg}</p>
          </div>
          <button onClick={() => setLapseMsg(null)} className="text-white/30 hover:text-white/60 flex-shrink-0">
            <span className="text-xs">✕</span>
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <span className="text-xs text-white/40 tabular-nums">{doneTasks.length}/{todayTasks.length}</span>
        {completionPct === 100 && (
          <span className="text-xs font-bold text-emerald-400">🔥 all done!!</span>
        )}
      </div>

      {/* Pending tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">Today's Tasks</p>
          {loadingFrames && (
            <div className="flex items-center gap-1.5 text-xs text-white/30 px-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              loading framing…
            </div>
          )}
          {pendingTasks.map(task => {
            const framed = framedTasks.get(task.title);
            const goal = goalMap.get(task.goalId);
            const hardnessCfg = HARDNESS_CONFIG[task.hardness] || HARDNESS_CONFIG[2];
            return (
              <div key={task.id} className="group relative p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => markDone(task.id)}
                    className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 border-white/25 hover:border-emerald-400 hover:bg-emerald-400/20 transition-all"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-snug">
                      {framed?.framedTitle || task.title}
                    </p>
                    {(framed?.motivationalNote || task.motivationalNote) && (
                      <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{framed?.motivationalNote || task.motivationalNote}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {goal && <span className="text-xs text-white/30">{goal.name}</span>}
                      <span className={`text-xs flex items-center gap-1 ${hardnessCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hardnessCfg.dot}`} />
                        {hardnessCfg.label}
                      </span>
                      <span className="text-xs text-white/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {task.durationMinutes}m
                      </span>
                    </div>
                  </div>
                  {/* Quick actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => reschedule(task.id)}
                      title="reschedule to tomorrow"
                      className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => markSkipped(task.id)}
                      title="skip today"
                      className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Done tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider px-1">Completed</p>
          {doneTasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-white/50 line-through">{task.framedTitle || task.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cap info */}
      {behaviorProfile && (
        <p className="text-xs text-white/25 px-1">
          Daily cap: {behaviorProfile.currentDailyCap} tasks
          {behaviorProfile.engagementTier === 'struggling'
            ? ' · rough week: two habits max'
            : behaviorProfile.engagementTier === 'disciplined'
              ? ' · disciplined mode: fewer micro-wins, heavier work'
              : ' · grows as you stay consistent'}
          {userConfig.lastBlueprintRewrite?.summary ? ` · ${userConfig.lastBlueprintRewrite.summary}` : ''}
        </p>
      )}
    </div>
  );
};
