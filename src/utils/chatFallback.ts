/**
 * Contextual offline / error replies so the UI never dumps the same canned line.
 * Used only when the live Groq backend is unreachable.
 */
export function smartOfflineReply(
  lastUserText: string,
  stage: 'onboarding' | 'open_chat' = 'open_chat',
  userName?: string
): string {
  const name = userName || 'champ';
  const t = (lastUserText || '').toLowerCase().trim();

  if (!t) {
    return `yo ${name}!! im here — what's on ur mind?`;
  }

  if (/^(hi|hello|hey|yo|sup|wassup|hiya)\b/.test(t) || t === 'hii' || t === 'hiii') {
    return `yo ${name}!! hey hey 👋 what's good, what u wanna talk about?`;
  }

  if (/what+\??|huh|idk what|confused|say again|repeat/.test(t)) {
    return `oh wait my bad lol 😅 i meant — what are ur main goals right now, or how can i help u today?`;
  }

  if (/let'?s chat|wanna talk|talk to me|chat/.test(t)) {
    return stage === 'onboarding'
      ? `bet!! first off what should i call u? 👀`
      : `bet ${name} i'm locked in 🔥 tell me what's actually going on rn`;
  }

  if (/goal|want to|i wanna|dream|become|achieve/.test(t)) {
    return `okay i hear u on that 🔥 why does that matter so much to u tho? like what's the real reason behind it?`;
  }

  if (/tired|hard|tough|stressed|sad|anxious|burn/.test(t)) {
    return `damn that sounds heavy fr… wanna vent a bit or want me to help u pick one tiny win for today?`;
  }

  if (stage === 'onboarding') {
    if (t.length < 20) {
      return `nice nice — tell me a bit more tho. what do u wanna change most in ur life rn?`;
    }
    return `gotchu. and what usually stops u from sticking with that — time, energy, distraction, or something else?`;
  }

  return `okay i got u — "${lastUserText.slice(0, 60)}${lastUserText.length > 60 ? '…' : ''}" — say more, i'm listening 👀`;
}

export function apiOfflineMessage(isNative: boolean): string {
  if (isNative) {
    return `yo my brain is offline rn 🔌 on ur PC run:\nnpm run dev\nthen:\nadb reverse tcp:3000 tcp:3000\nthen reopen NEXUS`;
  }
  return `yo my brain is offline rn 🔌 start the server with npm run dev then try again`;
}
