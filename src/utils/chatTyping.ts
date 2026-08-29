/**
 * Realistic phone-typing delays + bubble hygiene.
 * Longer texts take longer to "type." Extra bubbles are only kept when they
 * feel like a real double-text, not a chopped-up essay.
 */

const REACTION_ONLY =
  /^(wait|wait wait|lol|lmao|omg|yo|nah|ok|okay|damn|bro|fr|ngl|hold up|ayo|wait what|no way|bruh|sheesh)[\s!.?…]*$/i;

export function typingDelayForBubble(
  text: string,
  opts: { isFirst?: boolean; afterNetworkWait?: boolean } = {}
): number {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const chars = Math.max(1, clean.length);

  // Pause before starting to type (longer between double-texts than on the first)
  const think = opts.isFirst ? 180 + Math.random() * 260 : 320 + Math.random() * 480;

  // Casual phone typing: short taps are fast; longer thoughts slow down
  const cps =
    chars < 28 ? 10 + Math.random() * 3.5 : chars < 110 ? 6.2 + Math.random() * 2.2 : 4.6 + Math.random() * 1.4;
  let delay = think + (chars / cps) * 1000;

  const min = chars < 14 ? 260 : chars < 40 ? 480 : chars < 90 ? 1050 : chars < 180 ? 2100 : 3000;
  let max = chars < 36 ? 1200 : chars < 110 ? 3600 : 7800;

  // First bubble already waited on the network — keep the length curve, don't stack two full waits
  if (opts.afterNetworkWait) {
    delay *= chars < 36 ? 0.4 : chars < 100 ? 0.58 : 0.75;
    max = Math.min(max, chars < 36 ? 900 : chars < 110 ? 2400 : 4800);
  }

  return Math.round(Math.min(max, Math.max(min, delay)));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Collapse spammy / mid-sentence splits. Cap at 3. Prefer 1 bubble. */
export function normalizeAiBubbles(raw: string[]): string[] {
  let bubbles = (raw || []).map((b) => (b || '').trim()).filter(Boolean);
  if (bubbles.length <= 1) return bubbles.slice(0, 1);

  // Glue tiny non-reaction fragments onto the next bubble
  const glued: string[] = [];
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i];
    const next = bubbles[i + 1];
    if (next && b.length < 16 && !REACTION_ONLY.test(b) && !/[.!?…]$/.test(b)) {
      bubbles[i + 1] = `${b} ${next}`.replace(/\s+/g, ' ').trim();
      continue;
    }
    glued.push(b);
  }
  bubbles = glued;

  if (bubbles.length > 3) {
    bubbles = [bubbles[0], bubbles[1], bubbles.slice(2).join(' ').trim()];
  }

  // Three meaty paragraphs is not how people text — collapse to 2
  if (bubbles.length === 3 && bubbles.every((b) => b.length > 48)) {
    bubbles = [bubbles[0], `${bubbles[1]} ${bubbles[2]}`.trim()];
  }

  // Two long equal-weight paragraphs with no reaction opener → one bubble
  if (
    bubbles.length === 2 &&
    bubbles[0].length > 90 &&
    bubbles[1].length > 90 &&
    !REACTION_ONLY.test(bubbles[0])
  ) {
    bubbles = [`${bubbles[0]} ${bubbles[1]}`.trim()];
  }

  return bubbles.filter(Boolean).slice(0, 3);
}

export async function dripAiBubbles(
  bubbles: string[],
  onBubble: (text: string, index: number) => void | Promise<void>
): Promise<void> {
  const cleaned = normalizeAiBubbles(bubbles);
  for (let i = 0; i < cleaned.length; i++) {
    await sleep(
      typingDelayForBubble(cleaned[i], {
        isFirst: i === 0,
        afterNetworkWait: i === 0,
      })
    );
    await onBubble(cleaned[i], i);
  }
}

export function stripChatControlTokens(text: string): string {
  return (text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<<READY_FOR_PLAN>>/gi, '')
    .replace(/<<PLAN_APPROVED>>/gi, '')
    .replace(/^\s*(NEXUS\s*:|AI\s*:|Assistant\s*:)/i, '')
    .trim();
}

/** Visible live text while tokens are still arriving. */
export function liveStreamVisible(text: string): string {
  return stripChatControlTokens(text)
    .replace(/<<ACTION:[\s\S]*?>>/gi, '')
    .replace(/<<ACTION:[\s\S]*$/gi, '')
    .trim();
}

/** Split a live stream buffer on ||BUBBLE|| without waiting for the full reply. */
export function bubblesFromStreamBuffer(raw: string): { closed: string[]; current: string } {
  const parts = (raw || '').split(/[|][|]BUBBLE[|][|]/);
  const closed = parts.slice(0, -1).map((p) => stripChatControlTokens(p)).filter(Boolean);
  const current = stripChatControlTokens(parts[parts.length - 1] || '');
  return { closed, current };
}
