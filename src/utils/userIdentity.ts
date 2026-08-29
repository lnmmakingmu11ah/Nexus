/**
 * Structured "who they are" — LLM JSON is the source of truth.
 * Heuristics only fill empty slots when the model is offline.
 */

import { CategoryKey, UserIdentity } from '../types';

const ALL_PILLARS: CategoryKey[] = ['health', 'smarts', 'selfCare', 'happiness', 'spiritual'];

const EMPTY: UserIdentity = {
  lifeGoals: [],
  pillarNotes: {},
  setbacks: [],
};

function clean(s?: string): string | undefined {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length >= 2 ? t.slice(0, 180) : undefined;
}

export function mergeIdentity(existing: UserIdentity | undefined, incoming: UserIdentity | undefined): UserIdentity {
  const a = existing || {};
  const b = incoming || {};
  const pillarNotes = { ...(a.pillarNotes || {}), ...(b.pillarNotes || {}) };
  const lifeGoals = [...new Set([...(a.lifeGoals || []), ...(b.lifeGoals || [])].map((g) => g.trim()).filter(Boolean))].slice(0, 8);
  const setbacks = [...new Set([...(a.setbacks || []), ...(b.setbacks || [])].map((g) => g.trim()).filter(Boolean))].slice(0, 8);

  return {
    name: clean(b.name) || clean(a.name),
    city: clean(b.city) || clean(a.city),
    country: clean(b.country) || clean(a.country),
    work: clean(b.work) || clean(a.work),
    relationships: clean(b.relationships) || clean(a.relationships),
    lifeGoals,
    pillarNotes,
    setbacks,
    dailyCapacity: clean(b.dailyCapacity) || clean(a.dailyCapacity),
    preferredTime: clean(b.preferredTime) || clean(a.preferredTime),
    extractedAt: b.extractedAt || a.extractedAt || new Date().toISOString(),
    source: b.source || a.source || 'heuristic',
  };
}

/** Last-resort local parse — capture groups from full sentences, never word-list bingo. */
export function heuristicIdentityFromTranscript(
  transcript?: any[],
  existing?: UserIdentity
): UserIdentity {
  const safeTranscript = Array.isArray(transcript) ? transcript : [];
  const userText = safeTranscript
    .filter((m: any) => m && (m.sender === 'user' || m.role === 'user'))
    .map((m: any) => m.text || m.content || '')
    .join('\n');
  const draft: UserIdentity = { ...EMPTY, source: 'heuristic', extractedAt: new Date().toISOString() };

  const nameM = userText.match(/(?:call me|i'?m|im|my name is)\s+([A-Z][A-Za-z\-']{1,20})/i);
  if (nameM) draft.name = nameM[1];

  const locM = userText.match(/\b(?:live in|from|based in|i'?m in)\s+([A-Z][A-Za-z\s\-]{2,40})/i);
  if (locM) {
    const bits = locM[1].split(',').map((s) => s.trim());
    draft.city = bits[0];
    if (bits[1]) draft.country = bits[1];
  }

  const workM = userText.match(/\b(?:i (?:work|study)(?: as| in)?|i'?m a(?:n)?)\s+([^\n.]{3,60})/i);
  if (workM) draft.work = workM[1];

  const relM = userText.match(/\b(?:my (?:wife|husband|partner|girlfriend|boyfriend|kids?|family|mom|dad))\b([^\n.]{0,40})/i);
  if (relM) draft.relationships = clean(`${relM[0]}${relM[1] || ''}`);

  const lifeGoals: string[] = [];
  const goalRe =
    /(?:i want to|i wanna|my (?:life )?goal is to|i'?m trying to|i dream of(?: becoming)?)\s+([^\n.]{8,90})/gi;
  let gm: RegExpExecArray | null;
  while ((gm = goalRe.exec(userText)) !== null) {
    const g = clean(gm[1]);
    if (g) lifeGoals.push(g);
  }
  draft.lifeGoals = lifeGoals.slice(0, 8);

  const setbacks: string[] = [];
  const setRe =
    /(?:i struggle with|i keep|i always|i can'?t|i cannot|what stops me is|i used to)\s+([^\n.]{6,90})/gi;
  let sm: RegExpExecArray | null;
  while ((sm = setRe.exec(userText)) !== null) {
    const s = clean(sm[0]);
    if (s) setbacks.push(s);
  }
  draft.setbacks = setbacks.slice(0, 8);

  const capM = userText.match(/(\d+)\s*(min|minute|hour)s?\s*(?:a|per)\s*day/i);
  if (capM) draft.dailyCapacity = `${capM[1]} ${capM[2]}${Number(capM[1]) === 1 ? '' : 's'} a day`;

  const timeM = userText.match(/\b(morning|night|evening|afternoon)s?\b/i);
  if (timeM && /\b(prefer|better|usually|work best|time)\b/i.test(userText)) {
    draft.preferredTime = timeM[1].toLowerCase();
  }

  return mergeIdentity(existing, draft);
}

export function identityIsUseful(id?: UserIdentity): boolean {
  if (!id) return false;
  const filled = [id.name, id.city, id.work, id.relationships, ...(id.lifeGoals || [])].filter(Boolean);
  return filled.length >= 2;
}

export function formatIdentityForPrompt(identity?: UserIdentity): string {
  if (!identity) return '';
  const lines = [
    identity.name && `Name: ${identity.name}`,
    (identity.city || identity.country) && `Lives: ${[identity.city, identity.country].filter(Boolean).join(', ')}`,
    identity.work && `Work/study: ${identity.work}`,
    identity.relationships && `Relationships: ${identity.relationships}`,
    identity.lifeGoals?.length && `Life goals: ${identity.lifeGoals.join('; ')}`,
    identity.setbacks?.length && `Setbacks: ${identity.setbacks.join('; ')}`,
    identity.dailyCapacity && `Daily capacity: ${identity.dailyCapacity}`,
    identity.preferredTime && `Preferred time: ${identity.preferredTime}`,
    identity.pillarNotes &&
      Object.entries(identity.pillarNotes)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | '),
  ].filter(Boolean);
  if (!lines.length) return '';
  return `STRUCTURED IDENTITY (extracted facts — treat as ground truth, do not re-ask what is filled):\n${lines.join('\n')}`;
}

export function normalizeExtractedIdentity(raw: any): UserIdentity {
  const pillarNotes: UserIdentity['pillarNotes'] = {};
  const src = raw?.pillarNotes && typeof raw.pillarNotes === 'object' ? raw.pillarNotes : {};
  for (const key of ALL_PILLARS) {
    if (src[key]) pillarNotes[key] = String(src[key]).slice(0, 240);
  }
  const lifeGoals = Array.isArray(raw?.lifeGoals)
    ? raw.lifeGoals.map((g: any) => String(g).trim()).filter(Boolean).slice(0, 8)
    : [];
  const setbacks = Array.isArray(raw?.setbacks)
    ? raw.setbacks.map((g: any) => String(g).trim()).filter(Boolean).slice(0, 8)
    : [];

  return {
    name: clean(raw?.name),
    city: clean(raw?.city),
    country: clean(raw?.country),
    work: clean(raw?.work),
    relationships: clean(raw?.relationships),
    lifeGoals,
    pillarNotes,
    setbacks,
    dailyCapacity: clean(raw?.dailyCapacity),
    preferredTime: clean(raw?.preferredTime),
    extractedAt: new Date().toISOString(),
    source: 'llm',
  };
}
