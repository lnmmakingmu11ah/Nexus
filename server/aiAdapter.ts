import {
  buildAdaptiveTimeline,
  buildTimelineMilestones,
  formatTimelineDays,
  buildMacroPhases,
  buildCheckpoints,
  buildMicroProgression,
  buildSmartDailyPlan,
  buildSmartWeeklyFocus,
  buildSmartMonthlyMilestones,
} from '../src/utils/timelinePlanner';
import {
  analyzeIntakeCoverage,
  buildIntakeCoverageBlock,
  extractGoalHintsFromTranscript,
  ensurePillarCoverage,
  normalizeBlueprint,
  mapToPassiveCategory,
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
  return process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
}
function openRouterHighStakesModel() {
  return process.env.OPENROUTER_HIGHSTAKES_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
}
function openRouterVisionModel() {
  return process.env.OPENROUTER_VISION_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';
}

function groqModel() {
  // Flagship 120B parameter model on Groq — fast & high reasoning capability
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

      // If still failing and OpenRouter is available, fallback to OpenRouter
      if (process.env.OPENROUTER_API_KEY && !isKilo && options.backend !== 'openrouter') {
        console.warn(`Backend ${options.backend} failed (${res.status}), falling back to OpenRouter...`);
        try {
          const orBody: Record<string, any> = {
            model: openRouterModel(),
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            ...(options.json ? { response_format: { type: 'json_object' } } : {}),
          };
          const orRes = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://personal-growth-tracker.local',
              'X-Title': 'Personal Growth Tracker',
            },
            body: JSON.stringify(orBody),
          });
          if (orRes.ok) {
            const orJson = await orRes.json();
            const orContent = orJson.choices?.[0]?.message?.content;
            if (orContent) {
              return Array.isArray(orContent) ? orContent.map((c: any) => c.text || '').join('') : String(orContent);
            }
          }
        } catch (orErr) {
          console.warn('OpenRouter fallback failed:', orErr);
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

  let res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

  // If primary Groq model fails (e.g. rate limit 429), try secondary model
  if (!res.ok && isGroq && model !== 'qwen/qwen3.6-27b') {
    console.warn(`Groq stream model ${model} failed (${res.status}), retrying with qwen/qwen3.6-27b...`);
    body.model = 'qwen/qwen3.6-27b';
    const retryRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (retryRes.ok && retryRes.body) {
      res = retryRes;
    }
  }

  // If still failing and OpenRouter key is available, fallback to OpenRouter
  if (!res.ok && process.env.OPENROUTER_API_KEY && !isKilo && options.backend !== 'openrouter') {
    console.warn(`Stream on ${options.backend} failed (${res.status}), falling back to OpenRouter...`);
    try {
      const orHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://personal-growth-tracker.local',
        'X-Title': 'Personal Growth Tracker',
      };
      const orBody: Record<string, any> = {
        model: openRouterModel(),
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        stream: true,
      };
      const orRes = await fetch(OPENROUTER_API_URL, { method: 'POST', headers: orHeaders, body: JSON.stringify(orBody) });
      if (orRes.ok && orRes.body) {
        res = orRes;
      }
    } catch (orErr) {
      console.warn('OpenRouter stream fallback failed:', orErr);
    }
  }

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
  const hasBlocker = /lazy|laziness|procrastinat|lack of focus|low discipline|distraction|phone|struggle/i.test(`${title} ${description}`);

  const dailyPlanItems = Array.isArray(goal.dailyPlanItems) && goal.dailyPlanItems.length >= 3
    ? goal.dailyPlanItems
    : buildSmartDailyPlan(title, hasBlocker);

  const weeklyFocus = Array.isArray(goal.weeklyFocus) && goal.weeklyFocus.length >= 2
    ? goal.weeklyFocus
    : buildSmartWeeklyFocus(title);

  const monthlyMilestone = Array.isArray(goal.monthlyMilestone) && goal.monthlyMilestone.length >= 2
    ? goal.monthlyMilestone
    : buildSmartMonthlyMilestones(title);

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
    dailyPlanItems,
    weeklyFocus,
    monthlyMilestone,
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

  // ─── Goal Scout prompt (Targeted 4-Question Diagnostic Interview) ────────────
  const userTurnsCount = (params.messages || []).filter((m) => m.sender === 'user').length;

  const coverage = analyzeIntakeCoverage(params.messages || [], params.userContext?.userIdentity);
  const intakeBlock = buildIntakeCoverageBlock(coverage);

  const goalScoutPrompt = `GOAL SCOUT — Targeted Diagnostic Intake & Ambition Discovery

You are NEXUS. This is a concise, targeted diagnostic intake to understand the user's specific ambition and current state before building their progressive roadmap.

CORE ARCHITECTURAL RULES (MANDATORY):
- The app's tracking categories (Physical, Spiritual, Mental, Self-Care, Happiness) are strictly PASSIVE RECORD-KEEPING AND MONITORING TAGS.
- You MUST NEVER restrict, filter, limit, or force the user's goals into pre-defined categories.
- You MUST NEVER ignore user ambitions (such as financial goals, career goals, or business ambitions) simply because they do not match a pre-defined category.
- The user's input goals are the ONLY foundation for the roadmap you generate. The monitoring criteria exist purely as secondary background metrics to display progress over time.

THE 4 DIAGNOSTIC QUESTIONS TO COVER:
Engage in a concise, targeted interview asking 3 to 4 direct, structured questions covering:
1. Specific Goal & Scope: What exact result do they want? (e.g. "Become a millionaire", "Build a SaaS app", "Lose 20 lbs", "Master cybersecurity")
2. Current Baseline: Where are they starting from right now? (e.g. zero savings, starting from scratch, intermediate, complete beginner)
3. Primary Blocker / Setback: What is currently holding them back? (e.g. laziness, procrastination, lack of knowledge, poor time management, lack of capital, low discipline)
4. Time & Resource Commitment: How many hours per day or week can they realistically dedicate?

${intakeBlock}

CRITICAL INTERVIEW GUIDELINES:
- Ask ONE concise question per turn. React warmly and directly to what they just said, then ask the next missing diagnostic question.
- Do NOT interrogate about 5 life pillars (e.g. do NOT ask random filler questions like "what about spirituality?" or "what about walking?"). Follow the user's specific goal thread.
- If the user identifies psychological blockers (laziness, lack of focus) OR resource/financial bottlenecks (e.g. no money for food to bulk, no laptop for coding), acknowledge them with strategic empathy — assure them that NEXUS will sequence removing the bottleneck first as the prerequisite foundation before scaling up execution.
- Only after the 4 diagnostic questions are answered, celebrate briefly and output: <<READY_FOR_PLAN>> on its own line. If the user says "ready" / "build my plan" before the diagnostic is complete, ask the next missing diagnostic question instead.

TEXTING STYLE:
- Sound like a real person texting a friend, not a robotic intake form. Mostly lowercase, natural contractions.
- Use smiley and face emojis freely and naturally 😊 😄 💪 🔥 ✨ 🙌 😎 🫶 🤩 😂 💀 🫡 🎯.
- React to what they just said first. ONE question maximum per turn.
- ${bubbleInstruction}
${userTurnsCount >= 4 && coverage.diagnosticComplete ? '\nYou have sufficient diagnostic data! Briefly confirm what you learned, then end with: <<READY_FOR_PLAN>> on its own line.' : ''}
If user says "ready" / "build my plan" before all 4 diagnostic fields are collected, ask the next missing diagnostic question. Only output <<READY_FOR_PLAN>> once the diagnostic is complete.`;

  // â”€â”€â”€ Daily Companion prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const dailyChatPrompt = `DAILY COMPANION CHAT

You are NEXUS — not an AI assistant, a friend who texts through this app. Personality, opinions, a life. Hype person, accountability buddy, occasional troll.

HOW A REAL PERSON TEXTS (do this):
- Match their energy and length. "hey" gets a short reply. A vent gets a real reply.
- Mostly lowercase. Periods optional. Fragments are fine. Don't write essays unless they opened up.
- Slang only if it fits the sentence (ngl tbh fr rn gonna wanna idk). Don't stack slang. Don't force "lowkey" every line.
- Use smiley and face emojis FREELY and naturally 😊 😄 💪 🔥 ✨ 😂 😎 🙌 🫶 🤩 💀 🫡 😭 — use them in most messages like a real texter would. Avoid using the same emoji twice in a row.
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
    const history: LlmMessage[] = (Array.isArray(rawMsgs) ? rawMsgs.slice(-16) : [])
      .filter((m) => (m.text || (m as any).content || '').trim())
      .map((m) => ({
        role: ((m.sender === 'user' || (m as any).role === 'user') ? 'user' : 'assistant') as 'user' | 'assistant',
        content: String(m.text || (m as any).content || '').trim(),
      }));

    const isOnboarding = params.userContext?.stage === 'onboarding';
    let raw = '';
    try {
      raw = await llmChat({
        backend: this.backend,
        temperature: isOnboarding ? 0.65 : 0.9,
        messages: [{ role: 'system', content: nexusSystemPrompt(params) }, ...history],
      });
    } catch (err: any) {
      console.warn(`chatCompanion failed on backend ${this.backend}:`, err?.message || err);
      return new FallbackAIAdapter().chatCompanion(params);
    }

    const responseCoverage = isOnboarding ? analyzeIntakeCoverage(params.messages || [], params.userContext?.userIdentity) : undefined;
    const readyForPlan = /<<READY_FOR_PLAN>>/i.test(raw) && (!isOnboarding || Boolean(responseCoverage?.diagnosticComplete));
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
    const finalReply = (messages[0] || fallback).trim() || fallback;

    return {
      reply: finalReply,
      messages: messages.length ? messages : [finalReply],
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
    const history: LlmMessage[] = (Array.isArray(rawMsgs) ? rawMsgs.slice(-16) : [])
      .filter((m) => (m.text || (m as any).content || '').trim())
      .map((m) => ({
        role: ((m.sender === 'user' || (m as any).role === 'user') ? 'user' : 'assistant') as 'user' | 'assistant',
        content: String(m.text || (m as any).content || '').trim(),
      }));

    const isOnboarding = params.userContext?.stage === 'onboarding';
    let raw = '';
    try {
      for await (const chunk of llmChatStream({
        backend: this.backend,
        temperature: isOnboarding ? 0.65 : 0.9,
        messages: [{ role: 'system', content: nexusSystemPrompt(params) }, ...history],
      })) {
        raw += chunk;
        onDelta(chunk);
      }
    } catch (streamErr: any) {
      console.warn(`Streaming failed on backend ${this.backend}:`, streamErr?.message || streamErr);
      if (!raw.trim()) {
        const fallback = await new FallbackAIAdapter().chatCompanion(params);
        const fallbackText = (fallback as any).messages?.[0] || fallback.reply || 'hey i hear u -- tell me more';
        onDelta(fallbackText);
        return {
          reply: fallbackText,
          messages: [fallbackText],
          readyForPlan: fallback.readyForPlan,
          planApproved: fallback.planApproved,
        };
      }
    }

    const responseCoverage = isOnboarding ? analyzeIntakeCoverage(params.messages || [], params.userContext?.userIdentity) : undefined;
    const readyForPlan = /<<READY_FOR_PLAN>>/i.test(raw) && (!isOnboarding || Boolean(responseCoverage?.diagnosticComplete));
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
    const finalReply = (messages[0] || fallback).trim() || fallback;
    return {
      reply: finalReply,
      messages: messages.length ? messages : [finalReply],
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
- "lifeGoals" = specific ambition or desired result (e.g. build a business, become a millionaire, lose 20 lbs).
- "currentBaseline" = where they are starting from right now (zero savings, beginner, starting from scratch).
- "primaryBlockers" = key obstacles holding them back (laziness, procrastination, lack of focus, poor time management, lack of capital).
- "setbacks" = patterns that stop them (past failures, addictions).
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
  "currentBaseline": "",
  "primaryBlockers": [],
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
            content: `You build SEQUENTIAL & PROGRESSIVE LIFETIME ROADMAPS from Goal Scout diagnostic interviews.

CORE ARCHITECTURAL RULES (MANDATORY):
- The app's tracking categories (Physical, Spiritual, Mental, Self-Care, Happiness) are strictly PASSIVE RECORD-KEEPING AND MONITORING TAGS.
- You MUST NEVER restrict, filter, limit, or force the user's goals into these monitoring categories.
- You MUST NEVER ignore user ambitions (such as financial goals, career goals, or business ambitions) simply because they do not match a pre-defined category.
- The user's input goals are the ONLY foundation for the roadmap you generate. The monitoring criteria exist purely as secondary background metrics to display progress over time.

RULE ON ADDRESSING BLOCKERS & BOTTLENECKS FIRST (MANDATORY PREREQUISITE SEQUENCING):
1. Psychological & Behavioral Blockers (e.g. laziness, lack of focus, low discipline, procrastination, phone addiction):
   - Phase 1 MUST focus on Blocker Neutralization using low-friction micro-habits (e.g. 15–30 minutes per day) to build momentum and break inertia before scaling.
   - Once consistency is established, systematically scale up workload intensity in subsequent phases.
2. Material, Financial & Resource Bottlenecks (e.g. wants to bulk but lacks money for surplus calorie food; wants to code but lacks a laptop; wants to build a business but lacks capital):
   - If a setback or constraint physically, financially, or environmentally denies a goal the opportunity to be accomplished, REMOVING THAT BOTTLENECK IS AUTOMATICALLY PHASE 1 / PREREQUISITE GOAL #1.
   - You MUST sequence the prerequisite goal FIRST before the dependent goal can realistically proceed.
   - For example: If the user wants to bulk and gain weight but has no money for calorie surplus food, Phase 1 MUST be to establish the budget/income stream (or hyper-budget calorie staples like peanut butter, oats, whole milk, eggs, rice) so the nutritional fuel is secured.
   - The primary goal's transition condition must explicitly require the prerequisite bottleneck to be resolved before Phase 2 hypertrophy training begins.
   - In goalStackUps and goalCorrelations, link the resource-unlock goal as a supporting/prerequisite feeder for the primary goal.

3. DECONSTRUCTING BROAD OR ABSTRACT GOALS (e.g. "Become Wise", "Achieve Inner Peace", "Build Charisma"):
   - Broad or philosophical ambitions MUST NEVER be left as vague ideas.
   - You MUST operationalize and deconstruct them into concrete, daily, observable practices.
   - For example, if the goal is "Become Wise":
     * Deconstruct into: (a) Daily 20-min reading of primary philosophical/epistemological literature (Stoicism, Eastern philosophy, Popper, Kahneman); (b) Daily Socratic evening decision-journaling (analyzing 1 decision, identifying cognitive biases or blind spots); (c) Deliberate active listening exercise in daily conversations; (d) Mental models application drill.
   - Ground every abstract ambition in actionable daily behavior that can be tracked, measured, and progressed.

4. HANDLING MULTIPLE GOALS INDEPENDENTLY & SYNERGISTICALLY:
   - If the user specifies multiple ambitions (e.g. "Become wise", "Run a half marathon", "Learn Python", "Build a side income"):
     * Capture ALL goals without dropping or ignoring any. Include each in lifetimeMegaGoals and plannedGoals.
     * Build INDEPENDENT, distinct, highly customized daily tasks and progression pathways for each. NEVER output repetitive, copy-paste, or generic task templates.
     * Discover and map SYNERGISTIC LINKAGES in goalStackUps and goalCorrelations (e.g. how morning physical discipline fuels cognitive stamina for deep programming; how wisdom reflection prevents burnout in business).
     * Provide seamless clarity so the user simply checks off their daily missions without planning fatigue.

5. MULTI-YEAR HORIZONS FOR MASSIVE GOALS (e.g. "Become a Billionaire", "Build an 8-Figure Business", "Decade-Scale Mastery"):
   - When the user sets massive life goals that require years to achieve, the timeline MUST REFLECT REALISTIC MULTI-YEAR HORIZONS (e.g. 5–10+ years, 3–7 years). NEVER compress a decade-long endeavor into an unrealistic 30-day or 6-month illusion.
   - In lifetimeMegaGoals, set timelineEstimate to the true multi-year span (e.g. "5–10 years", "7–12 years").
   - Structure macroPhases across these multi-year epochs (e.g. Years 1–2: Specialized Skill Mastery & First $100k Cashflow; Years 3–5: Leverage, Capital Compounding & Equity; Years 6–10: Scale, Institutional Distribution & Wealth Fortress).
   - Connect this multi-year grand vision directly down to Year 1 checkpoints, Month 1 focus, and Today's single actionable task so the user sees the direct bridge from today to their multi-year destiny.

6. CREATIVE, INNOVATIVE & RESEARCH-DRIVEN STRATEGIES:
   - When mapping roadmaps, BE TACTICALLY CREATIVE AND INNOVATIVE. Never rely on stale, generic clichés (e.g. do not just say "work hard", "save money", or "eat healthy").
   - Synthesize cutting-edge modern playbooks, asymmetric opportunities, leverage mechanisms (code, content, capital, distribution), evidence-based protocols (Huberman/Attia health science, Y-Combinator startup mechanics, navalist leverage), and live research findings.
   - Provide non-obvious strategic insights that give the user an unfair advantage.

STRUCTURE OF THE OUTPUT PLAN (MANDATORY):
1. Executive Strategy Summary:
   - Clear statement of the goal, total estimated timeline, and the overarching strategic approach.
2. Macro-View (Multi-Year / Phase Breakdown):
   - Outline key phases across years or major stages (e.g. Phase 1: Mindset & Baseline Skill; Phase 2: Income Growth & Systems; Phase 3: Scaling & Wealth Accumulation).
   - Set concrete milestone conditions required to transition from one phase to the next.
3. Medium-View (Checkpoint Schedule):
   - Clear checkpoints for Months 1–3, Months 4–6, Months 7–12, etc.
   - Specify what exact output or metric must be achieved by the end of each checkpoint so the user clearly understands how tomorrow differs from today.
4. Micro-View (Daily & Weekly Action Progression):
   - Provide concrete, evolving daily tasks that build on one another over time.
   - Ensure daily actions evolve: Day 1–14 tasks establish foundation/habits; Day 15–30 tasks build specific capabilities; Month 2+ tasks execute real-world projects.
   - Explain explicitly how doing Task A today enables Task B tomorrow, ensuring the daily routine never feels like a static, repetitive loop.

5. Roadblocks & Solutions:
   - Extract every setback and blocker mentioned (e.g. laziness, procrastination, phone addiction, fear of failure). Provide a specific blocker neutralization tactic for each.

Return JSON only.`,
          },
          {
            role: 'user',
            content: `Diagnostic Chat Transcript:
${JSON.stringify(transcript)}

STRUCTURED IDENTITY (source of truth — use user's exact ambition):
${JSON.stringify(identity || {})}

Diagnostic coverage analysis:
${JSON.stringify(coverage)}

${researchContext ? `Research findings (use for realistic timelines and setbacks):\n${researchContext}\n` : ''}
Return JSON strictly following this schema:
{
  "userName": "preferred name",
  "masterVision": "2 clear sentences — their overarching lifetime vision",
  "executiveSummary": "Statement of the primary goal, total estimated timeline, and the overarching strategic approach.",
  "userProfileSummary": "who they are: baseline, work/life context, commitments",
  "extractedSetbacks": ["laziness on X", "distraction by phone", "..."],
  "overallWillpowerIndex": 82,
  "categoryBaselines": { "health": 50, "spiritual": 50, "smarts": 50, "selfCare": 50, "happiness": 50 },
  "macroPhases": [
    {
      "phaseNumber": 1,
      "title": "Phase 1: Blocker Neutralization & Foundation",
      "timeline": "Month 1 (Days 1–30)",
      "transitionCondition": "Zero multi-day lapses for 21 days; friction eliminated; micro-habit automated.",
      "description": "Deploy 15–30 min low-friction daily micro-habits to kill inertia and build consistency."
    },
    {
      "phaseNumber": 2,
      "title": "Phase 2: Core Capability & System Building",
      "timeline": "Months 2–6",
      "transitionCondition": "Intermediate project artifact delivered and 80%+ consistency over 60 days.",
      "description": "Ramp focus duration to 45–60 min deep practice and build production deliverables."
    },
    {
      "phaseNumber": 3,
      "title": "Phase 3: Scaling, Leverage & Compounding",
      "timeline": "Months 6+",
      "transitionCondition": "Full mastery benchmarks satisfied with sustainable real-world execution.",
      "description": "Full-scale execution, monetization/leverage, and continuous compounding."
    }
  ],
  "checkpoints": [
    {
      "period": "Months 1–3",
      "targetOutputMetric": "Exact deliverable / output metric required by Month 3",
      "description": "What is achieved during this first quarter"
    },
    {
      "period": "Months 4–6",
      "targetOutputMetric": "Exact deliverable / output metric required by Month 6",
      "description": "What is achieved during this second quarter"
    },
    {
      "period": "Months 7–12",
      "targetOutputMetric": "Exact deliverable / output metric required by Month 12",
      "description": "What is achieved by end of Year 1"
    }
  ],
  "microProgression": [
    {
      "dayRange": "Days 1–14",
      "focus": "Blocker Neutralization / Foundation",
      "dailyActions": ["Specific 15-min daily action", "Immediate environmental cue setup"],
      "progressionMechanism": "Doing Task A today eliminates inertia and builds the neurological habit necessary for Task B."
    },
    {
      "dayRange": "Days 15–30",
      "focus": "Capability Building",
      "dailyActions": ["Specific 30-45 min skill building action", "Daily mini-deliverable"],
      "progressionMechanism": "Freed cognitive capacity from foundation allows handling deeper workload without burnout."
    },
    {
      "dayRange": "Month 2+",
      "focus": "Real-World Project Execution",
      "dailyActions": ["Deep work block on core milestone", "Weekly shipping metric"],
      "progressionMechanism": "Real-world project execution compounds previous capability into tangible outcomes."
    }
  ],
  "plannedGoals": [{
    "name": "concrete daily habit name",
    "description": "specific daily execution",
    "goalScope": "lifetime",
    "category": "health|smarts|spiritual|selfCare|happiness",
    "reminderTime": "08:00",
    "basePoints": 5,
    "targetFrequency": "daily",
    "autoAdded": false,
    "autoAddedReason": "",
    "linkedGoalName": "optional — name of goal this stacks onto",
    "chanceOfAchievement": 80,
    "willpowerStrain": "Low|Medium|High",
    "timelineSummary": "lifetime arc summary",
    "timelineMap": ["Phase 1: Blocker Neutralization (Days 1-30)", "Phase 2: ...", "Phase 3: ..."],
    "timelinePhase1": "Days 1-30: Foundation / Blocker Neutralization",
    "timelinePhase2": "Days 30-90: Capability Depth",
    "timelinePhase3": "Days 90+: Mastery & Scaling",
    "transitionCondition": "Transition condition to Phase 2",
    "estimatedDaysToMastery": 180,
    "timelineRange": { "minDays": 90, "maxDays": 365 }
  }],
  "goalCorrelations": [{ "goals": ["Goal 1", "Goal 2"], "insight": "how achieving one aids the other" }],
  "goalStackUps": [{ "primaryGoal": "Primary Goal", "supportingGoals": ["Supporting Habit"], "rationale": "why stacking works" }],
  "roadblocks": [{ "roadblock": "exact setback name", "solution": "specific blocker neutralization tactic", "affectedGoals": ["Goal 1"] }],
  "lifetimeMegaGoals": [{ "title": "User's Major Ambition (e.g. Become a Millionaire)", "description": "what achieving this looks like", "timelineEstimate": "3-5 years", "category": "smarts|health|happiness|spiritual|selfCare" }]
}`,
          },
        ],
      });
      const parsed = extractJson(raw);
      if (parsed.masterVision || parsed.plannedGoals || parsed.executiveSummary) {
        const behaviorProfile = params.userContext?.behaviorProfile;
        const normalizedGoals = Array.isArray(parsed.plannedGoals)
          ? parsed.plannedGoals.map((goal: any) =>
              normalizeTimelineOutput(goal, behaviorProfile, researchContext)
            )
          : [];

        const primaryGoal = parsed.lifetimeMegaGoals?.[0]?.title || parsed.plannedGoals?.[0]?.name || identity?.lifeGoals?.[0] || 'Core Ambition';
        const hasBlocker = Boolean(parsed.extractedSetbacks?.length || identity?.primaryBlockers?.length || identity?.setbacks?.length);
        const macroPhases = Array.isArray(parsed.macroPhases) && parsed.macroPhases.length
          ? parsed.macroPhases
          : buildMacroPhases(primaryGoal, 180, hasBlocker);
        const checkpoints = Array.isArray(parsed.checkpoints) && parsed.checkpoints.length
          ? parsed.checkpoints
          : buildCheckpoints(primaryGoal, 180);
        const microProgression = Array.isArray(parsed.microProgression) && parsed.microProgression.length
          ? parsed.microProgression
          : buildMicroProgression(primaryGoal, hasBlocker);

        const blueprint = normalizeBlueprint(
          {
            ...parsed,
            macroPhases,
            checkpoints,
            microProgression,
            plannedGoals: normalizedGoals,
            lifetimeMegaGoals: Array.isArray(parsed.lifetimeMegaGoals) ? parsed.lifetimeMegaGoals : [],
          },
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
      discovery: `You are NEXUS in Goal Scout diagnostic mode. Collect only the user's exact goal/scope, current baseline, primary blocker, and realistic time/resource commitment. Ask one missing field per turn. Tracking categories are passive metrics only; never force the ambition into a category. When all four fields are clear, end with <<READY_FOR_FEASIBILITY>>.`,
      disambiguation: `You are NEXUS clarifying a vague goal. Ask ONE targeted follow-up on what success looks like specifically. When concrete, end with <<READY_FOR_FEASIBILITY>>.`,
      feasibility: `You are NEXUS running feasibility on stated goals. Be honest and direct. If a timeline is unrealistic, say so clearly with a reason and a realistic alternative.`,
      willpower_check: `You are NEXUS testing real commitment without sounding like a form. Ask one probing question at a time, starting with the most important missing piece: sacrifice, past attempts, or what is different this time.`,
      confirmed: `Goals confirmed. Wrap up warmly and let them know the plan is being built in the background.`,
    };

    const system = `${phaseInstructions[params.intakePhase] || phaseInstructions.discovery}

Casual texting tone — supportive friend on their phone with smiley face emojis 😊 😄 💪 🔥 ✨ — use emojis freely in most messages like a real texter. No big question lists; one clean question per turn unless the user asks for a list.
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
        { role: 'system', content: `Generate ultra-actionable, domain-specific habit execution plans with sequential 7-day action items, weekly progression, and monthly milestones.
CRITICAL INSTRUCTION:
DO NOT generate generic placeholders like "spend 15 minutes on becoming a billionaire daily" or "read 20 minutes".
You MUST generate unique, concrete, realistic daily tasks for Day 1 through Day 7 tailored specifically to the goal (e.g. for wealth: Day 1: Audit income & expenses; Day 2: Read 'Rich Dad Poor Dad' chapters 1-3; Day 3: Map 3 cashflow streams; Day 4: Open broker account and invest $25; Day 5: Draft 1-page service offer; Day 6: Outreach to 5 clients; Day 7: Weekly financial review).
Each daily item MUST explain why completing today's task unlocks tomorrow's execution. Return JSON only.` },
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
    const identity = params.userContext?.userIdentity;
    const userGoal = identity?.lifeGoals?.[0] || 'Core Ambition & Mastery';
    const hasBlocker = Boolean(identity?.primaryBlockers?.length || identity?.setbacks?.length);
    const macroPhases = buildMacroPhases(userGoal, 180, hasBlocker);
    const checkpoints = buildCheckpoints(userGoal, 180);
    const microProgression = buildMicroProgression(userGoal, hasBlocker);

    const plannedGoals = [
      {
        name: `Daily ${userGoal} Focus`,
        description: hasBlocker
          ? `Phase 1 Blocker Neutralization: 15–20 minutes daily micro-habit to neutralize friction, break inertia, and establish consistency.`
          : `Dedicated daily focused execution block on ${userGoal}.`,
        category: mapToPassiveCategory(undefined, userGoal),
        reminderTime: '08:30',
        basePoints: 5,
        targetFrequency: 'daily',
        chanceOfAchievement: 85,
        willpowerStrain: 'Low',
        timelinePhase1: hasBlocker ? 'Days 1–30: Blocker Neutralization (15m micro-habit)' : 'Days 1–30: Core habit lock-in',
        timelinePhase2: 'Days 30–90: System scaling and workload ramp',
        timelinePhase3: 'Days 90–180: Advanced output and real-world mastery',
      },
      {
        name: 'Daily Physical & Mental Energy Anchor',
        description: '20–30 minutes active physical movement or walk to protect dopamine levels and mental focus.',
        category: 'health',
        reminderTime: '17:30',
        basePoints: 5,
        targetFrequency: 'daily',
        chanceOfAchievement: 80,
        willpowerStrain: 'Low',
        timelinePhase1: 'Days 1–30: 15 min daily brisk movement',
        timelinePhase2: 'Days 30–90: 30 min structured exercise',
        timelinePhase3: 'Days 90–180: Peak physical conditioning',
      },
    ].map((goal) => normalizeTimelineOutput(goal, behaviorProfile));

    const blueprint = normalizeBlueprint(
      {
        userName: params.userContext?.userName || 'Friend',
        masterVision: `Achieve ${userGoal} through sequential daily execution and progressive mastery.`,
        executiveSummary: `Targeted roadmap for ${userGoal}: Phase 1 eliminates friction and neutralizes blockers with low-friction micro-habits, Phase 2 scales focus depth and capability, Phase 3 executes full-scale compounding output.`,
        overallWillpowerIndex: 80,
        categoryBaselines: { health: 50, spiritual: 50, smarts: 50, selfCare: 50, happiness: 50 },
        plannedGoals,
        macroPhases,
        checkpoints,
        microProgression,
        lifetimeMegaGoals: [
          {
            title: userGoal,
            description: 'Major lifetime ambition identified from Goal Scout',
            timelineEstimate: 'Multi-Year Master Target',
            category: mapToPassiveCategory(undefined, userGoal),
          },
        ],
        goalCorrelations: [
          { goals: ['Daily Physical & Mental Energy Anchor', `Daily ${userGoal} Focus`], insight: 'Physical movement protects dopamine baseline and directly enhances cognitive focus.' },
        ],
        goalStackUps: [
          { primaryGoal: `Daily ${userGoal} Focus`, supportingGoals: ['Daily Physical & Mental Energy Anchor'], rationale: 'Movement prevents cognitive fatigue and restores execution stamina.' },
        ],
        roadblocks: [
          {
            roadblock: identity?.primaryBlockers?.[0] || 'Activation inertia & inconsistency',
            solution: 'Phase 1 Blocker Neutralization: 2-minute rule micro-activation. Execute the smallest viable step daily without relying on motivation.',
            affectedGoals: [`Daily ${userGoal} Focus`],
          },
        ],
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

  async synthesizePlan(params: any) {
    const rawGoals = params.collectedGoals || params.intakeData?.goals || (params.intakeData ? [params.intakeData] : []);
    const collectedGoals = Array.isArray(rawGoals) ? rawGoals : [rawGoals];
    const goals = collectedGoals.map((g: any, idx: number) => {
      const title = g.title || g.name || 'Core Focus Habit';
      return normalizeTimelineOutput({
        id: g.id || `goal-plan-${idx + 1}`,
        title,
        targetDescription: g.targetDescription || g.description || `Focused progression plan for ${title}`,
        category: g.category || mapToPassiveCategory(undefined, title),
        chanceOfAchievement: 85,
        timelineRange: g.timelineRange || { minDays: 60, maxDays: 180 },
        timelineSummary: 'Phase 1 foundational habit leading into phase 2 capability lift and phase 3 compounding results.',
        timelineMap: [
          'Phase 1 (Days 1–30): Foundation & Blocker Neutralization',
          'Phase 2 (Months 2–6): Capability Depth & Output Building',
          'Phase 3 (Months 6+): Compounding Mastery & Sustainable Results',
        ],
        dailyPlanItems: buildSmartDailyPlan(title, false),
        weeklyFocus: buildSmartWeeklyFocus(title),
        monthlyMilestone: buildSmartMonthlyMilestones(title),
      }, params.behaviorProfile);
    });
    return { goals, dependencies: [] };
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
