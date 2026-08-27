export type CategoryKey = 'health' | 'spiritual' | 'smarts' | 'selfCare' | 'happiness';

export type CategoryScores = Record<CategoryKey, number>;

export interface GoalEffect {
  category: CategoryKey;
  weight: number; // Positive or negative integer/float (e.g., +3, -2)
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly';
  category: CategoryKey; // Primary visual category
  folder?: string; // Customizable folder (e.g. 'Work', 'Wellness', 'Hobbies')
  priority?: 'active' | 'maintenance' | 'parking_lot'; // How urgently this goal should shape daily focus
  proofPreference?: 'auto' | 'photo' | 'reflection' | 'challenge'; // Best evidence style for this goal
  difficulty?: 'low' | 'medium' | 'high'; // Difficulty level for prioritizing high impact tasks
  reminderTime?: string; // e.g. "08:00", "19:30" (24-hour format)
  reminderEnabled?: boolean; // Whether smart notification reminder is active
  linkedGoalId?: string; // ID of the next habit to trigger (Habit Stacking)
  stackingNote?: string; // Optional cue or transition note for habit stacking
  effects: GoalEffect[];
  isLifePathAligned: boolean; // Feeds Spiritual Resonance
  isCognitiveTraining: boolean; // Feeds Smarts (narrow cognitive drills only)
  basePoints: number; // Base impact points (e.g., 5)
  createdAt: string;
  archived?: boolean;
  // Planning engine extensions (all optional — backward compatible)
  milestoneIds?: string[];       // references to Milestone.id entries
  targetDescription?: string;   // disambiguated target from intake chat
  planStatus?: 'active' | 'paused' | 'completed';
  timelineRange?: { minDays: number; maxDays: number };
  timelineSummary?: string;
  timelineMap?: string[];
  dependencyIds?: string[];      // GoalDependency.id entries
  fromIntake?: boolean;          // true if created by the planning engine
}

export interface DailyGoalLog {
  goalId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  proofMediaUrl?: string; // Data URL or object URL (temporary during verification)
  proofVerified?: boolean;
  proofVerificationResult?: string;
  verificationStatus?: 'unchecked' | 'journal_needed' | 'proof_needed' | 'question_review' | 'verified';
  verificationConfidence?: number; // 0-100 confidence that the completion was actually earned
  evidenceSummary?: string;
  timestamp: string;
}

export interface DailyJournal {
  date: string; // YYYY-MM-DD
  entry: string;
  aiReflection?: string;
  mood?: number; // 1 to 5 scale
  updatedAt: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface AIPlannedGoal {
  name: string;
  description: string;
  goalScope?: string;
  scopeNote?: string;
  category: CategoryKey;
  reminderTime?: string;
  basePoints: number;
  targetFrequency: 'daily' | 'weekly';
  effects: GoalEffect[];
  timelineRange?: { minDays: number; maxDays: number };
  timelineSummary?: string;
  timelineMap?: string[];
  timelinePhase1Label?: string;
  timelinePhase2Label?: string;
  timelinePhase3Label?: string;
  timelinePhase1: string;
  timelinePhase2: string;
  timelinePhase3: string;
  linkedGoalName?: string; // habit stack — name of goal this feeds into
  estimatedDaysToMastery?: number;
}

export interface GoalCorrelation {
  goals: string[]; // goal names that reinforce each other
  insight: string;
}

export interface GoalStackUp {
  primaryGoal: string;
  supportingGoals: string[];
  rationale: string;
}

export interface MasterBlueprint {
  userName: string;
  masterVision: string;
  overallWillpowerIndex?: number;
  plannedGoals: AIPlannedGoal[];
  roadblocks: { roadblock: string; solution: string }[];
  goalCorrelations?: GoalCorrelation[];
  goalStackUps?: GoalStackUp[];
  categoryBaselines?: CategoryScores;
  createdAt: string;
  status?: 'building' | 'ready' | 'failed';
}

/** Persistent AI memory — facts learned about the user over time */
export interface AIMemory {
  userProfile?: string; // who they are, what they do
  knownGoals?: string[];
  setbacks?: string[];
  motivations?: string[];
  weeklyCapacity?: string; // time/energy they have
  personalNotes?: string[]; // key facts to remember
  appSnapshot?: string;
  progressNotes?: string[];
  openLoops?: string[];
  supportStrategies?: string[];
  lastUpdated?: string;
}

/** NEXUS AI persona — the AI's consistent fake "life" facts, never contradicted */
export interface NexusPersona {
  lastMentionedShow?: string;    // e.g. "Arcane Season 2"
  lastMentionedPlace?: string;   // e.g. "the gym (skipped leg day again 😭)"
  lastMentionedFood?: string;    // e.g. "jollof rice"
  lastMentionedSong?: string;    // e.g. "Kendrick - Not Like Us"
  opinions?: string[];           // e.g. ["hates pineapple on pizza", "thinks Interstellar > Inception"]
  funFacts?: string[];           // small canon facts NEXUS has stated about itself
  angryAt?: string | null;       // set when NEXUS storms off; cleared next session open
  updatedAt?: string;
}

export interface UserConfig {
  onboarded: boolean;
  userName?: string;
  lifePathGoal: string; // e.g., "Become a wise, calm, disciplined person"
  age: number; // e.g., 28
  sex: 'male' | 'female' | 'other';
  categoryBaselines: CategoryScores;
  absenceThresholdDays: number; // Default 3 days
  dailyDecayRate: number; // Default 2.0% per day
  maxStreakMultiplier: number; // Default 1.8x
  streakRampDays: number; // Default 10 days
  healthApiSyncEnabled: boolean;
  privacyAccepted: boolean;
  unlockedBadges?: string[];
  masterBlueprint?: MasterBlueprint;
  aiChatHistory?: AIChatMessage[];
  onboardingTranscript?: { sender: 'user' | 'ai'; text: string }[];
  aiMemory?: AIMemory;
  nexusPersona?: NexusPersona;    // AI consistent fake-life memory
  aiServerUrl?: string;
  behaviorProfile?: BehaviorProfile;
  locationOptIn?: boolean;
  locationLabel?: string; // e.g., "Nairobi, Kenya"
  countryCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  tutorialCompleted?: boolean;
  tutorialStep?: number;
  // Planning engine state (all optional — backward compatible)
  intakeState?: IntakeState;          // in-progress or last completed intake session
  onboardedAt?: string;               // ISO date string, used for adaptive cap calculation
}

export interface LifeExpectancyFactor {
  id: string;
  name: string;
  category: string;
  description: string;
  currentValue: string;
  coefficientYears: number; // e.g. +3.5 years
  source: string;
  isEditable?: boolean;
}

export interface AIDigest {
  date: string; // YYYY-MM-DD
  summary: string;
  correlations: string[];
  actionableTips: string[];
  generatedAt: string;
}

export const CATEGORY_NAMES: Record<CategoryKey, string> = {
  health: 'Health',
  spiritual: 'Spiritual Resonance',
  smarts: 'Smarts (Cognitive)',
  selfCare: 'Self-Care',
  happiness: 'Happiness',
};

export const CATEGORY_DESCRIPTIONS: Record<CategoryKey, string> = {
  health: 'Physical vitality, strength, endurance, and cardiovascular wellness',
  spiritual: 'Derivative resonance aligned with your core life path identity',
  smarts: 'Narrow cognitive training: math, physics/logic, memory, focus drills',
  selfCare: 'Grooming, sleep quality, skincare, posture, hydration (non-aesthetic)',
  happiness: 'Emotional well-being, gratitude, peace, and daily fulfillment',
};

export const CATEGORY_COLORS: Record<CategoryKey, { bg: string; text: string; border: string; hex: string }> = {
  health: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', hex: '#10b981' },
  spiritual: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', hex: '#6366f1' },
  smarts: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', hex: '#f59e0b' },
  selfCare: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30', hex: '#14b8a6' },
  happiness: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', hex: '#f43f5e' },
};

// ─────────────────────────────────────────────────────────────
// PLANNING ENGINE — new types (all new, none replace existing)
// ─────────────────────────────────────────────────────────────

/**
 * Hardness scale for planned tasks.
 * 1 = trivial  2 = easy  3 = moderate  4 = hard  5 = extreme
 */
export type TaskHardness = 1 | 2 | 3 | 4 | 5;

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  completionCondition: string; // plain-text: what "done" means
  orderIndex: number;          // 0-based sequence within the goal
  status: 'pending' | 'active' | 'completed';
  targetDateRange?: { earliest: string; latest: string }; // YYYY-MM-DD
}

export interface PlannedTask {
  id: string;
  milestoneId: string;
  goalId: string;
  title: string;
  description?: string;
  scheduledDate: string;            // YYYY-MM-DD
  durationMinutes: number;
  hardness: TaskHardness;
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekdays' | 'custom';
  status: 'pending' | 'done' | 'skipped' | 'rescheduled';
  completedAt?: string;
  skippedReason?: string;
  framedTitle?: string;             // AI-generated display version
  motivationalNote?: string;        // AI framing, loaded on demand
  /** Maps to existing DailyGoalLog via goalId for score integration */
  linkedGoalId?: string;
}

export interface GoalDependency {
  id: string;
  fromGoalId: string;  // prerequisite
  toGoalId: string;    // dependent goal
  sharedTaskIds?: string[];
  type: 'prerequisite' | 'shared_infrastructure';
  rationale?: string;
}


export interface BehaviorProfile {
  completionRateByCategory: Record<CategoryKey, number>; // 0–1
  completionRateByTaskType: Record<string, number>;
  successfulTimeSlots: string[];   // e.g. ['08:00', '09:00']
  failingTimeSlots: string[];
  avgStreakBeforeDropoff: number;
  lapseRecoveryDays: number;
  responsiveNudgeTypes: string[];
  lastComputedAt: string;
  daysSinceOnboarding: number;
  /** Adaptive daily task cap based on consistency track record */
  currentDailyCap: number;         // 2 → 7, computed by scheduler
}

export interface FeasibilityResult {
  pass: boolean;
  reason?: string;
  willpowerScore?: number;         // 0–10, from willpower assessment
  willpowerAssessmentDone?: boolean;
  proposedRevision?: {
    timelineRange: { minDays: number; maxDays: number };
    scopeNote: string;
  };
  userOverride?: boolean;          // true if user confirmed override after assessment
}

export interface UserConstraints {
  weeklyHoursAvailable: number;
  preferredTimeSlots: string[];
  existingCommitments: string[];
  pastAttempts: string[];
}

export interface PlannedGoalDraft {
  id?: string;
  title: string;
  targetDescription: string;
  category: CategoryKey;
  rawUserTimeline?: string;
  timelineRange?: { minDays: number; maxDays: number };
  timelineSummary?: string;
  timelineMap?: string[];
  feasibility?: FeasibilityResult;
  milestones?: Milestone[];
  confirmedByUser?: boolean;
}

export interface IntakeState {
  phase: 'discovery' | 'disambiguation' | 'feasibility' | 'willpower_check' | 'confirmed' | 'complete';
  collectedGoals: PlannedGoalDraft[];
  currentFeasibilityGoalIndex?: number;  // which goal is under feasibility review
  constraints: Partial<UserConstraints>;
  transcript: { sender: 'user' | 'ai'; text: string }[];
  startedAt: string;
}

export interface ResearchCacheEntry {
  key: string;       // `{category}:{goalType}`
  findings: string;  // summarized, injected as plan context
  fetchedAt: string;
  expiresAt: string;
}
