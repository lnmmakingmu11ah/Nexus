import React, { useState } from 'react';
import { HeartPulse, Info, Edit2, AlertCircle, Activity, ShieldCheck } from 'lucide-react';
import { DailyGoalLog, Goal, LifeExpectancyFactor, UserConfig } from '../types';
import { calculateLifeExpectancy } from '../utils/lifeExpectancy';

interface LifeExpectancyViewProps {
  userConfig: UserConfig;
  factors: LifeExpectancyFactor[];
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string;
  onSaveFactor: (factor: LifeExpectancyFactor) => void;
}

export const LifeExpectancyView: React.FC<LifeExpectancyViewProps> = ({
  userConfig,
  factors,
  goals,
  dailyLogs,
  todayStr,
  onSaveFactor,
}) => {
  const [editingFactor, setEditingFactor] = useState<LifeExpectancyFactor | null>(null);

  const result = calculateLifeExpectancy(userConfig, factors, goals, dailyLogs, todayStr);

  const handleEditFactor = (f: LifeExpectancyFactor) => {
    setEditingFactor({ ...f });
  };

  const handleSaveEdit = () => {
    if (!editingFactor) return;
    onSaveFactor(editingFactor);
    setEditingFactor(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
            <HeartPulse className="w-5 h-5 text-rose-400" />
            <span>Research-Based Life Expectancy Estimator</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light mt-0.5">
            Actuarial baseline combined with epidemiological research behavior coefficients
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
          <Info className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-[11px] text-rose-300 font-medium">Research Model — Non-Medical</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-emerald-500/25 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>What Changed This Estimate</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              NEXUS connects the longevity number to your actual tracked habits and proof confidence.
            </p>
          </div>
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
            30-day signal
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {result.changeNarrative.map((line) => (
            <div key={line} className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 leading-relaxed">
              {line}
            </div>
          ))}
        </div>

        {result.habitSignals.length > 0 ? (
          <div className="space-y-2">
            {result.habitSignals.map((signal) => (
              <div
                key={signal.goalName}
                className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{signal.goalName}</p>
                  <p className="text-[11px] text-zinc-400">{signal.explanation}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 border border-teal-500/25 px-2 py-1 rounded-lg">
                    +{signal.estimatedDays} days
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-lg flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {signal.verifiedDays}/{signal.daysCompleted} verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400">
            Complete and verify a few health, self-care, reflection, or movement goals to make this section react.
          </div>
        )}
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300">
          <span className="text-xs font-medium text-zinc-400">Actuarial Baseline</span>
          <div className="my-2">
            <span className="text-2xl font-mono font-bold text-white">
              {result.actuarialBaselineYears}
            </span>
            <span className="text-xs text-zinc-400 ml-1">years</span>
          </div>
          <span className="text-[10px] text-zinc-500">Based on Age {userConfig.age} / {userConfig.sex}</span>
        </div>

        <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300">
          <span className="text-xs font-medium text-zinc-400">Research Modifiers</span>
          <div className="my-2">
            <span className="text-2xl font-mono font-bold text-emerald-400">
              +{result.totalEstimatedYears}
            </span>
            <span className="text-xs text-zinc-400 ml-1">years</span>
          </div>
          <span className="text-[10px] text-zinc-500">Sum of research behavior factors</span>
        </div>

        <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300">
          <span className="text-xs font-medium text-zinc-400">Total Projected Lifespan</span>
          <div className="my-2">
            <span className="text-2xl font-mono font-bold text-indigo-400">
              {result.totalEstimatedAge}
            </span>
            <span className="text-xs text-zinc-400 ml-1">years</span>
          </div>
          <span className="text-[10px] text-indigo-400/80 font-mono">
            ~{result.remainingDays.toLocaleString()} remaining days
          </span>
        </div>

        <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300">
          <span className="text-xs font-medium text-zinc-400">Today's Daily Habit Delta</span>
          <div className="my-2">
            <span className="text-2xl font-mono font-bold text-teal-400">
              +{result.dailyGainsDays}
            </span>
            <span className="text-xs text-zinc-400 ml-1">days gained</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            ~{(result.dailyGainsDays * 24).toFixed(1)} hours gained today
          </span>
        </div>
      </div>

      {/* Editable Epidemiological Coefficient Table */}
      <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 transition-all duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Epidemiological Research Coefficient Breakdown</h3>
          <span className="text-xs text-zinc-400">Click edit icon to tune coefficient weights</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Behavior Factor</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Current Status</th>
                <th className="py-2.5 px-3">Lifespan Delta</th>
                <th className="py-2.5 px-3">Source Study</th>
                <th className="py-2.5 px-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-light text-zinc-200">
              {factors.map((f) => (
                <tr key={f.id} className="hover:bg-zinc-950/50 transition-colors">
                  <td className="py-3 px-3 font-medium text-white">{f.name}</td>
                  <td className="py-3 px-3 text-zinc-400">{f.category}</td>
                  <td className="py-3 px-3 text-zinc-300">{f.currentValue}</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                    {f.coefficientYears >= 0 ? `+${f.coefficientYears}` : f.coefficientYears} yrs
                  </td>
                  <td className="py-3 px-3 text-zinc-400 text-[11px] italic">{f.source}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleEditFactor(f)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Disclaimer Box */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-start space-x-3 text-xs text-zinc-400 font-light">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-zinc-200 font-semibold block mb-0.5">Scientific Estimate Disclaimer</strong>
          This tool uses published actuarial reference tables and epidemiological population studies to provide educational estimates. It is strictly for motivational tracking and self-reflection. It does NOT constitute medical diagnosis, clinical prognosis, or health advice.
        </div>
      </div>

      {/* Edit Factor Modal */}
      {editingFactor && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-3 text-zinc-100">
            <h3 className="text-sm font-semibold text-white">Edit Factor Coefficient</h3>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Factor Name</label>
              <input
                type="text"
                value={editingFactor.name}
                onChange={(e) => setEditingFactor({ ...editingFactor, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Current Status / Habit</label>
              <input
                type="text"
                value={editingFactor.currentValue}
                onChange={(e) => setEditingFactor({ ...editingFactor, currentValue: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Coefficient (Years Delta)</label>
              <input
                type="number"
                step="0.1"
                value={editingFactor.coefficientYears}
                onChange={(e) =>
                  setEditingFactor({ ...editingFactor, coefficientYears: Number(e.target.value) })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Research Source</label>
              <input
                type="text"
                value={editingFactor.source}
                onChange={(e) => setEditingFactor({ ...editingFactor, source: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingFactor(null)}
                className="flex-1 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-2 bg-emerald-600 text-white text-xs rounded-xl font-medium"
              >
                Save Factor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
