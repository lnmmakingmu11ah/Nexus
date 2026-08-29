import React, { useMemo, useState } from 'react';
import { Check, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import { AIPlannedGoal, CATEGORY_COLORS, CATEGORY_NAMES, CategoryKey, MasterBlueprint } from '../types';
import { formatTimelineDays } from '../utils/timelinePlanner';

interface PlanReviewModalProps {
  blueprint: MasterBlueprint;
  onConfirm: (selected: AIPlannedGoal[]) => void;
  onCancel: () => void;
}

export const PlanReviewModal: React.FC<PlanReviewModalProps> = ({ blueprint, onConfirm, onCancel }) => {
  const [goals, setGoals] = useState<AIPlannedGoal[]>(() => [...(blueprint.plannedGoals || [])]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');

  const kept = useMemo(() => goals.filter(Boolean), [goals]);
  const autoCount = kept.filter((g) => g.autoAdded).length;

  const removeAt = (idx: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== idx));
    setEditingIndex(null);
  };

  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    setDraftName(goals[idx].name);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const name = draftName.trim();
    if (name.length < 2) return;
    setGoals((prev) => prev.map((g, i) => (i === editingIndex ? { ...g, name } : g)));
    setEditingIndex(null);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex justify-center items-start p-3 sm:p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl max-w-lg w-full my-4 sm:my-8 shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-zinc-800/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Review your lifetime plan
              </h2>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Keep, rename, or drop goals. NEXUS-added pillar habits are marked — remove them if they don't fit.
              </p>
            </div>
            <button type="button" onClick={onCancel} className="text-zinc-500 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          {blueprint.masterVision && (
            <p className="mt-3 text-xs text-amber-200/90 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 leading-relaxed">
              {blueprint.masterVision}
            </p>
          )}
          {autoCount > 0 && (
            <p className="mt-2 text-[11px] text-violet-300">
              {autoCount} auto-added for pillar balance. You can delete them.
            </p>
          )}
        </div>

        <div className="p-4 space-y-2.5 max-h-[55vh] overflow-y-auto">
          {kept.map((goal, idx) => {
            const cat = (goal.category || 'smarts') as CategoryKey;
            const colors = CATEGORY_COLORS[cat];
            const days = goal.estimatedDaysToMastery || goal.timelineRange?.maxDays;
            return (
              <div key={`${goal.name}-${idx}`} className="border border-zinc-800 rounded-xl p-3 bg-zinc-950/70">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {CATEGORY_NAMES[cat]}
                    </span>
                    {goal.autoAdded && (
                      <span className="ml-1.5 text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-full">
                        NEXUS added
                      </span>
                    )}
                    {editingIndex === idx ? (
                      <div className="flex gap-2 mt-2">
                        <input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white"
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        />
                        <button type="button" onClick={saveEdit} className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-sm font-bold text-white mt-1.5">{goal.name}</h3>
                    )}
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-3">{goal.description}</p>
                    {goal.autoAddedReason && (
                      <p className="text-[10px] text-violet-300/80 mt-1">{goal.autoAddedReason}</p>
                    )}
                    {days ? (
                      <p className="text-[10px] text-amber-400/90 mt-1.5 font-mono">
                        Lifetime arc ~ {formatTimelineDays(days)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => startEdit(idx)} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => removeAt(idx)} className="p-1.5 text-rose-400/80 hover:text-rose-300 rounded-lg hover:bg-rose-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {kept.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-6">Keep at least one goal to lock the plan.</p>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs text-zinc-400 hover:text-white rounded-xl"
          >
            Later
          </button>
          <button
            type="button"
            disabled={kept.length === 0}
            onClick={() => onConfirm(kept)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-xs rounded-xl disabled:opacity-40"
          >
            Lock {kept.length} goal{kept.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
};
