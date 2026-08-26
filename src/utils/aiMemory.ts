import { AIMemory } from '../types';

export function mergeMemory(existing: AIMemory | undefined, incoming: Partial<AIMemory>): AIMemory {
  const base: AIMemory = existing ? { ...existing } : {};
  if (incoming.userProfile) base.userProfile = incoming.userProfile;
  if (incoming.weeklyCapacity) base.weeklyCapacity = incoming.weeklyCapacity;
  if (incoming.appSnapshot) base.appSnapshot = incoming.appSnapshot;
  if (incoming.knownGoals?.length) {
    const set = new Set([...(base.knownGoals || []), ...incoming.knownGoals]);
    base.knownGoals = [...set].slice(-20);
  }
  if (incoming.setbacks?.length) {
    const set = new Set([...(base.setbacks || []), ...incoming.setbacks]);
    base.setbacks = [...set].slice(-15);
  }
  if (incoming.motivations?.length) {
    const set = new Set([...(base.motivations || []), ...incoming.motivations]);
    base.motivations = [...set].slice(-15);
  }
  if (incoming.personalNotes?.length) {
    const set = new Set([...(base.personalNotes || []), ...incoming.personalNotes]);
    base.personalNotes = [...set].slice(-25);
  }
  if (incoming.progressNotes?.length) {
    const set = new Set([...(base.progressNotes || []), ...incoming.progressNotes]);
    base.progressNotes = [...set].slice(-20);
  }
  if (incoming.openLoops?.length) {
    const set = new Set([...(base.openLoops || []), ...incoming.openLoops]);
    base.openLoops = [...set].slice(-20);
  }
  if (incoming.supportStrategies?.length) {
    const set = new Set([...(base.supportStrategies || []), ...incoming.supportStrategies]);
    base.supportStrategies = [...set].slice(-20);
  }
  base.lastUpdated = new Date().toISOString();
  return base;
}

export function formatMemoryForPrompt(memory?: AIMemory): string {
  if (!memory) return '';
  const parts: string[] = [];
  if (memory.userProfile) parts.push(`Who they are: ${memory.userProfile}`);
  if (memory.knownGoals?.length) parts.push(`Known goals: ${memory.knownGoals.join('; ')}`);
  if (memory.setbacks?.length) parts.push(`Setbacks: ${memory.setbacks.join('; ')}`);
  if (memory.motivations?.length) parts.push(`Motivations: ${memory.motivations.join('; ')}`);
  if (memory.weeklyCapacity) parts.push(`Weekly capacity: ${memory.weeklyCapacity}`);
  if (memory.personalNotes?.length) parts.push(`Notes: ${memory.personalNotes.slice(-5).join('; ')}`);
  if (memory.appSnapshot) parts.push(`App snapshot: ${memory.appSnapshot}`);
  if (memory.progressNotes?.length) parts.push(`Progress notes: ${memory.progressNotes.slice(-5).join('; ')}`);
  if (memory.openLoops?.length) parts.push(`Open loops: ${memory.openLoops.slice(-5).join('; ')}`);
  if (memory.supportStrategies?.length) parts.push(`Support strategies: ${memory.supportStrategies.slice(-5).join('; ')}`);
  return parts.length ? parts.join('\n') : '';
}
