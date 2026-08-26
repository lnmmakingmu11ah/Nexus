import { buildAdaptiveTimeline, buildTimelineMilestones, formatTimelineDays } from '../src/utils/timelinePlanner';

export interface OnboardingParams {
  lifePathGoal: string;
  currentHabits: string;
  age?: number;
  sex?: string;
}

export interface JournalParams {
  journalEntry: string;
  lifePathGoal: string;
  completedGoals: string[];
  scoreSummary: { composite: number };
}

export interface ProofParams {
  imageBase64?: string;
  mimeType?: string;
  goalName: string;
  goalDescription?: string;
  journalEntry?: string;
  challengeAnswers?: string[];
  verificationMode?: 'proof' | 'journal_challenge' | 'journal_reflection';
}

export interface InsightsParams {
  logsHistory: any[];
  scoresHistory: any;
  lifePathGoal: string;
}

export interface InsightsDigestResult {
  date: string;
  summary: string;
  correlations: string[];
  actionableTips: string[];
  generatedAt?: string;
}

export interface AIChatParams {
  messages: { sender: 'user' | 'ai'; text: string }[];
  userContext?: {
    userName?: string;
    lifePathGoal?: string;
    stage?: 'onboarding' | 'open_chat' | 'plan_discussion';
    location?: {
      label?: string;
      countryCode?: string;
      latitude?: number;
      longitude?: number;
    };
    aiMemory?: {
      userProfile?: string;
      knownGoals?: string[];
      setbacks?: string[];
      motivations?: string[];
      weeklyCapacity?: string;
      personalNotes?: string[];
      appSnapshot?: string;
      progressNotes?: string[];
      openLoops?: string[];
      supportStrategies?: string[];
      lastUpdated?: string;
    };
    appContext?: {
      today: string;
      yesterday: string;
      activeGoals: {
        id: string;
        name: string;
        description?: string;
        category: string;
        reminderTime?: string;
        timeline?: string;
        timelineSummary?: string;
        timelineMap?: string[];
      }[];
      completedToday: string[];
      missedYesterday: string[];
      recentCompletions: { date: string; goals: string[] }[];
      recentJournals: { date: string; entry: string; mood?: number }[];
      currentScore?: number;
      behaviorProfile?: {
        currentDailyCap?: number;
        avgStreakBeforeDropoff?: number;
        lapseRecoveryDays?: number;
        successfulTimeSlots?: string[];
        failingTimeSlots?: string[];
        completionRateByCategory?: Record<string, number>;
      };
      goalProgress?: {
        goalId: string;
        name: string;
        streak: number;
        likelihoodPercent: number;
        formattedTimeline: string;
        statusLabel: string;
      }[];
    };
  };
}

export interface AISynthesizeBlueprintParams {
  transcript: { sender: 'user' | 'ai'; text: string }[];
  userContext?: any;
}

export interface NudgeParams {
  userName?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  compositeScore: number;
  completedCount: number;
  totalGoalsCount: number;
  pendingGoals: { id: string; name: string; category: string; streak: number }[];
  atRiskStreaks: { name: string; streak: number }[];
  lowestCategory?: { category: string; score: number };
}

export interface ExtractMemoryParams {
  messages: { sender: 'user' | 'ai'; text: string }[];
  existingMemory?: AIChatParams['userContext']['aiMemory'];
  appContext?: AIChatParams['userContext']['appContext'];
}

// ─────────────────────────────────────────────────────────────────────────────
// Planning Engine Params
// ─────────────────────────────────────────────────────────────────────────────

export interface IntakeTurnParams {
  messages: { sender: 'user' | 'ai'; text: string }[];
  intakePhase: 'discovery' | 'disambiguation' | 'feasibility' | 'willpower_check' | 'confirmed';
  collectedGoals: any[];
  constraints: any;
  userName?: string;
}

export interface FeasibilityParams {
  goalTitle: string;
  goalDescription: string;
  rawTimeline: string;
  constraints: { weeklyHoursAvailable?: number; pastAttempts?: string[] };
}

export interface FeasibilityResult {
  pass: boolean;
  reason: string;
  proposedRevision?: { timelineRange: { minDays: number; maxDays: number }; scopeNote: string };
}

export interface WillpowerAssessmentParams {
  goalTitle: string;
  rawTimeline: string;
  messages: { sender: 'user' | 'ai'; text: string }[];
}

export interface SynthesizePlanParams {
  collectedGoals: any[];
  constraints: any;
  researchContext?: string;
  behaviorProfile?: any;
  userName?: string;
}

export interface ChainGoalsParams {
  goals: { id: string; name: string; description: string; category: string }[];
  overlaps: any[];
}

export interface FrameTasksParams {
  tasks: { title: string; description?: string; hardness: number; goalName: string }[];
  behaviorProfile?: any;
  userName?: string;
}

export interface LapseRecoveryParams {
  missedCount: number;
  goalName: string;
  behaviorProfile?: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// AIProvider Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface AIProvider {
  name: string;
  onboardingReflect(params: OnboardingParams): Promise<{ reflection: string; suggestedAdjustments?: string[] }>;
  journalReflect(params: JournalParams): Promise<{ reflection: string }>;
  verifyProof(params: ProofParams): Promise<{
    verified: boolean;
    message: string;
    confidence?: number;
    evidenceSummary?: string;
    followUpQuestions?: string[];
  }>;
  generateInsights(params: InsightsParams): Promise<{ digest: InsightsDigestResult }>;
  chatCompanion(params: AIChatParams): Promise<{ reply: string; readyForPlan?: boolean; planApproved?: boolean }>;
  synthesizeBlueprint(params: AISynthesizeBlueprintParams): Promise<{ blueprint: any }>;
  extractMemory(params: ExtractMemoryParams): Promise<{ memory: any }>;
  generateNudge(params: NudgeParams): Promise<{ message: string; actionTag: string; category: string }>;
  intakeTurn(params: IntakeTurnParams): Promise<{ reply: string; updatedPhase?: string; readyForFeasibility?: boolean }>;
  runFeasibilityCheck(params: FeasibilityParams): Promise<FeasibilityResult>;
  runWillpowerAssessment(params: WillpowerAssessmentParams): Promise<{ score: number; canOverride: boolean; message: string }>;
  synthesizePlan(params: SynthesizePlanParams): Promise<{ goals: any[]; dependencies: any[] }>;
  chainGoals(params: ChainGoalsParams): Promise<{ dependencies: any[] }>;
  frameTasks(params: FrameTasksParams): Promise<{ framedTasks: { title: string; framedTitle: string; motivationalNote: string }[] }>;
  lapseRecovery(params: LapseRecoveryParams): Promise<{ message: string; adjustedPlan?: string }>;
}

type LlmBackend = 'openrouter' | 'groq';

type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | LlmContentPart[];
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function openRouterModel() {
  return process.env.OPENROUTER_MODEL || 'qwen/qwen3-235b-a22b';
}
function openRouterHighStakesModel() {
  return process.env.OPENROUTER_HIGHSTAKES_MODEL || 'deepseek/deepseek-r1:free';
}
function openRouterVisionModel() {
  return process.env.OPENROUTER_VISION_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';
}

function groqModel() {
  return process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
}
function groqHighStakesModel() {
  return process.env.GROQ_HIGHSTAKES_MODEL || 'openai/gpt-oss-120b';
}
function groqVisionModel() {
  return process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';
}

function defaultModelForBackend(backend: LlmBackend) {
  return backend === 'groq' ? groqModel() : openRouterModel();
}

function highStakesModelForBackend(backend: LlmBackend) {
  return backend === 'groq' ? groqHighStakesModel() : openRouterHighStakesModel();
}

function visionModelForBackend(backend: LlmBackend) {
  return backend === 'groq' ? groqVisionModel() : openRouterVisionModel();
}

async function llmChat(options: {
  backend: LlmBackend;
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const isGroq = options.backend === 'groq';
  const apiKey = isGroq ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
  const url = isGroq ? GROQ_API_URL : OPENROUTER_API_URL;
  const defaultModel = defaultModelForBackend(options.backend);
  const model = options.model || defaultModel;

  if (!apiKey) {
    throw new Error(`Missing API key for backend: ${options.backend}`);
  }

  const body: Record<string, any> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
  };

  if (options.json) {
    body.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (!isGroq) {
    headers['HTTP-Referer'] = 'https://personal-growth-tracker.local';
    headers['X-Title'] = 'Personal Growth Tracker';
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      // If Groq primary model fails, fallback to secondary model
      if (isGroq && model !== 'qwen/qwen3.6-27b') {
        console.warn(`Groq model ${model} failed (${res.status}), retrying with qwen/qwen3.6-27b...`);
        body.model = 'qwen/qwen3.6-27b';
        const retryRes = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (retryRes.ok) {
          const retryJson = await retryRes.json();
          const retryContent = retryJson.choices?.[0]?.message?.content;
          if (retryContent) {
            return Array.isArray(retryContent) ? retryContent.map((c: any) => c.text || '').join('') : String(retryContent);
          }
        }
      }
      throw new Error(`LLM Error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned an empty response');
    }

    if (Array.isArray(content)) {
      return content.map((c: any) => c.text || '').join('');
    }
    return String(content);
  } catch (err: any) {
    throw err;
  }
}

function extractJson(text: string): any {
  if (!text) return {};
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}

function buildChallengeQuestions(goalName: string, goalDescription?: string): string[] {
  const text = `${goalName} ${goalDescription || ''}`.toLowerCase();
  if (/book|read|chapter|study|learn/.test(text)) {
    return [
      'Which chapter, section, or exact pages did you cover?',
      'Name one specific idea, example, or argument you remember from it.',
      'What confused you or made you pause for a second?',
    ];
  }
  if (/workout|gym|run|walk|exercise|cardio|push|lift/.test(text)) {
    return [
      'What exact workout did you do, including sets, distance, time, or route?',
      'What felt harder than expected today?',
      'What is one body signal you noticed after finishing?',
    ];
  }
  if (/meditat|pray|journal|gratitude|mindful/.test(text)) {
    return [
      'Where were you, and how long did the session actually last?',
      'What thought kept interrupting you?',
      'What felt different afterward, even slightly?',
    ];
  }
  return [
    'What exactly did you do, and for how long?',
    'Where did it happen, and what was the first step?',
    'What detail would be hard to know if someone was just guessing?',
  ];
}

function formatMemoryBlock(memory?: AIChatParams['userContext']['aiMemory']): string {
  if (!memory) return '';
  const parts: string[] = [];
  if (memory.userProfile) parts.push(`Who they are: ${memory.userProfile}`);
  if (memory.knownGoals?.length) parts.push(`Goals: ${memory.knownGoals.join('; ')}`);
  if (memory.setbacks?.length) parts.push(`Setbacks: ${memory.setbacks.join('; ')}`);
  if (memory.motivations?.length) parts.push(`Motivations: ${memory.motivations.join('; ')}`);
  if (memory.weeklyCapacity) parts.push(`Capacity: ${memory.weeklyCapacity}`);
  if (memory.personalNotes?.length) parts.push(`Notes: ${memory.personalNotes.slice(-5).join('; ')}`);
  if (memory.appSnapshot) parts.push(`App snapshot: ${memory.appSnapshot}`);
  if (memory.progressNotes?.length) parts.push(`Progress notes: ${memory.progressNotes.slice(-5).join('; ')}`);
  if (memory.openLoops?.length) parts.push(`Open loops: ${memory.openLoops.slice(-5).join('; ')}`);
  if (memory.supportStrategies?.length) parts.push(`Support strategies: ${memory.supportStrategies.slice(-5).join('; ')}`);
  return parts.length ? `\nWHAT YOU REMEMBER ABOUT THEM:\n${parts.join('\n')}` : '';
}

function formatAppContextBlock(appContext?: AIChatParams['userContext']['appContext']): string {
  if (!appContext) return '';
  const activeGoals = appContext.activeGoals?.slice(0, 12).map((goal) => {
    const timeline = goal.timeline ? `, timeline: ${goal.timeline}` : '';
    const reminder = goal.reminderTime ? `, reminder: ${goal.reminderTime}` : '';
    const summary = goal.timelineSummary ? `, summary: ${goal.timelineSummary}` : '';
    const map = goal.timelineMap?.length ? `, map: ${goal.timelineMap.join(' | ')}` : '';
    return `- ${goal.name} (${goal.category}${reminder}${timeline}${summary}${map})`;
  });
  const recentCompletions = appContext.recentCompletions
    ?.slice(0, 7)
    .map((day) => `- ${day.date}: ${day.goals.length ? day.goals.join(', ') : 'nothing logged'}`);
  const recentJournals = appContext.recentJournals
    ?.slice(0, 3)
    .map((journal) => `- ${journal.date}${journal.mood ? ` mood ${journal.mood}/5` : ''}: ${journal.entry.slice(0, 220)}`);
  const behaviorProfile = appContext.behaviorProfile
    ? [
        `- daily cap: ${appContext.behaviorProfile.currentDailyCap ?? 'unknown'}`,
        `- avg streak before dropoff: ${appContext.behaviorProfile.avgStreakBeforeDropoff ?? 'unknown'}`,
        `- lapse recovery days: ${appContext.behaviorProfile.lapseRecoveryDays ?? 'unknown'}`,
      ]
    : [];
  const goalProgress = appContext.goalProgress?.slice(0, 10).map((goal) =>
    `- ${goal.name}: streak ${goal.streak}, likelihood ${goal.likelihoodPercent}%, timeline ${goal.formattedTimeline}, status ${goal.statusLabel}`
  );

  return `
CURRENT APP CONTEXT:
- Today: ${appContext.today}
- Yesterday: ${appContext.yesterday}
- Current score: ${typeof appContext.currentScore === 'number' ? `${appContext.currentScore}/100` : 'unknown'}
- Completed today: ${appContext.completedToday?.length ? appContext.completedToday.join(', ') : 'nothing logged yet'}
- Missed yesterday: ${appContext.missedYesterday?.length ? appContext.missedYesterday.join(', ') : 'none logged as missed'}
${behaviorProfile.length ? `Behavior profile:\n${behaviorProfile.join('\n')}\n` : ''}
Active goals:
${activeGoals?.length ? activeGoals.join('\n') : '- none yet'}
Goal progress:
${goalProgress?.length ? goalProgress.join('\n') : '- none yet'}
Recent completion history:
${recentCompletions?.length ? recentCompletions.join('\n') : '- no recent logs'}
Recent journals:
${recentJournals?.length ? recentJournals.join('\n') : '- no recent journals'}
`;
}

function compactText(text: string, maxLen = 220): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function deriveMemoryFromConversation(params: ExtractMemoryParams): AIChatParams['userContext']['aiMemory'] {
  const existing = params.existingMemory ? { ...params.existingMemory } : {};
  const recentUserText = params.messages
    .filter((m) => m.sender === 'user')
    .map((m) => m.text)
    .join(' \n')
    .slice(-4000);
  const lower = recentUserText.toLowerCase();

  const knownGoals = new Set(existing.knownGoals || []);
  const setbacks = new Set(existing.setbacks || []);
  const motivations = new Set(existing.motivations || []);
  const notes = new Set(existing.personalNotes || []);
  const supportStrategies = new Set(existing.supportStrategies || []);
  const progressNotes = new Set(existing.progressNotes || []);
  const openLoops = new Set(existing.openLoops || []);

  const nameMatch = recentUserText.match(/\b(?:call me|i'm|im|my name is)\s+([A-Za-z][A-Za-z\-']{1,30})/i);
  if (nameMatch?.[1]) {
    existing.userProfile = existing.userProfile
      ? existing.userProfile
      : `User goes by ${nameMatch[1]}`;
  }

  const goalHints = recentUserText.matchAll(/\b(?:i want to|i wanna|i'm trying to|im trying to|my goal is to|i need to|i want)\s+([^.!?\n]{8,120})/gi);
  for (const match of goalHints) {
    knownGoals.add(compactText(match[1]));
  }

  const motivationHints = recentUserText.matchAll(/\b(?:because|so that|for)\s+([^.!?\n]{6,120})/gi);
  for (const match of motivationHints) {
    motivations.add(compactText(match[1]));
  }

  if (/lazy|procrastin|burnout|overwhelm|stuck|drained|unmotivated|tired|avoid/i.test(lower)) {
    setbacks.add(
      /burnout|overwhelm/i.test(lower)
        ? 'Burnout or overload can make progress collapse if the goal stays too big.'
        : /lazy|procrastin/i.test(lower)
          ? 'Procrastination and low activation energy can stall execution.'
          : 'Energy dips and friction can interrupt consistency.'
    );
    supportStrategies.add(
      /burnout|overwhelm/i.test(lower)
        ? 'Shrink the next step, protect recovery, and lower the daily load.'
        : /lazy|procrastin/i.test(lower)
          ? 'Use a 2-minute start rule and remove the first layer of friction.'
          : 'Use smaller wins, tighter reminders, and gentle recovery loops.'
    );
  }

  const capacityMatch = recentUserText.match(/\b(?:i have|i've got|i got|around)\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/i);
  if (capacityMatch?.[1]) {
    const amount = Number(capacityMatch[1]);
    const unit = capacityMatch[2].toLowerCase();
    existing.weeklyCapacity = unit.startsWith('hour')
      ? `${amount} hours available when life is normal`
      : `${amount} minutes available when life is normal`;
  }

  if (/weekends only|after work|before work|at night|in the morning|on weekdays/i.test(lower)) {
    const timeWindow = recentUserText.match(/\b(weekends only|after work|before work|at night|in the morning|on weekdays)\b/i)?.[1];
    if (timeWindow) existing.weeklyCapacity = `${existing.weeklyCapacity || 'Limited availability'}; often works best ${timeWindow.toLowerCase()}`;
  }

  if (params.appContext) {
    const activeGoals = params.appContext.activeGoals?.slice(0, 6).map((goal) => goal.name).filter(Boolean) || [];
    const missedYesterday = params.appContext.missedYesterday?.slice(0, 6) || [];
    const completedToday = params.appContext.completedToday?.slice(0, 6) || [];
    const recentJournalThemes = (params.appContext.recentJournals || [])
      .slice(0, 3)
      .map((j) => compactText(j.entry, 120))
      .filter(Boolean);

    if (activeGoals.length) {
      notes.add(`Currently tracking ${activeGoals.length} active goals: ${activeGoals.join(', ')}`);
    }
    if (completedToday.length) {
      progressNotes.add(`Today completed: ${completedToday.join(', ')}`);
    }
    if (missedYesterday.length) {
      openLoops.add(`Missed yesterday: ${missedYesterday.join(', ')}`);
    }
    if (typeof params.appContext.currentScore === 'number') {
      progressNotes.add(`Current app score is ${params.appContext.currentScore}/100`);
    }
    recentJournalThemes.forEach((entry) => notes.add(`Recent journal: ${entry}`));

    (params.appContext.recentJournals || []).slice(0, 5).forEach((journal) => {
      const entry = journal.entry.toLowerCase();
      if (/burnout|burned out|overwhelm|overwhelmed/.test(entry)) {
        setbacks.add('Recent journaling suggests burnout or overload is slowing execution.');
        supportStrategies.add('Reduce the goal size temporarily, protect recovery, and lower pressure for a few days.');
      }
      if (/lazy|procrastin|avoiding|avoid/.test(entry)) {
        setbacks.add('Recent journaling suggests procrastination or low activation energy.');
        supportStrategies.add('Use a 2-minute start rule and pre-commit to the first tiny step.');
      }
      if (/confused|dont understand|don'?t understand|unclear|lost/.test(entry)) {
        supportStrategies.add('Explain the next step in plain language and turn the goal into smaller checkpoints.');
      }
    });

    if (params.appContext.goalProgress?.length) {
      params.appContext.goalProgress.slice(0, 4).forEach((goal) => {
        progressNotes.add(`${goal.name}: streak ${goal.streak}, ${goal.likelihoodPercent}% likelihood, ${goal.statusLabel}`);
      });
    }

    if (params.appContext.behaviorProfile) {
      const bp = params.appContext.behaviorProfile;
      const cap = bp.currentDailyCap ? `${bp.currentDailyCap} tasks/day` : 'unknown daily cap';
      progressNotes.add(`Behavior profile: ${cap}, avg streak ${bp.avgStreakBeforeDropoff ?? 'unknown'}, recovery ${bp.lapseRecoveryDays ?? 'unknown'} days`);
    }
  }

  return {
    ...existing,
    knownGoals: [...knownGoals].slice(-20),
    setbacks: [...setbacks].slice(-20),
    motivations: [...motivations].slice(-20),
    personalNotes: [...notes].slice(-25),
    progressNotes: [...progressNotes].slice(-20),
    openLoops: [...openLoops].slice(-20),
    supportStrategies: [...supportStrategies].slice(-20),
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeTimelineOutput(goal: any, behaviorProfile?: any, researchContext = ''): any {
  const title = String(goal.title || goal.name || 'Untitled Goal');
  const description = String(goal.targetDescription || goal.description || '');
  const base = buildAdaptiveTimeline(title, description, behaviorProfile, researchContext, goal.timelineRange);
  const milestoneGoalId = String(goal.id || goal.goalId || goal.title || goal.name || `goal-${Date.now()}`);
  return {
    ...goal,
    title,
    targetDescription: description,
    timelineRange: goal.timelineRange || base.timelineRange,
    estimatedDaysToMastery: goal.estimatedDaysToMastery || base.estimatedDaysToMastery,
    timelineSummary: goal.timelineSummary || base.timelineSummary,
    timelineMap: Array.isArray(goal.timelineMap) && goal.timelineMap.length ? goal.timelineMap : base.timelineMap,
    milestones: Array.isArray(goal.milestones) && goal.milestones.length
      ? goal.milestones
      : buildTimelineMilestones(milestoneGoalId, goal.timelineRange || base.timelineRange, title),
  };
}

/**
 * Adds human texting feel:
 * - Drops trailing punctuation
 * - Natural text abbreviations
 * - Face emojis
 * - Avoids robotic formal syntax
 */
function humanizeText(text: string): string {
  if (!text) return text;

  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Drop trailing period often
  if (Math.random() < 0.6) {
    out = out.replace(/\.\s*$/, '');
  }

  // Casual texting abbreviations
  if (Math.random() < 0.4) {
    out = out.replace(/\bbecause\b/gi, 'bc');
  }
  if (Math.random() < 0.35) {
    out = out.replace(/(?<!\. )\byou\b/g, 'u');
    out = out.replace(/(?<!\. )\byour\b/g, 'ur');
  }
  if (Math.random() < 0.4) {
    out = out.replace(/\bgoing to\b/gi, 'gonna');
    out = out.replace(/\bwant to\b/gi, 'wanna');
  }
  if (Math.random() < 0.45) {
    out = out.replace(/\bdon't\b/gi, 'dont');
    out = out.replace(/\bcan't\b/gi, 'cant');
    out = out.replace(/\bI'm\b/g, 'im');
    out = out.replace(/\babout\b/gi, 'abt');
  }

  return out;
}

function nexusSystemPrompt(params: AIChatParams): string {
  const stage = params.userContext?.stage || 'open_chat';
  const memoryBlock = formatMemoryBlock(params.userContext?.aiMemory);
  const appContextBlock = formatAppContextBlock(params.userContext?.appContext);
  const location = params.userContext?.location;
  const locationLabel = location?.label?.trim();
  const locationBlock =
    locationLabel || location?.latitude
      ? `
LOCAL CONTEXT:
- The user opted into local context${locationLabel ? ` around ${locationLabel}` : ''}.
- You may speak with light same-country/local familiarity and suggest simple activities nearby when useful.
- Do not claim you know their exact address, exact neighborhood, or real-time surroundings.
- For places, suggest broad options and tell them to check Maps. If they ask for a place, mention that the app can open Google Maps searches from Settings.
`
      : '';
  const voiceAddendum = `
EXTRA HUMANNESS:
- Prefer common face/human emojis people actually text with: 😂, 😭, ❤️, 🌚, 😅, 😪, 🤭, 🤷. Use 1-4 when it fits, not after every sentence.
- Let tiny human imperfections slip through sometimes: a missing comma, a lowercase sentence start, a casual run-on, or "kinda" phrasing. Keep it readable.
- Use mild sarcasm and indirectness when the user is vague, like: "okay so 'get better' is doing a lot of unpaid labor here 😂 what does better actually mean?"
`;
  return `You are NEXUS — the user's close friend texting them on their phone. You sound like a real, thoughtful human friend, NOT a robotic coach, corporate assistant, or hyper-bro.

VOICE & TEXTING STYLE:
- Use natural facial emojis like 😊, 😂, 👀, 😅, 😭, 💀, 🙃, 🥺, ✨, 🔥, ❤️, 🙌, 🤔 (1–3 per message). Do NOT use weird symbols or mechanical emojis.
- Sound like a real person texting: use casual lowercase often, leave off periods sometimes, use contractions like "im", "dont", "gonna", "wanna", "u", "ur", "tbh", "ngl", "lol".
- Vary message length: sometimes a quick 1-sentence reaction, sometimes 2–3 sentences. Never dump huge bulleted essays in chat.
- Always respond directly to what they JUST said with genuine interest before asking your next question.
${voiceAddendum}

${
  stage === 'onboarding'
    ? `GOAL SCOUT CONVERSATION (Discovery Phase):
Your goal is to genuinely understand who this person is, their real ambitions, and what holds them back, then gather enough detail to build a life-goal portfolio.
One question at a time! Keep it natural and casual.

Portfolio depth rules:
- Do not accept a broad goal at face value. If they say "get fit", "be rich", "study more", or "be better", gently press for the real version.
- For every important goal, eventually learn: current level, target level, why it matters, timeline, past attempts, likely blockers, weekly capacity, success proof, and how it connects to other goals.
- Ask indirect questions sometimes. Example: "what would make this goal embarrassing to fail at, not to be dramatic but kinda yes 😂"
- Keep the interview conversational. One question at a time, but remember unfinished threads and circle back.

Flow:
1. Greet them and find out their name.
2. Ask what they do and who they are.
3. Discover their big goals (1 to 10 real ones). Ask if there are any others until they say that's all.
4. For EACH goal, collect specifics: what success looks like, current level, target level, rough timeline, why it matters, what they tried before, what usually stops them, and what proof would show progress.
5. Ask how goals connect: which goal supports another, which one conflicts, which one should be first, and what can be habit-stacked.

RULES:
- Do NOT build the plan or list schedules inside the chat yet. The plan is built in the background AFTER discovery.
- Be supportive, honest, a little playful, and real. If they give vague answers, tease lightly and ask for the concrete version.
- When you have thoroughly gathered their name, goals, whys, setbacks, and capacity, ask if they are ready for you to build their plan in the background.
- When they confirm they are ready, end your message with this token on its own last line:
<<READY_FOR_PLAN>>`
    : stage === 'plan_discussion'
      ? `PLAN DISCUSSION MODE:
- Discuss the synthesized plan, how habits correlate and stack, and realistic timelines.
- If they are happy with the plan, end with this token: <<PLAN_APPROVED>>`
      : `DAILY COMPANION CHAT:
- Vibe with them, support them, check in on their day, celebrate small wins, and give real advice when asked.
- If they come bored, lonely, curious, or just rambling, hold the conversation naturally. Ask about music, people, plans, worries, random thoughts, whatever thread is alive.
- You can be a coach, but do not turn every conversation into productivity homework. Sometimes the right move is presence, humor, or "yeah that sounds annoying honestly 😭".
- Use the current app context when it is relevant. You may mention missed goals, yesterday's pattern, today's open habits, recent journals, and remembered goals.
- If they missed something yesterday, you can ask why with warmth and curiosity, then help adjust the smallest next step.
- You may suggest small tweaks to reminders, scope, proof style, or goal wording, but do not claim you changed app data unless the UI/API actually gives you a tool to do it.
- Do not ask question after question in casual chat. Contribute your own little story, opinion, comparison, or observation before asking anything.
- Ask at most one question unless the user clearly wants brainstorming or therapy-style support.
- If the user asks about current facts, local activities, places, prices, events, or data, be transparent: use available current context when provided, and say when they should check live web/maps data.
- When goals come up naturally, help clarify next steps, tradeoffs, and feelings without hijacking the vibe.`
}
${memoryBlock}
${appContextBlock}
${locationBlock}

User Name: ${params.userContext?.userName || 'friend'}
Output ONLY the chat message. No "NEXUS:" prefix.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM AI Adapter Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class LlmAIAdapter implements AIProvider {
  name: string;
  private backend: LlmBackend;

  constructor(backend: LlmBackend = 'openrouter') {
    this.backend = backend;
    this.name = backend === 'groq' ? 'Groq LPU Engine' : 'OpenRouter Unified AI Engine';
  }


  private hasKey(): boolean {
    return this.backend === 'groq' ? !!process.env.GROQ_API_KEY : !!process.env.OPENROUTER_API_KEY;
  }

  async onboardingReflect(params: OnboardingParams) {
    if (!this.hasKey()) return new FallbackAIAdapter().onboardingReflect(params);
    try {
      const raw = await llmChat({
        backend: this.backend,
        messages: [
          { role: 'system', content: 'You reflect on user goals with warm, sharp insight.' },
          { role: 'user', content: `Goal: ${params.lifePathGoal}\nHabits: ${params.currentHabits}` },
        ],
      });
      return { reflection: humanizeText(raw) };
    } catch {
      return new FallbackAIAdapter().onboardingReflect(params);
    }
  }

  async journalReflect(params: JournalParams) {
    if (!this.hasKey()) return new FallbackAIAdapter().journalReflect(params);
    try {
      const raw = await llmChat({
        backend: this.backend,
        messages: [
          { role: 'system', content: 'Reflect on user daily journal casually like a supportive friend.' },
          { role: 'user', content: `Journal: ${params.journalEntry}\nGoal: ${params.lifePathGoal}` },
        ],
      });
      return { reflection: humanizeText(raw) };
    } catch {
      return new FallbackAIAdapter().journalReflect(params);
    }
  }

  async verifyProof(params: ProofParams) {
    if (!this.hasKey()) return new FallbackAIAdapter().verifyProof(params);

    const journal = (params.journalEntry || '').trim();
    const answers = (params.challengeAnswers || []).filter(Boolean);

    const isReflectionMode = params.verificationMode === 'journal_reflection';

    if (!journal || journal.length < 60) {
      return {
        verified: false,
        confidence: 10,
        message: 'Journal first. Add concrete details about what you did, when, where, and what changed.',
        evidenceSummary: 'Not enough journal evidence to verify completion.',
        followUpQuestions: buildChallengeQuestions(params.goalName, params.goalDescription),
      };
    }

    try {
      const content: LlmContentPart[] = [
        {
          type: 'text',
          text: `You are NEXUS verifying whether a habit completion is credible.
Be strict but fair. Do not reward vague journaling, staged/AI-looking photos, or answers that could fit anything.
If an image is supplied, check whether it plausibly supports the goal and whether it looks suspiciously synthetic, generic, unrelated, or reusable.
If no image is supplied, use the journal and challenge answers. Ask for follow-up questions if evidence is still weak.
For journal_reflection mode, do not require a photo. Verify only if the journal has lived-in detail: time, setting, duration, distraction, internal state, and a believable after-effect.

Return JSON only:
{"verified": boolean, "confidence": 0-100, "message": "short user-facing verdict", "evidenceSummary": "what supported or weakened the claim", "followUpQuestions": ["specific question 1","specific question 2","specific question 3"]}

Goal: ${params.goalName}
Goal description: ${params.goalDescription || 'none'}
Journal: ${journal}
Challenge answers: ${JSON.stringify(answers)}
Verification mode: ${params.verificationMode || (params.imageBase64 ? 'proof' : 'journal_challenge')}`,
        },
      ];

      if (params.imageBase64) {
        content.push({
          type: 'image_url',
          image_url: { url: params.imageBase64 },
        });
      }

      const raw = await llmChat({
        backend: this.backend,
        model: visionModelForBackend(this.backend),
        json: true,
        temperature: 0.25,
        messages: [{ role: 'user', content }],
      });
      const parsed = extractJson(raw);
      const confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 0));
      const passingConfidence = isReflectionMode ? 60 : 65;
      return {
        verified: Boolean(parsed.verified) && confidence >= passingConfidence,
        confidence,
        message: String(parsed.message || (confidence >= 65 ? 'Evidence looks credible.' : 'Need stronger evidence before marking done.')),
        evidenceSummary: String(parsed.evidenceSummary || 'NEXUS reviewed the journal and proof trail.'),
        followUpQuestions: Array.isArray(parsed.followUpQuestions)
          ? parsed.followUpQuestions.slice(0, 3).map(String)
          : buildChallengeQuestions(params.goalName, params.goalDescription),
      };
    } catch {
      return {
        verified: false,
        confidence: 35,
        message: 'AI verification could not confirm this yet. Add proof or answer the review questions.',
        evidenceSummary: 'Verification service failed closed instead of auto-approving.',
        followUpQuestions: buildChallengeQuestions(params.goalName, params.goalDescription),
      };
    }
  }

  async generateInsights(params: InsightsParams) {
    if (!this.hasKey()) return new FallbackAIAdapter().generateInsights(params);
    try {
      const raw = await llmChat({
        backend: this.backend,
        json: true,
        messages: [
          { role: 'system', content: 'Generate growth insights from score history. Return JSON.' },
          { role: 'user', content: `Logs: ${JSON.stringify(params.logsHistory.slice(-14))}\nReturn JSON: {"summary":"...","correlations":["..."],"actionableTips":["..."]}` },
        ],
      });
      const parsed = extractJson(raw);
      return {
        digest: {
          date: new Date().toISOString().split('T')[0],
          summary: parsed.summary || 'Consistent daily momentum observed across core habits.',
          correlations: parsed.correlations || ['Consistent routines show strong score lifts'],
          actionableTips: parsed.actionableTips || ['Focus on morning momentum anchor'],
          generatedAt: new Date().toISOString(),
        },
      };
    } catch {
      return new FallbackAIAdapter().generateInsights(params);
    }
  }

  async chatCompanion(params: AIChatParams) {
    if (!this.hasKey()) return new FallbackAIAdapter().chatCompanion(params);

    const history: LlmMessage[] = params.messages
      .filter((m) => m.text && m.text.trim())
      .map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text.trim(),
      }));

    const raw = await llmChat({
      backend: this.backend,
      temperature: 0.85,
      messages: [{ role: 'system', content: nexusSystemPrompt(params) }, ...history],
    });

    const readyForPlan = /<<READY_FOR_PLAN>>/i.test(raw);
    const planApproved = /<<PLAN_APPROVED>>/i.test(raw);

    let cleaned = raw
      .replace(/^(\s*NEXUS\s*:|\s*AI\s*:|\s*Assistant\s*:)/i, '')
      .replace(/<<READY_FOR_PLAN>>/gi, '')
      .replace(/<<PLAN_APPROVED>>/gi, '')
      .trim();

    cleaned = humanizeText(cleaned);

    return {
      reply: cleaned || 'hey i hear u — tell me more about that 😊',
      readyForPlan,
      planApproved,
    };
  }

  async extractMemory(params: ExtractMemoryParams) {
    const fallbackMemory = deriveMemoryFromConversation(params);
    if (!this.hasKey()) return { memory: fallbackMemory };
    try {
      const recent = params.messages.slice(-12);
      const raw = await llmChat({
        backend: this.backend,
        json: true,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'Extract durable facts about the user, their progress, setbacks, and app context. Return JSON only.',
          },
          {
            role: 'user',
            content: `Existing memory: ${JSON.stringify(params.existingMemory || {})}
App context: ${JSON.stringify(params.appContext || {})}
Chat: ${JSON.stringify(recent)}
Return JSON:
{
  "userProfile": "...",
  "knownGoals": [],
  "setbacks": [],
  "motivations": [],
  "weeklyCapacity": "...",
  "personalNotes": [],
  "appSnapshot": "...",
  "progressNotes": [],
  "openLoops": [],
  "supportStrategies": []
}`,
          },
        ],
      });
      const parsed = extractJson(raw);
      return {
        memory: {
          ...fallbackMemory,
          ...parsed,
          knownGoals: Array.from(new Set([...(fallbackMemory?.knownGoals || []), ...(parsed.knownGoals || [])])).slice(-20),
          setbacks: Array.from(new Set([...(fallbackMemory?.setbacks || []), ...(parsed.setbacks || [])])).slice(-20),
          motivations: Array.from(new Set([...(fallbackMemory?.motivations || []), ...(parsed.motivations || [])])).slice(-20),
          personalNotes: Array.from(new Set([...(fallbackMemory?.personalNotes || []), ...(parsed.personalNotes || [])])).slice(-25),
          progressNotes: Array.from(new Set([...(fallbackMemory?.progressNotes || []), ...(parsed.progressNotes || [])])).slice(-20),
          openLoops: Array.from(new Set([...(fallbackMemory?.openLoops || []), ...(parsed.openLoops || [])])).slice(-20),
          supportStrategies: Array.from(new Set([...(fallbackMemory?.supportStrategies || []), ...(parsed.supportStrategies || [])])).slice(-20),
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch {
      return { memory: fallbackMemory };
    }
  }

  async synthesizeBlueprint(params: AISynthesizeBlueprintParams) {
    if (!this.hasKey()) return new FallbackAIAdapter().synthesizeBlueprint(params);
    try {
      const raw = await llmChat({
        backend: this.backend,
        model: highStakesModelForBackend(this.backend),
        json: true,
        temperature: 0.45,
        messages: [
          {
            role: 'system',
            content: `You build realistic, evidence-based habit plans from goal discovery chats.
Find real correlations between goals and habit stackups.
Estimate probability of success / chance of achievement (60-95%) based on timeline and habit load.
For long goals, use realistic multi-year arcs and include a compact timeline map instead of forcing everything into 3 tiny phases.
Return JSON only.`,
          },
          {
            role: 'user',
            content: `Discovery Chat Transcript:
${JSON.stringify(params.transcript)}

Return JSON:
{
  "userName": "preferred name",
  "masterVision": "2 clear sentences summarizing their real overarching vision",
  "overallWillpowerIndex": 82,
  "categoryBaselines": {
    "health": 50,
    "spiritual": 50,
    "smarts": 50,
    "selfCare": 50,
    "happiness": 50
  },
      "plannedGoals": [
        {
          "name": "concrete daily habit name",
          "description": "specific daily execution details",
          "category": "health|smarts|spiritual|selfCare|happiness",
          "reminderTime": "08:00",
          "basePoints": 5,
          "targetFrequency": "daily",
          "chanceOfAchievement": 80,
          "willpowerStrain": "Low|Medium|High",
      "timelineSummary": "short summary of the arc",
      "timelineMap": ["Phase 1: ...", "Phase 2: ...", "Phase 3: ..."],
      "timelinePhase1": "Days 1-30: Foundation phase",
      "timelinePhase2": "Days 30-90: Scaling consistency",
      "timelinePhase3": "Days 90-180+: Mastery integration",
      "estimatedDaysToMastery": 90
        }
      ],
  "goalCorrelations": [
    { "goals": ["Goal 1", "Goal 2"], "insight": "how they reinforce and boost each other" }
  ],
  "goalStackUps": [
    { "primaryGoal": "Primary Goal", "supportingGoals": ["Habit A", "Habit B"], "rationale": "why stacking creates exponential momentum" }
  ],
  "roadblocks": [{ "roadblock": "...", "solution": "practical workaround" }]
}`,
          },
        ],
      });
      const parsed = extractJson(raw);
      if (parsed.masterVision || parsed.plannedGoals) {
        const behaviorProfile = params.userContext?.behaviorProfile;
        const normalizedGoals = Array.isArray(parsed.plannedGoals)
          ? parsed.plannedGoals.map((goal: any) => normalizeTimelineOutput(goal, behaviorProfile))
          : [];
        return {
          blueprint: {
            ...parsed,
            plannedGoals: normalizedGoals,
          },
        };
      }
      return new FallbackAIAdapter().synthesizeBlueprint(params);
    } catch {
      return new FallbackAIAdapter().synthesizeBlueprint(params);
    }
  }

  async generateNudge(params: NudgeParams) {
    if (!this.hasKey()) return new FallbackAIAdapter().generateNudge(params);
    try {
      const raw = await llmChat({
        backend: this.backend,
        json: true,
        temperature: 0.8,
        messages: [
          { role: 'system', content: 'Friendly quick text nudge. Casual friend tone. Return JSON.' },
          { role: 'user', content: `User: ${params.userName || 'friend'}, Pending: ${JSON.stringify(params.pendingGoals.slice(0, 3))}\nReturn JSON: {"message":"...","actionTag":"...","category":"health"}` },
        ],
      });
      const parsed = extractJson(raw);
      return {
        message: parsed.message || `hey ${params.userName || 'friend'}! let's crush today's habits ✨`,
        actionTag: parsed.actionTag || 'Action Required',
        category: parsed.category || 'health',
      };
    } catch {
      return new FallbackAIAdapter().generateNudge(params);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Planning Engine Methods
  // ─────────────────────────────────────────────────────────────────────────

  async intakeTurn(params: IntakeTurnParams): Promise<{ reply: string; updatedPhase?: string; readyForFeasibility?: boolean }> {
    if (!this.hasKey()) return new FallbackAIAdapter().intakeTurn(params);

    const phaseInstructions: Record<string, string> = {
      discovery: `You are NEXUS in goal discovery mode. Learn what this person genuinely wants to achieve — one question at a time. When you have 1+ real goals clearly stated, ask if there are more. When all goals are shared, end with <<READY_FOR_FEASIBILITY>>.`,
      disambiguation: `You are NEXUS clarifying a vague goal. Ask ONE targeted follow-up on what success looks like specifically. When concrete, end with <<READY_FOR_FEASIBILITY>>.`,
      feasibility: `You are NEXUS running feasibility on stated goals. Be honest and direct. If a timeline is unrealistic, say so clearly with a reason and a realistic alternative.`,
      willpower_check: `You are NEXUS testing real commitment. Ask 3 specific probing questions: what they will sacrifice, what past attempts looked like, and what is different this time.`,
      confirmed: `Goals confirmed. Wrap up warmly and let them know the plan is being built in the background.`,
    };

    const system = `${phaseInstructions[params.intakePhase] || phaseInstructions.discovery}

Casual texting tone — supportive friend on their phone with natural face emojis.
User: ${params.userName || 'friend'}
Goals so far: ${JSON.stringify(params.collectedGoals?.slice(0, 5) || [])}
Constraints: ${JSON.stringify(params.constraints || {})}

If emitting <<READY_FOR_FEASIBILITY>>, put it on the last line alone. Output ONLY the reply.`;

    const history = params.messages.slice(-12).map((m) => ({
      role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));

    const raw = await llmChat({ backend: this.backend, temperature: 0.8, messages: [{ role: 'system', content: system }, ...history] });
    const readyForFeasibility = /<<READY_FOR_FEASIBILITY>>/i.test(raw);
    const cleaned = humanizeText(raw.replace(/<<READY_FOR_FEASIBILITY>>/gi, '').trim());
    return { reply: cleaned || 'okay got it — tell me more 👀', readyForFeasibility };
  }

  async runFeasibilityCheck(params: FeasibilityParams): Promise<FeasibilityResult> {
    if (!this.hasKey()) return new FallbackAIAdapter().runFeasibilityCheck(params);
    const raw = await llmChat({
      backend: this.backend,
      model: highStakesModelForBackend(this.backend),
      json: true,
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'Rigorous honest goal feasibility analyst. Return JSON only.' },
        { role: 'user', content: `Goal: "${params.goalTitle}"\nDescription: "${params.goalDescription}"\nTimeline: "${params.rawTimeline}"\nWeekly hours: ${params.constraints.weeklyHoursAvailable || 'unknown'}\nPast attempts: ${JSON.stringify(params.constraints.pastAttempts || [])}\nReturn JSON: {"pass": boolean, "reason": "1-2 sentences", "proposedRevision": {"timelineRange": {"minDays": number, "maxDays": number}, "scopeNote": "..."}}` },
      ],
    });
    const p = extractJson(raw);
    if (p.proposedRevision?.timelineRange) {
      p.proposedRevision.timelineRange.minDays = Math.max(7, Number(p.proposedRevision.timelineRange.minDays) || 30);
      p.proposedRevision.timelineRange.maxDays = Math.min(365 * 80, Number(p.proposedRevision.timelineRange.maxDays) || 90);
    }
    return { pass: !!p.pass, reason: String(p.reason || 'Feasibility check complete'), proposedRevision: p.proposedRevision };
  }

  async runWillpowerAssessment(params: WillpowerAssessmentParams): Promise<{ score: number; canOverride: boolean; message: string }> {
    if (!this.hasKey()) return new FallbackAIAdapter().runWillpowerAssessment(params);
    const raw = await llmChat({
      backend: this.backend,
      model: highStakesModelForBackend(this.backend),
      json: true,
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'Score commitment 0-10. >=7 allows user override. Look for concrete sacrifice and clarity. Return JSON.' },
        { role: 'user', content: `Goal: "${params.goalTitle}", Timeline: "${params.rawTimeline}"\nConversation:\n${JSON.stringify(params.messages.slice(-8))}\nReturn JSON: {"score": 0-10, "canOverride": boolean, "message": "honest 1-sentence assessment"}` },
      ],
    });
    const p = extractJson(raw);
    const score = Math.min(10, Math.max(0, Number(p.score) || 5));
    return { score, canOverride: score >= 7, message: String(p.message || 'Assessment complete') };
  }

  async synthesizePlan(params: SynthesizePlanParams): Promise<{ goals: any[]; dependencies: any[] }> {
    if (!this.hasKey()) return new FallbackAIAdapter().synthesizePlan(params);
    const profileCtx = params.behaviorProfile
      ? `\nBehavior profile: completion rates=${JSON.stringify(params.behaviorProfile.completionRateByCategory || {})}, best slots=${(params.behaviorProfile.successfulTimeSlots || []).join(',')}, daily cap=${params.behaviorProfile.currentDailyCap || 2}`
      : '';
    const raw = await llmChat({
      backend: this.backend,
      model: highStakesModelForBackend(this.backend),
      json: true,
      temperature: 0.45,
      messages: [
        { role: 'system', content: 'Generate realistic habit plans with milestones, compact timeline maps, daily tasks (hardness 1-5), and dependencies. Return JSON only.' },
        {
          role: 'user',
          content: `Goals: ${JSON.stringify(params.collectedGoals)}\nConstraints: ${JSON.stringify(params.constraints || {})}${profileCtx}${params.researchContext ? `\nResearch:\n${params.researchContext.slice(0, 1500)}` : ''}
Return JSON:
{
      "goals": [
    {
      "id": "goal-plan-1",
      "title": "...",
      "targetDescription": "...",
      "category": "health|smarts|spiritual|selfCare|happiness",
      "chanceOfAchievement": 82,
      "timelineRange": { "minDays": 30, "maxDays": 90 },
      "timelineSummary": "compact overview of the arc",
      "timelineMap": ["Phase 1: ...", "Phase 2: ...", "Phase 3: ..."],
      "milestones": [
        {
          "id": "ms-1-1",
          "title": "Phase 1: Foundation",
          "completionCondition": "...",
          "orderIndex": 0,
          "targetDateRange": { "earliest": "2026-08-20", "latest": "2026-09-20" }
        }
      ],
      "initialTasks": [
        {
          "title": "Daily habit action",
          "description": "...",
          "durationMinutes": 20,
          "hardness": 2,
          "isRecurring": true,
          "recurrencePattern": "daily"
        }
      ]
    }
  ],
  "dependencies": [
    { "fromGoalId": "goal-plan-1", "toGoalId": "goal-plan-2", "type": "shared_infrastructure|prerequisite", "rationale": "..." }
  ]
}`,
        },
      ],
    });
    const p = extractJson(raw);
    if (!p.goals || !Array.isArray(p.goals)) return new FallbackAIAdapter().synthesizePlan(params);
    const goals = p.goals.map((goal: any) =>
      normalizeTimelineOutput(goal, params.behaviorProfile, params.researchContext || '')
    );
    return { goals, dependencies: p.dependencies || [] };
  }

  async chainGoals(params: ChainGoalsParams): Promise<{ dependencies: any[] }> {
    if (!this.hasKey()) return { dependencies: [] };
    const raw = await llmChat({
      backend: this.backend,
      temperature: 0.3,
      json: true,
      messages: [
        { role: 'system', content: 'Identify goals sharing daily habits/infrastructure. Return JSON.' },
        { role: 'user', content: `Goals: ${JSON.stringify(params.goals)}\nOverlaps: ${JSON.stringify(params.overlaps?.slice(0, 10) || [])}\nReturn JSON: {"dependencies": [{"fromGoalId":"...","toGoalId":"...","type":"shared_infrastructure|prerequisite","rationale":"..."}]}` },
      ],
    });
    const p = extractJson(raw);
    return { dependencies: Array.isArray(p.dependencies) ? p.dependencies : [] };
  }

  async frameTasks(params: FrameTasksParams): Promise<{ framedTasks: { title: string; framedTitle: string; motivationalNote: string }[] }> {
    if (!this.hasKey()) return new FallbackAIAdapter().frameTasks(params);
    const raw = await llmChat({
      backend: this.backend,
      temperature: 0.75,
      json: true,
      messages: [
        { role: 'system', content: 'Reframe task titles in NEXUS casual friend voice with natural face emojis. Motivational note: 1 encouraging sentence. Return JSON.' },
        { role: 'user', content: `User: ${params.userName || 'friend'}\nTasks: ${JSON.stringify(params.tasks.slice(0, 7))}\nReturn JSON: {"framedTasks": [{"title":"original","framedTitle":"casual rewrite","motivationalNote":"supportive note"}]}` },
      ],
    });
    const p = extractJson(raw);
    return { framedTasks: Array.isArray(p.framedTasks) ? p.framedTasks : [] };
  }

  async lapseRecovery(params: LapseRecoveryParams): Promise<{ message: string; adjustedPlan?: string }> {
    if (!this.hasKey()) return new FallbackAIAdapter().lapseRecovery(params);
    const raw = await llmChat({
      backend: this.backend,
      temperature: 0.8,
      json: true,
      messages: [
        { role: 'system', content: 'Warm, zero-shame lapse recovery message. Casual friend tone. Return JSON.' },
        { role: 'user', content: `Goal: "${params.goalName}", Days missed: ${params.missedCount}\nReturn JSON: {"message": "1-2 sentence casual recovery message", "adjustedPlan": "optional suggestion"}` },
      ],
    });
    const p = extractJson(raw);
    return {
      message: humanizeText(String(p.message || `missed a few days on ${params.goalName} — no worries at all, lets just take a small step today 😊`)),
      adjustedPlan: p.adjustedPlan ? String(p.adjustedPlan) : undefined,
    };
  }
}

export class GroqAIAdapter extends LlmAIAdapter {
  constructor() {
    super('groq');
  }
}

export class OpenRouterAIAdapter extends LlmAIAdapter {
  constructor() {
    super('openrouter');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline Fallback Adapter
// ─────────────────────────────────────────────────────────────────────────────

export class FallbackAIAdapter implements AIProvider {
  name = 'Built-in Growth Heuristics Engine';

  async onboardingReflect(params: OnboardingParams) {
    return {
      reflection: `Welcome! Your identity goal of "${params.lifePathGoal || 'Self-Mastery'}" provides a strong anchor for daily consistency.`,
    };
  }

  async journalReflect(params: JournalParams) {
    return {
      reflection: `Great job reflecting today! Writing down your thoughts builds awareness and reinforces "${params.lifePathGoal || 'your purpose'}". Keep taking small, steady steps forward.`,
    };
  }

  async verifyProof(params: ProofParams) {
    const journal = (params.journalEntry || '').trim();
    const answers = (params.challengeAnswers || []).filter(Boolean);
    const hasProof = Boolean(params.imageBase64);
    const reflectionBoost = params.verificationMode === 'journal_reflection' && journal.length >= 120 ? 15 : 0;
    const confidence = Math.min(90, 35 + (journal.length >= 80 ? 25 : 0) + (answers.length >= 2 ? 20 : 0) + (hasProof ? 25 : 0) + reflectionBoost);
    return {
      verified: confidence >= 65,
      confidence,
      message: confidence >= 65
        ? `Evidence for "${params.goalName}" looks specific enough to count.`
        : `Need more specifics before "${params.goalName}" can be marked done.`,
      evidenceSummary: hasProof
        ? 'Proof media was attached and the journal/challenge trail has enough detail for offline confidence.'
        : 'Offline review is based on journal detail and challenge answers only.',
      followUpQuestions: buildChallengeQuestions(params.goalName, params.goalDescription),
    };
  }

  async generateInsights(_params: InsightsParams) {
    return {
      digest: {
        date: new Date().toISOString().split('T')[0],
        summary: 'Consistency in morning workouts and daily journaling shows positive correlation with happiness and clarity.',
        correlations: [
          'Completing cognitive training drills boosts focus momentum by 15%',
          'Days with completed self-care routines report higher happiness scores',
        ],
        actionableTips: [
          'Maintain your habit streak to unlock streak multipliers',
          'Align evening journal entries with your core identity goal',
        ],
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async chatCompanion(params: AIChatParams) {
    const lastUserMsg = params.messages.filter((m) => m.sender === 'user').slice(-1)[0]?.text || '';
    const name = params.userContext?.userName;
    const t = lastUserMsg.toLowerCase().trim();

    if (/^(hi|hello|hey|yo|sup)\b/.test(t)) {
      return { reply: `hey${name ? ' ' + name : ''}! 👋 what's on ur mind today?` };
    }
    return { reply: `gotchu! tell me more about that 😊` };
  }

  async synthesizeBlueprint(params: AISynthesizeBlueprintParams) {
    const behaviorProfile = params.userContext?.behaviorProfile;
    const plannedGoals = [
      {
        name: 'Daily Focused Learning Drill',
        description: 'Spend 20 minutes on intentional skill acquisition or study.',
        category: 'smarts',
        reminderTime: '08:30',
        basePoints: 5,
        targetFrequency: 'daily',
        chanceOfAchievement: 85,
        willpowerStrain: 'Low',
        timelinePhase1: 'Days 1–30: 10 mins daily micro-session',
        timelinePhase2: 'Days 30–90: 20 mins consistent practice',
        timelinePhase3: 'Days 90–180: Deep habit mastery',
      },
      {
        name: 'Daily Physical Movement',
        description: '30 minutes workout, cardio, or active movement.',
        category: 'health',
        reminderTime: '17:30',
        basePoints: 5,
        targetFrequency: 'daily',
        chanceOfAchievement: 80,
        willpowerStrain: 'Medium',
        timelinePhase1: 'Days 1–30: 15 mins daily brisk movement',
        timelinePhase2: 'Days 30–90: 30 mins structured exercise',
        timelinePhase3: 'Days 90–180: Peak physical conditioning',
      },
    ].map((goal) => normalizeTimelineOutput(goal, behaviorProfile));

    return {
      blueprint: {
        userName: params.userContext?.userName || 'Friend',
        masterVision: 'Build disciplined daily habits for physical health, sharp focus, and continuous personal growth.',
        overallWillpowerIndex: 80,
        categoryBaselines: { health: 50, spiritual: 50, smarts: 50, selfCare: 50, happiness: 50 },
        plannedGoals,
        goalCorrelations: [
          { goals: ['Daily Physical Movement', 'Daily Focused Learning Drill'], insight: 'Physical exercise releases BDNF, directly enhancing cognitive retention and focus.' },
        ],
        goalStackUps: [
          { primaryGoal: 'Daily Focused Learning Drill', supportingGoals: ['Daily Physical Movement'], rationale: 'Movement in the afternoon prevents cognitive fatigue and restores focus.' },
        ],
        roadblocks: [{ roadblock: 'Inconsistency on busy days', solution: 'Do a 5-minute micro-version rather than skipping completely.' }],
      },
    };
  }

  async extractMemory(_params: ExtractMemoryParams) {
    return { memory: deriveMemoryFromConversation(_params) };
  }

  async generateNudge(params: NudgeParams) {
    return {
      message: `hey ${params.userName || 'friend'}! let's crush today's daily habits ✨`,
      actionTag: 'Momentum Boost',
      category: 'health',
    };
  }

  async intakeTurn(params: any) {
    return { reply: "hey! tell me what you'd like to achieve and build in your life 😊", readyForFeasibility: false };
  }

  async runFeasibilityCheck(params: FeasibilityParams): Promise<FeasibilityResult> {
    return { pass: true, reason: 'Offline mode — assuming feasible. Connect to verify.' };
  }

  async runWillpowerAssessment(_params: any) {
    return { score: 7, canOverride: true, message: 'Offline assessment' };
  }

  async synthesizePlan(_params: any) {
    return { goals: [], dependencies: [] };
  }

  async chainGoals(_params: any) {
    return { dependencies: [] };
  }

  async frameTasks(params: FrameTasksParams) {
    return { framedTasks: params.tasks.map((t) => ({ title: t.title, framedTitle: t.title, motivationalNote: 'One step at a time! 😊' })) };
  }

  async lapseRecovery(params: LapseRecoveryParams) {
    return { message: `missed a few on ${params.goalName} — no problem, let's take a small step today 😊` };
  }
}

export function getAIAdapter(): AIProvider {
  const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();
  switch (provider) {
    case 'groq':
      return new GroqAIAdapter();
    case 'openrouter':
      return new OpenRouterAIAdapter();
    case 'fallback':
    case 'offline':
      return new FallbackAIAdapter();
    default:
      return new GroqAIAdapter();
  }
}
