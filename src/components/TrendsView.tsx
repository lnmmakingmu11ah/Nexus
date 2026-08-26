import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Flame,
  AlertTriangle,
  Zap,
  Target,
  BarChart2,
  Activity,
  Layers,
  Sparkles,
  Info,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_NAMES, DailyGoalLog, Goal, UserConfig } from '../types';
import { calculateScoresForDate } from '../utils/scoring';
import { calculateWillpowerAnalytics, formatTimelineDisplay } from '../utils/willpowerAnalytics';
import { ConsistencyHeatmap } from './ConsistencyHeatmap';
import { WeeklyRecap } from './WeeklyRecap';

interface TrendsViewProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string;
  userConfig: UserConfig;
}

export const TrendsView: React.FC<TrendsViewProps> = ({
  goals,
  dailyLogs,
  todayStr,
  userConfig,
}) => {
  const [rangeDays, setRangeDays] = useState<number>(30);

  // Calculate full Willpower and Effort analytics
  const analytics = calculateWillpowerAnalytics(
    goals,
    dailyLogs,
    todayStr,
    userConfig,
    rangeDays
  );

  // Generate date points for past rangeDays up to today for multi-category chart
  const categoryChartData = [];
  const currentDate = new Date(todayStr);

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const result = calculateScoresForDate(dateStr, goals, dailyLogs, userConfig);

    categoryChartData.push({
      date: dateStr.slice(5), // MM-DD
      Health: result.scores.health,
      Spiritual: result.scores.spiritual,
      Smarts: result.scores.smarts,
      SelfCare: result.scores.selfCare,
      Happiness: result.scores.happiness,
      Composite: result.composite,
    });
  }

  // Combined daily metrics data for Recharts
  const derivativeData = analytics.dailyMetrics;
  const activeGoals = goals.filter((g) => !g.archived);
  const stackLinks = activeGoals
    .filter((goal) => goal.linkedGoalId && activeGoals.some((g) => g.id === goal.linkedGoalId))
    .map((goal) => ({
      from: goal,
      to: activeGoals.find((g) => g.id === goal.linkedGoalId)!,
    }));
  const unlinkedStackCandidates = activeGoals
    .filter((goal) => !goal.linkedGoalId)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Controller Banner */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/30 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span>Advanced Habit, Willpower & Derivative Analytics</span>
            </h2>
            <span className="text-[10px] font-mono font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              6 Real-Time Models
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-light mt-1">
            Analyzing streak dynamics, work effort velocity, willpower strain, and goal achievement likelihood
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                rangeDays === days
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-950/40 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Willpower & Work Effort Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Willpower Index */}
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-amber-400" />
              <span>Willpower Index</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-400">30D Avg</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {analytics.overallWillpowerIndex}%
            </span>
            <span className="text-xs text-amber-300/80 font-light">
              {analytics.overallWillpowerIndex >= 70 ? 'High Focus' : analytics.overallWillpowerIndex >= 45 ? 'Moderate Discipline' : 'Needs Reinforcement'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
            Calculated from morning execution, high-difficulty task completion, and verified photo proof effort.
          </p>
        </div>

        {/* Card 2: Work Effort Velocity */}
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span>Work Effort Score</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-400">Impact Volume</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {analytics.overallWorkEffortScore}
            </span>
            <span className="text-xs text-indigo-300/80 font-light">
              {analytics.overallWorkEffortScore >= 75 ? 'Peak Capacity' : 'Steady Progress'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
            Measures weighted impact points generated per day across scheduled target goals.
          </p>
        </div>

        {/* Card 3: Burnout Risk & Stability */}
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-4 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Burnout Risk Index</span>
            </span>
            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
              analytics.burnoutRisk === 'High' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {analytics.burnoutRisk} Risk
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">
              {analytics.burnoutRisk === 'High' ? 'Overexertion Warning' : analytics.burnoutRisk === 'Moderate' ? 'Balanced Capacity' : 'Optimal Resilience'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
            Evaluated by comparing work effort volume against daily willpower recovery trends.
          </p>
        </div>
      </div>

      {/* 90-Day Consistency Heatmap */}
      <ConsistencyHeatmap goals={goals} dailyLogs={dailyLogs} todayStr={todayStr} />

      <WeeklyRecap goals={goals} dailyLogs={dailyLogs} userConfig={userConfig} todayStr={todayStr} />

      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-cyan-500/25 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Habit Stacking Graph</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Shows which habits trigger the next move so the day becomes a chain, not a pile of random chores.
            </p>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
            {stackLinks.length} Active Links
          </span>
        </div>

        {stackLinks.length > 0 ? (
          <div className="space-y-3">
            {stackLinks.map(({ from, to }) => (
              <div
                key={`${from.id}-${to.id}`}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4"
              >
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 min-w-0">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">After</p>
                  <p className="text-xs font-semibold text-white truncate">{from.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{from.stackingNote || 'Completion becomes the cue'}</p>
                </div>
                <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-cyan-400 to-emerald-400 relative">
                  <span className="absolute -right-1 -top-1.5 text-cyan-300 text-xs">›</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 min-w-0">
                  <p className="text-[10px] font-mono text-emerald-300 uppercase">Trigger</p>
                  <p className="text-xs font-semibold text-white truncate">{to.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{CATEGORY_NAMES[to.category]}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-300 font-medium">No habit chains yet.</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              In Goals, edit a habit and choose “Trigger Next Habit Upon Completion” to build a visible chain here.
            </p>
            {unlinkedStackCandidates.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {unlinkedStackCandidates.map((goal) => (
                  <span
                    key={goal.id}
                    className="text-[10px] text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg"
                  >
                    {goal.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5-Category Historical Trajectory */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3 transition-all duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-400" />
            <span>5-Category Historical Trajectory</span>
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">Score Range: 0–100</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={categoryChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
              <YAxis domain={[0, 100]} stroke="#71717a" fontSize={10} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-zinc-950/95 border border-amber-500/30 p-3 rounded-xl shadow-2xl max-w-xs space-y-1.5 text-xs text-zinc-100">
                        <div className="font-bold text-amber-400 border-b border-zinc-800 pb-1 flex justify-between">
                          <span>Date: {label}</span>
                          <span className="font-mono text-[10px] text-zinc-400">Category Trajectory</span>
                        </div>
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-[11px]">
                            <span style={{ color: entry.color }} className="font-medium">
                              {entry.name}:
                            </span>
                            <span className="font-mono font-bold">{entry.value}%</span>
                          </div>
                        ))}
                        <div className="pt-1 border-t border-zinc-800/80 text-[10px] text-zinc-400 font-light italic">
                          💡 <strong>What's calculated:</strong> Normalized 0-100 score per life category incorporating completion weight and absence decay rules.
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="Health" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Spiritual" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Smarts" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="SelfCare" stroke="#14b8a6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Happiness" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Composite" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Willpower Index vs Work Effort Velocity */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3 transition-all duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Daily Willpower Index vs Work Effort Velocity</span>
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">Derivative Index (0–100)</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={derivativeData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="willpowerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="effortGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
              <YAxis domain={[0, 100]} stroke="#71717a" fontSize={10} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-zinc-950/95 border border-amber-500/30 p-3 rounded-xl shadow-2xl max-w-xs space-y-2 text-xs text-zinc-100">
                        <div className="font-bold text-amber-400 border-b border-zinc-800 pb-1 flex justify-between">
                          <span>Date: {label}</span>
                          <span className="font-mono text-[10px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded">Willpower & Effort</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-amber-400 font-medium">Willpower Index:</span>
                            <span className="font-mono font-bold">{data.willpowerIndex}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-indigo-400 font-medium">Work Effort:</span>
                            <span className="font-mono font-bold">{data.workEffort} pts</span>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-zinc-800 text-[10px] text-zinc-400 font-light">
                          🧠 <strong>What's calculated:</strong> Willpower Index measures resistance overcome (morning executions, high difficulty tasks, photo proofs). Work Effort measures total impact points earned versus scheduled target.
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="willpowerIndex" name="Willpower Index" stroke="#f59e0b" fillOpacity={1} fill="url(#willpowerGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="workEffort" name="Work Effort Score" stroke="#6366f1" fillOpacity={1} fill="url(#effortGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Habit Completion Volume & Consistency Ratio */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3 transition-all duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Daily Habit Completion Volume & Consistency Ratio</span>
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">Volume & % Ratio</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={derivativeData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
              <YAxis yAxisId="left" stroke="#71717a" fontSize={10} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#10b981" fontSize={10} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-zinc-950/95 border border-amber-500/30 p-3 rounded-xl shadow-2xl max-w-xs space-y-2 text-xs text-zinc-100">
                        <div className="font-bold text-amber-400 border-b border-zinc-800 pb-1 flex justify-between">
                          <span>Date: {label}</span>
                          <span className="font-mono text-[10px] text-emerald-400">Habit Volume</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-zinc-300">Completed Habits:</span>
                            <span className="font-mono font-bold text-white">{data.completedCount} / {data.totalCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-emerald-400">Completion Ratio:</span>
                            <span className="font-mono font-bold">{data.completionRate}%</span>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-zinc-800 text-[10px] text-zinc-400 font-light">
                          📊 <strong>What's calculated:</strong> Absolute number of completed habits (bar height) overlaid with overall completion ratio percentage (green line).
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="completedCount" name="Completed Habits" fill="#3f3f46" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion Rate (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth Acceleration / Rate of Change (1st Derivative) */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3 transition-all duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Growth Acceleration (1st Derivative ΔScore/Δt)</span>
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">Daily Delta Velocity</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={derivativeData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="deltaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
              <YAxis stroke="#71717a" fontSize={10} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isPositive = data.scoreDelta >= 0;
                    return (
                      <div className="bg-zinc-950/95 border border-amber-500/30 p-3 rounded-xl shadow-2xl max-w-xs space-y-2 text-xs text-zinc-100">
                        <div className="font-bold text-amber-400 border-b border-zinc-800 pb-1 flex justify-between">
                          <span>Date: {label}</span>
                          <span className="font-mono text-[10px] text-cyan-400">1st Derivative</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-300">Daily Acceleration (Δ):</span>
                          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? `+${data.scoreDelta}` : data.scoreDelta} pts/day
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-zinc-800 text-[10px] text-zinc-400 font-light">
                          📈 <strong>What's calculated:</strong> The first derivative (Score today - Score yesterday). Positive values mean momentum acceleration; negative values show decay from missed habits.
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="scoreDelta" name="Growth Acceleration (ΔScore)" stroke="#06b6d4" fillOpacity={1} fill="url(#deltaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rolling 7-Day vs 30-Day Moving Average Momentum */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-3 transition-all duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>Rolling 7-Day vs 30-Day Moving Average Momentum</span>
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">Macro vs Micro Momentum</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={derivativeData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
              <YAxis domain={[0, 100]} stroke="#71717a" fontSize={10} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const diff = data.movingAvg7 - data.movingAvg30;
                    return (
                      <div className="bg-zinc-950/95 border border-amber-500/30 p-3 rounded-xl shadow-2xl max-w-xs space-y-2 text-xs text-zinc-100">
                        <div className="font-bold text-amber-400 border-b border-zinc-800 pb-1 flex justify-between">
                          <span>Date: {label}</span>
                          <span className="font-mono text-[10px] text-purple-400">Moving Averages</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-amber-400 font-medium">7-Day MA (Micro):</span>
                            <span className="font-mono font-bold">{data.movingAvg7}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-400 font-medium">30-Day MA (Macro):</span>
                            <span className="font-mono font-bold">{data.movingAvg30}%</span>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-zinc-800 text-[10px] text-zinc-400 font-light">
                          🔍 <strong>What's calculated:</strong> Compares short-term execution (7-day MA) against long-term baseline (30-day MA). {diff >= 0 ? 'Short-term execution is currently OUTPERFORMING baseline! 🔥' : 'Short-term execution is currently lagging baseline.'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="movingAvg7" name="7-Day Moving Avg (Short-Term)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="movingAvg30" name="30-Day Moving Avg (Long-Term)" stroke="#a855f7" strokeWidth={2} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAPH 6: Goal Achievement Likelihood & Mastery Timeline Matrix */}
      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Target className="w-5 h-5 text-amber-400" />
              <span>Goal Achievement Likelihood & Timeframe Calculations</span>
            </h3>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Calculates probability (%) and projected days to full habit mastery based on current streak, 30-day completion rate & willpower strain
            </p>
          </div>
          <span className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
            {analytics.goalLikelihoods.length} Active Goals
          </span>
        </div>

        {/* Goal Likelihood Cards List */}
        {analytics.goalLikelihoods.length === 0 ? (
          <div className="p-6 bg-zinc-950/60 border border-zinc-800 rounded-xl text-center space-y-2">
            <Target className="w-8 h-8 text-amber-400/40 mx-auto" />
            <p className="text-xs text-zinc-300 font-medium">No active habits to calculate likelihoods for</p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Create goals in the Goals Manager or use the AI Goal Planner to see probabilistic mastery curves.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.goalLikelihoods.map((gl) => {
              const isHigh = gl.likelihoodPercent >= 75;
              const isModerate = gl.likelihoodPercent >= 50;

              return (
                <div
                  key={gl.goalId}
                  className="bg-zinc-950/90 border border-amber-500/20 rounded-xl p-4 shadow-lg space-y-3 hover:border-amber-400/40 transition-all"
                >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {gl.category}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">{gl.goalName}</h4>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-lg font-extrabold font-mono block ${
                        isHigh ? 'text-emerald-400' : isModerate ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {gl.likelihoodPercent}%
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 block">Achievement Chance</span>
                  </div>
                </div>

                {/* Likelihood Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isHigh ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${gl.likelihoodPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono pt-0.5">
                    <span>Streak: 🔥 {gl.currentStreak}d</span>
                    <span>30D Rate: {gl.completionRate30d}%</span>
                  </div>
                </div>

                {/* Projected Timeline */}
                <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-light flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Projected Mastery Timeline:</span>
                  </span>
                  <span className="font-bold text-amber-300 font-mono">
                    ~{gl.formattedTimeline || formatTimelineDisplay(gl.estimatedMasteryDays)}
                  </span>
                </div>

                {/* AI Recommendation Tip */}
                <p className="text-[11px] text-zinc-300 font-light bg-amber-500/5 border border-amber-500/15 p-2 rounded-lg">
                  💡 <strong>AI Strategy:</strong> {gl.aiRecommendation}
                </p>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Extended Absence Rules Explanation Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-2">
        <div className="flex items-center space-x-2 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-sm font-semibold text-white">Extended Absence & Decay Rules</h3>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed font-light">
          Real stakes drive growth. If a goal or category is neglected for past <strong className="text-emerald-400">{userConfig.absenceThresholdDays} consecutive days</strong>, your streak resets to zero AND the category score actively decays by <strong className="text-rose-400">{userConfig.dailyDecayRate}% per day</strong> until you return and complete goals. Returning to your habits immediately stops decay and resumes positive score growth.
        </p>
      </div>
    </div>
  );
};
