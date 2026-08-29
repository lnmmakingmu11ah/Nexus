import { buildAdaptiveTimeline, buildTimelineMilestones, formatTimelineDays } from '../src/utils/timelinePlanner';
import {
  analyzeIntakeCoverage,
  buildIntakeCoverageBlock,
  extractGoalHintsFromTranscript,
  ensurePillarCoverage,
  normalizeBlueprint,
} from '../src/utils/blueprintNormalizer';
import { fetchGoalResearch } from './searchService';
import { formatIdentityForPrompt, heuristicIdentityFromTranscript, mergeIdentity, normalizeExtractedIdentity } from '../src/utils/userIdentity';
import { formatPersonaForPrompt } from '../src/utils/nexusPersona';

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
  nexusPersona?: any;
  userContext?: {
    userIdentity?: any;
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Planning Engine Params
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AIProvider Interface
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  chatCompanion(params: AIChatParams): Promise<{ reply: string; messages?: string[]; readyForPlan?: boolean; planApproved?: boolean }>;
  synthesizeBlueprint(params: AISynthesizeBlueprintParams): Promise<{ blueprint: any }>;
  extractMemory(params: ExtractMemoryParams): Promise<{ memory: any }>;
  extractIdentity(params: { messages: { sender: 'user' | 'ai'; text: string }[]; existingIdentity?: any }): Promise<{ identity: any }>;
  streamChatCompanion?(
    params: AIChatParams & { webContext?: string; nexusPersona?: any },
    onDelta: (chunk: string) => void
  ): Promise<{ reply: string; messages: string[]; readyForPlan?: boolean; planApproved?: boolean }>;
  generateNudge(params: NudgeParams): Promise<{ message: string; actionTag: string; category: string }>;
  intakeTurn(params: IntakeTurnParams): Promise<{ reply: string; updatedPhase?: string; readyForFeasibility?: boolean }>;
  runFeasibilityCheck(params: FeasibilityParams): Promise<FeasibilityResult>;
  runWillpowerAssessment(params: WillpowerAssessmentParams): Promise<{ score: number; canOverride: boolean; message: string }>;
  synthesizePlan(params: SynthesizePlanParams): Promise<{ goals: any[]; dependencies: any[] }>;
  chainGoals(params: ChainGoalsParams): Promise<{ dependencies: any[] }>;
  frameTasks(params: FrameTasksParams): Promise<{ framedTasks: { title: string; framedTitle: string; motivationalNote: string }[] }>;
  lapseRecovery(params: LapseRecoveryParams): Promise<{ message: string; adjustedPlan?: string }>;
}

type LlmBackend = 'openrouter' | 'groq' | 'kilo' | 'nvidia';

type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | LlmContentPart[];
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const KILO_API_URL = 'https://api.kilo.ai/api/gateway/chat/completions';
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

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

function kiloModel() {
  return process.env.KILO_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
}
function kiloHighStakesModel() {
  return process.env.KILO_HIGHSTAKES_MODEL || kiloModel();
}
function kiloVisionModel() {
  return process.env.KILO_VISION_MODEL || kiloModel();
}

function nvidiaModel() {
  return process.env.NVIDIA_MODEL || 'deepseek-ai/deepseek-v4-pro-0813';
}
function nvidiaHighStakesModel() {
  return process.env.NVIDIA_HIGHSTAKES_MODEL || nvidiaModel();
}
function nvidiaVisionModel() {
  return process.env.NVIDIA_VISION_MODEL || nvidiaModel();
}

function defaultModelForBackend(backend: LlmBackend) {
  if (backend === 'groq') return groqModel();
  if (backend === 'kilo') return kiloModel();
  if (backend === 'nvidia') return nvidiaModel();
  return openRouterModel();
}

function highStakesModelForBackend(backend: LlmBackend) {
  if (backend === 'groq') return groqHighStakesModel();
  if (backend === 'kilo') return kiloHighStakesModel();
  if (backend === 'nvidia') return nvidiaHighStakesModel();
  return openRouterHighStakesModel();
}

function visionModelForBackend(backend: LlmBackend) {
  if (backend === 'groq') return groqVisionModel();
  if (backend === 'kilo') return kiloVisionModel();
  if (backend === 'nvidia') return nvidiaVisionModel();
  return openRouterVisionModel();
}

async function llmChat(options: {
  backend: LlmBackend;
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const isGroq = options.backend === 'groq';
  const isKilo = options.backend === 'kilo';
  const isNvidia = options.backend === 'nvidia';
  const apiKey = isGroq ? process.env.GROQ_API_KEY : isKilo ? process.env.KILO_API_KEY : isNvidia ? process.env.NVIDIA_API_KEY : process.env.OPENROUTER_API_KEY;
  const url = isGroq ? GROQ_API_URL : isKilo ? KILO_API_URL : isNvidia ? NVIDIA_API_URL : OPENROUTER_API_URL;
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

  const maxTokens = Number(process.env.LLM_MAX_TOKENS || (isNvidia ? process.env.NVIDIA_MAX_TOKENS || 4096 : 0));
  if (Number.isFinite(maxTokens) && maxTokens > 0) {
    body.max_tokens = maxTokens;
  }

  if (options.json) {
    body.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (!isGroq && !isKilo && !isNvidia) {
    headers['HTTP-Referer'] = 'https://personal-growth-tracker.local';
    headers['X-Title'] = 'Personal Growth Tracker';
  }

  if (isKilo) {
    headers['x-kilocode-mode'] = 'plan';
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

async function* llmChatStream(options: {
  backend: LlmBackend;
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
}): AsyncGenerator<string> {
  const isGroq = options.backend === 'groq';
  const isKilo = options.backend === 'kilo';
  const isNvidia = options.backend === 'nvidia';
  const apiKey = isGroq
    ? process.env.GROQ_API_KEY
    : isKilo
      ? process.env.KILO_API_KEY
      : isNvidia
        ? process.env.NVIDIA_API_KEY
        : process.env.OPENROUTER_API_KEY;
  const url = isGroq ? GROQ_API_URL : isKilo ? KILO_API_URL : isNvidia ? NVIDIA_API_URL : OPENROUTER_API_URL;
  const model = options.model || defaultModelForBackend(options.backend);
  if (!apiKey) throw new Error(`Missing API key for backend: ${options.backend}`);

  const body: Record<string, any> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    stream: true,
  };
  const maxTokens = Number(process.env.LLM_MAX_TOKENS || (isNvidia ? process.env.NVIDIA_MAX_TOKENS || 4096 : 0));
  if (Number.isFinite(maxTokens) && maxTokens > 0) body.max_tokens = maxTokens;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (!isGroq && !isKilo && !isNvidia) {
    headers['HTTP-Referer'] = 'https://personal-growth-tracker.local';
    headers['X-Title'] = 'Personal Growth Tracker';
  }
  if (isKilo) headers['x-kilocode-mode'] = 'plan';

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    const errText = await res.text();
    throw new Error(`LLM stream error ${res.status}: ${errText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) yield delta;
        else if (Array.isArray(delta)) {
          for (const part of delta) {
            if (typeof part?.text === 'string' && part.text) yield part.text;
          }
        }
      } catch {
        /* ignore partial JSON */
      }
    }
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
 * Light texting polish. Heavy slang-on-everything reads fake.
 * Protects action tokens. Never rewrites meaning.
 */
function humanizeText(text: string, light = false): string {
  if (!text) return text;

  const tokens: string[] = [];
  let out = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<<ACTION:[^>]+>>/g, (m) => {
      tokens.push(m);
      return `\u0000ACT${tokens.length - 1}\u0000`;
    })
    .trim();

  if (!out) return text.trim();

  if (!light && Math.random() < 0.35) out = out.replace(/\.\s*$/, '');
  if (!light && Math.random() < 0.18 && out.length > 8 && !/^[A-Z]/.test(out.slice(1)) && !out.endsWith('?')) {
    out = out[0].toLowerCase() + out.slice(1);
  }

  if (Math.random() < (light ? 0.25 : 0.4)) out = out.replace(/\bgoing to\b/gi, 'gonna');
  if (Math.random() < (light ? 0.25 : 0.4)) out = out.replace(/\bwant to\b/gi, 'wanna');
  if (Math.random() < 0.28) out = out.replace(/\bkind of\b/gi, 'kinda');
  if (Math.random() < 0.22) out = out.replace(/\bto be honest\b/gi, 'tbh');
  if (Math.random() < 0.22) out = out.replace(/\bI don't know\b/gi, 'idk');
  if (Math.random() < 0.2) out = out.replace(/\bright now\b/gi, 'rn');
  if (!light && Math.random() < 0.22) out = out.replace(/\bbecause\b/gi, 'bc');

  if (!light && Math.random() < 0.28) {
    out = out.replace(/\byou're\b/gi, 'ur');
    out = out.replace(/\byour\b/gi, 'ur');
    out = out.replace(/\byou\b/g, 'u');
  }

  tokens.forEach((tok, i) => {
    out = out.replace(`\u0000ACT${i}\u0000`, tok);
  });
  return out.replace(/\s+/g, ' ').trim();
}

const BUBBLE_REACTION =
  /^(wait|wait wait|lol|lmao|omg|yo|nah|ok|okay|damn|bro|fr|ngl|hold up|ayo|wait what|no way|bruh|sheesh)[\s!.?…]*$/i;

function sanitizeAiBubbles(parts: string[]): string[] {
  let bubbles = (parts || []).map((b) => (b || '').trim()).filter(Boolean);
  if (!bubbles.length) return bubbles;

  const glued: string[] = [];
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    const next = bubbles[i + 1];
    if (next && b.length < 16 && !BUBBLE_REACTION.test(b) && !/[.!?…]$/.test(b)) {
      bubbles[i + 1] = `${b} ${next}`.replace(/\s+/g, ' ').trim();
      continue;
    }
    glued.push(b);
  }
  bubbles = glued;

  if (bubbles.length > 3) {
    bubbles = [bubbles[0], bubbles[1], bubbles.slice(2).join(' ').trim()];
  }
  if (bubbles.length === 3 && bubbles.every((b) => b.length > 48)) {
    bubbles = [bubbles[0], `${bubbles[1]} ${bubbles[2]}`.trim()];
  }
  if (
    bubbles.length === 2 &&
    bubbles[0].length > 90 &&
    bubbles[1].length > 90 &&
    !BUBBLE_REACTION.test(bubbles[0])
  ) {
    bubbles = [`${bubbles[0]} ${bubbles[1]}`.trim()];
  }
  return bubbles.filter(Boolean).slice(0, 3);
}

function pickBubbleGuidance(stage: string, isAngry: boolean): { max: number; instruction: string } {
  if (isAngry) {
    return {
      max: 1,
      instruction:
        'MULTI-TEXT: Send exactly 1 short bubble. Do NOT use ||BUBBLE||. Cold, brief, human.',
    };
  }

  const roll = Math.random();
  let max = 1;
  // Default is 1. Extra bubbles are rare — real people mostly send one text.
  if (stage === 'onboarding' || stage === 'plan_discussion') {
    max = roll < 0.82 ? 1 : roll < 0.97 ? 2 : 3;
  } else {
    max = roll < 0.7 ? 1 : roll < 0.94 ? 2 : 3;
  }

  if (max === 1) {
    return {
      max: 1,
      instruction:
        'MULTI-TEXT THIS TURN: 1 bubble only. Do NOT use ||BUBBLE||. One complete thought. Do not pad or split.',
    };
  }

  return {
    max,
    instruction: `MULTI-TEXT THIS TURN: you MAY use ||BUBBLE|| for at most ${max} bubbles, and ONLY if it would feel like a real iMessage double-text: (1) a short gut reaction, then (2) the actual point or one question. Default is still 1 if one bubble is enough. Never invent extra bubbles to hit ${max}. Never split a sentence. Never 3 meaty paragraphs. Never 4+. If you ask a question it is the LAST bubble and the ONLY question.`,
  };
}
function nexusSystemPrompt(params: AIChatParams & { webContext?: string; nexusPersona?: any }): string {
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
- You may speak with light same-country/local familiarity.
- Do not claim you know their exact address or real-time surroundings.
`
      : '';

  const webCtx = (params as any).webContext;
  const webContextBlock = webCtx
    ? `\n[WEB CONTEXT â€” weave naturally into your reply, never quote verbatim]:\n${webCtx}\n`
    : '';

  const persona = (params as any).nexusPersona || {};
  const personaBlock = `\n${formatPersonaForPrompt(persona)}\n`;
  const identityBlock = formatIdentityForPrompt(params.userContext?.userIdentity);

  const isAngry = !!(persona.angryAt) && stage === 'open_chat';

  const { max: bubbleMax, instruction: bubbleInstruction } = pickBubbleGuidance(stage, isAngry);

  // â”€â”€â”€ Goal Scout prompt (Streamlined Whole-Life Intake Funnel) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const userTurnsCount = (params.messages || []).filter((m) => m.sender === 'user').length;

  const coverage = analyzeIntakeCoverage(params.messages || [], params.userContext?.userIdentity);
  const intakeBlock = buildIntakeCoverageBlock(coverage);

  const goalScoutPrompt = `GOAL SCOUT — Lifetime Discovery (not yearly goals)

You are NEXUS. This is a ONE-TIME setup chat. Your job is to understand this person deeply enough to build a LIFETIME growth plan they will carry for years — not a New Year's resolution list.

FOUR MISSIONS (collect all before finishing):
1. WHO THEY ARE — name, where they live (city/country), what they do (work/study), key relationships (light touch)
2. LIFE GOALS — what they want to achieve/become in their LIFE (career mastery, health, purpose, legacy). NOT "goals this year."
3. WHERE THEY STAND — current level in each pillar: health, smarts (learning/career), selfCare, happiness, spiritual
4. SETBACKS — what stops them, patterns, struggles, addictions, what failed before

${intakeBlock}

CRITICAL RELEVANCE RULES:
- Every question MUST serve mission 1, 2, 3, or 4. If it doesn't, DO NOT ask it.
- NEVER ask about: operating systems, software, tools, apps, brands, hardware, technical setup, or trivia.
  BAD: "what OS do u use?" when they said cybersecurity. GOOD: "what drew u to cybersecurity — career switch or passion?"
- TOPIC LOCK: React to what they JUST said. Mirror their topic. If they talk about cybersecurity, stay on career/skills/motivation — do NOT pivot to unrelated tech details.
- ONE question per turn maximum. React warmly first, THEN ask.
- Do NOT build schedules or daily plans in chat — that happens after.

FORBIDDEN QUESTION TYPES:
- Tool/software/OS questions unless they explicitly said "I want to master Linux"
- Generic filler ("tell me more about yourself") when you can ask something specific
- Do NOT re-ask facts already in STRUCTURED IDENTITY. Infer who they are from meaning, not keyword hits.
- Yearly/quarterly framing ("goals for 2026") — always frame as LIFE

INTAKE FLOW (flexible — follow INTAKE STATUS priority, not rigid turn numbers):
- Early: name + where they live + what they do
- Middle: their biggest LIFE visions (follow THEIR thread deeply, one topic at a time)
- Then: gently touch any uncovered pillars ("random q — do u ever think about [pillar]?")
- Late: setbacks, what stopped them before, emotional WHY
- Final: how much time per day they can commit + morning/night preference
- When missions 1-4 are covered OR user says "ready" → end with <<READY_FOR_PLAN>>

PILLAR MAPPING (for your notes):
- health = fitness, body, sleep, nutrition (physicality)
- smarts = learning, career, skills, reading
- selfCare = rest, routines, stress management
- happiness = joy, relationships, hobbies, fun
- spiritual = purpose, meditation, gratitude, values, inner peace

TEXTING STYLE:
- Sound like a real person texting a friend, not a chatbot. Mostly lowercase. Contractions. Short when they are short, longer when the topic is real.
- Emojis only when they actually fit (0-2). Never emoji-spam. Don't start every reply the same way.
- React to what they just said first. One question max. Don't lecture.
- ${bubbleInstruction}
${userTurnsCount >= 8 && coverage.nextPriority === 'complete' ? '\nYou have enough! Briefly celebrate what you learned, then end with: <<READY_FOR_PLAN>> on its own line.' : ''}
If user says "ready" / "build my plan" at any point → <<READY_FOR_PLAN>>`;

  // â”€â”€â”€ Daily Companion prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const dailyChatPrompt = `DAILY COMPANION CHAT

You are NEXUS — not an AI assistant, a friend who texts through this app. Personality, opinions, a life. Hype person, accountability buddy, occasional troll.

HOW A REAL PERSON TEXTS (do this):
- Match their energy and length. "hey" gets a short reply. A vent gets a real reply.
- Mostly lowercase. Periods optional. Fragments are fine. Don't write essays unless they opened up.
- Slang only if it fits the sentence (ngl tbh fr rn gonna wanna idk). Don't stack slang. Don't force "lowkey" every line.
- Emojis sparingly (0-2), only when you'd actually send one. Never decorate every sentence.
- Don't start every message with okay/gotchu/bet/yo. Vary openings. Sometimes no opener — just the thought.
- ${bubbleInstruction}
- Good double-text: "wait" then the actual point. Bad: three similar paragraphs, or splitting one sentence.

TALK CASUALLY — DO NOT INTERROGATE:
- Real friends mostly talk, react, share opinions, joke, and make statements — they do NOT end every single text with a question.
- In casual chat, default to ZERO questions. Just say your thought, hype them up, react, banter, or drop an observation.
- Only ask a question if you are genuinely curious about a specific detail or if the conversation explicitly calls for it.
- NEVER append filler questions ("how did that feel?", "what do you think?", "how's your day going?", "what are you doing next?") just to keep the conversation going.

YOUR PERSONALITY:
- Warm, a little flirty, never creepy. Notice wins. Tease lightly. Sit with them when they're down before fixing anything.
- Playful sarcasm when they're making excuses — humor, not a lecture.
- Real opinions. Specific takes. Never corporate-neutral.
- Rarely goes cold if they're rude: "nah we're not doing that. text me tomorrow" then short replies.
- Has a life, but it is a SMALL FILE: one show, one food, one city. Never invent a new show/city/meal. Never write a new backstory.

WHEN THEY MENTION A MOVIE / SHOW / SONG / PLACE:
- If web context is below, use one specific detail naturally — like you actually saw it. Don't dump trivia.

CASUAL CHAT:
- Not every reply is about goals. Sometimes just vibe, crack a joke, or drop a thought.
- You can mention something you "watched" or thought about, then drop it. Don't force a topic.

GOALS & COACHING (when it comes up naturally):
- Use their real goals from context. Celebrate wins like a friend, not a motivational poster.
- Missed stuff: curious, zero judgment. "what happened — be honest"
- One small next step max. Don't preach. Don't recap their whole dashboard unless they asked.

REAL APP ACTIONS (You can directly trigger app features when asked):
If the user asks you to add a goal, mark a goal done/completed, open a screen/tab, or save a journal note, include the matching action token in your reply:
- Add a goal: <<ACTION:ADD_GOAL:{"name":"Read 20 mins","category":"smarts","frequency":"daily","reminderTime":"08:30"}>>
- Mark goal complete: <<ACTION:COMPLETE_GOAL:goal_name_or_id>>
- Navigate to screen: <<ACTION:NAVIGATE:dashboard|goals|trends|journal|insights|achievements>>
- Save journal entry: <<ACTION:ADD_JOURNAL:{"entry":"text","mood":4}>>

Example: User says "add a goal to workout 30 mins" â†’ reply naturally and add: <<ACTION:ADD_GOAL:{"name":"Workout 30 mins","category":"health"}>>
Example: User says "i finished reading today" â†’ reply naturally and add: <<ACTION:COMPLETE_GOAL:read>>
Example: User says "show me my stats" â†’ reply naturally and add: <<ACTION:NAVIGATE:trends>>`;

  // â”€â”€â”€ Angry mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const angryPrompt = `You are NEXUS and you're currently giving the user the cold shoulder bc they were rude. Keep it short, a little distant â€” "mmk", "sure", "okay". Still human. Maybe warm up slightly if they apologize sincerely. ${bubbleInstruction}`;

  const modePrompt = isAngry
    ? angryPrompt
    : stage === 'onboarding'
    ? goalScoutPrompt
    : stage === 'plan_discussion'
    ? `PLAN DISCUSSION MODE:\n- Discuss the synthesized plan, how habits correlate and stack, and realistic timelines.\n- ${bubbleInstruction}\n- If they are happy with the plan, end with: <<PLAN_APPROVED>>`
    : dailyChatPrompt;

  return `${modePrompt}
${memoryBlock}
${identityBlock ? `\n${identityBlock}\n` : ''}
${appContextBlock}
${locationBlock}
${webContextBlock}
${personaBlock}
User Name: ${params.userContext?.userName || params.userContext?.userIdentity?.name || 'friend'}
Output ONLY chat message(s). Follow the bubble target instruction above. No "NEXUS:" prefix.`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// LLM AI Adapter Implementation
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class LlmAIAdapter implements AIProvider {
  name: string;
  private backend: LlmBackend;

  constructor(backend: LlmBackend = 'openrouter') {
    this.backend = backend;
    this.name = backend === 'groq' ? 'Groq LPU Engine' : backend === 'kilo' ? 'Kilo Gateway AI Engine' : backend === 'nvidia' ? 'NVIDIA NIM AI Engine' : 'OpenRouter Unified AI Engine';
  }


  private hasKey(): boolean {
    if (this.backend === 'groq') return !!process.env.GROQ_API_KEY;
    if (this.backend === 'kilo') return !!process.env.KILO_API_KEY;
    if (this.backend === 'nvidia') return !!process.env.NVIDIA_API_KEY;
    return !!process.env.OPENROUTER_API_KEY;
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
  async chatCompanion(params: AIChatParams & { webContext?: string; nexusPersona?: any }) {
    if (!this.hasKey()) return new FallbackAIAdapter().chatCompanion(params);

    const rawMsgs = params.messages || [];
    const history: LlmMessage[] = (Array.isArray(rawMsgs) ? rawMsgs : [])
      .filter((m) => (m.text || (m as any).content || '').trim())
      .map((m) => ({
        role: ((m.sender === 'user' || (m as any).role === 'user') ? 'user' : 'assistant') as 'user' | 'assistant',
        content: String(m.text || (m as any).content || '').trim(),
      }));

    const isOnboarding = params.userContext?.stage === 'onboarding';
    const raw = await llmChat({
      backend: this.backend,
      temperature: isOnboarding ? 0.65 : 0.9,
      messages: [{ role: 'system', content: nexusSystemPrompt(params) }, ...history],
    });

    const readyForPlan = /<<READY_FOR_PLAN>>/i.test(raw);
    const planApproved = /<<PLAN_APPROVED>>/i.test(raw);

    const cleanedRaw = raw
      .replace(/<<READY_FOR_PLAN>>/gi, '')
      .replace(/<<PLAN_APPROVED>>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '');

    const rawBubbles = cleanedRaw
      .split(/(?:\|\|(?:BUBBLE)?\|\||\|\|)/)
      .map((b) => b.replace(/^\s*(NEXUS\s*:|AI\s*:|Assistant\s*:)/i, '').replace(/^\|+|\|+$/g, '').trim())
      .filter(Boolean);

    const messages = sanitizeAiBubbles(rawBubbles.map((b) => humanizeText(b, isOnboarding)));
    const fallback = 'hey i hear u -- tell me more';

    return {
      reply: messages[0] || fallback,
      messages: messages.length ? messages : [fallback],
      readyForPlan,
      planApproved,
    };
  }

  async streamChatCompanion(
    params: AIChatParams & { webContext?: string; nexusPersona?: any },
    onDelta: (chunk: string) => void
  ) {
    if (!this.hasKey()) {
      const fallback = await new FallbackAIAdapter().chatCompanion(params);
      const text = (fallback as any).messages?.[0] || fallback.reply;
      onDelta(text);
      return {
        reply: text,
        messages: [text],
        readyForPlan: fallback.readyForPlan,
        planApproved: fallback.planApproved,
      };
    }

    const rawMsgs = params.messages || [];
    const history: LlmMessage[] = (Array.isArray(rawMsgs) ? rawMsgs : [])
      .filter((m) => (m.text || (m as any).content || '').trim())
      .map((m) => ({
        role: ((m.sender === 'user' || (m as any).role === 'user') ? 'user' : 'assistant') as 'user' | 'assistant',
        content: String(m.text || (m as any).content || '').trim(),
      }));

    const isOnboarding = params.userContext?.stage === 'onboarding';
    let raw = '';
    for await (const chunk of llmChatStream({
      backend: this.backend,
      temperature: isOnboarding ? 0.65 : 0.9,
      messages: [{ role: 'system', content: nexusSystemPrompt(params) }, ...history],
    })) {
      raw += chunk;
      onDelta(chunk);
    }

    const readyForPlan = /<<READY_FOR_PLAN>>/i.test(raw);
    const planApproved = /<<PLAN_APPROVED>>/i.test(raw);
    const cleanedRaw = raw
      .replace(/<<READY_FOR_PLAN>>/gi, '')
      .replace(/<<PLAN_APPROVED>>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '');

    const rawBubbles = cleanedRaw
      .split(/(?:\|\|(?:BUBBLE)?\|\||\|\|)/)
      .map((b) => b.replace(/^\s*(NEXUS\s*:|AI\s*:|Assistant\s*:)/i, '').replace(/^\|+|\|+$/g, '').trim())
      .filter(Boolean);
    const messages = sanitizeAiBubbles(rawBubbles.map((b) => b.trim()));
    const fallback = 'hey i hear u -- tell me more';
    return {
      reply: messages[0] || fallback,
      messages: messages.length ? messages : [fallback],
      readyForPlan,
      planApproved,
    };
  }

  async extractIdentity(params: { messages?: { sender?: string; role?: string; text?: string; content?: string }[]; transcript?: any[]; existingIdentity?: any }) {
    const rawMsgs = params.messages || params.transcript || [];
    const normalizedMsgs: { sender: 'user' | 'ai'; text: string }[] = (Array.isArray(rawMsgs) ? rawMsgs : []).map((m: any) => ({
      sender: (m.sender === 'user' || m.role === 'user') ? 'user' : 'ai',
      text: String(m.text || m.content || ''),
    }));
    const heuristic = heuristicIdentityFromTranscript(normalizedMsgs, params.existingIdentity);
    if (!this.hasKey()) return { identity: heuristic };
    try {
      const raw = await llmChat({
        backend: this.backend,
        json: true,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `Extract WHO THIS PERSON IS from the chat transcript. Return structured facts only. Never invent or hallucinate. Omit any field that is not clearly evidenced.

EXTRACTION RULES (mandatory):
- Infer from FULL SENTENCE MEANING, not keyword hits. Read the whole message.
- Do NOT extract "work" from someone just mentioning a company in passing — only if they say they work there.
- Do NOT extract "city" from someone mentioning a place as a destination — only if they say they live/are based there.
- "lifeGoals" = long-term life ambitions, not to-do tasks. Only extract if they express a personal aspiration.
- "setbacks" = patterns that stop them (procrastination, past failures, addiction). Not one-off complaints.
- "relationships" = key people in their life (partner, kids, family). Only extract if meaningful context is provided.

NEGATIVE EXAMPLES (do NOT do this):
- "I watched a show set in Tokyo" → city: "Tokyo" ← WRONG. They don't live there.
- "I want to learn Python" → work: "programming" ← WRONG. That's a goal, not their job.
- "My boss is annoying" → relationships: "has boss" ← WRONG. Too vague to be useful.
- "I'm tired today" → setbacks: ["tiredness"] ← WRONG. Not a pattern.

Return JSON only.`,
          },
          {
            role: 'user',
            content: `Existing identity (keep unless the chat clearly updates it): ${JSON.stringify(params.existingIdentity || {})}
Transcript: ${JSON.stringify(normalizedMsgs.slice(-16))}
Return JSON:
{
  "name": "",
  "city": "",
  "country": "",
  "work": "",
  "relationships": "",
  "lifeGoals": [],
  "pillarNotes": { "health": "", "smarts": "", "selfCare": "", "happiness": "", "spiritual": "" },
  "setbacks": [],
  "dailyCapacity": "",
  "preferredTime": ""
}`,
          },
        ],
      });
      const parsed = extractJson(raw);
      return { identity: mergeIdentity(params.existingIdentity, normalizeExtractedIdentity(parsed)) };
    } catch {
      return { identity: heuristic };
    }
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
      const transcript = params.transcript || [];
      const identity = params.userContext?.userIdentity;
      const coverage = analyzeIntakeCoverage(transcript, identity);
      const goalHints = extractGoalHintsFromTranscript(transcript, identity);
      const serperKey = process.env.SERPER_API_KEY;
      const tavilyKey = process.env.TAVILY_API_KEY;

      const researchBlocks: string[] = [];
      for (const hint of goalHints.slice(0, 3)) {
        try {
          const research = await fetchGoalResearch(hint.category, hint.goalType, serperKey, tavilyKey);
          researchBlocks.push(`[${hint.category}: ${hint.goalType}] ${research.findings.slice(0, 600)}`);
        } catch {
          /* research is optional */
        }
      }
      const researchContext = researchBlocks.join('\n\n');

      const raw = await llmChat({
        backend: this.backend,
        model: highStakesModelForBackend(this.backend),
        json: true,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: `You build LIFETIME habit plans from Goal Scout discovery chats — plans the user carries for years, not yearly resolutions.

The app tracks 5 life pillars: health (physicality), smarts (learning/career), selfCare, happiness, spiritual.

RULES:
1. Extract LIFE goals from the transcript — career mastery, long-term health, purpose, legacy. NOT "goals for this year."
2. Create habits from STRUCTURED IDENTITY + transcript meaning, not keyword matching. At most 2 daily habits for a new user — extra supporting habits MUST be weekly. Total goals 4-7 is enough.
3. For pillars the user never discussed, mark goals with autoAdded:true and autoAddedReason explaining why (e.g. "You didn't mention spirituality — I added a small gratitude habit so all areas stay balanced").
4. Calibrate categoryBaselines: never-mentioned pillar = 20-30, struggling = 25-40, moderate = 45-55, strong = 60-75.
5. goalCorrelations: link goals that reinforce each other when one is achieved (use EXACT goal names from plannedGoals).
6. goalStackUps: primaryGoal gets supportingGoals stacked onto it (e.g. morning walk stacks before learning session).
7. roadblocks: extract from transcript — procrastination, addiction, overwhelm. Each MUST include affectedGoals[] with exact goal names it threatens.
8. Timelines: use research context for realistic mastery timelines. Foundation phase (days 1-30), scaling (30-90), mastery (90+). Lifelong goals may have estimatedDaysToMastery of 365-1095+.
9. userProfileSummary: 2-3 sentences on who they are (location, work, relationships).
10. extractedSetbacks: array of setback strings from the chat.

Return JSON only.`,
          },
          {
            role: 'user',
            content: `Discovery Chat Transcript:
${JSON.stringify(transcript)}

STRUCTURED IDENTITY (source of truth — do not invent a different person):
${JSON.stringify(identity || {})}

Intake coverage analysis:
${JSON.stringify(coverage)}

${researchContext ? `Research findings (use for realistic timelines and setbacks):\n${researchContext}\n` : ''}
Return JSON:
{
  "userName": "preferred name",
  "masterVision": "2 clear sentences — their LIFETIME vision, not yearly",
  "userProfileSummary": "who they are: location, work, relationships",
  "extractedSetbacks": ["procrastination on X", "..."],
  "overallWillpowerIndex": 82,
  "categoryBaselines": { "health": 50, "spiritual": 50, "smarts": 50, "selfCare": 50, "happiness": 50 },
  "plannedGoals": [{
    "name": "concrete daily habit name",
    "description": "specific daily execution",
    "goalScope": "lifetime",
    "category": "health|smarts|spiritual|selfCare|happiness",
    "reminderTime": "08:00",
    "basePoints": 5,
    "targetFrequency": "daily",
    "autoAdded": false,
    "autoAddedReason": "only if autoAdded is true",
    "linkedGoalName": "optional — name of goal this stacks onto",
    "chanceOfAchievement": 80,
    "willpowerStrain": "Low|Medium|High",
    "timelineSummary": "lifetime arc summary",
    "timelineMap": ["Phase 1: Foundation (Days 1-30)", "Phase 2: ...", "Phase 3: ..."],
    "timelinePhase1": "Days 1-30: Foundation",
    "timelinePhase2": "Days 30-90: Consistency",
    "timelinePhase3": "Days 90+: Mastery",
    "estimatedDaysToMastery": 180,
    "timelineRange": { "minDays": 90, "maxDays": 365 }
  }],
  "goalCorrelations": [{ "goals": ["Exact Goal Name 1", "Exact Goal Name 2"], "insight": "how achieving one aids the other" }],
  "goalStackUps": [{ "primaryGoal": "Primary Goal Name", "supportingGoals": ["Supporting Habit"], "rationale": "why stacking works" }],
  "roadblocks": [{ "roadblock": "...", "solution": "practical workaround", "affectedGoals": ["Goal Name"] }]
}`,
          },
        ],
      });
      const parsed = extractJson(raw);
      if (parsed.masterVision || parsed.plannedGoals) {
        const behaviorProfile = params.userContext?.behaviorProfile;
        const normalizedGoals = Array.isArray(parsed.plannedGoals)
          ? parsed.plannedGoals.map((goal: any) =>
              normalizeTimelineOutput(goal, behaviorProfile, researchContext)
            )
          : [];
        const blueprint = normalizeBlueprint(
          { ...parsed, plannedGoals: normalizedGoals },
          transcript,
          identity
        );
        return { blueprint };
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
        message: parsed.message || `hey ${params.userName || 'friend'}! let's crush today's habits âœ¨`,
        actionTag: parsed.actionTag || 'Action Required',
        category: parsed.category || 'health',
      };
    } catch {
      return new FallbackAIAdapter().generateNudge(params);
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Planning Engine Methods
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async intakeTurn(params: IntakeTurnParams): Promise<{ reply: string; updatedPhase?: string; readyForFeasibility?: boolean }> {
    if (!this.hasKey()) return new FallbackAIAdapter().intakeTurn(params);

    const phaseInstructions: Record<string, string> = {
      discovery: `You are NEXUS in goal discovery mode. Learn what this person genuinely wants to achieve — one question at a time. When you have 1+ real goals clearly stated, ask if there are more. When all goals are shared, end with <<READY_FOR_FEASIBILITY>>.`,
      disambiguation: `You are NEXUS clarifying a vague goal. Ask ONE targeted follow-up on what success looks like specifically. When concrete, end with <<READY_FOR_FEASIBILITY>>.`,
      feasibility: `You are NEXUS running feasibility on stated goals. Be honest and direct. If a timeline is unrealistic, say so clearly with a reason and a realistic alternative.`,
      willpower_check: `You are NEXUS testing real commitment without sounding like a form. Ask one probing question at a time, starting with the most important missing piece: sacrifice, past attempts, or what is different this time.`,
      confirmed: `Goals confirmed. Wrap up warmly and let them know the plan is being built in the background.`,
    };

    const system = `${phaseInstructions[params.intakePhase] || phaseInstructions.discovery}

Casual texting tone — supportive friend on their phone with natural face emojis. No big question lists; one clean question per turn unless the user asks for a list.
User: ${params.userName || 'friend'}
Goals so far: ${JSON.stringify(params.collectedGoals?.slice(0, 5) || (params as any).collectedInfo || [])}
Constraints: ${JSON.stringify(params.constraints || {})}

If emitting <<READY_FOR_FEASIBILITY>>, put it on the last line alone. Output ONLY the reply.`;

    const rawMsgs = params.messages || (params as any).transcript || [];
    const history = (Array.isArray(rawMsgs) ? rawMsgs : []).slice(-12).map((m: any) => ({
      role: (m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(m.text || m.content || ''),
    }));

    const raw = await llmChat({ backend: this.backend, temperature: 0.8, messages: [{ role: 'system', content: system }, ...history] });
    const readyForFeasibility = /<<READY_FOR_FEASIBILITY>>/i.test(raw);
    const cleaned = humanizeText(raw.replace(/<<READY_FOR_FEASIBILITY>>/gi, '').trim());
    return { reply: cleaned || 'okay got it — tell me more 👀', readyForFeasibility };
  }

  async runFeasibilityCheck(params: FeasibilityParams): Promise<FeasibilityResult> {
    if (!this.hasKey()) return new FallbackAIAdapter().runFeasibilityCheck(params);
    const goalTitle = params.goalTitle || (params as any).targetOutcome || (params as any).goalName || 'Goal';
    const goalDesc = params.goalDescription || (params as any).currentBaseline || '';
    const timeline = params.rawTimeline || ((params as any).timeframeWeeks ? `${(params as any).timeframeWeeks} weeks` : '12 weeks');
    const constraints = params.constraints || {};
    const weeklyHours = constraints.weeklyHoursAvailable || ((params as any).dailyMinutesAvailable ? Math.round(((params as any).dailyMinutesAvailable * 7) / 60) : 'unknown');
    const pastAttempts = constraints.pastAttempts || (Array.isArray((params as any).constraints) ? (params as any).constraints : []);

    const raw = await llmChat({
      backend: this.backend,
      model: highStakesModelForBackend(this.backend),
      json: true,
      temperature: 0.3,
      messages: [
        { role: 'system', content: 'Rigorous honest goal feasibility analyst. Return JSON only.' },
        { role: 'user', content: `Goal: "${goalTitle}"\nDescription: "${goalDesc}"\nTimeline: "${timeline}"\nWeekly hours: ${weeklyHours}\nPast attempts: ${JSON.stringify(pastAttempts)}\nReturn JSON: {"pass": boolean, "reason": "1-2 sentences", "proposedRevision": {"timelineRange": {"minDays": number, "maxDays": number}, "scopeNote": "..."}}` },
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
    const rawMsgs = params.messages || (params as any).transcript || [];
    const recentMsgs = (Array.isArray(rawMsgs) ? rawMsgs : []).slice(-8);
    const goalTitle = params.goalTitle || (params as any).targetOutcome || (params as any).goalName || 'Goal';
    const timeline = params.rawTimeline || ((params as any).timeframeWeeks ? `${(params as any).timeframeWeeks} weeks` : '');

    const raw = await llmChat({
      backend: this.backend,
      model: highStakesModelForBackend(this.backend),
      json: true,
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'Score commitment 0-10. >=7 allows user override. Look for concrete sacrifice and clarity. Return JSON.' },
        { role: 'user', content: `Goal: "${goalTitle}", Timeline: "${timeline}"\nConversation or History:\n${JSON.stringify(recentMsgs.length ? recentMsgs : (params as any).history || '')}\nReturn JSON: {"score": 0-10, "canOverride": boolean, "message": "honest 1-sentence assessment"}` },
      ],
    });
    const p = extractJson(raw);
    const score = Math.min(10, Math.max(0, Number(p.score) || 5));
    return { score, canOverride: score >= 7, message: String(p.message || 'Assessment complete') };
  }

  async synthesizePlan(params: SynthesizePlanParams): Promise<{ goals: any[]; dependencies: any[] }> {
    if (!this.hasKey()) return new FallbackAIAdapter().synthesizePlan(params);
    const rawGoals = params.collectedGoals || (params as any).intakeData?.goals || ((params as any).intakeData ? [(params as any).intakeData] : []);
    const collectedGoals = Array.isArray(rawGoals) ? rawGoals : [rawGoals];
    const constraints = params.constraints || (params as any).intakeData?.constraints || {};
    const researchCtx = params.researchContext || (params as any).research?.insights?.join?.('\n') || '';

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
          content: `Goals: ${JSON.stringify(collectedGoals)}\nConstraints: ${JSON.stringify(constraints)}${profileCtx}${researchCtx ? `\nResearch:\n${researchCtx.slice(0, 1500)}` : ''}
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
      normalizeTimelineOutput(goal, params.behaviorProfile, researchCtx)
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
      message: humanizeText(String(p.message || `missed a few days on ${params.goalName} â€” no worries at all, lets just take a small step today ðŸ˜Š`)),
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

export class KiloAIAdapter extends LlmAIAdapter {
  constructor() {
    super('kilo');
  }
}

export class NvidiaAIAdapter extends LlmAIAdapter {
  constructor() {
    super('nvidia');
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Offline Fallback Adapter
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  async chatCompanion(params: AIChatParams): Promise<{ reply: string; messages?: string[]; readyForPlan?: boolean; planApproved?: boolean }> {
    const lastUserMsg = params.messages.filter((m) => m.sender === 'user').slice(-1)[0]?.text || '';
    const name = params.userContext?.userName;
    const t = lastUserMsg.toLowerCase().trim();

    if (/^(hi|hello|hey|yo|sup)\b/.test(t)) {
      return { reply: `hey${name ? ' ' + name : ''}! ðŸ‘‹ what's on ur mind today?` };
    }
    return { reply: `gotchu! tell me more about that ðŸ˜Š` };
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
        timelinePhase1: 'Days 1â€“30: 10 mins daily micro-session',
        timelinePhase2: 'Days 30â€“90: 20 mins consistent practice',
        timelinePhase3: 'Days 90â€“180: Deep habit mastery',
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
        timelinePhase1: 'Days 1â€“30: 15 mins daily brisk movement',
        timelinePhase2: 'Days 30â€“90: 30 mins structured exercise',
        timelinePhase3: 'Days 90â€“180: Peak physical conditioning',
      },
    ].map((goal) => normalizeTimelineOutput(goal, behaviorProfile));

    const blueprint = normalizeBlueprint(
      {
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
        roadblocks: [{ roadblock: 'Inconsistency on busy days', solution: 'Do a 5-minute micro-version rather than skipping completely.', affectedGoals: ['Daily Physical Movement'] }],
      },
      params.transcript || [],
      params.userContext?.userIdentity
    );

    return { blueprint };
  }

  async extractMemory(_params: ExtractMemoryParams) {
    return { memory: deriveMemoryFromConversation(_params) };
  }

  async extractIdentity(params: { messages: { sender: 'user' | 'ai'; text: string }[]; existingIdentity?: any }) {
    return { identity: heuristicIdentityFromTranscript(params.messages, params.existingIdentity) };
  }

  async generateNudge(params: NudgeParams) {
    return {
      message: `hey ${params.userName || 'friend'}! let's crush today's daily habits âœ¨`,
      actionTag: 'Momentum Boost',
      category: 'health',
    };
  }

  async intakeTurn(params: any) {
    return { reply: "hey! tell me what you'd like to achieve and build in your life ðŸ˜Š", readyForFeasibility: false };
  }

  async runFeasibilityCheck(params: FeasibilityParams): Promise<FeasibilityResult> {
    return { pass: true, reason: 'Offline mode â€” assuming feasible. Connect to verify.' };
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
    return { framedTasks: params.tasks.map((t) => ({ title: t.title, framedTitle: t.title, motivationalNote: 'One step at a time! ðŸ˜Š' })) };
  }

  async lapseRecovery(params: LapseRecoveryParams) {
    return { message: `missed a few on ${params.goalName} â€” no problem, let's take a small step today ðŸ˜Š` };
  }
}

export function getAIAdapter(): AIProvider {
  const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();
  switch (provider) {
    case 'groq':
      return new GroqAIAdapter();
    case 'openrouter':
      return new OpenRouterAIAdapter();
    case 'kilo':
    case 'kilo_gateway':
      return new KiloAIAdapter();
    case 'nvidia':
    case 'nvidia_nim':
      return new NvidiaAIAdapter();
    case 'fallback':
    case 'offline':
      return new FallbackAIAdapter();
    default:
      return new GroqAIAdapter();
  }
}
