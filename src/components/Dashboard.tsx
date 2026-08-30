import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import {
  CheckCircle2,
  Circle,
  Flame,
  Camera,
  Plus,
  AlertTriangle,
  Activity,
  Sparkles,
  Zap,
  Layers,
  Heart,
  Brain,
  Smile,
  Shield,
  Crown,
  Trophy,
  TrendingUp,
  Award,
  Star,
  Folder,
  FolderPlus,
  Clock,
  Bell,
  LayoutGrid,
  ListFilter,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Target,
  RefreshCw,
  X,
} from 'lucide-react';
import { loadCustomFolders, saveCustomFolders } from '../utils/storage';
import { selectDailyFocusGoals, capFromProfile } from '../utils/dailyCap';
import { daysSince } from '../utils/weeklyBlueprint';
import {
  CATEGORY_COLORS,
  CATEGORY_NAMES,
  CategoryKey,
  DailyGoalLog,
  Goal,
  UserConfig,
} from '../types';
import { ScoreCalculationResult, calculateGoalBestStreak } from '../utils/scoring';
import { MonthlyCalendar } from './MonthlyCalendar';
import { DailyIntention } from './DailyIntention';
import { evaluateBadges } from '../utils/badges';
import { calculateNexusPoints } from '../utils/gamification';
import { DailyJournal } from '../types';

interface DashboardProps {
  scoreData: ScoreCalculationResult;
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  journals?: DailyJournal[];
  todayStr: string;
  userConfig: UserConfig;
  onToggleGoal: (goalId: string) => void;
  onOpenProofModal: (goal: Goal) => void;
  onOpenAddGoal: () => void;
  onToggleHealthSync: (enabled: boolean) => void;
  onTriggerStreakToast?: (goalName: string, streakDays: number, msg?: string) => void;
  onUpdateUserConfig?: (updated: UserConfig) => void;
  onNavigateTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  scoreData,
  goals,
  dailyLogs,
  journals = [],
  todayStr,
  userConfig,
  onToggleGoal,
  onOpenProofModal,
  onOpenAddGoal,
  onToggleHealthSync,
  onTriggerStreakToast,
  onUpdateUserConfig,
  onNavigateTab,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [filterStreak, setFilterStreak] = useState<'all' | 'over5' | 'best'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'folderGrouped'>('grid');
  const [folders, setFolders] = useState<string[]>(loadCustomFolders);
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [rewriteBannerDismissed, setRewriteBannerDismissed] = useState<boolean>(false);

  const showRewriteBanner =
    !rewriteBannerDismissed &&
    !!userConfig.lastBlueprintRewrite?.summary &&
    daysSince(userConfig.lastBlueprintRewrite?.at) < 3;

  const { unlockedBadgeIds, hasNewUnlocks } = evaluateBadges(
    goals,
    dailyLogs,
    journals,
    scoreData.composite,
    scoreData.scores,
    userConfig
  );

  useEffect(() => {
    if (hasNewUnlocks && onUpdateUserConfig) {
      onUpdateUserConfig({
        ...userConfig,
        unlockedBadges: unlockedBadgeIds,
      });
    }
  }, [hasNewUnlocks, unlockedBadgeIds, userConfig, onUpdateUserConfig]);

  const handleCreateFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFolderNameInput.trim();
    if (!trimmed) return;
    if (!folders.includes(trimmed)) {
      const updated = [...folders, trimmed];
      setFolders(updated);
      saveCustomFolders(updated);
    }
    setFilterFolder(trimmed);
    setNewFolderNameInput('');
    setShowFolderModal(false);
  };

  const dailyCap = userConfig.behaviorProfile?.currentDailyCap || capFromProfile(userConfig.behaviorProfile);
  const focusGoals = selectDailyFocusGoals(goals, dailyLogs, dailyCap, todayStr);
  const focusIds = new Set(focusGoals.map((g) => g.id));
  const parkedCount = goals.filter((g) => {
    if (g.archived || g.frequency === 'weekly') return false;
    if (g.planStatus === 'paused' || g.planStatus === 'completed') return false;
    return g.priority === 'parking_lot' || !focusIds.has(g.id);
  }).length;
  const usingDefaultFilters = filterFolder === 'all' && filterCategory === 'all' && filterStreak === 'all';
  const activeGoals = usingDefaultFilters
    ? focusGoals
    : goals.filter((g) => !g.archived);

  // Compute best streaks & streak highlights across active goals
  const bestStreaksMap: Record<string, number> = {};
  activeGoals.forEach((g) => {
    bestStreaksMap[g.id] = calculateGoalBestStreak(
      g.id,
      dailyLogs,
      todayStr,
      userConfig?.absenceThresholdDays || 3
    );
  });

  const over5StreakGoals = activeGoals.filter(
    (g) => (scoreData.streakData[g.id]?.streak || 0) > 5
  );

  const lifetimeBestGoals = activeGoals.filter((g) => {
    const current = scoreData.streakData[g.id]?.streak || 0;
    const best = bestStreaksMap[g.id] || 0;
    return current > 0 && current >= best;
  });

  const maxStreak = Math.max(0, ...activeGoals.map((g) => scoreData.streakData[g.id]?.streak || 0));

  const filteredByFolder =
    filterFolder === 'all'
      ? activeGoals
      : activeGoals.filter((g) => (g.folder || 'General') === filterFolder);

  const filteredByCategory =
    filterCategory === 'all'
      ? filteredByFolder
      : filteredByFolder.filter((g) => g.category === filterCategory);

  const filteredGoals = filteredByCategory.filter((goal) => {
    const s = scoreData.streakData[goal.id]?.streak || 0;
    const best = bestStreaksMap[goal.id] || 0;
    if (filterStreak === 'over5') return s > 5;
    if (filterStreak === 'best') return s > 0 && s >= best;
    return true;
  });

  // Radar chart data mapping
  const radarData = [
    { subject: 'Health', score: scoreData.scores.health, fullMark: 100 },
    { subject: 'Spiritual', score: scoreData.scores.spiritual, fullMark: 100 },
    { subject: 'Smarts', score: scoreData.scores.smarts, fullMark: 100 },
    { subject: 'Self-Care', score: scoreData.scores.selfCare, fullMark: 100 },
    { subject: 'Happiness', score: scoreData.scores.happiness, fullMark: 100 },
  ];

  // Map category icons
  const getCategoryIcon = (key: CategoryKey) => {
    switch (key) {
      case 'health':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'spiritual':
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
      case 'smarts':
        return <Brain className="w-4 h-4 text-amber-400" />;
      case 'selfCare':
        return <Shield className="w-4 h-4 text-teal-400" />;
      case 'happiness':
        return <Smile className="w-4 h-4 text-rose-400" />;
    }
  };

  const logsTodayMap = new Map<string, DailyGoalLog>();
  dailyLogs.forEach((l) => {
    if (l.date === todayStr) logsTodayMap.set(l.goalId, l);
  });

  const completedTodayCount = activeGoals.filter((g) => logsTodayMap.get(g.id)?.completed).length;
  const pendingMissionGoals = activeGoals.filter((g) => !logsTodayMap.get(g.id)?.completed);
  const priorityMissionGoal =
    pendingMissionGoals.find((g) => (g.priority || 'active') === 'active') ||
    pendingMissionGoals.find((g) => (g.priority || 'active') === 'maintenance') ||
    pendingMissionGoals[0];
  const missionPercent = activeGoals.length > 0 ? Math.round((completedTodayCount / activeGoals.length) * 100) : 0;
  const nexusPoints = calculateNexusPoints(goals, dailyLogs, todayStr, userConfig);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-emerald-500/25 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-emerald-950/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300">Today's Mission</span>
            <button
              type="button"
              onClick={() => priorityMissionGoal ? onToggleGoal(priorityMissionGoal.id) : onOpenAddGoal()}
              className="text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg"
            >
              What should I do next?
            </button>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {priorityMissionGoal ? priorityMissionGoal.name : 'Set one real move for today'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              {priorityMissionGoal
                ? priorityMissionGoal.description || 'One clean completion keeps the system honest.'
                : 'Create a goal or open the AI planner when you are ready to give NEXUS something concrete to track.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-full lg:min-w-[480px]">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Progress</p>
            <p className="text-xl font-bold text-emerald-400 font-mono">{missionPercent}%</p>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Done</p>
            <p className="text-xl font-bold text-white font-mono">{completedTodayCount}/{activeGoals.length}</p>
          </div>
          <div className="bg-zinc-950/80 border border-amber-500/25 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-zinc-500 uppercase font-mono">NEXUS XP</p>
              {nexusPoints.todayStreakMultiplier > 1 && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {nexusPoints.todayStreakMultiplier}x
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-amber-300 font-mono">+{nexusPoints.todayPoints}</p>
            <p className="text-[10px] text-zinc-400 truncate font-mono">
              Lvl {nexusPoints.level} · {nexusPoints.levelTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => priorityMissionGoal ? onToggleGoal(priorityMissionGoal.id) : onOpenAddGoal()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl p-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <span>{priorityMissionGoal ? 'Mark Done' : 'Add Goal'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Major Life Targets Banner (Ultimate Endpoints) */}
      {((userConfig.masterBlueprint?.lifetimeMegaGoals && userConfig.masterBlueprint.lifetimeMegaGoals.length > 0) ||
        (userConfig.userIdentity?.lifeGoals && userConfig.userIdentity.lifeGoals.length > 0)) && (
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-amber-500/25 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Major Life Targets</h3>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Ultimate Endpoints
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(userConfig.masterBlueprint?.lifetimeMegaGoals || (userConfig.userIdentity?.lifeGoals || []).map((g) => ({ title: g, timelineEstimate: 'Long-term' }))).slice(0, 4).map((mg, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{mg.title}</span>
                    {mg.timelineEstimate && (
                      <span className="text-[10px] text-zinc-500 font-mono">({mg.timelineEstimate})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('aicoach')}
              className="self-start sm:self-auto shrink-0 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors flex items-center gap-1"
            >
              <span>View Blueprint</span>
              <ArrowRight className="w-3 h-3 text-amber-400" />
            </button>
          )}
        </div>
      )}

      {/* Composite Life Score & Overview Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Radar Chart Section (7 cols) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-4 transition-all duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Category Balance Matrix</span>
              </h2>
              <p className="text-xs text-zinc-400 font-light mt-0.5">
                5-Axis balance analysis based on daily habit completions & decay
              </p>
            </div>
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="relative flex items-center space-x-2 bg-emerald-500/10 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 shadow-sm shadow-emerald-500/10 overflow-hidden group"
            >
              {/* Subtle pulsing background aura */}
              <div className="absolute -inset-1 rounded-xl bg-emerald-500/15 blur-sm animate-pulse pointer-events-none" />
              <span className="relative z-10 text-xs text-emerald-400/90 font-medium uppercase tracking-wider flex items-center space-x-1.5">
                <span className="relative flex h-2 w-2 mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>NEXUS Score</span>
              </span>
              <span className="relative z-10 text-lg font-mono font-extrabold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
                {scoreData.composite}%
              </span>
            </motion.div>
          </div>

          <div className="h-64 sm:h-72 w-full my-auto flex items-center justify-center py-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#71717a', fontSize: 9 }}
                />
                <Radar
                  name="Life Score"
                  dataKey="score"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.25}
                  dot={{ r: 3, fill: '#10b981' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f4f4f5',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-3 border-t border-zinc-800/60 text-center">
            {(Object.keys(CATEGORY_NAMES) as CategoryKey[]).map((catKey) => {
              const score = scoreData.scores[catKey];
              const decay = scoreData.absenceDecays[catKey];
              return (
                <div
                  key={catKey}
                  className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 flex flex-col items-center justify-between shadow-sm"
                >
                  <div className="flex items-center space-x-1 mb-1">
                    {getCategoryIcon(catKey)}
                    <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[60px]">
                      {CATEGORY_NAMES[catKey].split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-bold text-zinc-100">{score}%</span>
                  {decay > 0 ? (
                    <span className="text-[9px] text-rose-400 font-mono flex items-center mt-0.5">
                      -<AlertTriangle className="w-2.5 h-2.5 mr-0.5 inline" />
                      {decay.toFixed(1)}/d
                    </span>
                  ) : (
                    <span className="text-[9px] text-emerald-400/80 font-mono mt-0.5">Stable</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown & Decay Alerts (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-4 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-3">
              <h3 className="text-base font-bold text-white">Category Status</h3>
              <div className="flex items-center space-x-1 text-xs text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <span>{scoreData.totalCompleted} / {scoreData.totalGoals} Completed</span>
              </div>
            </div>

            <div className="space-y-3.5">
              {(Object.keys(CATEGORY_NAMES) as CategoryKey[]).map((catKey) => {
                const score = scoreData.scores[catKey];
                const decay = scoreData.absenceDecays[catKey];
                const colorInfo = CATEGORY_COLORS[catKey];

                return (
                  <div
                    key={catKey}
                    className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(catKey)}
                        <span className="text-xs font-semibold text-zinc-200">
                          {CATEGORY_NAMES[catKey]}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {decay > 0 && (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-mono">
                            Decaying (-{decay.toFixed(1)}%/d)
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-zinc-100">
                          {score}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${score}%`,
                          backgroundColor: colorInfo.hex,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Health API Integration Toggle */}
          <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">Health API Sync</p>
                <p className="text-[10px] text-zinc-400 font-light">Fitbit & Wearables Sync Integration</p>
              </div>
            </div>
            <button
              onClick={() => onToggleHealthSync(!userConfig.healthApiSyncEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                userConfig.healthApiSyncEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              }`}
            >
              {userConfig.healthApiSyncEnabled ? 'Synced ✓' : 'Enable Sync'}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Intention & Focus Reset (Positioned below Category Balance Matrix graph) */}
      <DailyIntention todayStr={todayStr} userConfig={userConfig} />

      {/* Today's Goal Checklist Section */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 transition-all duration-300">
        {/* Personal Momentum Highlights Banner */}
        <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-zinc-950/90 border border-zinc-800/80 rounded-xl">
          <div className={`flex items-center space-x-3 p-2 rounded-lg border transition-all ${
            lifetimeBestGoals.length > 0
              ? 'bg-amber-500/10 border-amber-500/30 shadow-sm shadow-amber-950/20'
              : 'bg-amber-500/5 border-amber-500/10'
          }`}>
            <div className={`p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 ${
              lifetimeBestGoals.length > 0 ? 'animate-pulse' : ''
            }`}>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400/40" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Lifetime Best Records ⭐</p>
              <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 mt-0.5">
                {lifetimeBestGoals.length > 0 ? (
                  <>
                    <span className="text-amber-400 font-mono font-bold text-sm animate-pulse">{lifetimeBestGoals.length}</span>
                    <span className="text-zinc-300 text-[11px] truncate max-w-[120px]" title={lifetimeBestGoals[0]?.name}>
                      Habit{lifetimeBestGoals.length !== 1 ? 's' : ''} at Peak Record
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-500 text-[11px] italic">Build momentum today</span>
                )}
              </div>
            </div>
          </div>

          <div className={`flex items-center space-x-3 p-2 rounded-lg border transition-all ${
            over5StreakGoals.length > 0
              ? 'bg-orange-500/10 border-orange-500/30 shadow-sm shadow-orange-950/20'
              : 'bg-orange-500/5 border-orange-500/10'
          }`}>
            <div className={`p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 ${
              over5StreakGoals.length > 0 ? 'animate-pulse' : ''
            }`}>
              <Flame className="w-4 h-4 fill-orange-400/30 text-orange-400" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Hot Streaks (&gt;5 Days) 🔥</p>
              <p className="text-xs font-semibold text-zinc-100 mt-0.5">
                <span className={`text-orange-400 font-mono text-sm font-bold ${
                  over5StreakGoals.length > 0 ? 'animate-pulse' : ''
                }`}>{over5StreakGoals.length}</span> Habit{over5StreakGoals.length !== 1 ? 's' : ''} Ignited
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Top Momentum Boost</p>
              <p className="text-xs font-semibold text-emerald-400 font-mono text-sm font-bold mt-0.5">
                {Math.max(1.0, ...activeGoals.map((g) => scoreData.streakData[g.id]?.multiplier || 1.0)).toFixed(2)}x Multiplier
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
                <span>Today's Habit Checklist</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                  {todayStr}
                </span>
              </h3>
            </div>

            <p className="text-xs text-zinc-400 font-light mt-0.5">
              {usingDefaultFilters
                ? `Today's focus: ${Math.min(focusGoals.length, dailyCap)} of ${dailyCap} slots${
                    parkedCount ? ` · ${parkedCount} parked for a lighter week` : ''
                  }`
                : 'Organize habits into custom folders and complete routines to build streak multipliers'}
            </p>
            {showRewriteBanner && usingDefaultFilters && (
              <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/8 border border-amber-500/25 text-[11px] text-amber-300/90">
                <RefreshCw className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="flex-1 leading-relaxed">
                  <span className="font-semibold text-amber-200">Week rewrite</span>
                  {userConfig.lastBlueprintRewrite?.dailyCap ? ` · cap ${userConfig.lastBlueprintRewrite.dailyCap}` : ''}: {userConfig.lastBlueprintRewrite?.summary}
                </span>
                <button
                  onClick={() => setRewriteBannerDismissed(true)}
                  className="text-amber-400/60 hover:text-amber-300 flex-shrink-0"
                  aria-label="Dismiss rewrite banner"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* View Mode Toggle & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-0.5 bg-zinc-950 border border-zinc-800 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all flex items-center space-x-1 ${
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('folderGrouped')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all flex items-center space-x-1 ${
                  viewMode === 'folderGrouped'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Folder className="w-3 h-3 text-cyan-300" />
                <span>By Folders</span>
              </button>
            </div>

            {/* Streak Quick Filters */}
            <div className="flex items-center p-0.5 bg-zinc-950 border border-zinc-800 rounded-xl">
              <button
                onClick={() => setFilterStreak('all')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  filterStreak === 'all'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStreak('over5')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all flex items-center space-x-1 ${
                  filterStreak === 'over5'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'text-zinc-400 hover:text-orange-300'
                }`}
              >
                <span>🔥</span>
                <span>&gt;5d</span>
              </button>
              <button
                onClick={() => setFilterStreak('best')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all flex items-center space-x-1 ${
                  filterStreak === 'best'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-amber-300'
                }`}
              >
                <span>⭐</span>
                <span>Best</span>
              </button>
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              <option value="health">Health</option>
              <option value="spiritual">Spiritual Resonance</option>
              <option value="smarts">Smarts (Cognitive)</option>
              <option value="selfCare">Self-Care</option>
              <option value="happiness">Happiness</option>
            </select>

            <button
              onClick={onOpenAddGoal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-950/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Goal</span>
            </button>
          </div>
        </div>

        {/* Custom Category / Folder Label Pills Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none mb-3">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1 font-semibold">
            <Folder className="w-3.5 h-3.5 text-cyan-400" /> Custom Category Filter:
          </span>
          <button
            onClick={() => setFilterFolder('all')}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 ${
              filterFolder === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'bg-zinc-950/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All Labels ({activeGoals.length})
          </button>

          {Array.from(
            new Set([
              'Work',
              'Wellness',
              'Hobbies',
              'Personal',
              'General',
              ...folders,
              ...activeGoals.map((g) => g.folder || 'General'),
            ])
          ).map((folderName) => {
            const count = activeGoals.filter((g) => (g.folder || 'General') === folderName).length;
            const isSelected = filterFolder === folderName;

            return (
              <button
                key={folderName}
                onClick={() => setFilterFolder(folderName)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'bg-zinc-950/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <span>🏷️ {folderName}</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setShowFolderModal(true)}
            className="px-2.5 py-1 rounded-xl text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-zinc-950/80 hover:bg-emerald-950/30 border border-emerald-500/30 transition-all shrink-0 flex items-center space-x-1"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Custom Label</span>
          </button>
        </div>

        {/* Goal Items List */}
        {filteredGoals.length === 0 ? (
          <div className="text-center py-10 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <p className="text-xs text-zinc-400">
              {filterStreak !== 'all'
                ? `No habits currently match the '${filterStreak === 'over5' ? '>5 Days Hot Streak' : 'Lifetime Best'}' filter.`
                : 'No active goals in this view.'}
            </p>
            {filterStreak !== 'all' ? (
              <button
                onClick={() => setFilterStreak('all')}
                className="mt-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-amber-400 rounded-lg"
              >
                Show All Habits
              </button>
            ) : (
              <button
                onClick={onOpenAddGoal}
                className="mt-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs text-emerald-400 rounded-lg"
              >
                Create First Goal
              </button>
            )}
          </div>
        ) : viewMode === 'folderGrouped' ? (
          /* Folder-Grouped Layout View */
          <div className="space-y-6">
            {(
              Object.entries(
                filteredGoals.reduce((acc, goal) => {
                  const folderName = goal.folder || 'General';
                  if (!acc[folderName]) acc[folderName] = [];
                  acc[folderName].push(goal);
                  return acc;
                }, {} as Record<string, Goal[]>)
              ) as [string, Goal[]][]
            ).map(([folderName, folderGoals]) => {
              const completedCount = folderGoals.filter(
                (g) => logsTodayMap.get(g.id)?.completed === true
              ).length;
              const percent = Math.round((completedCount / folderGoals.length) * 100);

              return (
                <div
                  key={folderName}
                  className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3"
                >
                  {/* Folder Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                          <span>{folderName}</span>
                          <span className="text-xs font-mono font-normal text-zinc-400">
                            ({folderGoals.length} Habit{folderGoals.length !== 1 ? 's' : ''})
                          </span>
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-light">
                          {completedCount} of {folderGoals.length} completed today
                        </p>
                      </div>
                    </div>

                    {/* Folder Progress Bar */}
                    <div className="w-full sm:w-48 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                        <span>Folder Completion</span>
                        <span className="text-cyan-400 font-bold">{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Goal Cards Grid inside Folder */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {folderGoals.map((goal) => {
                      const log = logsTodayMap.get(goal.id);
                      const isCompleted = log?.completed === true;
                      const confidence = log?.verificationConfidence ?? (log?.proofVerified ? 85 : isCompleted ? 40 : 0);
                      const streakInfo = scoreData.streakData[goal.id] || {
                        streak: 0,
                        multiplier: 1.0,
                        missedDays: 0,
                      };

                      const bestStreak = bestStreaksMap[goal.id] || 0;
                      const isFlameOver5 = streakInfo.streak > 5;
                      const isLifetimeBest = streakInfo.streak > 0 && streakInfo.streak >= bestStreak;

                      let cardStyle = 'bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700/80';
                      if (isLifetimeBest) {
                        cardStyle = 'bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-950 border-amber-500/50 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/20';
                      } else if (isFlameOver5) {
                        cardStyle = 'bg-gradient-to-br from-orange-950/25 via-zinc-950 to-zinc-950 border-orange-500/40 shadow-sm shadow-orange-950/10';
                      } else if (isCompleted) {
                        cardStyle = 'bg-emerald-950/20 border-emerald-500/30';
                      }

                      return (
                        <div
                          key={goal.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${cardStyle}`}
                        >
                          <div>
                            <div className="flex items-start justify-between space-x-3 mb-1.5">
                              <div className="flex items-start space-x-2.5">
                                <button
                                  onClick={() => onToggleGoal(goal.id)}
                                  className="mt-0.5 text-zinc-400 hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-zinc-600 hover:text-emerald-400" />
                                  )}
                                </button>
                                <div>
                                  <h5
                                    className={`text-xs font-semibold ${
                                      isCompleted ? 'line-through text-zinc-400' : 'text-zinc-100'
                                    }`}
                                  >
                                    {goal.name}
                                  </h5>
                                  <p className="text-[10px] text-zinc-400 font-light mt-0.5 line-clamp-1">
                                    {goal.description}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0 text-[10px] font-mono text-amber-400">
                                <Flame className="w-3 h-3 fill-amber-400/30" />
                                <span>{streakInfo.streak}d</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-2">
                            <div className="flex items-center space-x-1 flex-wrap gap-y-0.5">
                              <span className="text-[9px] uppercase font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {CATEGORY_NAMES[goal.category]}
                              </span>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                                  goal.difficulty === 'high'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    : goal.difficulty === 'medium'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {goal.difficulty === 'high' ? '🔥 High' : goal.difficulty === 'low' ? '🌱 Low' : '⚡ Med'}
                              </span>
                              {goal.reminderTime && goal.reminderEnabled !== false && (
                                <span className="text-[9px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{goal.reminderTime}</span>
                                </span>
                              )}
                              {isCompleted && (
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                                    confidence >= 75
                                      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                                      : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                                  }`}
                                  title={log?.evidenceSummary || log?.proofVerificationResult || 'Completion evidence reviewed'}
                                >
                                  <Shield className="w-2.5 h-2.5" />
                                  <span>{confidence}% proof</span>
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => onOpenProofModal(goal)}
                              title="Attach proof or improve verification confidence"
                              className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors flex items-center gap-1 text-[10px]"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Proof</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredGoals.map((goal) => {
              const log = logsTodayMap.get(goal.id);
              const isCompleted = log?.completed === true;
              const confidence = log?.verificationConfidence ?? (log?.proofVerified ? 85 : isCompleted ? 40 : 0);
              const streakInfo = scoreData.streakData[goal.id] || {
                streak: 0,
                multiplier: 1.0,
                missedDays: 0,
              };

              const bestStreak = bestStreaksMap[goal.id] || 0;
              const isFlameOver5 = streakInfo.streak > 5;
              const isLifetimeBest = streakInfo.streak > 0 && streakInfo.streak >= bestStreak;

              // Card styling based on streak status
              let cardStyle = 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700/80';
              if (isLifetimeBest) {
                cardStyle = 'bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-950 border-amber-500/50 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/20';
              } else if (isFlameOver5) {
                cardStyle = 'bg-gradient-to-br from-orange-950/25 via-zinc-950 to-zinc-950 border-orange-500/40 shadow-sm shadow-orange-950/10';
              } else if (isCompleted) {
                cardStyle = 'bg-emerald-950/20 border-emerald-500/30';
              }

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${cardStyle}`}
                >
                  {/* Subtle Top Accent Ribbon for Lifetime Best or Hot (>5) Streaks */}
                  {isLifetimeBest && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />
                  )}
                  {isFlameOver5 && !isLifetimeBest && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
                  )}

                  <div>
                    {/* Visual Streak Highlights Badge Row */}
                    {(isLifetimeBest || isFlameOver5) && (
                      <div className="flex items-center space-x-1.5 mb-2.5 flex-wrap gap-1">
                        {isLifetimeBest && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
                            <span className="text-xs animate-bounce">⭐</span>
                            <span>LIFETIME BEST RECORD</span>
                          </span>
                        )}
                        {isFlameOver5 && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold animate-pulse ${
                            isLifetimeBest
                              ? 'bg-zinc-800/80 text-orange-300 border border-orange-500/30'
                              : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          }`}>
                            <span className="text-xs animate-bounce">🔥</span>
                            <span>HOT STREAK (&gt;5 DAYS)</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-start justify-between space-x-3 mb-2">
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => onToggleGoal(goal.id)}
                          className="mt-0.5 text-zinc-400 hover:text-emerald-400 transition-colors focus:outline-none cursor-pointer"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                          ) : (
                            <Circle className="w-5 h-5 text-zinc-600 hover:text-emerald-400" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="text-[9px] uppercase font-mono tracking-wider text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                              <Folder className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{goal.folder || 'General'}</span>
                            </span>

                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                                goal.difficulty === 'high'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : goal.difficulty === 'medium'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {goal.difficulty === 'high' ? '🔥 High' : goal.difficulty === 'low' ? '🌱 Low' : '⚡ Med'}
                            </span>

                            {goal.reminderTime && goal.reminderEnabled !== false && (
                              <span className="text-[9px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                <span>{goal.reminderTime}</span>
                              </span>
                            )}

                            {isCompleted && (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${
                                  confidence >= 75
                                    ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                                    : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                                }`}
                                title={log?.evidenceSummary || log?.proofVerificationResult || 'Completion evidence reviewed'}
                              >
                                <Shield className="w-2.5 h-2.5" />
                                <span>{confidence}% proof</span>
                              </span>
                            )}

                            <h4
                              className={`text-xs font-semibold ${
                                isCompleted ? 'line-through text-zinc-400' : 'text-zinc-100'
                              }`}
                            >
                              {goal.name}
                            </h4>

                            {/* Small '🔥' icon for goals with streak > 5 */}
                            {isFlameOver5 && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse"
                                title="Current hot streak over 5 days! 🔥"
                              >
                                <span className="text-xs leading-none animate-bounce">🔥</span>
                                <span>{streakInfo.streak}d</span>
                              </span>
                            )}

                            {/* Small '⭐' icon for lifetime best streak */}
                            {isLifetimeBest && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                                title="Lifetime best streak achieved! ⭐"
                              >
                                <span className="text-xs leading-none animate-bounce">⭐</span>
                                <span>Best</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 font-light mt-0.5 line-clamp-2">
                            {goal.description}
                          </p>
                        </div>
                      </div>

                      {/* Streak Badge Component */}
                      <div className="flex flex-col items-end shrink-0">
                        {isLifetimeBest ? (
                          <div className="flex items-center space-x-1 text-xs font-mono px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm animate-pulse">
                            <span className="text-xs animate-bounce">⭐</span>
                            <span className="font-bold">{streakInfo.streak}d streak</span>
                          </div>
                        ) : isFlameOver5 ? (
                          <div className="flex items-center space-x-1 text-xs font-mono px-2.5 py-1 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-300 shadow-sm animate-pulse">
                            <span className="text-xs animate-bounce">🔥</span>
                            <span className="font-bold">{streakInfo.streak}d streak</span>
                          </div>
                        ) : (
                          <div className={`flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400 ${
                            streakInfo.streak >= 3 ? 'animate-pulse border-amber-500/30' : ''
                          }`}>
                            <Flame className={`w-3 h-3 fill-amber-400/30 ${streakInfo.streak >= 3 ? 'animate-bounce' : ''}`} />
                            <span>{streakInfo.streak}d streak</span>
                          </div>
                        )}
                        <span className={`text-[10px] font-mono mt-0.5 ${
                          isLifetimeBest
                            ? 'text-amber-400/90 font-medium'
                            : isFlameOver5
                            ? 'text-orange-400/90 font-medium'
                            : 'text-zinc-500'
                        }`}>
                          {streakInfo.multiplier}x boost
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Motivational micro-callout for highlighted streaks */}
                    {isLifetimeBest && (
                      <p className="text-[10px] text-amber-300/90 font-mono flex items-center gap-1.5 mb-2 pt-1 border-t border-amber-500/20">
                        <span>⭐</span>
                        <span>Lifetime Best Streak Record! Personal best performance.</span>
                      </p>
                    )}
                    {!isLifetimeBest && isFlameOver5 && (
                      <p className="text-[10px] text-orange-300/90 font-mono flex items-center gap-1.5 mb-2 pt-1 border-t border-orange-500/20">
                        <span>🔥</span>
                        <span>Hot Streak Active! Over 5 days of unbroken momentum.</span>
                      </p>
                    )}

                    {/* Effects Tags & Proof Media Button */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/60">
                      <div className="flex flex-wrap items-center gap-1">
                        {goal.isLifePathAligned && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Life-Path Aligned
                          </span>
                        )}
                        {goal.isCognitiveTraining && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Cognitive Drill
                          </span>
                        )}
                        {goal.effects.map((eff, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              eff.weight >= 0
                                ? 'bg-zinc-800 text-emerald-400'
                                : 'bg-zinc-800 text-rose-400'
                            }`}
                          >
                            {eff.weight >= 0 ? `+${eff.weight}` : eff.weight}{' '}
                            {eff.category.slice(0, 3)}
                          </span>
                        ))}
                      </div>

                      {/* Proof Media Button */}
                      <button
                        onClick={() => onOpenProofModal(goal)}
                        title="Attach proof or improve verification confidence"
                        className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors flex items-center space-x-1 text-[11px]"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Attach Proof</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Calendar View - Consistency Contribution Graph */}
      <MonthlyCalendar goals={goals} dailyLogs={dailyLogs} todayStr={todayStr} />

      {/* Create New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateFolder}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 text-zinc-100 shadow-2xl space-y-4"
          >
            <div className="flex items-center space-x-2 text-cyan-400">
              <FolderPlus className="w-5 h-5" />
              <h3 className="text-base font-semibold text-white">Create Custom Folder</h3>
            </div>
            <p className="text-xs text-zinc-400 font-light">
              Add a custom category or folder tag ('Work', 'Wellness', 'Hobbies', 'Fitness') to group your goals.
            </p>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Folder Name
              </label>
              <input
                type="text"
                autoFocus
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                placeholder="Work Projects"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-xl font-medium shadow-md shadow-cyan-950/40"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
