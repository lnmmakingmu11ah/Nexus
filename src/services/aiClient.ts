/**
 * Client-side AI Service Client
 * Provides unified method calls to backend AI endpoints.
 * On native (Capacitor), defaults to localhost so `adb reverse tcp:3000 tcp:3000` works.
 */

import { Capacitor } from '@capacitor/core';
import { loadUserConfig } from '../utils/storage';

function getApiBase(): string {
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  const storedUrl = loadUserConfig().aiServerUrl;
  if (storedUrl && storedUrl.trim()) {
    return storedUrl.replace(/\/$/, '');
  }
  if (Capacitor.isNativePlatform()) {
    // Fallback for local Android/iOS dev when the computer server is bridged to the device.
    return 'http://127.0.0.1:3000';
  }
  return '';
}

export class AiClientError extends Error {
  code: string;
  status?: number;
  detail: string;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'AiClientError';
    this.code = code;
    this.status = status;
    this.detail = message;
  }
}

async function apiFetch(path: string, init?: RequestInit) {
  const url = `${getApiBase()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (err: any) {
    const hint = Capacitor.isNativePlatform()
      ? 'Cannot reach AI server on phone. Set an AI Server URL in Settings, or on PC run: npm run dev then adb reverse tcp:3000 tcp:3000 and reopen the app.'
      : 'Cannot reach AI server. Run: npm run dev';
    throw new AiClientError(
      err?.message?.includes('Failed to fetch') || err?.name === 'TypeError'
        ? hint
        : err?.message || 'Network error talking to AI server',
      'NETWORK_OFFLINE'
    );
  }

  const raw = await res.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { error: raw };
  }

  if (!res.ok) {
    const detail =
      (typeof data?.error === 'string' && data.error) ||
      data?.error?.message ||
      data?.message ||
      raw ||
      `HTTP ${res.status}`;
    throw new AiClientError(String(detail), 'API_ERROR', res.status);
  }

  return data;
}

export interface OnboardingAIRequest {
  lifePathGoal: string;
  currentHabits: string;
  age?: number;
  sex?: string;
}

export interface JournalAIReflectRequest {
  journalEntry: string;
  lifePathGoal: string;
  completedGoals: string[];
  scoreSummary: { composite: number };
}

export interface ProofVerifyRequest {
  imageBase64?: string;
  mimeType?: string;
  goalName: string;
  goalDescription?: string;
  journalEntry?: string;
  challengeAnswers?: string[];
  verificationMode?: 'proof' | 'journal_challenge' | 'journal_reflection';
}

export interface InsightsDigestRequest {
  logsHistory: any[];
  scoresHistory: any;
  lifePathGoal: string;
}

export interface AIChatRequest {
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

export interface AISynthesizeBlueprintRequest {
  transcript: { sender: 'user' | 'ai'; text: string }[];
  userContext?: any;
}

export const aiClient = {
  async onboardingReflect(data: OnboardingAIRequest) {
    return apiFetch('/api/ai/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async journalReflect(data: JournalAIReflectRequest) {
    return apiFetch('/api/ai/reflect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async verifyProof(data: ProofVerifyRequest): Promise<{
    verified: boolean;
    message: string;
    confidence?: number;
    evidenceSummary?: string;
    followUpQuestions?: string[];
  }> {
    return apiFetch('/api/ai/verify-proof', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async generateInsights(data: InsightsDigestRequest) {
    return apiFetch('/api/ai/insights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async chatCompanion(data: AIChatRequest): Promise<{ reply: string; readyForPlan?: boolean; planApproved?: boolean }> {
    const result = await apiFetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!result?.reply || typeof result.reply !== 'string') {
      throw new AiClientError('AI returned an empty reply', 'EMPTY_REPLY');
    }
    return result;
  },

  async extractMemory(data: {
    messages: { sender: 'user' | 'ai'; text: string }[];
    existingMemory?: AIChatRequest['userContext']['aiMemory'];
    appContext?: AIChatRequest['userContext']['appContext'];
  }): Promise<{ memory: AIChatRequest['userContext']['aiMemory'] }> {
    return apiFetch('/api/ai/extract-memory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async synthesizeBlueprint(data: AISynthesizeBlueprintRequest): Promise<{ blueprint: any }> {
    return apiFetch('/api/ai/synthesize-blueprint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ─── Planning Engine Client Methods ─────────────────────────────────────

  async intakeTurn(data: {
    messages: { sender: 'user' | 'ai'; text: string }[];
    intakePhase: string;
    collectedGoals: any[];
    constraints: any;
    userName?: string;
  }): Promise<{ reply: string; readyForFeasibility?: boolean }> {
    return apiFetch('/api/plan/intake-turn', { method: 'POST', body: JSON.stringify(data) });
  },

  async runFeasibilityCheck(data: {
    goalTitle: string;
    goalDescription: string;
    rawTimeline: string;
    constraints: { weeklyHoursAvailable?: number; pastAttempts?: string[] };
  }): Promise<{ pass: boolean; reason: string; proposedRevision?: { timelineRange: { minDays: number; maxDays: number }; scopeNote: string } }> {
    return apiFetch('/api/plan/feasibility', { method: 'POST', body: JSON.stringify(data) });
  },

  async runWillpowerAssessment(data: {
    goalTitle: string;
    rawTimeline: string;
    messages: { sender: 'user' | 'ai'; text: string }[];
  }): Promise<{ score: number; canOverride: boolean; message: string }> {
    return apiFetch('/api/plan/willpower', { method: 'POST', body: JSON.stringify(data) });
  },

  async synthesizePlan(data: {
    collectedGoals: any[];
    constraints: any;
    researchContext?: string;
    behaviorProfile?: any;
    userName?: string;
  }): Promise<{ goals: any[]; dependencies: any[] }> {
    return apiFetch('/api/plan/synthesize', { method: 'POST', body: JSON.stringify(data) });
  },

  async chainGoals(data: {
    goals: { id: string; name: string; description: string; category: string }[];
    overlaps: any[];
  }): Promise<{ dependencies: any[] }> {
    return apiFetch('/api/plan/chain-goals', { method: 'POST', body: JSON.stringify(data) });
  },

  async frameTasks(data: {
    tasks: { title: string; description?: string; hardness: number; goalName: string }[];
    behaviorProfile?: any;
    userName?: string;
  }): Promise<{ framedTasks: { title: string; framedTitle: string; motivationalNote: string }[] }> {
    return apiFetch('/api/plan/frame-tasks', { method: 'POST', body: JSON.stringify(data) });
  },

  async lapseRecovery(data: {
    missedCount: number;
    goalName: string;
    behaviorProfile?: any;
  }): Promise<{ message: string; adjustedPlan?: string }> {
    return apiFetch('/api/plan/lapse-recovery', { method: 'POST', body: JSON.stringify(data) });
  },

  async fetchResearch(data: {
    category: string;
    goalType: string;
  }): Promise<{ findings: string; source: string }> {
    return apiFetch('/api/research/fetch', { method: 'POST', body: JSON.stringify(data) });
  },

  async health(): Promise<{ status: string; hasApiKey: boolean; aiProvider: string; provider?: string }> {
    return apiFetch('/api/health');
  },
};
