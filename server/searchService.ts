/**
 * searchService.ts
 * Waterfall search strategy: DuckDuckGo (free) → Serper → Tavily
 * Scoped to goal categories. Returns summarized research findings.
 * Cache is handled on the client side (researchCache.ts).
 */

const DDG_URL = 'https://api.duckduckgo.com/';
const SERPER_URL = 'https://google.serper.dev/search';
const TAVILY_URL = 'https://api.tavily.com/search';

const CATEGORY_RESEARCH_TEMPLATES: Record<string, string> = {
  health: '{goal} evidence-based training protocol habits beginner progression',
  smarts: '{goal} spaced repetition learning framework daily study habit',
  spiritual: '{goal} mindfulness daily practice habit formation routine',
  selfCare: '{goal} daily routine habit formation self-care protocol',
  happiness: '{goal} behavioral science habit routine wellbeing',
};

function buildQuery(category: string, goalType: string): string {
  const template = CATEGORY_RESEARCH_TEMPLATES[category] || '{goal} habit formation daily routine evidence';
  return `${template.replace('{goal}', goalType)} realistic timeline setbacks recovery fallback steps`;
}

// ─── DuckDuckGo (free, no key needed) ───────────────────────────────────────

async function searchDDG(query: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `${DDG_URL}?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NEXUS-LifeCompanion/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.RelatedTopics) {
      (data.RelatedTopics as any[])
        .slice(0, 5)
        .filter(t => t.Text)
        .forEach(t => parts.push(t.Text));
    }
    return parts.length > 0 ? parts.join(' ').slice(0, 1500) : null;
  } catch {
    return null;
  }
}

// ─── Serper (2,500 free credits/month) ──────────────────────────────────────

async function searchSerper(query: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5, gl: 'us' }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parts: string[] = [];

    if (data.answerBox?.answer) parts.push(data.answerBox.answer);
    if (data.answerBox?.snippet) parts.push(data.answerBox.snippet);
    if (data.organic) {
      (data.organic as any[])
        .slice(0, 4)
        .filter(r => r.snippet)
        .forEach(r => parts.push(`${r.title}: ${r.snippet}`));
    }
    return parts.length > 0 ? parts.join(' ').slice(0, 2000) : null;
  } catch {
    return null;
  }
}

// ─── Tavily (1,000 free credits/month — AI-optimized research) ──────────────

async function searchTavily(query: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic', // cheaper than 'advanced'
        max_results: 5,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parts: string[] = [];
    if (data.answer) parts.push(data.answer);
    if (data.results) {
      (data.results as any[])
        .slice(0, 3)
        .filter(r => r.content)
        .forEach(r => parts.push(r.content?.slice(0, 400)));
    }
    return parts.length > 0 ? parts.join(' ').slice(0, 2000) : null;
  } catch {
    return null;
  }
}

// ─── Static fallback knowledge base ─────────────────────────────────────────

const STATIC_KNOWLEDGE: Record<string, string> = {
  health: `Evidence-based fitness habit formation: Start with minimum viable sessions (10–15 min) to build consistency before increasing intensity. Progressive overload — small weekly increases of 5–10% in volume. Habit stacking with existing morning routines shows highest adherence. Frequency trumps duration for beginners. 3–4x/week is optimal for neural adaptation.`,
  smarts: `Evidence-based learning: Spaced repetition (Anki, 20 min/day) outperforms massed practice by 200-300%. Active recall over passive re-reading. Interleaving topics improves transfer. Pomodoro (25 min focus / 5 min break) suits most cognitive tasks. Sleep is consolidation — learning before sleep outperforms morning for retention.`,
  spiritual: `Mindfulness habit formation: Start with 5 minutes/day — consistency matters more than duration. Body scan and breath focus are the most research-backed entry points. Link to an existing anchor (morning coffee, bedtime). Gratitude journaling (3 specific items nightly) measurably improves wellbeing at 8 weeks.`,
  selfCare: `Self-care habit formation: Sleep hygiene is the highest-leverage lever — consistent wake times matter more than bedtime. Blue light cutoff 1 hour before sleep. 7-9 hours non-negotiable for mood and cognition. Hydration: 2–3L/day baseline. Habit stack grooming/skincare with teeth brushing anchor.`,
  happiness: `Wellbeing habits: Social connection is the single strongest predictor of long-term happiness (Harvard Study of Adult Development). Aim for one meaningful interaction/day. Contribution activities (helping others) produce lasting mood elevation. Limit social media to <30 min/day. Nature exposure 2x/week shows significant cortisol reduction.`,
};

// ─── Main fetch (waterfall: DDG → Serper → Tavily → static) ─────────────────

export interface ResearchResult {
  findings: string;
  source: 'ddg' | 'serper' | 'tavily' | 'static';
}

export async function fetchGoalResearch(
  category: string,
  goalType: string,
  serperKey?: string,
  tavilyKey?: string
): Promise<ResearchResult> {
  const query = buildQuery(category, goalType);

  // 1. Try DDG first (free)
  try {
    const ddgResult = await searchDDG(query);
    if (ddgResult && ddgResult.length > 100) {
      return { findings: ddgResult, source: 'ddg' };
    }
  } catch { /* fall through */ }

  // 2. Try Serper (spend credits only when DDG failed)
  if (serperKey) {
    try {
      const serperResult = await searchSerper(query, serperKey);
      if (serperResult && serperResult.length > 100) {
        return { findings: serperResult, source: 'serper' };
      }
    } catch { /* fall through */ }
  }

  // 3. Try Tavily (most credits — use sparingly)
  if (tavilyKey) {
    try {
      const tavilyResult = await searchTavily(query, tavilyKey);
      if (tavilyResult && tavilyResult.length > 100) {
        return { findings: tavilyResult, source: 'tavily' };
      }
    } catch { /* fall through */ }
  }

  // 4. Static fallback (zero cost, always available)
  const staticFinding = STATIC_KNOWLEDGE[category] || STATIC_KNOWLEDGE.health;
  return { findings: staticFinding, source: 'static' };
}

// --- Quick chat search (lightweight, for injecting web context into chat) ----




export async function quickChatSearch(
  topic: string,
  serperKey?: string
): Promise<string | null> {
  const query = `${topic} overview summary`
  // Try Serper first (fast, structured)
  if (serperKey) {
    try {
      const res = await fetch(SERPER_URL, {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 3 }),
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data = await res.json()
        const parts: string[] = []
        if (data.answerBox?.snippet) parts.push(data.answerBox.snippet)
        if (data.knowledgeGraph?.description) parts.push(data.knowledgeGraph.description)
        ;(data.organic as any[] || []).slice(0, 2).filter((r: any) => r.snippet).forEach((r: any) => parts.push(r.snippet))
        if (parts.length) return parts.join(' ').slice(0, 400)
      }
    } catch { /* fall through */ }
  }
  // Fallback: DDG instant answer
  try {
    const result = await searchDDG(query)
    if (result && result.length > 80) return result.slice(0, 400)
  } catch { /* fall through */ }
  return null
}

export function detectChatSearchTopic(userMessage: string): string | null {
  const lower = userMessage.toLowerCase()
  const mediaKw = ['movie','film','show','series','season','episode','album','song','artist','singer','band','book','novel','game','anime','manga']
  const hasMedia = mediaKw.some(k => lower.includes(k))
  if (!hasMedia) return null
  // Extract quoted or capitalized phrase as topic
  const quoted = userMessage.match(/"([^"]+)"/)
  if (quoted) return quoted[1]
  // Grab 2-4 word phrase after media keyword
  const m = userMessage.match(/(?:watched|watch|listening to|played|read|saw|loved|hated|finished)\s+([A-Z][^.?!,]{3,50})/i)
  if (m) return m[1].trim()
  // Fallback: grab anything that looks like a title (multiple caps)
  const titleMatch = userMessage.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/)
  if (titleMatch) return titleMatch[1]
  return null
}
