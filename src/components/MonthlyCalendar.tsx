import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar as CalendarIcon,
  Award,
  Sparkles,
  Flame,
  Star,
  Info,
} from 'lucide-react';
import { DailyGoalLog, Goal } from '../types';

interface MonthlyCalendarProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string; // YYYY-MM-DD
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  goals,
  dailyLogs,
  todayStr,
}) => {
  // Parse today's year & month
  const todayDate = new Date(todayStr + 'T00:00:00');
  const [currentYear, setCurrentYear] = useState<number>(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayDate.getMonth()); // 0-11
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(todayStr);

  const activeGoals = goals.filter((g) => !g.archived);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setCurrentYear(todayDate.getFullYear());
    setCurrentMonth(todayDate.getMonth());
    setSelectedDayStr(todayStr);
  };

  // Month details calculation
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', {
    month: 'long',
  });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  // Build daily stats for all days in selected month
  // Create map of logs by date -> goalId -> completed
  const logsByDateMap = new Map<string, Map<string, boolean>>();
  dailyLogs.forEach((log) => {
    if (!logsByDateMap.has(log.date)) {
      logsByDateMap.set(log.date, new Map());
    }
    logsByDateMap.get(log.date)!.set(log.goalId, log.completed);
  });

  // Calculate day cells data
  const calendarDays = [];
  let totalPerfectDays = 0;
  let totalLoggedDaysWithCompletion = 0;
  let totalDaysElapsedInMonth = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;

    const dayLogs = logsByDateMap.get(dateStr) || new Map<string, boolean>();

    let completedCount = 0;
    activeGoals.forEach((goal) => {
      if (dayLogs.get(goal.id) === true) {
        completedCount++;
      }
    });

    const totalActiveCount = activeGoals.length;
    const ratio = totalActiveCount > 0 ? completedCount / totalActiveCount : 0;
    const isPerfect = totalActiveCount > 0 && completedCount === totalActiveCount;

    if (!isFuture) {
      totalDaysElapsedInMonth++;
      if (completedCount > 0) totalLoggedDaysWithCompletion++;
      if (isPerfect) totalPerfectDays++;
    }

    calendarDays.push({
      dayNumber: day,
      dateStr,
      isFuture,
      isToday,
      completedCount,
      totalActiveCount,
      ratio,
      isPerfect,
    });
  }

  // Selected day details info
  const selectedDayData = calendarDays.find((d) => d.dateStr === selectedDayStr);
  const selectedDayLogs = selectedDayStr ? logsByDateMap.get(selectedDayStr) : null;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-5 shadow-lg">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <span>Consistency Calendar</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Monthly Graph
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Highlighting days where all key goals were 100% completed ⭐
            </p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center space-x-2">
          {(currentMonth !== todayDate.getMonth() || currentYear !== todayDate.getFullYear()) && (
            <button
              onClick={handleResetToCurrentMonth}
              className="px-2.5 py-1 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              Today
            </button>
          )}

          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-zinc-200 px-3 font-mono min-w-[110px] text-center">
              {monthName} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Consistency Quick Stats Bar */}
      <div className="grid grid-cols-3 gap-2.5 mb-4 p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl">
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
            Perfect Days ⭐
          </span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="text-base font-bold font-mono text-emerald-400">
              {totalPerfectDays}
            </span>
            <span className="text-xs text-zinc-400">/ {totalDaysElapsedInMonth} days</span>
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left border-x border-zinc-800/80 px-2">
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
            All-Met Rate
          </span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="text-base font-bold font-mono text-amber-400">
              {totalDaysElapsedInMonth > 0
                ? Math.round((totalPerfectDays / totalDaysElapsedInMonth) * 100)
                : 0}
              %
            </span>
            <span className="text-xs text-zinc-400">consistency</span>
          </div>
        </div>

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
            Active Habits
          </span>
          <div className="flex items-center space-x-1 mt-0.5">
            <span className="text-base font-bold font-mono text-indigo-400">
              {activeGoals.length}
            </span>
            <span className="text-xs text-zinc-400">daily goals</span>
          </div>
        </div>
      </div>

      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
        {weekdays.map((day) => (
          <div key={day} className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid Cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Empty Padding Offset Cells for Month Start */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-10 rounded-lg bg-zinc-950/20 border border-zinc-900/30 opacity-30" />
        ))}

        {/* Day Cells */}
        {calendarDays.map((dayData) => {
          const {
            dayNumber,
            dateStr,
            isFuture,
            isToday,
            completedCount,
            totalActiveCount,
            ratio,
            isPerfect,
          } = dayData;

          const isSelected = selectedDayStr === dateStr;

          // Contribution Shade Styling
          let cellBg = 'bg-zinc-950 border-zinc-800/60 text-zinc-400 hover:border-zinc-700';
          let indicator = null;

          if (isFuture) {
            cellBg = 'bg-zinc-950/40 border-zinc-900/40 text-zinc-600/60 cursor-default';
          } else if (isPerfect) {
            // 100% Perfect Day: Glowing Emerald
            cellBg =
              'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 border-emerald-400/80 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/50';
            indicator = <Star className="w-3 h-3 text-amber-300 fill-amber-300 inline-block ml-0.5" />;
          } else if (ratio >= 0.75) {
            // High completion
            cellBg = 'bg-emerald-600/50 border-emerald-500/50 text-emerald-100 hover:bg-emerald-600/70';
          } else if (ratio >= 0.4) {
            // Medium completion
            cellBg = 'bg-emerald-700/35 border-emerald-600/35 text-emerald-200 hover:bg-emerald-700/50';
          } else if (completedCount > 0) {
            // Low completion
            cellBg = 'bg-emerald-900/30 border-emerald-800/30 text-emerald-300 hover:bg-emerald-900/50';
          } else {
            // Zero completion logged
            cellBg = 'bg-zinc-950 border-zinc-800/60 text-zinc-500 hover:border-zinc-700';
          }

          if (isSelected) {
            cellBg += ' ring-2 ring-amber-400 shadow-sm shadow-amber-950/30';
          } else if (isToday) {
            cellBg += ' ring-1 ring-emerald-400/80';
          }

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDayStr(dateStr)}
              className={`h-10 rounded-lg border transition-all flex flex-col items-center justify-center relative p-1 cursor-pointer focus:outline-none ${cellBg}`}
              title={`${dateStr}: ${completedCount}/${totalActiveCount} goals completed (${Math.round(ratio * 100)}%)${isPerfect ? ' • PERFECT DAY ⭐' : ''}`}
            >
              <div className="flex items-center justify-center space-x-0.5">
                <span className={`text-xs font-mono ${isPerfect ? 'font-bold' : 'font-medium'}`}>
                  {dayNumber}
                </span>
                {indicator}
              </div>

              {/* Completion ratio indicator dot/bar */}
              {!isFuture && (
                <div className="mt-0.5 text-[9px] font-mono leading-none opacity-80">
                  {completedCount}/{totalActiveCount}
                </div>
              )}

              {/* Today marker label */}
              {isToday && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contribution Level Legend */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider mr-1">Legend:</span>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-zinc-950 border border-zinc-800" />
            <span>0%</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-emerald-900/30 border border-emerald-800/30" />
            <span>1-39%</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-emerald-700/35 border border-emerald-600/35" />
            <span>40-74%</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-emerald-600/50 border border-emerald-500/50" />
            <span>75-99%</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400 text-white flex items-center justify-center text-[8px]">
              ⭐
            </span>
            <span className="text-emerald-300 font-semibold">100% All Met ⭐</span>
          </div>
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDayData && (
        <div className="mt-4 p-3.5 bg-zinc-950/90 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-zinc-200 font-mono">
                {new Date(selectedDayData.dateStr + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {selectedDayData.isToday && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Today
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {selectedDayData.isPerfect ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>100% PERFECT DAY</span>
                </span>
              ) : (
                <span className="text-xs font-mono text-zinc-300">
                  {selectedDayData.completedCount} / {selectedDayData.totalActiveCount} Completed (
                  {Math.round(selectedDayData.ratio * 100)}%)
                </span>
              )}
            </div>
          </div>

          {/* Goals breakdown list for selected day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
            {activeGoals.map((goal) => {
              const isCompletedOnDay = selectedDayLogs?.get(goal.id) === true;
              return (
                <div
                  key={goal.id}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between ${
                    isCompletedOnDay
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-zinc-900/60 border-zinc-800/60 text-zinc-400'
                  }`}
                >
                  <span className="truncate pr-2">{goal.name}</span>
                  {isCompletedOnDay ? (
                    <span className="flex items-center space-x-1 text-emerald-400 text-[10px] font-semibold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Met</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-[10px] shrink-0">Not logged</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
