/**
 * dependencyGraph.ts — Deterministic dependency graph engine.
 * AI identifies relationships; this code applies and manages them.
 */

import { Goal, GoalDependency, PlannedTask, CategoryKey } from '../types';

export interface DependencyGraph {
  goals: Goal[];
  dependencies: GoalDependency[];
  adjacency: Map<string, string[]>;   // fromGoalId → toGoalId[]
  reverseAdj: Map<string, string[]>;  // toGoalId → fromGoalId[]
}

export interface OverlapCandidate {
  goalIdA: string;
  goalIdB: string;
  overlapReason: string;
  confidence: 'high' | 'medium' | 'low';
}

// Category keywords for coded overlap detection (no AI needed)
const CATEGORY_KW: Record<CategoryKey, string[]> = {
  health: ['run', 'workout', 'exercise', 'gym', 'cardio', 'weight', 'fitness', 'walk', 'swim', 'sport', 'strength', 'lose', 'muscle', 'marathon', 'bulk'],
  smarts: ['study', 'learn', 'read', 'course', 'coding', 'math', 'skill', 'language', 'exam', 'degree', 'research', 'book'],
  spiritual: ['meditat', 'gratitude', 'journal', 'reflect', 'purpose', 'mindful', 'pray', 'peace', 'inner', 'spiritual'],
  selfCare: ['sleep', 'skincare', 'hygiene', 'grooming', 'hydrat', 'posture', 'rest', 'recover', 'nap'],
  happiness: ['friend', 'family', 'social', 'hobby', 'fun', 'travel', 'creative', 'art', 'music', 'connect'],
};

// Known category pairs with natural shared infrastructure
const SHARED_INFRA_PAIRS: [CategoryKey, CategoryKey, string][] = [
  ['health', 'happiness', 'physical activity and mood share cardio/movement habits'],
  ['health', 'smarts', 'post-workout BDNF elevation enhances cognitive performance'],
  ['spiritual', 'happiness', 'mindfulness and reflection practices overlap significantly'],
  ['selfCare', 'health', 'sleep and recovery are shared infrastructure for physical goals'],
  ['smarts', 'spiritual', 'deep focus and meditation share distraction-reduction habits'],
];

// ── Coded overlap detection (fast, zero AI cost) ─────────────────

export function detectOverlaps(goals: Goal[]): OverlapCandidate[] {
  const candidates: OverlapCandidate[] = [];
  for (let i = 0; i < goals.length; i++) {
    for (let j = i + 1; j < goals.length; j++) {
      const a = goals[i];
      const b = goals[j];

      if (a.category === b.category) {
        candidates.push({ goalIdA: a.id, goalIdB: b.id, overlapReason: `Both are ${a.category} goals — may share daily habits`, confidence: 'high' });
        continue;
      }

      const pair = SHARED_INFRA_PAIRS.find(([catA, catB]) =>
        (a.category === catA && b.category === catB) || (a.category === catB && b.category === catA)
      );
      if (pair) {
        candidates.push({ goalIdA: a.id, goalIdB: b.id, overlapReason: pair[2], confidence: 'medium' });
        continue;
      }

      const aText = `${a.name} ${a.description || ''}`.toLowerCase();
      const bText = `${b.name} ${b.description || ''}`.toLowerCase();
      const aKws = CATEGORY_KW[a.category] || [];
      const bKws = CATEGORY_KW[b.category] || [];
      const hit = aKws.find(kw => bText.includes(kw)) || bKws.find(kw => aText.includes(kw));
      if (hit) {
        candidates.push({ goalIdA: a.id, goalIdB: b.id, overlapReason: `Keyword "${hit}" suggests overlapping daily actions`, confidence: 'low' });
      }
    }
  }
  return candidates;
}

// ── Build graph ──────────────────────────────────────────────────

export function buildDependencyGraph(goals: Goal[], dependencies: GoalDependency[]): DependencyGraph {
  const adjacency = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>();
  goals.forEach(g => { adjacency.set(g.id, []); reverseAdj.set(g.id, []); });
  dependencies.forEach(dep => {
    adjacency.set(dep.fromGoalId, [...(adjacency.get(dep.fromGoalId) || []), dep.toGoalId]);
    reverseAdj.set(dep.toGoalId, [...(reverseAdj.get(dep.toGoalId) || []), dep.fromGoalId]);
  });
  return { goals, dependencies, adjacency, reverseAdj };
}

// ── Cycle detection ──────────────────────────────────────────────

export function validateNoCycles(graph: DependencyGraph): boolean {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const dfs = (id: string): boolean => {
    if (inStack.has(id)) return false;
    if (visited.has(id)) return true;
    visited.add(id); inStack.add(id);
    for (const nb of graph.adjacency.get(id) || []) if (!dfs(nb)) return false;
    inStack.delete(id);
    return true;
  };
  for (const g of graph.goals) if (!dfs(g.id)) return false;
  return true;
}

// ── Unlocked goals (prereqs met) ─────────────────────────────────

export function getUnlockedGoals(graph: DependencyGraph, completedGoalIds: string[]): string[] {
  const done = new Set(completedGoalIds);
  return graph.goals
    .filter(g => !done.has(g.id))
    .filter(g => (graph.reverseAdj.get(g.id) || []).every(prereq => done.has(prereq)))
    .map(g => g.id);
}

// ── Merge shared tasks across overlapping goals ──────────────────

export function mergeSharedTasks(
  tasks: PlannedTask[],
  dependencies: GoalDependency[]
): { mergedTasks: PlannedTask[]; mergeMap: Map<string, string> } {
  const mergeMap = new Map<string, string>();
  const sharedPairs = new Set(
    dependencies
      .filter(d => d.type === 'shared_infrastructure')
      .map(d => [d.fromGoalId, d.toGoalId].sort().join(':'))
  );

  // Group by date + normalized title
  const grouped = new Map<string, PlannedTask[]>();
  tasks.forEach(t => {
    const key = `${t.scheduledDate}:${t.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  });

  const result: PlannedTask[] = [];
  const processed = new Set<string>();

  tasks.forEach(task => {
    if (processed.has(task.id)) return;
    const key = `${task.scheduledDate}:${task.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
    const group = grouped.get(key) || [];
    if (group.length <= 1) { result.push(task); processed.add(task.id); return; }

    const pairKey = group.map(t => t.goalId).sort().join(':');
    if (sharedPairs.has(pairKey)) {
      const canonical = group[0];
      group.forEach(t => { mergeMap.set(t.id, canonical.id); processed.add(t.id); });
      result.push(canonical);
    } else {
      group.forEach(t => { result.push(t); processed.add(t.id); });
    }
  });

  return { mergedTasks: result, mergeMap };
}
