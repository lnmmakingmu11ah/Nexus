/**
 * researchCache.ts — 7-day TTL research cache keyed by category:goalType.
 * Prevents redundant search API calls for similar goals.
 */

import { ResearchCacheEntry, CategoryKey } from '../types';
import { loadResearchCache, saveResearchCache } from './storage';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function buildKey(category: CategoryKey, goalType: string): string {
  return `${category}:${goalType.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`;
}

export function getCachedResearch(category: CategoryKey, goalType: string): string | null {
  try {
    const key = buildKey(category, goalType);
    const entry = loadResearchCache().find(e => e.key === key);
    if (!entry || new Date(entry.expiresAt).getTime() < Date.now()) return null;
    return entry.findings;
  } catch { return null; }
}

export function setCachedResearch(category: CategoryKey, goalType: string, findings: string): void {
  try {
    const key = buildKey(category, goalType);
    const now = new Date();
    const entry: ResearchCacheEntry = {
      key, findings,
      fetchedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
    };
    const filtered = loadResearchCache().filter(e => e.key !== key);
    saveResearchCache([entry, ...filtered].slice(0, 50));
  } catch (err) { console.error('setCachedResearch', err); }
}

export function evictExpiredResearch(): void {
  try {
    const now = Date.now();
    const valid = loadResearchCache().filter(e => new Date(e.expiresAt).getTime() > now);
    saveResearchCache(valid);
  } catch { /* best-effort */ }
}
