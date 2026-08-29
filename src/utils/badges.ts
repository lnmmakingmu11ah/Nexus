import { CategoryKey, DailyGoalLog, DailyJournal, Goal, UserConfig } from '../types';
import { computeEngagementTier, evaluateMicroRewards, getStreakBadgeThreshold } from './zeroToHero';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or Lucide icon indicator
  color: string; // Tailwind gradient / text color
  requirementText: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_step',
    name: 'Genesis Step',
    description: 'Logged your very first completed habit check-in',
    icon: '🚀',
    color: 'from-emerald-400 to-teal-500',
    requirementText: 'Complete 1 goal check-in',
  },
  {
    id: 'micro_first_win',
    name: 'You Showed Up',
    description: 'Completed your first tiny win — the hardest part is starting',
    icon: '🌱',
    color: 'from-lime-300 to-emerald-500',
    requirementText: 'Log any completion while rebuilding momentum',
  },
  {
    id: 'micro_showed_up',
    name: 'Bed Made Energy',
    description: 'A small completion still counts. NEXUS saw you.',
    icon: '🛏️',
    color: 'from-sky-300 to-cyan-500',
    requirementText: 'Complete one habit on a low-motivation stretch',
  },
  {
    id: 'micro_two_day',
    name: 'Two-Day Spark',
    description: 'Did the same habit two days in a row — that is how streaks begin',
    icon: '✨',
    color: 'from-amber-300 to-yellow-500',
    requirementText: 'Complete any goal on two consecutive days',
  },
  {
    id: 'micro_made_bed',
    name: 'Self-Care Spark',
    description: 'Took care of a self-care habit. Tiny, real, yours.',
    icon: '🪞',
    color: 'from-fuchsia-300 to-pink-500',
    requirementText: 'Complete a self-care goal',
  },
  {
    id: 'micro_tiny_step',
    name: 'Three Tiny Steps',
    description: 'Three completions. You are not starting from zero anymore.',
    icon: '👣',
    color: 'from-emerald-300 to-teal-500',
    requirementText: 'Log 3 completions while in rebuild mode',
  },
  {
    id: 'daily_sweep',
    name: 'Daily Sweep',
    description: 'Completed every active daily goal on the same day',
    icon: 'OK',
    color: 'from-emerald-300 to-lime-500',
    requirementText: 'Finish all active daily goals in one day',
  },
  {
    id: 'weekly_anchor',
    name: 'Weekly Anchor',
    description: 'Completed a weekly goal and kept the bigger rhythm alive',
    icon: 'PIN',
    color: 'from-cyan-400 to-blue-500',
    requirementText: 'Complete any weekly goal',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Completed a habit early or set morning reminders before 9 AM',
    icon: '🌅',
    color: 'from-amber-400 to-orange-500',
    requirementText: 'Complete a goal or set reminder before 9 AM',
  },
  {
    id: 'dawn_patrol',
    name: 'Dawn Patrol',
    description: 'Logged a habit before 7:00 AM in the morning',
    icon: '🌄',
    color: 'from-amber-300 to-yellow-500',
    requirementText: 'Log habit completion before 7 AM',
  },
  {
    id: 'night_owl',
    name: 'Evening Reflector',
    description: 'Reflected deeply in your Daily Journal',
    icon: '🌙',
    color: 'from-blue-400 to-indigo-500',
    requirementText: 'Record a journal reflection',
  },
  {
    id: 'midnight_warrior',
    name: 'Midnight Grind',
    description: 'Logged a goal completion or journal after 10 PM',
    icon: '🌌',
    color: 'from-purple-500 to-indigo-600',
    requirementText: 'Log an activity after 10 PM',
  },
  {
    id: 'consistency_king',
    name: '7-Day Vanguard',
    description: 'Maintained a 7-day streak on any goal',
    icon: '👑',
    color: 'from-yellow-400 to-amber-600',
    requirementText: 'Reach a 7-day streak on any goal',
  },
  {
    id: 'fortnight_master',
    name: 'Fortnight Focus',
    description: 'Sustained a 14-day goal streak',
    icon: '🛡️',
    color: 'from-orange-400 to-red-500',
    requirementText: 'Reach a 14-day streak on any goal',
  },
  {
    id: 'monthly_titan',
    name: 'Monthly Titan',
    description: 'Archieved a massive 30-day unbroken goal streak',
    icon: '🔥',
    color: 'from-rose-500 to-red-600',
    requirementText: 'Reach a 30-day streak on any goal',
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Logged 10 total goal check-ins',
    icon: '💯',
    color: 'from-indigo-400 to-purple-600',
    requirementText: 'Complete 10 goal check-ins',
  },
  {
    id: 'quarter_k',
    name: 'Quarter Century',
    description: 'Logged 25 total goal check-ins',
    icon: '⚡',
    color: 'from-cyan-400 to-blue-500',
    requirementText: 'Complete 25 goal check-ins',
  },
  {
    id: 'half_hundred',
    name: 'Half Century',
    description: 'Logged 50 total goal check-ins',
    icon: '🎯',
    color: 'from-teal-400 to-emerald-600',
    requirementText: 'Complete 50 goal check-ins',
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Logged 100 total goal check-ins',
    icon: '🏆',
    color: 'from-amber-400 to-yellow-500',
    requirementText: 'Complete 100 goal check-ins',
  },
  {
    id: 'titan_500',
    name: 'Titan 500',
    description: 'Logged 500 total goal check-ins',
    icon: '⚜️',
    color: 'from-purple-400 to-pink-600',
    requirementText: 'Complete 500 goal check-ins',
  },
  {
    id: 'thousand_legend',
    name: '1K Legend',
    description: 'Achieved an unprecedented 1,000 completed goal check-ins',
    icon: '👑',
    color: 'from-yellow-300 via-amber-400 to-orange-500',
    requirementText: 'Complete 1,000 goal check-ins',
  },
  {
    id: 'resonance_bronze',
    name: 'Resonance Spark',
    description: 'Achieved a Composite Life Score of 25%+',
    icon: '🌱',
    color: 'from-emerald-600 to-teal-700',
    requirementText: 'Reach a 25% Composite Score',
  },
  {
    id: 'resonance_silver',
    name: 'Silver Resonance',
    description: 'Achieved a Composite Life Score of 50%+',
    icon: '🥈',
    color: 'from-zinc-300 to-zinc-500',
    requirementText: 'Reach a 50% Composite Score',
  },
  {
    id: 'resonance_pioneer',
    name: 'Gold Resonance',
    description: 'Achieved a Composite Life Score of 75%+',
    icon: '🥇',
    color: 'from-amber-400 to-yellow-500',
    requirementText: 'Reach a 75% Composite Score',
  },
  {
    id: 'resonance_diamond',
    name: 'Diamond Resonance',
    description: 'Achieved an elite Composite Life Score of 90%+',
    icon: '💎',
    color: 'from-cyan-300 to-blue-500',
    requirementText: 'Reach a 90% Composite Score',
  },
  {
    id: 'apex_perfection',
    name: 'Apex 100%',
    description: 'Reached a flawless 100% Composite Life Score',
    icon: '🌟',
    color: 'from-amber-300 via-yellow-400 to-amber-600',
    requirementText: 'Reach 100% Composite Score',
  },
  {
    id: 'balanced_master',
    name: 'Balanced Master',
    description: 'Maintained 50%+ score in all 5 life categories simultaneously',
    icon: '☯️',
    color: 'from-rose-400 to-amber-500',
    requirementText: 'Score 50%+ in all 5 categories',
  },
  {
    id: 'pinnacle_harmony',
    name: 'Pinnacle Harmony',
    description: 'Maintained 80%+ score in all 5 life categories simultaneously',
    icon: '🔮',
    color: 'from-purple-400 to-indigo-500',
    requirementText: 'Score 80%+ in all 5 categories',
  },
  {
    id: 'health_initiate',
    name: 'Vitality Spark',
    description: 'Achieved 50%+ in the Physical Health category',
    icon: '🏃',
    color: 'from-rose-400 to-red-500',
    requirementText: 'Reach 50%+ Health Score',
  },
  {
    id: 'health_titan',
    name: 'Physical Titan',
    description: 'Achieved 80%+ in the Physical Health category',
    icon: '💪',
    color: 'from-red-500 to-rose-600',
    requirementText: 'Reach 80%+ Health Score',
  },
  {
    id: 'smarts_scholar',
    name: 'Cognitive Scholar',
    description: 'Achieved 50%+ in the Smarts & Intellect category',
    icon: '📚',
    color: 'from-blue-400 to-cyan-500',
    requirementText: 'Reach 50%+ Smarts Score',
  },
  {
    id: 'smarts_sage',
    name: 'Polymath Sage',
    description: 'Achieved 80%+ in the Smarts & Intellect category',
    icon: '🧠',
    color: 'from-indigo-400 to-blue-600',
    requirementText: 'Reach 80%+ Smarts Score',
  },
  {
    id: 'spiritual_zen',
    name: 'Inner Zen',
    description: 'Achieved 50%+ in the Spiritual & Purpose category',
    icon: '🧘',
    color: 'from-emerald-400 to-teal-500',
    requirementText: 'Reach 50%+ Spiritual Score',
  },
  {
    id: 'spiritual_monk',
    name: 'Transcendent Monk',
    description: 'Achieved 80%+ in the Spiritual & Purpose category',
    icon: '✨',
    color: 'from-teal-300 to-emerald-500',
    requirementText: 'Reach 80%+ Spiritual Score',
  },
  {
    id: 'selfcare_oasis',
    name: 'Self-Care Sanctuary',
    description: 'Achieved 50%+ in the Self-Care & Regeneration category',
    icon: '🛁',
    color: 'from-purple-400 to-pink-500',
    requirementText: 'Reach 50%+ Self-Care Score',
  },
  {
    id: 'selfcare_sovereign',
    name: 'Wellness Sovereign',
    description: 'Achieved 80%+ in the Self-Care & Regeneration category',
    icon: '💖',
    color: 'from-pink-400 to-rose-500',
    requirementText: 'Reach 80%+ Self-Care Score',
  },
  {
    id: 'happiness_glow',
    name: 'Joyful Aura',
    description: 'Achieved 50%+ in the Happiness & Joy category',
    icon: '😊',
    color: 'from-amber-400 to-orange-400',
    requirementText: 'Reach 50%+ Happiness Score',
  },
  {
    id: 'happiness_magnet',
    name: 'Radiance Magnet',
    description: 'Achieved 80%+ in the Happiness & Joy category',
    icon: '☀️',
    color: 'from-yellow-400 to-amber-500',
    requirementText: 'Reach 80%+ Happiness Score',
  },
  {
    id: 'habit_stacker',
    name: 'Habit Chainer',
    description: 'Linked habits together for automated Habit Stacking',
    icon: '🔗',
    color: 'from-cyan-400 to-blue-600',
    requirementText: 'Link 2 habits together',
  },
  {
    id: 'chain_architect',
    name: 'Chain Architect',
    description: 'Linked 3 or more habits into a seamless routine chain',
    icon: '⛓️',
    color: 'from-blue-500 to-indigo-600',
    requirementText: 'Create 3 or more habit links',
  },
  {
    id: 'proof_master',
    name: 'Proof Verified',
    description: 'Verified a goal completion with AI photo vision proof',
    icon: '📸',
    color: 'from-emerald-400 to-green-600',
    requirementText: 'Verify a goal with AI photo proof',
  },
  {
    id: 'proof_pioneer',
    name: 'Vision Pioneer',
    description: 'Verified 5 goals using AI photo proof',
    icon: '🔍',
    color: 'from-teal-400 to-cyan-600',
    requirementText: 'Verify 5 goal completions with AI proof',
  },
  {
    id: 'proof_legend',
    name: 'Unshakable Veracity',
    description: 'Verified 15 goals using AI photo proof',
    icon: '👁️',
    color: 'from-indigo-400 to-purple-500',
    requirementText: 'Verify 15 goal completions with AI proof',
  },
  {
    id: 'journal_scribe',
    name: 'Wordsmith Scribe',
    description: 'Recorded 3 deep journal reflections',
    icon: '✍️',
    color: 'from-blue-400 to-indigo-400',
    requirementText: 'Record 3 journal entries',
  },
  {
    id: 'journal_philosopher',
    name: 'Deep Philosopher',
    description: 'Recorded 10 deep journal reflections',
    icon: '📜',
    color: 'from-purple-400 to-indigo-600',
    requirementText: 'Record 10 journal entries',
  },
  {
    id: 'folder_organizer',
    name: 'Category Architect',
    description: 'Organized goals into custom folders or groups',
    icon: '📁',
    color: 'from-amber-400 to-orange-500',
    requirementText: 'Create or assign a custom folder',
  },
  {
    id: 'goal_craftsman',
    name: 'Goal Craftsman',
    description: 'Configured at least 5 active habits in NEXUS',
    icon: '🛠️',
    color: 'from-teal-400 to-emerald-500',
    requirementText: 'Have 5 active goals configured',
  },
  {
    id: 'goal_architect',
    name: 'Master Architect',
    description: 'Configured 10 or more active habits across your life system',
    icon: '🏗️',
    color: 'from-indigo-400 to-purple-600',
    requirementText: 'Have 10 active goals configured',
  },
  {
    id: 'intention_setter',
    name: 'Mindful Intention',
    description: 'Set a daily morning intention banner',
    icon: '🚩',
    color: 'from-amber-300 to-yellow-500',
    requirementText: 'Set a daily intention in the app',
  },
  {
    id: 'longevity_gainer',
    name: 'Lifespan Gainer',
    description: 'Added +1.0 or more years of projected lifespan via positive research modifiers',
    icon: '❤️',
    color: 'from-rose-400 to-pink-500',
    requirementText: 'Gain +1.0 years projected lifespan',
  },
  {
    id: 'longevity_titan',
    name: 'Longevity Vanguard',
    description: 'Added +3.0 or more years of projected lifespan',
    icon: '💖',
    color: 'from-pink-500 to-rose-600',
    requirementText: 'Gain +3.0 years projected lifespan',
  },
  {
    id: 'perfect_day',
    name: 'Perfect Day',
    description: 'Completed 100% of your active daily goals in a single day',
    icon: '⭐',
    color: 'from-yellow-300 to-amber-500',
    requirementText: 'Complete all goals in 1 day',
  },
  {
    id: 'triple_perfection',
    name: 'Triple Crown',
    description: 'Achieved 3 Perfect Days with 100% goal completion',
    icon: '👑',
    color: 'from-amber-400 to-orange-500',
    requirementText: 'Achieve 3 Perfect Days',
  },
  {
    id: 'streak_frenzy',
    name: 'Multi-Streak Frenzy',
    description: 'Maintained 3 distinct goals with active streaks simultaneously',
    icon: '⚡',
    color: 'from-cyan-400 to-blue-500',
    requirementText: 'Have 3 goals with active streaks',
  },
  {
    id: 'ai_collaborator',
    name: 'AI Companion Partner',
    description: 'Conversed with your AI Coach and unlocked your customized Master Blueprint',
    icon: '🤖',
    color: 'from-purple-400 via-pink-400 to-amber-400',
    requirementText: 'Complete AI Chat setup or generate Master Plan',
  },
  {
    id: 'life_path_anchor',
    name: 'Purpose Anchored',
    description: 'Defined your overarching Life Path identity vision',
    icon: '🧭',
    color: 'from-indigo-400 to-cyan-500',
    requirementText: 'Define your Life Path identity goal',
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Vanguard',
    description: 'Logged a completed goal on Saturday or Sunday',
    icon: '🏖️',
    color: 'from-teal-400 to-emerald-500',
    requirementText: 'Log a goal completion on a weekend',
  },
  {
    id: 'custom_habit_pioneer',
    name: 'Custom Creator',
    description: 'Created a customized goal with specialized impact weights or reminders',
    icon: '🎨',
    color: 'from-purple-400 to-pink-500',
    requirementText: 'Create a customized goal',
  },
  {
    id: 'momentum_builder',
    name: 'Momentum Overdrive',
    description: 'Sustained goal check-ins over 5 consecutive calendar days',
    icon: '🚄',
    color: 'from-emerald-400 to-teal-500',
    requirementText: 'Log check-ins across 5 consecutive days',
  },
  // ── NEW: Streak Milestone Badges ─────────────────────────────────────────
  {
    id: 'streak_3',
    name: 'Warm Up',
    description: 'Hit a 3-day habit streak — the hardest part is starting',
    icon: '⚡',
    color: 'from-yellow-300 to-amber-500',
    requirementText: 'Reach a 3-day streak on any goal',
  },
  {
    id: 'streak_5',
    name: 'Momentum',
    description: 'Five days straight — you\'re officially building a habit',
    icon: '🏃',
    color: 'from-orange-400 to-red-500',
    requirementText: 'Reach a 5-day streak on any goal',
  },
  {
    id: 'streak_60',
    name: '60-Day Titan',
    description: 'Two months of unbroken discipline. You are a different person now.',
    icon: '🦁',
    color: 'from-rose-500 to-pink-700',
    requirementText: 'Reach a 60-day streak on any goal',
  },
  {
    id: 'streak_100',
    name: 'The Centurion',
    description: '100 days. No excuses. Just you and the grind.',
    icon: '💎',
    color: 'from-cyan-400 to-blue-600',
    requirementText: 'Reach a 100-day streak on any goal',
  },
  // ── NEW: Level Badges ────────────────────────────────────────────────────
  {
    id: 'level_5',
    name: 'Rising',
    description: 'Reached NEXUS Level 5 — you\'re officially in your arc',
    icon: '⬆️',
    color: 'from-sky-400 to-blue-500',
    requirementText: 'Reach NEXUS Level 5',
  },
  {
    id: 'level_10',
    name: 'Ascendant',
    description: 'Level 10: NEXUS Legend status unlocked. You\'re built different.',
    icon: '🌟',
    color: 'from-amber-400 to-yellow-300',
    requirementText: 'Reach NEXUS Level 10',
  },
  // ── NEW: 5-Pillar Completionist Badge ────────────────────────────────────
  {
    id: 'all_5_pillars',
    name: 'Renaissance',
    description: 'Active goals in all 5 life pillars: Health, Smarts, Self-Care, Happiness & Spiritual',
    icon: '🌍',
    color: 'from-emerald-400 via-cyan-400 to-purple-500',
    requirementText: 'Have at least 1 active goal in each of the 5 life pillars',
  },
  // ── NEW: Daily Sweep Hat-Trick ───────────────────────────────────────────
  {
    id: 'daily_sweep_3',
    name: 'Perfect Hat-Trick',
    description: 'Completed all daily goals on 3 separate days — consistency is your superpower',
    icon: '🎩',
    color: 'from-violet-400 to-fuchsia-600',
    requirementText: 'Complete a full daily sweep 3 different times',
  },
];


export function evaluateBadges(
  goals: Goal[] = [],
  dailyLogs: DailyGoalLog[] = [],
  journals: DailyJournal[] = [],
  compositeScore: number = 0,
  categoryScores: Record<string, number> = {},
  currentUserConfig: Partial<UserConfig> = {}
): { unlockedBadgeIds: string[]; hasNewUnlocks: boolean } {
  const currentUnlocked = new Set<string>(currentUserConfig?.unlockedBadges || []);
  let newlyUnlockedCount = 0;
  const tier = currentUserConfig?.behaviorProfile?.engagementTier || computeEngagementTier(currentUserConfig?.behaviorProfile);

  evaluateMicroRewards(tier, dailyLogs, goals, currentUnlocked).forEach((id) => {
    currentUnlocked.add(id);
    newlyUnlockedCount++;
  });

  const totalCompletions = dailyLogs.filter((l) => l.completed).length;
  const verifiedCount = dailyLogs.filter((l) => l.completed && l.proofVerified).length;
  const validJournals = journals.filter((j) => j.entry && j.entry.trim().length > 5);
  const activeDailyGoalIds = goals
    .filter((goal) => goal.frequency === 'daily' && !goal.archived && (goal.priority || 'active') !== 'parking_lot')
    .map((goal) => goal.id);
  const completedLogsByDate = dailyLogs.reduce<Record<string, Set<string>>>((acc, log) => {
    if (!log.completed) return acc;
    if (!acc[log.date]) acc[log.date] = new Set<string>();
    acc[log.date].add(log.goalId);
    return acc;
  }, {});

  // 1. Genesis Step
  if (!currentUnlocked.has('first_step') && totalCompletions >= 1) {
    currentUnlocked.add('first_step');
    newlyUnlockedCount++;
  }

  if (!currentUnlocked.has('daily_sweep') && activeDailyGoalIds.length > 0) {
    const hasDailySweep = Object.values(completedLogsByDate).some((goalIds) =>
      activeDailyGoalIds.every((goalId) => goalIds.has(goalId))
    );
    if (hasDailySweep) {
      currentUnlocked.add('daily_sweep');
      newlyUnlockedCount++;
    }
  }

  if (!currentUnlocked.has('weekly_anchor')) {
    const hasWeeklyCompletion = dailyLogs.some((log) => {
      const goal = goals.find((g) => g.id === log.goalId);
      return log.completed && goal?.frequency === 'weekly';
    });
    if (hasWeeklyCompletion) {
      currentUnlocked.add('weekly_anchor');
      newlyUnlockedCount++;
    }
  }

  // 2. Early Bird
  if (!currentUnlocked.has('early_bird')) {
    const hasEarlyGoal = goals.some((g) => g.reminderTime && parseInt(g.reminderTime.split(':')[0], 10) < 9);
    const hasEarlyLog = dailyLogs.some((l) => l.completed && l.timestamp && new Date(l.timestamp).getHours() < 9);
    if (hasEarlyGoal || hasEarlyLog) {
      currentUnlocked.add('early_bird');
      newlyUnlockedCount++;
    }
  }

  // 3. Dawn Patrol
  if (!currentUnlocked.has('dawn_patrol')) {
    const hasDawnLog = dailyLogs.some((l) => l.completed && l.timestamp && new Date(l.timestamp).getHours() < 7);
    if (hasDawnLog) {
      currentUnlocked.add('dawn_patrol');
      newlyUnlockedCount++;
    }
  }

  // 4. Night Owl
  if (!currentUnlocked.has('night_owl') && validJournals.length > 0) {
    currentUnlocked.add('night_owl');
    newlyUnlockedCount++;
  }

  // 5. Midnight Grind
  if (!currentUnlocked.has('midnight_warrior')) {
    const hasLateLog = dailyLogs.some((l) => l.completed && l.timestamp && new Date(l.timestamp).getHours() >= 22);
    if (hasLateLog) {
      currentUnlocked.add('midnight_warrior');
      newlyUnlockedCount++;
    }
  }

  // Streaks calculation helper
  const completionCountsByGoal: Record<string, number> = {};
  dailyLogs.forEach((l) => {
    if (l.completed) {
      completionCountsByGoal[l.goalId] = (completionCountsByGoal[l.goalId] || 0) + 1;
    }
  });
  const maxGoalCompletions = Math.max(0, ...Object.values(completionCountsByGoal));

  // 6. 7-Day Vanguard
  if (!currentUnlocked.has('consistency_king') && maxGoalCompletions >= getStreakBadgeThreshold(7, tier)) {
    currentUnlocked.add('consistency_king');
    newlyUnlockedCount++;
  }

  // 7. Fortnight Focus
  if (!currentUnlocked.has('fortnight_master') && maxGoalCompletions >= getStreakBadgeThreshold(14, tier)) {
    currentUnlocked.add('fortnight_master');
    newlyUnlockedCount++;
  }

  // 8. Monthly Titan
  if (!currentUnlocked.has('monthly_titan') && maxGoalCompletions >= getStreakBadgeThreshold(30, tier)) {
    currentUnlocked.add('monthly_titan');
    newlyUnlockedCount++;
  }

  // Total check-ins milestones
  if (!currentUnlocked.has('centurion') && totalCompletions >= 10) {
    currentUnlocked.add('centurion');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('quarter_k') && totalCompletions >= 25) {
    currentUnlocked.add('quarter_k');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('half_hundred') && totalCompletions >= 50) {
    currentUnlocked.add('half_hundred');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('century_club') && totalCompletions >= 100) {
    currentUnlocked.add('century_club');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('titan_500') && totalCompletions >= 500) {
    currentUnlocked.add('titan_500');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('thousand_legend') && totalCompletions >= 1000) {
    currentUnlocked.add('thousand_legend');
    newlyUnlockedCount++;
  }

  // Composite Score Thresholds
  if (!currentUnlocked.has('resonance_bronze') && compositeScore >= 25) {
    currentUnlocked.add('resonance_bronze');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('resonance_silver') && compositeScore >= 50) {
    currentUnlocked.add('resonance_silver');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('resonance_pioneer') && compositeScore >= 75) {
    currentUnlocked.add('resonance_pioneer');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('resonance_diamond') && compositeScore >= 90) {
    currentUnlocked.add('resonance_diamond');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('apex_perfection') && compositeScore >= 99.5) {
    currentUnlocked.add('apex_perfection');
    newlyUnlockedCount++;
  }

  // Balanced & Pinnacle Category Scores
  const catVals = Object.values(categoryScores);
  if (!currentUnlocked.has('balanced_master') && catVals.length >= 5 && catVals.every((s) => s >= 50)) {
    currentUnlocked.add('balanced_master');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('pinnacle_harmony') && catVals.length >= 5 && catVals.every((s) => s >= 80)) {
    currentUnlocked.add('pinnacle_harmony');
    newlyUnlockedCount++;
  }

  // Individual Category Badges
  if (!currentUnlocked.has('health_initiate') && (categoryScores.health || 0) >= 50) {
    currentUnlocked.add('health_initiate');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('health_titan') && (categoryScores.health || 0) >= 80) {
    currentUnlocked.add('health_titan');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('smarts_scholar') && (categoryScores.smarts || 0) >= 50) {
    currentUnlocked.add('smarts_scholar');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('smarts_sage') && (categoryScores.smarts || 0) >= 80) {
    currentUnlocked.add('smarts_sage');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('spiritual_zen') && (categoryScores.spiritual || 0) >= 50) {
    currentUnlocked.add('spiritual_zen');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('spiritual_monk') && (categoryScores.spiritual || 0) >= 80) {
    currentUnlocked.add('spiritual_monk');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('selfcare_oasis') && (categoryScores.selfCare || 0) >= 50) {
    currentUnlocked.add('selfcare_oasis');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('selfcare_sovereign') && (categoryScores.selfCare || 0) >= 80) {
    currentUnlocked.add('selfcare_sovereign');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('happiness_glow') && (categoryScores.happiness || 0) >= 50) {
    currentUnlocked.add('happiness_glow');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('happiness_magnet') && (categoryScores.happiness || 0) >= 80) {
    currentUnlocked.add('happiness_magnet');
    newlyUnlockedCount++;
  }

  // Habit Stacking & Links
  const linkedCount = goals.filter((g) => g.linkedGoalId).length;
  if (!currentUnlocked.has('habit_stacker') && linkedCount >= 1) {
    currentUnlocked.add('habit_stacker');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('chain_architect') && linkedCount >= 3) {
    currentUnlocked.add('chain_architect');
    newlyUnlockedCount++;
  }

  // Proof Badges
  if (!currentUnlocked.has('proof_master') && verifiedCount >= 1) {
    currentUnlocked.add('proof_master');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('proof_pioneer') && verifiedCount >= 5) {
    currentUnlocked.add('proof_pioneer');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('proof_legend') && verifiedCount >= 15) {
    currentUnlocked.add('proof_legend');
    newlyUnlockedCount++;
  }

  // Journal Badges
  if (!currentUnlocked.has('journal_scribe') && validJournals.length >= 3) {
    currentUnlocked.add('journal_scribe');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('journal_philosopher') && validJournals.length >= 10) {
    currentUnlocked.add('journal_philosopher');
    newlyUnlockedCount++;
  }

  // Folder & Goals Count Badges
  if (!currentUnlocked.has('folder_organizer') && goals.some((g) => g.folder && g.folder.trim().length > 0)) {
    currentUnlocked.add('folder_organizer');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('goal_craftsman') && goals.length >= 5) {
    currentUnlocked.add('goal_craftsman');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('goal_architect') && goals.length >= 10) {
    currentUnlocked.add('goal_architect');
    newlyUnlockedCount++;
  }

  // Intention & Purpose
  if (!currentUnlocked.has('life_path_anchor') && currentUserConfig.lifePathGoal && currentUserConfig.lifePathGoal.trim().length > 3) {
    currentUnlocked.add('life_path_anchor');
    newlyUnlockedCount++;
  }

  // Weekend Warrior
  if (!currentUnlocked.has('weekend_warrior')) {
    const hasWeekend = dailyLogs.some((l) => {
      if (!l.completed || !l.timestamp) return false;
      const day = new Date(l.timestamp).getDay();
      return day === 0 || day === 6;
    });
    if (hasWeekend) {
      currentUnlocked.add('weekend_warrior');
      newlyUnlockedCount++;
    }
  }

  // Custom Creator
  if (!currentUnlocked.has('custom_habit_pioneer')) {
    const hasCustom = goals.some((g) => g.effects && g.effects.some((e) => Math.abs(e.weight) > 3));
    if (hasCustom) {
      currentUnlocked.add('custom_habit_pioneer');
      newlyUnlockedCount++;
    }
  }

  // Momentum Overdrive (5 consecutive days with completions)
  if (!currentUnlocked.has('momentum_builder')) {
    const uniqueDays = new Set<string>();
    dailyLogs.forEach((l) => {
      if (l.completed && l.date) uniqueDays.add(l.date);
    });
    if (uniqueDays.size >= 5) {
      currentUnlocked.add('momentum_builder');
      newlyUnlockedCount++;
    }
  }

  // ── NEW: Streak Milestones (3, 5, 60, 100) ─────────────────────────────
  if (!currentUnlocked.has('streak_3') && maxGoalCompletions >= getStreakBadgeThreshold(3, tier)) {
    currentUnlocked.add('streak_3');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('streak_5') && maxGoalCompletions >= getStreakBadgeThreshold(5, tier)) {
    currentUnlocked.add('streak_5');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('streak_60') && maxGoalCompletions >= 60) {
    currentUnlocked.add('streak_60');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('streak_100') && maxGoalCompletions >= 100) {
    currentUnlocked.add('streak_100');
    newlyUnlockedCount++;
  }

  // ── NEW: Level Badges (requires XP calculation) ─────────────────────────
  const xpEarned = dailyLogs.filter((l) => l.completed).length * 5; // rough XP estimate for badge gating
  if (!currentUnlocked.has('level_5') && xpEarned >= 500) {
    currentUnlocked.add('level_5');
    newlyUnlockedCount++;
  }
  if (!currentUnlocked.has('level_10') && xpEarned >= 2000) {
    currentUnlocked.add('level_10');
    newlyUnlockedCount++;
  }

  // ── NEW: All 5 Pillars (Renaissance) ────────────────────────────────────
  if (!currentUnlocked.has('all_5_pillars')) {
    const PILLARS: CategoryKey[] = ['health', 'smarts', 'selfCare', 'happiness', 'spiritual'];
    const activeGoalCategories = new Set(goals.filter((g) => !g.archived).map((g) => g.category));
    if (PILLARS.every((p) => activeGoalCategories.has(p))) {
      currentUnlocked.add('all_5_pillars');
      newlyUnlockedCount++;
    }
  }

  // ── NEW: Daily Sweep Hat-Trick ────────────────────────────────────────────
  if (!currentUnlocked.has('daily_sweep_3') && activeDailyGoalIds.length > 0) {
    const sweepDays = Object.values(completedLogsByDate).filter((goalIds) =>
      activeDailyGoalIds.every((goalId) => goalIds.has(goalId))
    ).length;
    if (sweepDays >= 3) {
      currentUnlocked.add('daily_sweep_3');
      newlyUnlockedCount++;
    }
  }

  return {
    unlockedBadgeIds: Array.from(currentUnlocked),
    hasNewUnlocks: newlyUnlockedCount > 0,
  };
}

export function checkAndUnlockBadges(
  goals: Goal[],
  dailyLogs: DailyGoalLog[],
  journals: DailyJournal[],
  compositeScore: number,
  categoryScores: Record<string, number>,
  currentUserConfig: UserConfig,
  saveConfigCallback: (updated: UserConfig) => void
): string[] {
  const { unlockedBadgeIds, hasNewUnlocks } = evaluateBadges(
    goals,
    dailyLogs,
    journals,
    compositeScore,
    categoryScores,
    currentUserConfig
  );

  if (hasNewUnlocks) {
    saveConfigCallback({
      ...currentUserConfig,
      unlockedBadges: unlockedBadgeIds,
    });
  }

  return unlockedBadgeIds;
}
