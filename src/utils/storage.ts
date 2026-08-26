import { DEFAULT_FOLDERS, DEFAULT_USER_CONFIG, INITIAL_LIFE_EXPECTANCY_FACTORS } from '../constants';
import { AIDigest, CATEGORY_NAMES, DailyGoalLog, DailyJournal, Goal, LifeExpectancyFactor, UserConfig } from '../types';
import { isSensitiveKey, migrateToSecureStorage, secureGetItemDecrypted, secureSetItem } from './secureStorage';

const STORAGE_KEYS = {
  USER_CONFIG: 'pgt_user_config_v2',
  GOALS: 'pgt_goals_v2',
  DAILY_LOGS: 'pgt_daily_logs_v2',
  JOURNALS: 'pgt_journals_v2',
  FACTORS: 'pgt_factors_v2',
  DIGESTS: 'pgt_digests_v2',
  DAILY_INTENTIONS: 'pgt_daily_intentions_v1',
  CUSTOM_FOLDERS: 'pgt_custom_folders_v1',
};

/** In-memory cache for encrypted keys — populated on init */
const cache: Record<string, string | null> = {};
let storageReady = false;

export async function initSecureStorage(): Promise<void> {
  if (storageReady) return;
  await migrateToSecureStorage();
  for (const key of Object.values(STORAGE_KEYS)) {
    if (isSensitiveKey(key)) {
      cache[key] = await secureGetItemDecrypted(key);
    }
  }
  storageReady = true;
}

function cachedGet(key: string): string | null {
  if (isSensitiveKey(key) && key in cache) return cache[key];
  return localStorage.getItem(key);
}

function cachedSet(key: string, value: string): void {
  if (isSensitiveKey(key)) cache[key] = value;
  void secureSetItem(key, value);
}

export function loadUserConfig(): UserConfig {
  try {
    const data = cachedGet(STORAGE_KEYS.USER_CONFIG);
    if (!data) return DEFAULT_USER_CONFIG;
    return { ...DEFAULT_USER_CONFIG, ...JSON.parse(data) };
  } catch (err) {
    console.error('Failed to load user config', err);
    return DEFAULT_USER_CONFIG;
  }
}

export function saveUserConfig(config: UserConfig): void {
  try {
    cachedSet(STORAGE_KEYS.USER_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save user config', err);
  }
}

export function loadGoals(): Goal[] {
  try {
    const data = cachedGet(STORAGE_KEYS.GOALS);
    if (!data) return [];
    const parsed: Goal[] = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load goals', err);
    return [];
  }
}

export function saveGoals(goals: Goal[]): void {
  try {
    cachedSet(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  } catch (err) {
    console.error('Failed to save goals', err);
  }
}

export function loadDailyLogs(): DailyGoalLog[] {
  try {
    const data = cachedGet(STORAGE_KEYS.DAILY_LOGS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load daily logs', err);
    return [];
  }
}

export function saveDailyLogs(logs: DailyGoalLog[]): void {
  try {
    const sanitizedLogs = logs.map((log) => ({
      ...log,
      proofMediaUrl: undefined,
    }));
    cachedSet(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(sanitizedLogs));
  } catch (err) {
    console.error('Failed to save daily logs', err);
  }
}

export function loadJournals(): DailyJournal[] {
  try {
    const data = cachedGet(STORAGE_KEYS.JOURNALS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load journals', err);
    return [];
  }
}

export function saveJournal(journal: DailyJournal): void {
  try {
    const journals = loadJournals();
    const index = journals.findIndex((j) => j.date === journal.date);
    const sanitizedJournal = { ...journal, proofMediaUrl: undefined };
    if (index >= 0) {
      journals[index] = sanitizedJournal;
    } else {
      journals.push(sanitizedJournal);
    }
    cachedSet(STORAGE_KEYS.JOURNALS, JSON.stringify(journals));
  } catch (err) {
    console.error('Failed to save journal', err);
  }
}

export function loadFactors(): LifeExpectancyFactor[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FACTORS);
    if (!data) return INITIAL_LIFE_EXPECTANCY_FACTORS;
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load factors', err);
    return INITIAL_LIFE_EXPECTANCY_FACTORS;
  }
}

export function saveFactors(factors: LifeExpectancyFactor[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FACTORS, JSON.stringify(factors));
  } catch (err) {
    console.error('Failed to save factors', err);
  }
}

export function loadDigests(): AIDigest[] {
  try {
    const data = cachedGet(STORAGE_KEYS.DIGESTS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load digests', err);
    return [];
  }
}

export function saveDigest(digest: AIDigest): void {
  try {
    const digests = loadDigests();
    const filtered = digests.filter((d) => d.date !== digest.date);
    filtered.unshift(digest);
    cachedSet(STORAGE_KEYS.DIGESTS, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save digest', err);
  }
}

export function loadCustomFolders(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_FOLDERS);
    if (!raw) return DEFAULT_FOLDERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FOLDERS;
  } catch (err) {
    console.error('Failed to load custom folders', err);
    return DEFAULT_FOLDERS;
  }
}

export function saveCustomFolders(folders: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_FOLDERS, JSON.stringify(folders));
  } catch (err) {
    console.error('Failed to save custom folders', err);
  }
}

export function loadDailyIntention(dateStr: string): string {
  try {
    const raw = cachedGet(STORAGE_KEYS.DAILY_INTENTIONS);
    if (!raw) return '';
    const parsed: Record<string, string> = JSON.parse(raw);
    return parsed[dateStr] || '';
  } catch (err) {
    console.error('Failed to load daily intention', err);
    return '';
  }
}

export function saveDailyIntention(dateStr: string, intentionText: string): void {
  try {
    const raw = cachedGet(STORAGE_KEYS.DAILY_INTENTIONS);
    const parsed: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (intentionText.trim()) {
      parsed[dateStr] = intentionText.trim();
    } else {
      delete parsed[dateStr];
    }
    cachedSet(STORAGE_KEYS.DAILY_INTENTIONS, JSON.stringify(parsed));
  } catch (err) {
    console.error('Failed to save daily intention', err);
  }
}

/** Wipe all local data — for fresh start with real goals */
export function clearAllLocalData(): void {
  Object.values(STORAGE_KEYS).forEach((k) => {
    localStorage.removeItem(k);
    delete cache[k];
  });
}

export function exportBackupJSON(): void {
  const data = {
    version: 2,
    exportDate: new Date().toISOString(),
    config: loadUserConfig(),
    goals: loadGoals(),
    dailyLogs: loadDailyLogs(),
    journals: loadJournals(),
    factors: loadFactors(),
    digests: loadDigests(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `personal_growth_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAnonymizedBackupJSON(): void {
  const rawConfig = loadUserConfig();
  const rawGoals = loadGoals();
  const rawLogs = loadDailyLogs();
  const rawJournals = loadJournals();
  const rawFactors = loadFactors();
  const rawDigests = loadDigests();

  const goalNameMap: Record<string, string> = {};
  const anonymizedGoals = rawGoals.map((g, idx) => {
    const anonName = `Goal #${idx + 1} (${CATEGORY_NAMES[g.category] || 'Habit'})`;
    goalNameMap[g.id] = anonName;
    return {
      ...g,
      name: anonName,
      description: '[Anonymized Goal Description for Coach/Mentor Review]',
    };
  });

  const anonymizedJournals = rawJournals.map((j) => ({
    ...j,
    entry: '[Anonymized Journal Entry Text]',
    aiReflection: j.aiReflection ? '[Anonymized AI Reflection]' : undefined,
  }));

  const anonymizedConfig = {
    ...rawConfig,
    lifePathGoal: '[Anonymized Life Path Goal]',
  };

  const anonymizedLogs = rawLogs.map((l) => ({
    ...l,
    proofMediaUrl: l.proofMediaUrl ? '[Anonymized Proof Media]' : undefined,
    proofVerificationResult: l.proofVerificationResult ? '[Anonymized Verification Result]' : undefined,
  }));

  const anonymizedDigests = rawDigests.map((d) => ({
    ...d,
    summary: '[Anonymized Daily Digest Summary]',
    correlations: d.correlations.map(() => '[Anonymized Correlation Insight]'),
    actionableTips: d.actionableTips.map(() => '[Anonymized Actionable Tip]'),
  }));

  const data = {
    version: 2,
    isAnonymized: true,
    exportDate: new Date().toISOString(),
    config: anonymizedConfig,
    goals: anonymizedGoals,
    dailyLogs: anonymizedLogs,
    journals: anonymizedJournals,
    factors: rawFactors,
    digests: anonymizedDigests,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anonymized_growth_data_for_coach_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') return false;

    if (data.config) saveUserConfig(data.config);
    if (data.goals) saveGoals(data.goals);
    if (data.dailyLogs) saveDailyLogs(data.dailyLogs);
    if (data.journals) saveJournalsBulk(data.journals);
    if (data.factors) saveFactors(data.factors);
    if (data.digests) cachedSet(STORAGE_KEYS.DIGESTS, JSON.stringify(data.digests));

    return true;
  } catch (err) {
    console.error('Import failed', err);
    return false;
  }
}

function saveJournalsBulk(journals: DailyJournal[]): void {
  cachedSet(STORAGE_KEYS.JOURNALS, JSON.stringify(journals));
}

// ─────────────────────────────────────────────────────────────
// Planning Engine Storage (additive — does not change existing keys)
// ─────────────────────────────────────────────────────────────

const PLAN_STORAGE_KEYS = {
  PLANNED_TASKS: 'pgt_planned_tasks_v1',
  MILESTONES: 'pgt_milestones_v1',
  GOAL_DEPS: 'pgt_goal_deps_v1',
  RESEARCH_CACHE: 'pgt_research_cache_v1',
};

export function loadPlannedTasks(): import('../types').PlannedTask[] {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEYS.PLANNED_TASKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function savePlannedTasks(tasks: import('../types').PlannedTask[]): void {
  try { localStorage.setItem(PLAN_STORAGE_KEYS.PLANNED_TASKS, JSON.stringify(tasks)); }
  catch (err) { console.error('savePlannedTasks', err); }
}

export function loadMilestones(): import('../types').Milestone[] {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEYS.MILESTONES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function saveMilestones(milestones: import('../types').Milestone[]): void {
  try { localStorage.setItem(PLAN_STORAGE_KEYS.MILESTONES, JSON.stringify(milestones)); }
  catch (err) { console.error('saveMilestones', err); }
}

export function loadGoalDependencies(): import('../types').GoalDependency[] {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEYS.GOAL_DEPS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function saveGoalDependencies(deps: import('../types').GoalDependency[]): void {
  try { localStorage.setItem(PLAN_STORAGE_KEYS.GOAL_DEPS, JSON.stringify(deps)); }
  catch (err) { console.error('saveGoalDependencies', err); }
}

export function loadResearchCache(): import('../types').ResearchCacheEntry[] {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEYS.RESEARCH_CACHE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function saveResearchCache(cache: import('../types').ResearchCacheEntry[]): void {
  try { localStorage.setItem(PLAN_STORAGE_KEYS.RESEARCH_CACHE, JSON.stringify(cache)); }
  catch (err) { console.error('saveResearchCache', err); }
}
