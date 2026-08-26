/**
 * planValidator.ts — Deterministic validation layer.
 * Every AI-produced plan object passes through this before touching state.
 * Hard rules live here, not in prompts.
 */

import { PlannedGoalDraft, Milestone, PlannedTask, CategoryKey } from '../types';

const VALID_CATEGORIES: CategoryKey[] = ['health', 'smarts', 'spiritual', 'selfCare', 'happiness'];
const MIN_TIMELINE_DAYS = 7;
const MAX_TIMELINE_DAYS = 365 * 80; // 80 years
const MAX_GOALS_PER_PLAN = 10;
const MAX_TASKS_PER_DAY = 7;
const MAX_MILESTONES_PER_GOAL = 18;
const MAX_FIELD_LENGTH = 500;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ok = (): ValidationResult => ({ valid: true, errors: [], warnings: [] });
const fail = (...errors: string[]): ValidationResult => ({ valid: false, errors, warnings: [] });

function sanitize(s: unknown, maxLen = MAX_FIELD_LENGTH): string {
  if (typeof s !== 'string') return '';
  return s.replace(/<[^>]+>/g, '').trim().slice(0, maxLen);
}

// ── Goal Drafts ──────────────────────────────────────────────────

export function validateGoalDraft(draft: unknown): ValidationResult {
  if (!draft || typeof draft !== 'object') return fail('Goal draft must be an object');
  const d = draft as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!d.title || typeof d.title !== 'string' || sanitize(d.title).length < 2)
    errors.push('Goal title is required (min 2 chars)');
  if (!d.category || !VALID_CATEGORIES.includes(d.category as CategoryKey))
    errors.push(`Invalid category "${d.category}". Must be: ${VALID_CATEGORIES.join(', ')}`);

  if (d.timelineRange) {
    const tr = d.timelineRange as Record<string, unknown>;
    const min = Number(tr.minDays);
    const max = Number(tr.maxDays);
    if (isNaN(min) || min < MIN_TIMELINE_DAYS)
      errors.push(`Timeline minimum must be ≥ ${MIN_TIMELINE_DAYS} days`);
    if (isNaN(max) || max > MAX_TIMELINE_DAYS)
      errors.push(`Timeline maximum cannot exceed ${MAX_TIMELINE_DAYS} days`);
    if (!isNaN(min) && !isNaN(max) && min > max)
      errors.push('Timeline minimum cannot exceed maximum');
  }

  if (typeof d.targetDescription === 'string' && d.targetDescription.length > MAX_FIELD_LENGTH)
    warnings.push('targetDescription truncated to 500 chars');

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
}

export function validateGoalDrafts(drafts: unknown[]): ValidationResult {
  if (!Array.isArray(drafts)) return fail('Goals must be an array');
  if (drafts.length === 0) return fail('At least one goal required');
  if (drafts.length > MAX_GOALS_PER_PLAN) return fail(`Max ${MAX_GOALS_PER_PLAN} goals per plan`);

  const errors: string[] = [];
  const warnings: string[] = [];
  drafts.forEach((d, i) => {
    const r = validateGoalDraft(d);
    r.errors.forEach(e => errors.push(`Goal #${i + 1}: ${e}`));
    r.warnings.forEach(w => warnings.push(`Goal #${i + 1}: ${w}`));
  });
  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, errors: [], warnings };
}

// ── Milestones ───────────────────────────────────────────────────

export function validateMilestones(milestones: unknown[]): ValidationResult {
  if (!Array.isArray(milestones)) return fail('Milestones must be an array');
  if (milestones.length > MAX_MILESTONES_PER_GOAL)
    return fail(`Max ${MAX_MILESTONES_PER_GOAL} milestones per goal`);

  const errors: string[] = [];
  const today = new Date();

  milestones.forEach((m, i) => {
    if (!m || typeof m !== 'object') { errors.push(`Milestone #${i + 1}: must be object`); return; }
    const ms = m as Record<string, unknown>;
    if (!ms.title || typeof ms.title !== 'string' || sanitize(ms.title).length < 2)
      errors.push(`Milestone #${i + 1}: title required`);
    if (!ms.completionCondition || typeof ms.completionCondition !== 'string')
      errors.push(`Milestone #${i + 1}: completionCondition required`);
    if (ms.targetDateRange) {
      const dr = ms.targetDateRange as Record<string, unknown>;
      const earliest = new Date(dr.earliest as string);
      const latest = new Date(dr.latest as string);
      if (isNaN(earliest.getTime())) errors.push(`Milestone #${i + 1}: invalid earliest date`);
      if (isNaN(latest.getTime())) errors.push(`Milestone #${i + 1}: invalid latest date`);
      if (!isNaN(latest.getTime()) && !isNaN(earliest.getTime()) && latest < earliest)
        errors.push(`Milestone #${i + 1}: latest cannot be before earliest`);
    }
  });
  return errors.length > 0 ? { valid: false, errors, warnings: [] } : ok();
}

// ── Planned Tasks ────────────────────────────────────────────────

export function validateTasks(tasks: unknown[]): ValidationResult {
  if (!Array.isArray(tasks)) return fail('Tasks must be an array');
  const errors: string[] = [];
  const tasksByDate = new Map<string, number>();

  tasks.forEach((t, i) => {
    if (!t || typeof t !== 'object') { errors.push(`Task #${i + 1}: must be object`); return; }
    const task = t as Record<string, unknown>;
    if (!task.title || typeof task.title !== 'string' || sanitize(task.title).length < 2)
      errors.push(`Task #${i + 1}: title required`);
    if (!task.scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(task.scheduledDate as string))
      errors.push(`Task #${i + 1}: scheduledDate must be YYYY-MM-DD`);
    else {
      const d = task.scheduledDate as string;
      const count = (tasksByDate.get(d) || 0) + 1;
      tasksByDate.set(d, count);
      if (count > MAX_TASKS_PER_DAY)
        errors.push(`Task #${i + 1}: too many tasks on ${d} (max ${MAX_TASKS_PER_DAY})`);
    }
    const h = Number(task.hardness);
    if (isNaN(h) || h < 1 || h > 5) errors.push(`Task #${i + 1}: hardness must be 1–5`);
    const dur = Number(task.durationMinutes);
    if (isNaN(dur) || dur < 1 || dur > 480) errors.push(`Task #${i + 1}: durationMinutes 1–480`);
  });
  return errors.length > 0 ? { valid: false, errors, warnings: [] } : ok();
}

// ── Dependency Graph ─────────────────────────────────────────────

export function validateDependencyGraph(deps: unknown[], goalIds: string[]): ValidationResult {
  if (!Array.isArray(deps) || deps.length === 0) return ok();
  const goalIdSet = new Set(goalIds);
  const errors: string[] = [];

  deps.forEach((d, i) => {
    if (!d || typeof d !== 'object') { errors.push(`Dep #${i + 1}: must be object`); return; }
    const dep = d as Record<string, unknown>;
    if (!dep.fromGoalId || !goalIdSet.has(dep.fromGoalId as string))
      errors.push(`Dep #${i + 1}: unknown fromGoalId`);
    if (!dep.toGoalId || !goalIdSet.has(dep.toGoalId as string))
      errors.push(`Dep #${i + 1}: unknown toGoalId`);
    if (dep.fromGoalId === dep.toGoalId)
      errors.push(`Dep #${i + 1}: self-loop not allowed`);
  });

  if (errors.length === 0) {
    // DFS cycle detection
    const adj = new Map<string, string[]>();
    (deps as Array<Record<string, unknown>>).forEach(d => {
      const from = d.fromGoalId as string;
      const to = d.toGoalId as string;
      if (!adj.has(from)) adj.set(from, []);
      adj.get(from)!.push(to);
    });
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const hasCycle = (node: string): boolean => {
      if (inStack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node); inStack.add(node);
      for (const nb of adj.get(node) || []) if (hasCycle(nb)) return true;
      inStack.delete(node);
      return false;
    };
    for (const id of goalIds) if (hasCycle(id)) { errors.push('Cycle in dependency graph'); break; }
  }
  return errors.length > 0 ? { valid: false, errors, warnings: [] } : ok();
}

// ── Sanitize helpers (strip HTML, cap lengths) ───────────────────

export function sanitizeDraft(d: PlannedGoalDraft): PlannedGoalDraft {
  return { ...d, title: sanitize(d.title, 120), targetDescription: sanitize(d.targetDescription) };
}

export function sanitizeTask(t: PlannedTask): PlannedTask {
  return {
    ...t,
    title: sanitize(t.title, 200),
    description: t.description ? sanitize(t.description) : undefined,
    framedTitle: t.framedTitle ? sanitize(t.framedTitle, 200) : undefined,
    motivationalNote: t.motivationalNote ? sanitize(t.motivationalNote) : undefined,
  };
}
