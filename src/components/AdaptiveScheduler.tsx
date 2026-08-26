import React, { useState } from 'react';
import {
  Clock,
  Compass,
  Sparkles,
  Zap,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  ChevronDown,
  ChevronUp,
  Brain,
  CheckCircle2,
  Calendar,
  Copy,
  Check,
} from 'lucide-react';
import { CATEGORY_NAMES, CategoryKey, Goal, UserConfig } from '../types';

interface AdaptiveSchedulerProps {
  goals: Goal[];
  userConfig?: UserConfig;
}

interface TimeBlock {
  id: string;
  name: string;
  timeRange: string;
  icon: React.ReactNode;
  circadianPhase: string;
  energyProfile: string;
  recommendedCategories: CategoryKey[];
  accentColor: string;
  badgeBg: string;
}

const TIME_BLOCKS: TimeBlock[] = [
  {
    id: 'early_morning',
    name: 'Dawn Activation',
    timeRange: '6:00 AM - 9:00 AM',
    icon: <Sunrise className="w-4 h-4 text-amber-400" />,
    circadianPhase: 'Cortisol Awakening Response',
    energyProfile: 'High Physical Energy & Spiritual Openness',
    recommendedCategories: ['health', 'spiritual'],
    accentColor: 'border-amber-500/30 text-amber-300',
    badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  },
  {
    id: 'late_morning',
    name: 'Peak Focus Window',
    timeRange: '9:00 AM - 12:00 PM',
    icon: <Sun className="w-4 h-4 text-emerald-400" />,
    circadianPhase: 'Maximum Cognitive Acuity',
    energyProfile: 'High Executive Function & Prefrontal Cortex Focus',
    recommendedCategories: ['smarts', 'spiritual'],
    accentColor: 'border-emerald-500/30 text-emerald-300',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  },
  {
    id: 'afternoon_recovery',
    name: 'Midday Reset & Recovery',
    timeRange: '12:00 PM - 3:00 PM',
    icon: <Zap className="w-4 h-4 text-sky-400" />,
    circadianPhase: 'Post-Prandial Dip & Restorative Pause',
    energyProfile: 'Moderate Focus / Recharge & Self-Care Period',
    recommendedCategories: ['selfCare', 'health'],
    accentColor: 'border-sky-500/30 text-sky-300',
    badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  },
  {
    id: 'late_afternoon',
    name: 'Secondary Productivity',
    timeRange: '3:00 PM - 6:00 PM',
    icon: <Clock className="w-4 h-4 text-indigo-400" />,
    circadianPhase: 'Body Temperature Peak & Motor Skill Apex',
    energyProfile: 'Physical Agility & Tactical Execution',
    recommendedCategories: ['smarts', 'health', 'happiness'],
    accentColor: 'border-indigo-500/30 text-indigo-300',
    badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  },
  {
    id: 'evening_winddown',
    name: 'Twilight Reflection',
    timeRange: '6:00 PM - 9:00 PM',
    icon: <Sunset className="w-4 h-4 text-orange-400" />,
    circadianPhase: 'Parasympathetic Transition & Social Bonding',
    energyProfile: 'Emotional Processing, Gratitude & Social Joy',
    recommendedCategories: ['happiness', 'selfCare'],
    accentColor: 'border-orange-500/30 text-orange-300',
    badgeBg: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
  },
  {
    id: 'night_rest',
    name: 'Night Restoration',
    timeRange: '9:00 PM - 10:30 PM',
    icon: <Moon className="w-4 h-4 text-purple-400" />,
    circadianPhase: 'Melatonin Rise & Subconscious Consolidation',
    energyProfile: 'Deep Introspection, Journaling & Sleep Prep',
    recommendedCategories: ['spiritual', 'selfCare'],
    accentColor: 'border-purple-500/30 text-purple-300',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  },
];

export const AdaptiveScheduler: React.FC<AdaptiveSchedulerProps> = ({
  goals,
  userConfig,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'recommendations'>('timeline');
  const [copied, setCopied] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>('late_morning');

  const activeGoals = goals.filter((g) => !g.archived);

  // Function to determine best time block for a goal based on category weights and special flags
  const getOptimalBlockForGoal = (goal: Goal): TimeBlock => {
    // Check highest impact weight category among goal.effects
    let highestCategory: CategoryKey = goal.category;
    let maxWeight = -999;

    goal.effects.forEach((eff) => {
      if (eff.weight > maxWeight) {
        maxWeight = eff.weight;
        highestCategory = eff.category;
      }
    });

    // Special cognitive training flag prioritization
    if (goal.isCognitiveTraining || highestCategory === 'smarts') {
      return TIME_BLOCKS[1]; // Peak Focus 9am-12pm
    }

    if (goal.isLifePathAligned && highestCategory === 'spiritual') {
      return TIME_BLOCKS[0]; // Early Morning Dawn Activation
    }

    if (highestCategory === 'health') {
      return TIME_BLOCKS[0]; // Early Morning Physical Activation
    }

    if (highestCategory === 'selfCare') {
      return TIME_BLOCKS[2]; // Midday Reset & Recovery
    }

    if (highestCategory === 'happiness') {
      return TIME_BLOCKS[4]; // Evening Winddown
    }

    if (highestCategory === 'spiritual') {
      return TIME_BLOCKS[5]; // Night Restoration
    }

    return TIME_BLOCKS[3]; // Default Late Afternoon
  };

  // Group goals into time blocks
  const scheduledBlocks = TIME_BLOCKS.map((block) => {
    const matchingGoals = activeGoals.filter((g) => {
      const bestBlock = getOptimalBlockForGoal(g);
      return bestBlock.id === block.id;
    });

    return {
      ...block,
      goals: matchingGoals,
    };
  });

  // Calculate life path resonance score
  const totalAlignedGoals = activeGoals.filter((g) => g.isLifePathAligned).length;
  const resonanceScore =
    activeGoals.length > 0
      ? Math.min(100, Math.round(70 + (totalAlignedGoals / activeGoals.length) * 30))
      : 0;

  const handleCopySchedule = () => {
    let itineraryText = `📅 ADAPTIVE CIRCADIAN SCHEDULE\nLife Path Goal: ${userConfig?.lifePathGoal || 'Optimal High Performance'}\nResonance Alignment: ${resonanceScore}%\n\n`;

    scheduledBlocks.forEach((b) => {
      if (b.goals.length > 0) {
        itineraryText += `⏰ ${b.timeRange} — ${b.name} (${b.circadianPhase})\n`;
        b.goals.forEach((g) => {
          itineraryText += `  • [${CATEGORY_NAMES[g.category]}] ${g.name}${g.isLifePathAligned ? ' ⭐' : ''}\n`;
        });
        itineraryText += '\n';
      }
    });

    navigator.clipboard.writeText(itineraryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-5 shadow-lg space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
            <Compass className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Adaptive Circadian Scheduler</span>
              </h3>
              {activeGoals.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {resonanceScore}% Life Path Resonance
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Optimizes habit timing based on cognitive load, cortisol rhythms, and category weights
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {activeGoals.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Timeline View
              </button>
              <button
                onClick={() => setViewMode('recommendations')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'recommendations'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Category Matrix
              </button>
            </div>

            <button
              onClick={handleCopySchedule}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium border border-indigo-500/40 flex items-center space-x-1.5 transition-all shadow-sm"
              title="Copy Schedule to Clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Export Itinerary</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {activeGoals.length === 0 ? (
        <div className="p-6 bg-zinc-950/60 border border-zinc-800 rounded-xl text-center space-y-2">
          <Clock className="w-8 h-8 text-indigo-400/40 mx-auto" />
          <p className="text-xs text-zinc-300 font-medium">No habits scheduled yet</p>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
            Add habits or click "Add Science Presets" to automatically distribute routines across peak focus, midday reset, and evening winddown windows.
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-3">
          {scheduledBlocks.map((block) => {
            const isExpanded = expandedBlockId === block.id;

            return (
              <div
                key={block.id}
                className={`bg-zinc-950/80 border ${block.accentColor} rounded-xl p-3.5 transition-all shadow-inner`}
              >
                {/* Block Title Row */}
                <div
                  onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3">

                    <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      {block.icon}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-zinc-100">
                          {block.timeRange}
                        </span>
                        <span className="text-xs font-medium text-zinc-300">• {block.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${block.badgeBg}`}>
                          {block.goals.length} Goal{block.goals.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                        <span className="text-zinc-500">Circadian:</span> {block.circadianPhase}
                      </p>
                    </div>
                  </div>

                  <button className="text-zinc-400 hover:text-white p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Habits List for this Block */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2">
                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Optimal Energy Profile: {block.energyProfile}</span>
                    </div>

                    {block.goals.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {block.goals.map((goal) => (
                          <div
                            key={goal.id}
                            className="bg-zinc-900/90 border border-zinc-800/90 rounded-lg p-2.5 flex flex-col justify-between"
                          >
                            <div className="flex items-start justify-between space-x-2">
                              <div>
                                <span className="text-[9px] uppercase font-mono tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  {CATEGORY_NAMES[goal.category]}
                                </span>
                                <h4 className="text-xs font-semibold text-zinc-100 mt-1">
                                  {goal.name}
                                </h4>
                              </div>

                              {goal.isLifePathAligned && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-0.5 shrink-0"
                                  title="Life Path Aligned"
                                >
                                  <Compass className="w-2.5 h-2.5 text-indigo-400" />
                                  <span>Aligned</span>
                                </span>
                              )}
                            </div>

                            {/* Weight Breakdown */}
                            <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                              <span className="text-zinc-500 font-mono">Impact Weights:</span>
                              <div className="flex items-center space-x-1">
                                {goal.effects.map((eff, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded bg-zinc-950 font-mono text-emerald-400 border border-zinc-800"
                                  >
                                    +{eff.weight} {eff.category.slice(0, 3)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-900/40 rounded-lg text-center text-xs text-zinc-500 italic">
                        No habits currently mapped to this window. Ideal for general focus or rest.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Matrix View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeGoals.map((goal) => {
            const bestBlock = getOptimalBlockForGoal(goal);

            return (
              <div
                key={goal.id}
                className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                      {CATEGORY_NAMES[goal.category]}
                    </span>
                    {goal.isCognitiveTraining && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                        <Brain className="w-3 h-3 text-amber-400" />
                        <span>Cognitive Drill</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-zinc-100 mt-1.5">{goal.name}</h4>
                  <p className="text-xs text-zinc-400 font-light mt-1 line-clamp-2">
                    {goal.description || 'Routine habit action.'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs space-y-1">
                  <div className="flex items-center justify-between text-zinc-300 font-medium">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">
                      Suggested Time Slot
                    </span>
                    <span className="font-mono text-indigo-300">{bestBlock.timeRange}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{bestBlock.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
