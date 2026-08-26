import React, { useState, useEffect } from 'react';
import { Compass, Target, Sun, Sparkles, Check, Edit3, Trash2, Clock, Zap } from 'lucide-react';
import { UserConfig } from '../types';
import { loadDailyIntention, saveDailyIntention } from '../utils/storage';

interface DailyIntentionProps {
  todayStr: string; // YYYY-MM-DD
  userConfig: UserConfig;
}

const PRESET_INTENTIONS = [
  'Deep Focus & No Distractions',
  'Calm Mind & Patient Reactions',
  'Physical Vitality & Clean Eating',
  'Consistent Discipline & Action',
  'Gratitude & Present Awareness',
];

export const DailyIntention: React.FC<DailyIntentionProps> = ({
  todayStr,
  userConfig,
}) => {
  const [intentionText, setIntentionText] = useState<string>('');
  const [savedIntention, setSavedIntention] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Load daily intention for today date (resets automatically when todayStr changes)
  useEffect(() => {
    const existing = loadDailyIntention(todayStr);
    setSavedIntention(existing);
    setIntentionText(existing);
    setIsEditing(!existing);
  }, [todayStr]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = intentionText.trim();
    if (!trimmed) return;

    saveDailyIntention(todayStr, trimmed);
    setSavedIntention(trimmed);
    setIsEditing(false);
    setJustSaved(true);

    setTimeout(() => {
      setJustSaved(false);
    }, 2500);
  };

  const handleClear = () => {
    saveDailyIntention(todayStr, '');
    setSavedIntention('');
    setIntentionText('');
    setIsEditing(true);
  };

  const handleSelectPreset = (presetText: string) => {
    setIntentionText(presetText);
  };

  const formattedDate = new Date(todayStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-gradient-to-r from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-amber-950/20 hover:border-amber-400/50 transition-all duration-300 relative overflow-hidden my-4">
      {/* Background Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Meta Bar: Title + Life Path Tag */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-sm shrink-0">
            <Sun className="w-5 h-5 text-indigo-400 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-1.5">
                <span>Daily Intention</span>
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/80">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>24h Cycle ({formattedDate})</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Set your single core focus for today • Resets automatically every 24 hours
            </p>
          </div>
        </div>

        {/* Life Path Tag Display */}
        {userConfig.lifePathGoal && (
          <div className="inline-flex items-center space-x-2 bg-indigo-950/60 border border-indigo-500/30 px-3.5 py-1.5 rounded-xl text-indigo-200 text-xs shadow-sm max-w-full truncate shrink-0">
            <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-medium text-zinc-400 text-[11px] uppercase tracking-wider shrink-0">
              Life Path:
            </span>
            <span className="font-semibold text-indigo-300 truncate" title={userConfig.lifePathGoal}>
              "{userConfig.lifePathGoal}"
            </span>
          </div>
        )}
      </div>

      {/* Intention Input vs Display View */}
      {savedIntention && !isEditing ? (
        <div className="bg-zinc-950/80 border border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner relative">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Active Goal for Today
                </span>
                {justSaved && (
                  <span className="text-[10px] text-emerald-300 font-medium animate-pulse flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved!
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-100 italic leading-relaxed">
                "{savedIntention}"
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-all flex items-center space-x-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Edit Focus</span>
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-xs font-medium bg-zinc-800/60 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 border border-zinc-700/50 hover:border-rose-800/50 transition-all"
              title="Clear intention"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              placeholder="Type your daily intention..."
              className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-indigo-500/80 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all pr-28"
            />
            <button
              type="submit"
              disabled={!intentionText.trim()}
              className="absolute right-2 top-2 bottom-2 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-medium transition-all flex items-center space-x-1 shadow-sm"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Set Intention</span>
            </button>
          </div>

          {/* Quick Preset Prompts */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs text-zinc-400">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Suggestions:
            </span>
            {PRESET_INTENTIONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="px-2.5 py-1 rounded-lg bg-zinc-950/80 hover:bg-indigo-950/50 border border-zinc-800/80 hover:border-indigo-500/40 text-zinc-300 text-[11px] whitespace-nowrap transition-all"
              >
                + {preset}
              </button>
            ))}
          </div>
        </form>
      )}
    </div>
  );
};
