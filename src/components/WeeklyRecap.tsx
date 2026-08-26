import React, { useMemo, useState } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Award,
  Sparkles,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart2,
  Activity,
  Zap,
} from 'lucide-react';
import {
  CATEGORY_COLORS,
  CATEGORY_NAMES,
  CategoryKey,
  DailyGoalLog,
  Goal,
  UserConfig,
} from '../types';
import { calculateScoresForDate } from '../utils/scoring';

interface WeeklyRecapProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  userConfig: UserConfig;
  todayStr?: string;
}

export const WeeklyRecap: React.FC<WeeklyRecapProps> = ({
  goals,
  dailyLogs,
  userConfig,
  todayStr,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'growth' | 'completion'>('growth');

  // Determine current anchor date
  const anchorDateStr = useMemo(() => {
    if (todayStr) return todayStr;
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, [todayStr]);

  // Compute 7-day data sequence: [d-6, d-5, d-4, d-3, d-2, d-1, d-0]
  const weeklyData = useMemo(() => {
    const dates: string[] = [];
    const anchor = new Date(anchorDateStr);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Baseline date 7 days ago (d-7) for comparison
    const baselineDate = new Date(anchor);
    baselineDate.setDate(baselineDate.getDate() - 7);
    const baselineDateStr = baselineDate.toISOString().split('T')[0];

    // Score calculations for each day
    const dailyResults = dates.map((dateStr) =>
      calculateScoresForDate(dateStr, goals, dailyLogs, userConfig)
    );

    const baselineResult = calculateScoresForDate(baselineDateStr, goals, dailyLogs, userConfig);
    const todayResult = dailyResults[dailyResults.length - 1]; // d-0

    // Overall completion math
    const totalPossibleLogsOverWeek = dailyResults.reduce((acc, curr) => acc + curr.totalGoals, 0);
    const totalCompletedLogsOverWeek = dailyResults.reduce((acc, curr) => acc + curr.totalCompleted, 0);
    const avgWeeklyCompletionRate =
      totalPossibleLogsOverWeek > 0
        ? Math.round((totalCompletedLogsOverWeek / totalPossibleLogsOverWeek) * 100)
        : 0;

    // Previous week completion rate (d-13 to d-7) for comparison
    let prevWeekCompleted = 0;
    let prevWeekPossible = 0;
    for (let i = 13; i >= 7; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i);
      const res = calculateScoresForDate(d.toISOString().split('T')[0], goals, dailyLogs, userConfig);
      prevWeekCompleted += res.totalCompleted;
      prevWeekPossible += res.totalGoals;
    }
    const prevWeekCompletionRate =
      prevWeekPossible > 0 ? Math.round((prevWeekCompleted / prevWeekPossible) * 100) : 0;
    const completionRateDelta = avgWeeklyCompletionRate - prevWeekCompletionRate;

    // Category Score Growth & Category Completion Breakdown
    const categories: CategoryKey[] = ['health', 'spiritual', 'smarts', 'selfCare', 'happiness'];

    const categoryStats = categories.map((cat) => {
      const startScore = baselineResult.scores[cat];
      const currentScore = todayResult.scores[cat];
      const growth = currentScore - startScore;

      // Category specific completions over week
      const activeCatGoals = goals.filter((g) => !g.archived && g.category === cat);
      let catCompletedCount = 0;
      let catPossibleCount = activeCatGoals.length * 7;

      dailyResults.forEach((dayRes) => {
        const dayLogs = dailyLogs.filter((l) => l.date === dayRes.date && l.completed);
        activeCatGoals.forEach((g) => {
          if (dayLogs.some((l) => l.goalId === g.id)) {
            catCompletedCount++;
          }
        });
      });

      const catCompletionRate =
        catPossibleCount > 0 ? Math.round((catCompletedCount / catPossibleCount) * 100) : 0;

      // Score trend curve points for sparkline
      const scoreTrend = dailyResults.map((r) => r.scores[cat]);

      return {
        key: cat,
        name: CATEGORY_NAMES[cat],
        color: CATEGORY_COLORS[cat],
        startScore,
        currentScore,
        growth,
        catCompletedCount,
        catPossibleCount,
        catCompletionRate,
        scoreTrend,
      };
    });

    // Net Composite Growth
    const compositeGrowth = todayResult.composite - baselineResult.composite;

    // Most Consistent Habit
    const habitCompletions: Record<string, { goal: Goal; count: number }> = {};
    goals
      .filter((g) => !g.archived)
      .forEach((g) => {
        habitCompletions[g.id] = { goal: g, count: 0 };
      });

    dates.forEach((dStr) => {
      dailyLogs
        .filter((l) => l.date === dStr && l.completed)
        .forEach((l) => {
          if (habitCompletions[l.goalId]) {
            habitCompletions[l.goalId].count++;
          }
        });
    });

    const sortedHabits = Object.values(habitCompletions).sort((a, b) => b.count - a.count);
    const topHabit = sortedHabits[0];
    const slippedHabits = [...sortedHabits]
      .filter((item) => item.count < 3)
      .sort((a, b) => a.count - b.count)
      .slice(0, 3);
    const completedLogsThisWeek = dates.flatMap((dStr) =>
      dailyLogs.filter((l) => l.date === dStr && l.completed)
    );
    const verifiedCount = completedLogsThisWeek.filter((l) => l.proofVerified || l.verificationStatus === 'verified').length;
    const proofConfidence =
      completedLogsThisWeek.length > 0
        ? Math.round((verifiedCount / completedLogsThisWeek.length) * 100)
        : 0;

    // Highest Growth Category
    const topGrowthCategory = [...categoryStats].sort((a, b) => b.growth - a.growth)[0];
    // Lowest Score or Needs Attention
    const lowestCategory = [...categoryStats].sort((a, b) => a.currentScore - b.currentScore)[0];

    return {
      dates,
      dailyResults,
      baselineResult,
      todayResult,
      totalPossibleLogsOverWeek,
      totalCompletedLogsOverWeek,
      avgWeeklyCompletionRate,
      completionRateDelta,
      categoryStats,
      compositeGrowth,
      topHabit,
      slippedHabits,
      verifiedCount,
      proofConfidence,
      topGrowthCategory,
      lowestCategory,
    };
  }, [anchorDateStr, goals, dailyLogs, userConfig]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>7-Day Weekly Recap</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Macro Habit Analytics
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Longer-term completion trajectory & category score movement over the past 7 days
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setSelectedMetric('growth')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedMetric === 'growth'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Category Growth
          </button>
          <button
            onClick={() => setSelectedMetric('completion')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedMetric === 'completion'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Daily Breakdown
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 7-Day Completion Rate Card */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase text-zinc-400">Avg Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight flex items-baseline space-x-2">
              <span>{weeklyData.avgWeeklyCompletionRate}%</span>
              <span
                className={`text-xs font-mono font-semibold flex items-center ${
                  weeklyData.completionRateDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {weeklyData.completionRateDelta >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>{Math.abs(weeklyData.completionRateDelta)}% vs last wk</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-light mt-1">
              {weeklyData.totalCompletedLogsOverWeek} of {weeklyData.totalPossibleLogsOverWeek} routines completed
            </p>
          </div>
        </div>

        {/* 7-Day Score Delta Card */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase text-zinc-400">Life Score Shift</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight flex items-baseline space-x-2">
              <span
                className={
                  weeklyData.compositeGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                {weeklyData.compositeGrowth >= 0 ? '+' : ''}
                {weeklyData.compositeGrowth} pts
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                ({weeklyData.todayResult.composite} overall)
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-light mt-1">
              Net composite trajectory over 7 days
            </p>
          </div>
        </div>

        {/* Most Consistent Habit Card */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase text-zinc-400">Top Habit</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white truncate">
              {weeklyData.topHabit?.count ? weeklyData.topHabit.goal.name : 'No logs yet'}
            </div>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-xs font-mono font-semibold text-amber-400">
                {weeklyData.topHabit?.count || 0}/7 days
              </span>
              <span className="text-[10px] text-zinc-500">
                • {weeklyData.topHabit?.count ? `${Math.round((weeklyData.topHabit.count / 7) * 100)}% consistency` : 'Build momentum'}
              </span>
            </div>
          </div>
        </div>

        {/* Fastest Growing Category Card */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono uppercase text-zinc-400">Growth Leader</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center space-x-2">
              <span className={weeklyData.topGrowthCategory?.color}>
                {weeklyData.topGrowthCategory?.name}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1 text-xs font-mono font-semibold text-emerald-400">
              <span>
                {weeklyData.topGrowthCategory?.growth >= 0 ? '+' : ''}
                {weeklyData.topGrowthCategory?.growth} pts
              </span>
              <span className="text-[10px] text-zinc-500 font-normal">• 7d boost</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">What Worked</h4>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {weeklyData.topHabit?.count
              ? `${weeklyData.topHabit.goal.name} showed up ${weeklyData.topHabit.count}/7 days. Keep that as an anchor habit next week.`
              : 'No clear anchor habit yet. Pick one tiny routine and make it easy to repeat.'}
          </p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-rose-300 uppercase tracking-wider">What Slipped</h4>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {weeklyData.slippedHabits.length > 0
              ? `${weeklyData.slippedHabits.map((item) => item.goal.name).join(', ')} need a lighter cue or lower friction.`
              : 'Nothing obvious slipped badly this week. Nice, suspiciously competent.'}
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 space-y-1.5">
          <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Change Next Week</h4>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Put one active goal first, move low-value extras to maintenance, and improve proof confidence from{' '}
            <span className="font-mono text-amber-200">{weeklyData.proofConfidence}%</span>{' '}
            by journaling specifics before checking goals off.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedMetric === 'growth' ? (
        /* Category Growth Breakdown Matrix */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>Category Score Shift & 7-Day Trajectories</span>
            </h4>
            <span className="text-xs text-zinc-400 font-mono">
              Baseline (7d ago) ➔ Current
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {weeklyData.categoryStats.map((cat) => {
              const isPositive = cat.growth >= 0;

              return (
                <div
                  key={cat.key}
                  className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase tracking-wider ${cat.color}`}>
                        {cat.name}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-0.5 ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {cat.growth} pts
                      </span>
                    </div>

                    {/* Big Numbers */}
                    <div className="flex items-baseline justify-between mt-2">
                      <div className="text-2xl font-extrabold text-white font-mono">
                        {cat.currentScore}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">
                        Started: <span className="text-zinc-300">{cat.startScore}</span>
                      </div>
                    </div>

                    {/* Progress Bar Visual */}
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800/80 mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cat.key === 'health'
                            ? 'bg-emerald-400'
                            : cat.key === 'spiritual'
                            ? 'bg-indigo-400'
                            : cat.key === 'smarts'
                            ? 'bg-amber-400'
                            : cat.key === 'selfCare'
                            ? 'bg-sky-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${cat.currentScore}%` }}
                      />
                    </div>
                  </div>

                  {/* 7-Day Mini Sparkline Bars */}
                  <div className="pt-2 border-t border-zinc-800/60">
                    <div className="flex items-end justify-between h-8 gap-1 pt-1">
                      {cat.scoreTrend.map((val, idx) => {
                        const dayLabel = ['M', 'T', 'W', 'T', 'F', 'S', 'S'][
                          new Date(weeklyData.dates[idx]).getDay()
                        ];
                        const barHeightPercent = Math.max(15, Math.min(100, val));

                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-1 group relative"
                            title={`${dayLabel}: ${val} pts`}
                          >
                            <div className="w-full bg-zinc-900 rounded-sm h-full flex items-end overflow-hidden">
                              <div
                                className={`w-full transition-all ${
                                  idx === 6
                                    ? 'bg-indigo-400 shadow-sm shadow-indigo-400/50'
                                    : 'bg-zinc-700 group-hover:bg-zinc-500'
                                }`}
                                style={{ height: `${barHeightPercent}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500">{dayLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Daily Breakdown Timeline (Mon-Sun 7-Day Completion Bars) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Day-by-Day 7-Day Completion Flow</span>
            </h4>
            <span className="text-xs text-zinc-400 font-mono">
              Completions / Total Active Habits
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
            {weeklyData.dailyResults.map((dayRes, i) => {
              const d = new Date(dayRes.date);
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const dateFormatted = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
              const pct =
                dayRes.totalGoals > 0
                  ? Math.round((dayRes.totalCompleted / dayRes.totalGoals) * 100)
                  : 0;

              const isToday = i === 6;

              return (
                <div
                  key={dayRes.date}
                  className={`bg-zinc-950/80 border ${
                    isToday ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-zinc-800/80'
                  } rounded-xl p-3 flex flex-col justify-between space-y-2 text-center`}
                >
                  <div>
                    <div className="text-xs font-bold text-white uppercase">{dayName}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{dateFormatted}</div>
                  </div>

                  <div className="py-2">
                    <div className="text-xl font-extrabold text-white font-mono">{pct}%</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {dayRes.totalCompleted}/{dayRes.totalGoals} done
                    </div>
                  </div>

                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full transition-all ${
                        pct >= 80
                          ? 'bg-emerald-400'
                          : pct >= 50
                          ? 'bg-amber-400'
                          : 'bg-zinc-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actionable Weekly Takeaway / Growth Focus Note */}
      <div className="bg-zinc-950/90 border border-indigo-500/30 rounded-xl p-4 flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            Weekly Synthesis & Next Focus
          </h4>
          <p className="text-xs text-zinc-300 font-light mt-1 leading-relaxed">
            Your strongest momentum this week was in{' '}
            <strong className="text-white font-semibold">
              {weeklyData.topGrowthCategory?.name}
            </strong>{' '}
            ({weeklyData.topGrowthCategory?.growth >= 0 ? '+' : ''}
            {weeklyData.topGrowthCategory?.growth} pts). To boost overall life resonance next week,
            consider prioritizing routines in{' '}
            <strong className="text-amber-300 font-semibold">
              {weeklyData.lowestCategory?.name}
            </strong>{' '}
            to minimize absence decay and elevate your baseline score.
          </p>
        </div>
      </div>
    </div>
  );
};
