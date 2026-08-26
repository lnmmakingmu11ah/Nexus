import React, { useState } from 'react';
import { Flame, Calendar, CheckCircle2, Award, Info, Filter } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_NAMES, CategoryKey, DailyGoalLog, Goal } from '../types';

interface ConsistencyHeatmapProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string;
}

interface DayData {
  dateStr: string;
  dateObj: Date;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ...
  completedCount: number;
  completedGoalNames: string[];
  categoriesCount: Record<CategoryKey, number>;
  intensityLevel: 0 | 1 | 2 | 3 | 4;
}

export const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = ({
  goals,
  dailyLogs,
  todayStr,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all'>('all');
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Map of goal ID to Goal object for fast lookup
  const goalMap = new Map<string, Goal>(goals.map((g) => [g.id, g]));

  // Calculate past 90 days ending on todayStr
  const daysData: DayData[] = [];
  const today = new Date(todayStr);

  let activeDays90d = 0;
  let totalCompletions90d = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Find logs for this date
    const logsForDay = dailyLogs.filter((l) => l.date === dateStr && l.completed);

    // Filter by selected category if applicable
    const relevantLogs = logsForDay.filter((log) => {
      if (selectedCategory === 'all') return true;
      const g = goalMap.get(log.goalId);
      return g?.category === selectedCategory;
    });

    const completedGoalNames: string[] = [];
    const categoriesCount: Record<CategoryKey, number> = {
      health: 0,
      spiritual: 0,
      smarts: 0,
      selfCare: 0,
      happiness: 0,
    };

    relevantLogs.forEach((log) => {
      const g = goalMap.get(log.goalId);
      if (g) {
        completedGoalNames.push(g.name);
        categoriesCount[g.category] = (categoriesCount[g.category] || 0) + 1;
      } else {
        completedGoalNames.push('Completed Habit');
      }
    });

    const count = relevantLogs.length;
    if (count > 0) activeDays90d++;
    totalCompletions90d += count;

    // Intensity level logic
    let intensityLevel: 0 | 1 | 2 | 3 | 4 = 0;
    if (count === 1) intensityLevel = 1;
    else if (count === 2) intensityLevel = 2;
    else if (count === 3) intensityLevel = 3;
    else if (count >= 4) intensityLevel = 4;

    // Streak calculation
    if (count > 0) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 0;
    }

    daysData.push({
      dateStr,
      dateObj: d,
      dayOfWeek: d.getDay(),
      completedCount: count,
      completedGoalNames,
      categoriesCount,
      intensityLevel,
    });
  }

  // Calculate current streak ending today or yesterday
  let calcStreak = 0;
  for (let i = daysData.length - 1; i >= 0; i--) {
    if (daysData[i].completedCount > 0) {
      calcStreak++;
    } else {
      // If today is empty, check if yesterday had a streak
      if (i === daysData.length - 1) continue;
      break;
    }
  }
  currentStreak = calcStreak;

  // Organize days into weeks (columns of 7 days)
  // Align start date to Sunday for nice github-style column layout
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  // Pad first week with nulls if first date doesn't start on Sunday (day 0)
  const firstDayOfWeek = daysData[0].dayOfWeek;
  for (let i = 0; i < firstDayOfWeek; i++) {
    // Empty cell placeholder handled in rendering
  }

  daysData.forEach((day) => {
    if (day.dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Intensity Square Styles based on selected category
  const getSquareColorClass = (level: 0 | 1 | 2 | 3 | 4): string => {
    if (level === 0) return 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-700';

    if (selectedCategory === 'health') {
      if (level === 1) return 'bg-emerald-950 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900';
      if (level === 2) return 'bg-emerald-800 text-emerald-200 border-emerald-700 hover:bg-emerald-700';
      if (level === 3) return 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500';
      return 'bg-emerald-400 text-zinc-950 font-bold border-emerald-300 shadow-sm shadow-emerald-500/50 hover:bg-emerald-300';
    }

    if (selectedCategory === 'spiritual') {
      if (level === 1) return 'bg-indigo-950 text-indigo-400 border-indigo-800/50 hover:bg-indigo-900';
      if (level === 2) return 'bg-indigo-800 text-indigo-200 border-indigo-700 hover:bg-indigo-700';
      if (level === 3) return 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500';
      return 'bg-indigo-400 text-zinc-950 font-bold border-indigo-300 shadow-sm shadow-indigo-500/50 hover:bg-indigo-300';
    }

    if (selectedCategory === 'smarts') {
      if (level === 1) return 'bg-amber-950 text-amber-400 border-amber-800/50 hover:bg-amber-900';
      if (level === 2) return 'bg-amber-800 text-amber-200 border-amber-700 hover:bg-amber-700';
      if (level === 3) return 'bg-amber-600 text-white border-amber-500 hover:bg-amber-500';
      return 'bg-amber-400 text-zinc-950 font-bold border-amber-300 shadow-sm shadow-amber-500/50 hover:bg-amber-300';
    }

    if (selectedCategory === 'selfCare') {
      if (level === 1) return 'bg-teal-950 text-teal-400 border-teal-800/50 hover:bg-teal-900';
      if (level === 2) return 'bg-teal-800 text-teal-200 border-teal-700 hover:bg-teal-700';
      if (level === 3) return 'bg-teal-600 text-white border-teal-500 hover:bg-teal-500';
      return 'bg-teal-400 text-zinc-950 font-bold border-teal-300 shadow-sm shadow-teal-500/50 hover:bg-teal-300';
    }

    if (selectedCategory === 'happiness') {
      if (level === 1) return 'bg-rose-950 text-rose-400 border-rose-800/50 hover:bg-rose-900';
      if (level === 2) return 'bg-rose-800 text-rose-200 border-rose-700 hover:bg-rose-700';
      if (level === 3) return 'bg-rose-600 text-white border-rose-500 hover:bg-rose-500';
      return 'bg-rose-400 text-zinc-950 font-bold border-rose-300 shadow-sm shadow-rose-500/50 hover:bg-rose-300';
    }

    // Default 'all' category color scale (Emerald - Growth theme)
    if (level === 1) return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900';
    if (level === 2) return 'bg-emerald-800/80 text-emerald-200 border-emerald-700 hover:bg-emerald-700';
    if (level === 3) return 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500';
    return 'bg-emerald-400 text-zinc-950 font-bold border-emerald-300 shadow-sm shadow-emerald-500/50 hover:bg-emerald-300';
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 transition-all duration-300">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">90-Day Consistency Heatmap</h3>
              <p className="text-xs text-zinc-400 font-light">
                Visualizing habit completion density and active momentum over the last 3 months
              </p>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
              selectedCategory === 'all'
                ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            All Categories
          </button>
          {(Object.keys(CATEGORY_NAMES) as CategoryKey[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors border flex items-center space-x-1 ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              <span>{CATEGORY_NAMES[cat]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Metric Highline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-mono">Active Consistency</span>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">
            {activeDays90d} <span className="text-xs font-normal text-zinc-400">/ 90 days</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-light">
            {Math.round((activeDays90d / 90) * 100)}% active habit score
          </span>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-mono">Total Habits Finished</span>
          <div className="text-lg font-bold text-white mt-0.5">{totalCompletions90d}</div>
          <span className="text-[10px] text-zinc-500 font-light">In last 90 days</span>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-mono">Current Streak</span>
          <div className="text-lg font-bold text-amber-400 mt-0.5 flex items-center gap-1">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{currentStreak} days</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-light">Consecutive habit days</span>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-mono">Max 90d Streak</span>
          <div className="text-lg font-bold text-indigo-400 mt-0.5 flex items-center gap-1">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>{maxStreak} days</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-light">Personal best run</span>
        </div>
      </div>

      {/* Heatmap Grid Section */}
      <div className="bg-zinc-950/90 border border-zinc-800/80 p-4 rounded-xl space-y-3 overflow-x-auto">
        <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
          <span className="font-mono text-[11px]">
            {daysData[0]?.dateStr} → {daysData[daysData.length - 1]?.dateStr}
          </span>
          <div className="flex items-center space-x-1.5 text-[11px] font-mono">
            <span className="text-zinc-500">Less</span>
            <div className="w-3 h-3 rounded bg-zinc-900 border border-zinc-800" />
            <div className={`w-3 h-3 rounded ${getSquareColorClass(1)}`} />
            <div className={`w-3 h-3 rounded ${getSquareColorClass(2)}`} />
            <div className={`w-3 h-3 rounded ${getSquareColorClass(3)}`} />
            <div className={`w-3 h-3 rounded ${getSquareColorClass(4)}`} />
            <span className="text-zinc-500">More</span>
          </div>
        </div>

        {/* Calendar Grid Representation */}
        <div className="flex space-x-1.5 min-w-max">
          {/* Day Labels Column */}
          <div className="flex flex-col justify-between py-1 text-[10px] font-mono text-zinc-500 pr-1 select-none">
            <span>Sun</span>
            <span>Tue</span>
            <span>Thu</span>
            <span>Sat</span>
          </div>

          {/* Week Columns */}
          <div className="flex space-x-1.5">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col space-y-1.5">
                {Array.from({ length: 7 }).map((_, dayIndex) => {
                  const dayData = week.find((d) => d.dayOfWeek === dayIndex);

                  if (!dayData) {
                    return (
                      <div
                        key={dayIndex}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md bg-transparent"
                      />
                    );
                  }

                  const isHovered = hoveredDay?.dateStr === dayData.dateStr;
                  const isSelected = selectedDay?.dateStr === dayData.dateStr;

                  return (
                    <button
                      key={dayData.dateStr}
                      onMouseEnter={() => setHoveredDay(dayData)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onClick={() => setSelectedDay(dayData)}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md border transition-all transform hover:scale-125 focus:outline-none ${getSquareColorClass(
                        dayData.intensityLevel
                      )} ${
                        isSelected || isHovered
                          ? 'ring-2 ring-white z-10'
                          : ''
                      }`}
                      title={`${dayData.dateStr}: ${dayData.completedCount} habits completed`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Tooltip / Selected Day Inspection Card */}
      {(hoveredDay || selectedDay) && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 animate-fade-in space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-white">
                {(hoveredDay || selectedDay)?.dateStr} ({dayNames[(hoveredDay || selectedDay)?.dayOfWeek || 0]})
              </span>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {(hoveredDay || selectedDay)?.completedCount} Habits Finished
            </span>
          </div>

          {(hoveredDay || selectedDay)?.completedGoalNames && (hoveredDay || selectedDay)!.completedGoalNames.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-zinc-400 uppercase font-mono">Completed Habits on this day:</span>
              <div className="flex flex-wrap gap-1.5">
                {(hoveredDay || selectedDay)!.completedGoalNames.map((name, i) => (
                  <span
                    key={i}
                    className="text-xs bg-zinc-900 text-zinc-200 border border-zinc-800 px-2.5 py-1 rounded-lg flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{name}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-1">
              No habits recorded on this day.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
