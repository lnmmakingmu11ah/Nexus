import React, { useState } from 'react';
import { Target, Plus, Trash2, Edit2, Sparkles, Check, Brain, Shield, Compass, BookOpen, Folder, FolderPlus, Bell, Clock, Link2, Layers, ChevronDown, ChevronUp, BarChart2, Zap } from 'lucide-react';
import { CATEGORY_NAMES, CategoryKey, Goal, GoalEffect, UserConfig, PlannedTask, Milestone, GoalDependency } from '../types';
import { STARTER_GOALS } from '../constants';
import { AdaptiveScheduler } from './AdaptiveScheduler';
import { GoalIntakeChat } from './GoalIntakeChat';
import { DailyPlanView } from './DailyPlanView';
import { loadCustomFolders, saveCustomFolders } from '../utils/storage';

interface GoalsManagerProps {
  goals: Goal[];
  userConfig?: UserConfig;
  onSaveGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddPresetGoals: () => void;
  // Planning engine
  plannedTasks?: PlannedTask[];
  milestones?: Milestone[];
  goalDependencies?: GoalDependency[];
  onPlanReady?: (goals: any[], dependencies: any[], milestones: any[], tasks: any[]) => void;
  onTasksUpdated?: (tasks: PlannedTask[]) => void;
  onUpdateIntakeState?: (state: any) => void;
  onToggleGoal?: (goalId: string) => void;
}

export const GoalsManager: React.FC<GoalsManagerProps> = ({
  goals,
  userConfig,
  onSaveGoal,
  onDeleteGoal,
  onAddPresetGoals,
  plannedTasks = [],
  milestones = [],
  goalDependencies = [],
  onPlanReady,
  onTasksUpdated,
  onUpdateIntakeState,
  onToggleGoal,
}) => {

  const [editingGoal, setEditingGoal] = useState<Partial<Goal> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [folders, setFolders] = useState<string[]>(loadCustomFolders);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'active' | 'maintenance' | 'parking_lot'>('all');

  // Planning section state
  const [showPlanSection, setShowPlanSection] = useState(false);
  const [activePlanTab, setActivePlanTab] = useState<'today' | 'intake'>('today');
  const hasPlan = plannedTasks.length > 0;

  const handleOpenNew = () => {
    setEditingGoal({
      id: `goal-${Date.now()}`,
      name: '',
      description: '',
      frequency: 'daily',
      category: 'health',
      folder: folders[0] || 'Wellness',
      priority: 'active',
      proofPreference: 'auto',
      difficulty: 'medium',
      effects: [{ category: 'health', weight: 4 }],
      isLifePathAligned: false,
      isCognitiveTraining: false,
      basePoints: 5,
      createdAt: new Date().toISOString(),
    });
    setShowModal(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal({ ...goal });
    setShowModal(true);
  };

  const handleAddFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    if (!folders.includes(trimmed)) {
      const updated = [...folders, trimmed];
      setFolders(updated);
      saveCustomFolders(updated);
    }
    if (editingGoal) {
      setEditingGoal({ ...editingGoal, folder: trimmed });
    }
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleSave = () => {
    if (!editingGoal?.name?.trim()) return;

    const assignedFolder = editingGoal.folder?.trim() || 'General';
    if (assignedFolder && !folders.includes(assignedFolder)) {
      const updatedFolders = [...folders, assignedFolder];
      setFolders(updatedFolders);
      saveCustomFolders(updatedFolders);
    }

    const finalGoal: Goal = {
      id: editingGoal.id || `goal-${Date.now()}`,
      name: editingGoal.name.trim(),
      description: editingGoal.description?.trim() || '',
      frequency: editingGoal.frequency || 'daily',
      category: editingGoal.category || 'health',
      folder: assignedFolder,
      priority: editingGoal.priority || 'active',
      proofPreference: editingGoal.proofPreference || 'auto',
      difficulty: editingGoal.difficulty || 'medium',
      reminderTime: editingGoal.reminderTime || '08:00',
      reminderEnabled: editingGoal.reminderEnabled !== false,
      linkedGoalId: editingGoal.linkedGoalId || undefined,
      stackingNote: editingGoal.stackingNote?.trim() || undefined,
      effects: editingGoal.effects || [{ category: 'health', weight: 3 }],
      isLifePathAligned: !!editingGoal.isLifePathAligned,
      isCognitiveTraining: !!editingGoal.isCognitiveTraining,
      basePoints: editingGoal.basePoints || 5,
      createdAt: editingGoal.createdAt || new Date().toISOString(),
      archived: !!editingGoal.archived,
    };

    onSaveGoal(finalGoal);
    setShowModal(false);
    setEditingGoal(null);
  };

  const handleUpdateEffect = (index: number, field: 'category' | 'weight', value: any) => {
    if (!editingGoal) return;
    const currentEffects = [...(editingGoal.effects || [])];
    currentEffects[index] = { ...currentEffects[index], [field]: value };
    setEditingGoal({ ...editingGoal, effects: currentEffects });
  };

  const handleAddEffect = () => {
    if (!editingGoal) return;
    const currentEffects = [...(editingGoal.effects || [])];
    currentEffects.push({ category: 'happiness', weight: 2 });
    setEditingGoal({ ...editingGoal, effects: currentEffects });
  };

  const handleRemoveEffect = (index: number) => {
    if (!editingGoal) return;
    const currentEffects = [...(editingGoal.effects || [])];
    currentEffects.splice(index, 1);
    setEditingGoal({ ...editingGoal, effects: currentEffects });
  };

  const activeGoals = goals.filter((g) => !g.archived);
  const filteredGoals = activeGoals
    .filter((g) => priorityFilter === 'all' || (g.priority || 'active') === priorityFilter)
    .sort((a, b) => {
      const rank = { active: 0, maintenance: 1, parking_lot: 2 };
      return rank[a.priority || 'active'] - rank[b.priority || 'active'];
    });

  return (
    <div className="space-y-6">

      {/* ─── Planning Engine Section ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
        {/* Section header / toggle */}
        <button
          onClick={() => setShowPlanSection(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">AI Goal Planner</p>
              <p className="text-xs text-white/40 mt-0.5">
                {hasPlan
                  ? `${plannedTasks.filter(t => t.scheduledDate === new Date().toISOString().split('T')[0]).length} tasks today`
                  : 'talk to NEXUS — build a real plan for your goals'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasPlan && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            {showPlanSection ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </div>
        </button>

        {/* Collapsible body */}
        {showPlanSection && (
          <div className="border-t border-white/10 p-4 space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
              {([['today', hasPlan ? 'Today\'s Tasks' : 'Today', BarChart2], ['intake', 'Chat with NEXUS', Zap]] as const).map(([tab, label, Icon]) => (
                <button
                  key={tab}
                  onClick={() => setActivePlanTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    activePlanTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Today's tasks */}
            {activePlanTab === 'today' && (
              hasPlan ? (
                <DailyPlanView
                  tasks={plannedTasks}
                  milestones={milestones}
                  goals={goals}
                  goalDependencies={goalDependencies}
                  behaviorProfile={userConfig?.behaviorProfile}
                  userConfig={{
                    userName: userConfig?.userName,
                    behaviorProfile: userConfig?.behaviorProfile,
                    lastBlueprintRewrite: userConfig?.lastBlueprintRewrite,
                  }}
                  onTasksUpdated={onTasksUpdated || (() => {})}
                  onGoalCompleted={onToggleGoal}
                />
              ) : (

                <div className="text-center py-6 text-white/30 text-sm">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>no plan yet — use the Chat tab to get started</p>
                </div>
              )
            )}

            {/* Intake chat */}
            {activePlanTab === 'intake' && userConfig && (
              <GoalIntakeChat
                userConfig={userConfig}
                onPlanReady={onPlanReady || (() => {})}
                onUpdateIntakeState={onUpdateIntakeState || (() => {})}
              />
            )}
          </div>
        )}
      </div>

      {/* Top Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Habit & Goal Engine Configuration</span>
          </h2>
          <p className="text-xs text-zinc-400 font-light mt-0.5">
            Configure goal effects, assign multi-category weights (+/-), and tag Life-Path alignment
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onAddPresetGoals && (
            <button
              onClick={onAddPresetGoals}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Science Presets</span>
            </button>
          )}
          <button
            onClick={handleOpenNew}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-950/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Goal</span>
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Goal Priority Board</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Keep today's energy on active goals, let maintenance habits stay lighter, and park ideas that should not pull focus yet.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPriorityFilter('active');
              setShowPlanSection(true);
              setActivePlanTab('today');
            }}
            className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold"
          >
            What should I do next?
          </button>
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-x-auto scrollbar-none">
            {[
              ['all', 'All'],
              ['active', 'Active Now'],
              ['maintenance', 'Maintenance'],
              ['parking_lot', 'Parking Lot'],
            ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPriorityFilter(id as typeof priorityFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                priorityFilter === id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              {label}
            </button>
            ))}
          </div>
        </div>
      </div>

      {/* Adaptive Circadian Scheduler Tool */}
      {goals.length > 0 && <AdaptiveScheduler goals={goals} userConfig={userConfig} />}

      {/* Goals Cards Grid / Empty State */}
      {activeGoals.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <Target className="w-10 h-10 text-emerald-400/40 mx-auto" />
          <h4 className="text-base font-bold text-white">No active goals yet</h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Use the AI Goal Planner above to chat with NEXUS, add science-backed presets, or create custom goals.
          </p>
          <div className="flex justify-center flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => {
                setShowPlanSection(true);
                setActivePlanTab('intake');
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Open AI Goal Planner</span>
            </button>
            {onAddPresetGoals && (
              <button
                onClick={onAddPresetGoals}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold text-xs rounded-xl border border-amber-500/30 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Add Science Presets</span>
              </button>
            )}
            <button
              onClick={handleOpenNew}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Goal</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals
            .map((goal) => (
              <div
                key={goal.id}
                className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-4 shadow-lg hover:border-zinc-700 transition-all flex flex-col justify-between"
              >

              <div>
                <div className="flex items-start justify-between space-x-2 mb-2">
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {CATEGORY_NAMES[goal.category]}
                      </span>
                      <span className="text-[10px] font-medium text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                        <Folder className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{goal.folder || 'General'}</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                          goal.difficulty === 'high'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : goal.difficulty === 'medium'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {goal.difficulty === 'high'
                          ? '🔥 High'
                          : goal.difficulty === 'low'
                          ? '🌱 Low'
                          : '⚡ Med'}
                      </span>
                      {goal.reminderTime && goal.reminderEnabled !== false && (
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          <span>{goal.reminderTime}</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/30">
                        {(goal.priority || 'active') === 'active'
                          ? 'Active Now'
                          : (goal.priority || 'active') === 'maintenance'
                          ? 'Maintenance'
                          : 'Parking Lot'}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                        {(goal.proofPreference || 'auto') === 'auto'
                          ? 'Auto Proof'
                          : (goal.proofPreference || 'auto') === 'photo'
                          ? 'Photo Proof'
                          : (goal.proofPreference || 'auto') === 'reflection'
                          ? 'Reflection Check'
                          : 'Challenge Review'}
                      </span>
                      {goal.linkedGoalId && (
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1" title="Habit Stack Linked">
                          <Link2 className="w-2.5 h-2.5 text-purple-400" />
                          <span>Stacks → {goals.find(g => g.id === goal.linkedGoalId)?.name || 'Next Habit'}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white mt-1.5">{goal.name}</h3>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 font-light mb-3 line-clamp-2">
                  {goal.description || 'No description provided'}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                {/* Special Tags */}
                <div className="flex flex-wrap gap-1">
                  {goal.isLifePathAligned && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center space-x-1">
                      <Compass className="w-3 h-3" />
                      <span>Life-Path Aligned</span>
                    </span>
                  )}
                  {goal.isCognitiveTraining && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                      <Brain className="w-3 h-3" />
                      <span>Cognitive Drill</span>
                    </span>
                  )}
                </div>

                {/* Category Weight Effects */}
                <div>
                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mb-1">
                    Category Impact Weights
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {goal.effects.map((eff, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                          eff.weight >= 0
                            ? 'bg-zinc-950 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-950 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {eff.weight >= 0 ? `+${eff.weight}` : eff.weight}{' '}
                        {CATEGORY_NAMES[eff.category]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goal Edit / Create Modal */}
      {showModal && editingGoal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 text-zinc-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-white">
              {editingGoal.id ? 'Edit Goal' : 'Create Custom Goal'}
            </h3>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Goal Name *</label>
              <input
                type="text"
                value={editingGoal.name || ''}
                onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                placeholder="Enter goal name"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
              <textarea
                value={editingGoal.description || ''}
                onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                rows={2}
                placeholder="Enter description"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Primary Category</label>
                <select
                  value={editingGoal.category || 'health'}
                  onChange={(e) =>
                    setEditingGoal({ ...editingGoal, category: e.target.value as CategoryKey })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="health">Health</option>
                  <option value="spiritual">Spiritual Resonance</option>
                  <option value="smarts">Smarts (Cognitive)</option>
                  <option value="selfCare">Self-Care</option>
                  <option value="happiness">Happiness</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Custom Group / Label (Work, Wellness, Hobbies)
                </label>
                {isCreatingFolder ? (
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Type custom label name..."
                      className="w-full bg-zinc-950 border border-emerald-500/80 rounded-xl px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddFolder}
                      className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shrink-0"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingFolder(false)}
                      className="px-2 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-medium shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={editingGoal.folder || 'Work'}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setIsCreatingFolder(true);
                        } else {
                          setEditingGoal({ ...editingGoal, folder: e.target.value });
                        }
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      {Array.from(new Set(['Work', 'Wellness', 'Hobbies', 'Personal', 'General', ...folders])).map((f) => (
                        <option key={f} value={f}>
                          🏷️ {f}
                        </option>
                      ))}
                      <option value="__add_new__">+ Type Custom Label...</option>
                    </select>

                    {/* Quick Preset Label Chips */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono">Quick Pick:</span>
                      {['Work', 'Wellness', 'Hobbies', 'Personal', 'General'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditingGoal({ ...editingGoal, folder: preset })}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-all ${
                            (editingGoal.folder || 'Work') === preset
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-900'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Priority Lane
                </label>
                <select
                  value={editingGoal.priority || 'active'}
                  onChange={(e) =>
                    setEditingGoal({
                      ...editingGoal,
                      priority: e.target.value as 'active' | 'maintenance' | 'parking_lot',
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="active">Active Now / Main Focus</option>
                  <option value="maintenance">Maintenance / Keep Warm</option>
                  <option value="parking_lot">Parking Lot / Later</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={editingGoal.difficulty || 'medium'}
                  onChange={(e) =>
                    setEditingGoal({
                      ...editingGoal,
                      difficulty: e.target.value as 'low' | 'medium' | 'high',
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="low">🌱 Low Impact / Light Effort</option>
                  <option value="medium">⚡ Medium Effort / Balanced</option>
                  <option value="high">🔥 High Impact / Hard Focus</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Proof Style
                </label>
                <select
                  value={editingGoal.proofPreference || 'auto'}
                  onChange={(e) =>
                    setEditingGoal({
                      ...editingGoal,
                      proofPreference: e.target.value as 'auto' | 'photo' | 'reflection' | 'challenge',
                    })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="auto">Auto - NEXUS chooses best evidence</option>
                  <option value="photo">Photo Proof - visible physical evidence</option>
                  <option value="reflection">Reflection Check - journal specifics only</option>
                  <option value="challenge">Challenge Review - journal + questions</option>
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Use Reflection Check for habits like meditation, prayer, deep work, or emotional regulation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Base Point Value</label>
                <input
                  type="number"
                  value={editingGoal.basePoints || 5}
                  onChange={(e) =>
                    setEditingGoal({ ...editingGoal, basePoints: Number(e.target.value) })
                  }
                  min={1}
                  max={20}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Smart Daily Reminder */}
            <div className="space-y-2.5 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">Smart Habit Reminder</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingGoal.reminderEnabled !== false}
                    onChange={(e) =>
                      setEditingGoal({ ...editingGoal, reminderEnabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {editingGoal.reminderEnabled !== false && (
                <div className="flex items-center space-x-3 pt-1">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Reminder Scheduled Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={editingGoal.reminderTime || '08:00'}
                        onChange={(e) =>
                          setEditingGoal({ ...editingGoal, reminderTime: e.target.value })
                        }
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 flex-1 font-light leading-snug">
                    Sends browser notification when habit is due based on daily schedule.
                  </p>
                </div>
              )}
            </div>

            {/* Habit Stacking (Chain Habits) */}
            <div className="space-y-2.5 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <div className="flex items-center space-x-2">
                <Link2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-white">Habit Stacking (Chain Habits)</span>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-zinc-400">
                  Trigger Next Habit Upon Completion
                </label>
                <select
                  value={editingGoal.linkedGoalId || ''}
                  onChange={(e) =>
                    setEditingGoal({ ...editingGoal, linkedGoalId: e.target.value || undefined })
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500 font-medium"
                >
                  <option value="">-- No Linked Habit (Standalone) --</option>
                  {goals
                    .filter((g) => g.id !== editingGoal.id && !g.archived)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        ⚡ Chain → {g.name} ({CATEGORY_NAMES[g.category]})
                      </option>
                    ))}
                </select>

                {editingGoal.linkedGoalId && (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Habit Cue / Transition Note
                    </label>
                    <input
                      type="text"
                      value={editingGoal.stackingNote || ''}
                      onChange={(e) =>
                        setEditingGoal({ ...editingGoal, stackingNote: e.target.value })
                      }
                      placeholder="Transition note"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Special Tag Toggles */}
            <div className="space-y-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editingGoal.isLifePathAligned}
                  onChange={(e) =>
                    setEditingGoal({ ...editingGoal, isLifePathAligned: e.target.checked })
                  }
                  className="rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-medium text-indigo-300">Life-Path Aligned Goal</span>
                  <p className="text-[10px] text-zinc-500">
                    Feeds Spiritual Resonance based on your stated identity goal.
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editingGoal.isCognitiveTraining}
                  onChange={(e) =>
                    setEditingGoal({ ...editingGoal, isCognitiveTraining: e.target.checked })
                  }
                  className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-medium text-amber-300">Cognitive Training Drill</span>
                  <p className="text-[10px] text-zinc-500">
                    Feeds Smarts (math, physics/logic, memory, focus drills ONLY).
                  </p>
                </div>
              </label>
            </div>

            {/* Category Impact Effects List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-zinc-300">Category Effect Weights (+/-)</label>
                <button
                  type="button"
                  onClick={handleAddEffect}
                  className="text-xs text-emerald-400 hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Effect</span>
                </button>
              </div>

              <div className="space-y-2">
                {editingGoal.effects?.map((eff, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <select
                      value={eff.category}
                      onChange={(e) => handleUpdateEffect(idx, 'category', e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 flex-1"
                    >
                      <option value="health">Health</option>
                      <option value="spiritual">Spiritual Resonance</option>
                      <option value="smarts">Smarts</option>
                      <option value="selfCare">Self-Care</option>
                      <option value="happiness">Happiness</option>
                    </select>

                    <input
                      type="number"
                      value={eff.weight}
                      onChange={(e) => handleUpdateEffect(idx, 'weight', Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono text-center"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveEffect(idx)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl font-medium shadow-md shadow-emerald-950/40"
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
