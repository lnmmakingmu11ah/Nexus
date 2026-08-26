import React, { useState } from 'react';
import { Award, Lock, Sparkles, CheckCircle2, Search, Filter } from 'lucide-react';
import { BADGE_DEFINITIONS } from '../utils/badges';

interface BadgesGridProps {
  unlockedBadgeIds: string[];
}

export const BadgesGrid: React.FC<BadgesGridProps> = ({ unlockedBadgeIds = [] }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unlockedSet = new Set(unlockedBadgeIds);
  const unlockedCount = unlockedSet.size;
  const totalBadges = BADGE_DEFINITIONS.length;

  const filteredBadges = BADGE_DEFINITIONS.filter((badge) => {
    const isUnlocked = unlockedSet.has(badge.id);
    if (filter === 'unlocked' && !isUnlocked) return false;
    if (filter === 'locked' && isUnlocked) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        badge.name.toLowerCase().includes(q) ||
        badge.description.toLowerCase().includes(q) ||
        badge.requirementText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-amber-950/20 hover:border-amber-400/50 transition-all duration-300 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Milestones & Badges</span>
              <span className="text-xs font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                52 Badges
              </span>
            </h3>
            <p className="text-xs text-zinc-400 font-light">
              Unlock achievements by maintaining habits, streaks, AI proofs & resonance
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-zinc-950/90 px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-inner">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-amber-300">
              {unlockedCount} / {totalBadges} Unlocked
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto bg-zinc-950/80 p-1 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({totalBadges})
          </button>
          <button
            onClick={() => setFilter('unlocked')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filter === 'unlocked'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              filter === 'locked'
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Locked ({totalBadges - unlockedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 52 badges..."
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredBadges.map((badge) => {
          const isUnlocked = unlockedSet.has(badge.id);

          return (
            <div
              key={badge.id}
              className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${
                isUnlocked
                  ? 'bg-zinc-950/90 border-emerald-500/30 hover:border-emerald-400/50 shadow-lg shadow-emerald-950/20'
                  : 'bg-zinc-950/40 border-zinc-800/60 opacity-60 hover:opacity-85'
              }`}
            >
              {/* Badge Icon & Status Indicator */}
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md ${
                    isUnlocked
                      ? `bg-gradient-to-br ${badge.color} text-white shadow-amber-500/20 ring-1 ring-white/20`
                      : 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/50'
                  }`}
                >
                  {isUnlocked ? badge.icon : <Lock className="w-4 h-4 text-zinc-500" />}
                </div>
                {isUnlocked ? (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                    Unlocked
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded-md">
                    Locked
                  </span>
                )}
              </div>

              {/* Title & Requirement */}
              <div>
                <h4
                  className={`text-xs font-bold truncate ${
                    isUnlocked ? 'text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  {badge.name}
                </h4>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug font-light">
                  {isUnlocked ? badge.description : badge.requirementText}
                </p>
              </div>
            </div>
          );
        })}

        {filteredBadges.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 text-xs">
            No badges found matching "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};
