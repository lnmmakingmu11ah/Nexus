import React, { useState } from 'react';
import { Sparkles, RefreshCw, Lightbulb, CheckCircle, TrendingUp, Compass } from 'lucide-react';
import { AIDigest, DailyGoalLog, Goal, UserConfig } from '../types';
import { WeeklyRecap } from './WeeklyRecap';

interface InsightsViewProps {
  digests: AIDigest[];
  userConfig: UserConfig;
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  onGenerateNewDigest: () => void;
  loading: boolean;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  digests,
  userConfig,
  goals,
  dailyLogs,
  onGenerateNewDigest,
  loading,
}) => {
  const latestDigest = digests[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>NEXUS AI Habit & Correlation Insights</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light mt-0.5">
            Periodic AI digests surfacing hidden pattern correlations between your behaviors
          </p>
        </div>

        <button
          onClick={onGenerateNewDigest}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl flex items-center space-x-2 transition-all shadow-md shadow-indigo-950/40 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Analyzing Patterns...' : 'Run New AI Digest'}</span>
        </button>
      </div>

      {/* 7-Day Weekly Recap Section */}
      <WeeklyRecap goals={goals} dailyLogs={dailyLogs} userConfig={userConfig} />

      {/* Main Latest Digest Card */}
      {latestDigest ? (
        <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
              <Compass className="w-5 h-5" />
              <span>Personal Growth Pattern Synthesis</span>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              Generated {latestDigest.date}
            </span>
          </div>

          <p className="text-sm text-zinc-100 leading-relaxed font-light">
            {latestDigest.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Surfaced Correlations */}
            <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 mb-2">
                <Lightbulb className="w-4 h-4" />
                <span>Observed Correlations</span>
              </div>
              <ul className="space-y-2">
                {latestDigest.correlations?.map((corr, i) => (
                  <li key={i} className="text-xs text-zinc-300 flex items-start space-x-2 font-light">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{corr}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Recommendations */}
            <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span>Actionable Recommendations</span>
              </div>
              <ul className="space-y-2">
                {latestDigest.actionableTips?.map((tip, i) => (
                  <li key={i} className="text-xs text-zinc-300 flex items-start space-x-2 font-light">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No AI Digest Generated Yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto font-light">
            Run an AI digest to analyze your historical logs and discover hidden correlations across your 5 life categories.
          </p>
          <button
            onClick={onGenerateNewDigest}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-md shadow-indigo-950/40"
          >
            Generate First Digest
          </button>
        </div>
      )}
    </div>
  );
};
