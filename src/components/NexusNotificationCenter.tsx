import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Sparkles,
  Flame,
  Zap,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  MessageSquare,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldAlert,
  Activity,
  Brain,
  Smile,
  Shield,
  Heart,
} from 'lucide-react';
import { DailyGoalLog, Goal, UserConfig } from '../types';
import { ScoreCalculationResult } from '../utils/scoring';

interface NexusNotificationCenterProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string;
  scoreData: ScoreCalculationResult;
  userConfig: UserConfig;
  onToggleGoal: (goalId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export interface NexusNudge {
  id: string;
  type: 'priority' | 'habit' | 'decay' | 'win' | 'burnout';
  categoryKey?: 'health' | 'spiritual' | 'smarts' | 'selfCare' | 'happiness';
  title: string;
  message: string;
  actionTag: string;
  goalId?: string;
  goalName?: string;
  timestamp: string;
  timeContext: string; // 'Morning', 'Midday', 'Evening', 'Night', 'Just Now'
  read: boolean;
  dismissed: boolean;
  aiGenerated?: boolean;
}

export const NexusNotificationCenter: React.FC<NexusNotificationCenterProps> = ({
  goals,
  dailyLogs,
  todayStr,
  scoreData,
  userConfig,
  onToggleGoal,
  onNavigateTab,
}) => {
  const [nudges, setNudges] = useState<NexusNudge[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'priority' | 'habit' | 'decay' | 'win'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('nexus_dismissed_nudges');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [loadingAiNudge, setLoadingAiNudge] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [nativeNotifiedIds, setNativeNotifiedIds] = useState<Set<string>>(new Set());

  const userName = userConfig.userName || 'Champ';

  const requestNativeNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      new Notification('NEXUS alerts are on', {
        body: 'Streak rescues and habit nudges can now show outside the app.',
      });
    }
  };

  // Compute Time of Day
  const getTimeOfDay = (): { period: 'morning' | 'afternoon' | 'evening' | 'night'; label: string } => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { period: 'morning', label: 'Morning Launchpad' };
    if (hour >= 12 && hour < 18) return { period: 'afternoon', label: 'Midday Momentum' };
    if (hour >= 18 && hour < 22) return { period: 'evening', label: 'Evening Sunset Check' };
    return { period: 'night', label: 'Night Recovery' };
  };

  // Generate Proactive Nudges from local state & schedule engine
  useEffect(() => {
    const activeGoals = goals.filter((g) => !g.archived);
    const completedGoalIdsToday = new Set(
      dailyLogs.filter((l) => l.date === todayStr && l.completed).map((l) => l.goalId)
    );

    const generated: NexusNudge[] = [];
    const timeInfo = getTimeOfDay();

    // 1. STREAK RESCUE ALERT (At-risk habits with streaks > 1 that are uncompleted today)
    activeGoals.forEach((goal) => {
      const currentStreak = scoreData.streakData[goal.id]?.streak || 0;
      const isCompleted = completedGoalIdsToday.has(goal.id);

      if (currentStreak >= 2 && !isCompleted) {
        generated.push({
          id: `streak-risk-${goal.id}-${todayStr}`,
          type: 'priority',
          categoryKey: goal.category,
          title: `Streak Rescue Alert: ${goal.name}`,
          message: `yo ${userName}!! your ${currentStreak}-day streak on ${goal.name} is on the line today! 2 mins is all it takes fr 🚨`,
          actionTag: 'Protect Streak',
          goalId: goal.id,
          goalName: goal.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timeContext: timeInfo.label,
          read: false,
          dismissed: false,
        });
      }
    });

    // 2. HABIT SCHEDULE NUDGES (Uncompleted habits scheduled or high difficulty)
    const pendingGoals = activeGoals.filter((g) => !completedGoalIdsToday.has(g.id));
    if (pendingGoals.length > 0) {
      const topPending = pendingGoals[0];
      generated.push({
        id: `pending-habit-${topPending.id}-${todayStr}`,
        type: 'habit',
        categoryKey: topPending.category,
        title: `Scheduled Habit: ${topPending.name}`,
        message: `hey ${userName}! ${topPending.name} is ready for u. let's lock in and clear it real quick! ⚡`,
        actionTag: 'Quick Complete',
        goalId: topPending.id,
        goalName: topPending.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeContext: timeInfo.label,
        read: false,
        dismissed: false,
      });
    }

    // 3. CATEGORY DECAY & BALANCE WARNINGS
    const categoryEntries = Object.entries(scoreData.scores) as [
      'health' | 'spiritual' | 'smarts' | 'selfCare' | 'happiness',
      number
    ][];
    categoryEntries.forEach(([catKey, val]) => {
      if (val < 45) {
        const catName = catKey.charAt(0).toUpperCase() + catKey.slice(1);
        generated.push({
          id: `decay-${catKey}-${todayStr}`,
          type: 'decay',
          categoryKey: catKey,
          title: `${catName} Category Score Dipping`,
          message: `heads up ${userName}!! your ${catName} score is down at ${val}%. hit a ${catName} habit to stop the decay! 🛡️`,
          actionTag: 'Boost Score',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timeContext: 'Decay Alert',
          read: false,
          dismissed: false,
        });
      }
    });

    // 4. WIN CELEBRATION NUDGE
    if (scoreData.composite >= 80) {
      generated.push({
        id: `win-composite-${todayStr}`,
        type: 'win',
        title: 'NEXUS Score Milestone Achieved!',
        message: `omg ${userName}!! your NEXUS composite score is at ${scoreData.composite}% today!! absolute legend behavior fr ✨`,
        actionTag: 'Celebrate Win',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeContext: 'Daily Milestone',
        read: false,
        dismissed: false,
      });
    } else if (activeGoals.length > 0 && pendingGoals.length === 0) {
      generated.push({
        id: `win-100percent-${todayStr}`,
        type: 'win',
        title: '100% Execution Day Locked In!',
        message: `SLAY ${userName}!! all scheduled habits completed for today! momentum is off the charts 🏆`,
        actionTag: 'Perfect Day',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeContext: 'Daily Milestone',
        read: false,
        dismissed: false,
      });
    }

    (userConfig.adaptiveWarnings || []).slice(-6).forEach((warning) => {
      generated.push({
        id: `timeline-${warning.id}`,
        type: warning.direction === 'slipped' ? 'decay' : 'win',
        title: warning.direction === 'slipped' ? `Timeline slipped: ${warning.goalName}` : `Timeline improved: ${warning.goalName}`,
        message: warning.message,
        actionTag: warning.direction === 'slipped' ? 'Do a tiny step' : 'Keep going',
        goalId: warning.goalId,
        goalName: warning.goalName,
        timestamp: new Date(warning.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeContext: timeInfo.label,
        read: warning.read,
        dismissed: false,
      });
    });

    // Filter out locally dismissed nudge IDs
    const filtered = generated.filter((n) => !dismissedIds.has(n.id));
    setNudges(filtered);
  }, [goals, dailyLogs, todayStr, scoreData.composite, userConfig.userName, dismissedIds]);

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const urgentNudges = nudges.filter((n) => n.type === 'priority' || n.type === 'decay' || n.aiGenerated);
    urgentNudges.forEach((nudge) => {
      if (nativeNotifiedIds.has(nudge.id)) return;
      try {
        new Notification(nudge.title, {
          body: nudge.message,
          tag: nudge.id,
        });
        setNativeNotifiedIds((prev) => new Set(prev).add(nudge.id));
      } catch (e) {
        console.error('Native nudge notification failed:', e);
      }
    });
  }, [nudges, nativeNotifiedIds]);

  const handleDismiss = (id: string) => {
    const updated = new Set(dismissedIds);
    updated.add(id);
    setDismissedIds(updated);
    try {
      localStorage.setItem('nexus_dismissed_nudges', JSON.stringify(Array.from(updated)));
    } catch (e) {
      console.error('Error saving dismissed nudges:', e);
    }
  };

  const handleFetchAiNudge = async () => {
    setLoadingAiNudge(true);
    try {
      const activeGoals = goals.filter((g) => !g.archived);
      const completedGoalIdsToday = new Set(
        dailyLogs.filter((l) => l.date === todayStr && l.completed).map((l) => l.goalId)
      );

      const pending = activeGoals
        .filter((g) => !completedGoalIdsToday.has(g.id))
        .map((g) => ({
          id: g.id,
          name: g.name,
          category: g.category,
          streak: scoreData.streakData[g.id]?.streak || 0,
        }));

      const atRisk = pending.filter((p) => p.streak >= 2);

      const lowestCat = (Object.entries(scoreData.scores) as [string, number][]).sort(
        (a, b) => a[1] - b[1]
      )[0];

      const res = await fetch('/api/ai/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          timeOfDay: getTimeOfDay().period,
          compositeScore: scoreData.composite,
          completedCount: activeGoals.length - pending.length,
          totalGoalsCount: activeGoals.length,
          pendingGoals: pending,
          atRiskStreaks: atRisk,
          lowestCategory: lowestCat ? { category: lowestCat[0], score: lowestCat[1] } : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newNudge: NexusNudge = {
          id: `ai-nudge-${Date.now()}`,
          type: data.category === 'health' ? 'priority' : 'habit',
          categoryKey: data.category || 'smarts',
          title: 'Fresh NEXUS AI Nudge',
          message: data.message || `yo ${userName}!! let's lock in and crush your goals fr 🔥`,
          actionTag: data.actionTag || 'NEXUS Direct',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timeContext: 'Live AI Nudge',
          read: false,
          dismissed: false,
          aiGenerated: true,
        };
        setNudges((prev) => [newNudge, ...prev]);
      }
    } catch (e) {
      console.error('Failed to fetch AI nudge:', e);
    } finally {
      setLoadingAiNudge(false);
    }
  };

  const visibleNudges = nudges.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  const unreadCount = visibleNudges.length;

  const getTypeIcon = (type: NexusNudge['type']) => {
    switch (type) {
      case 'priority':
        return <Flame className="w-4 h-4 text-amber-400 animate-pulse" />;
      case 'habit':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'decay':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'win':
        return <Trophy className="w-4 h-4 text-amber-300" />;
      case 'burnout':
        return <ShieldAlert className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 transition-all duration-300">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
              <Bell className="w-4 h-4" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-black font-mono">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
              <span>NEXUS Proactive Notification Center</span>
              <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Live Companion
              </span>
            </h3>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Contextual nudges, streak alerts & real-time habit schedule reminders in NEXUS persona
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleFetchAiNudge}
            disabled={loadingAiNudge}
            className="flex items-center space-x-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs px-2.5 py-1.5 rounded-xl transition-all font-medium disabled:opacity-50"
            title="Ask NEXUS for fresh live AI nudge"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingAiNudge ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Ask NEXUS</span>
          </button>

          {typeof Notification !== 'undefined' && notificationPermission !== 'granted' && (
            <button
              onClick={requestNativeNotifications}
              className="flex items-center space-x-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1.5 rounded-xl transition-all font-medium"
              title="Allow native notifications for NEXUS alerts"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enable Alerts</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Nudges' },
              { id: 'priority', label: '🚨 Priority Streaks' },
              { id: 'habit', label: '⏰ Habit Schedule' },
              { id: 'decay', label: '⚠️ Decay & Risks' },
              { id: 'win', label: '🎉 Wins' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Nudge Feed List */}
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            <AnimatePresence>
              {visibleNudges.length === 0 ? (
                <div className="p-6 text-center bg-zinc-950/50 border border-zinc-800/50 rounded-xl space-y-2">
                  <Sparkles className="w-6 h-6 text-emerald-400 mx-auto animate-bounce" />
                  <p className="text-xs text-zinc-300 font-medium">All caught up!! No pending alerts fr 🔥</p>
                  <p className="text-[11px] text-zinc-500 font-light">
                    NEXUS is monitoring your schedule and habits in real-time.
                  </p>
                </div>
              ) : (
                visibleNudges.map((nudge) => {
                  const isGoalCompletedToday = nudge.goalId
                    ? dailyLogs.some((l) => l.goalId === nudge.goalId && l.date === todayStr && l.completed)
                    : false;

                  return (
                    <motion.div
                      key={nudge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-3.5 rounded-xl border transition-all duration-200 relative group flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        nudge.type === 'priority'
                          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400/60'
                          : nudge.type === 'decay'
                          ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400/60'
                          : nudge.type === 'win'
                          ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400/60'
                          : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0">
                          {getTypeIcon(nudge.type)}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white tracking-tight">
                              {nudge.title}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                              {nudge.timeContext}
                            </span>
                            {nudge.aiGenerated && (
                              <span className="text-[9px] font-semibold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                                AI Generated
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-zinc-300 font-sans leading-relaxed font-normal italic">
                            "{nudge.message}"
                          </p>

                          <div className="flex items-center space-x-2 text-[10px] text-zinc-500">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>{nudge.timestamp}</span>
                            <span>•</span>
                            <span className="text-amber-400/90 font-medium">NEXUS Companion</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
                        {nudge.goalId && (
                          <button
                            onClick={() => onToggleGoal(nudge.goalId!)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                              isGoalCompletedToday
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-emerald-500 text-black hover:bg-emerald-400 font-bold'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isGoalCompletedToday ? 'Completed!' : 'Quick Complete'}</span>
                          </button>
                        )}

                        {onNavigateTab && (
                          <button
                            onClick={() => onNavigateTab('aicoach')}
                            className="flex items-center space-x-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2.5 py-1.5 rounded-xl transition-colors"
                            title="Chat with NEXUS about this habit"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Talk NEXUS</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDismiss(nudge.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 bg-zinc-900/60 border border-zinc-800 rounded-lg transition-colors"
                          title="Dismiss Nudge"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
