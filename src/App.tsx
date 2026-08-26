import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { FloatingBottomNav } from './components/FloatingBottomNav';
import { OnboardingModal } from './components/OnboardingModal';
import { TutorialWalkthrough } from './components/TutorialWalkthrough';
import { Dashboard } from './components/Dashboard';
import { JournalView } from './components/JournalView';
import { GoalsManager } from './components/GoalsManager';
import { TrendsView } from './components/TrendsView';
import { InsightsView } from './components/InsightsView';
import { LifeExpectancyView } from './components/LifeExpectancyView';
import { AICoachView } from './components/AICoachView';
import { AchievementsView } from './components/AchievementsView';
import { ProofVerificationModal } from './components/ProofVerificationModal';
import { CompletionReviewModal } from './components/CompletionReviewModal';
import { StreakToastContainer, StreakToastData } from './components/StreakToast';
import { SmartReminderNotifier } from './components/SmartReminderNotifier';
import { NexusNotificationCenter } from './components/NexusNotificationCenter';
import { LocationSettings } from './components/LocationSettings';
import { AiServerSettings } from './components/AiServerSettings';
import { HabitStackPrompt } from './components/HabitStackPrompt';
import { triggerHapticFeedback } from './utils/haptics';
import { aiClient } from './services/aiClient';
import { mergeMemory } from './utils/aiMemory';

import {
  AIDigest,
  DailyGoalLog,
  DailyJournal,
  Goal,
  LifeExpectancyFactor,
  UserConfig,
  PlannedTask,
  Milestone,
  GoalDependency,
} from './types';
import { STARTER_GOALS, SCIENCE_PRESET_GOALS } from './constants';
import {
  exportAnonymizedBackupJSON,
  exportBackupJSON,
  importBackupJSON,
  loadDailyLogs,
  loadDigests,
  loadFactors,
  loadGoals,
  loadJournals,
  loadUserConfig,
  saveDailyLogs,
  saveDigest,
  saveFactors,
  saveGoals,
  saveJournal,
  saveUserConfig,
  loadPlannedTasks,
  savePlannedTasks,
  loadMilestones,
  saveMilestones,
  loadGoalDependencies,
  saveGoalDependencies,
} from './utils/storage';
import { calculateScoresForDate, calculateGoalStreak } from './utils/scoring';
import { validateGoalDrafts } from './utils/planValidator';
import { fallbackGoalDraft, fallbackMilestones, fallbackTask } from './utils/planFallbacks';
import { detectOverlaps, buildDependencyGraph } from './utils/dependencyGraph';
import { buildAdaptiveTimeline, buildTimelineMilestones } from './utils/timelinePlanner';
import { computeBehaviorProfile } from './utils/behaviorProfile';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [todayStr] = useState<string>(new Date().toISOString().split('T')[0]);

  // Persistent States
  const [userConfig, setUserConfig] = useState<UserConfig>(loadUserConfig);
  const [goals, setGoals] = useState<Goal[]>(loadGoals);
  const [dailyLogs, setDailyLogs] = useState<DailyGoalLog[]>(loadDailyLogs);
  const [journals, setJournals] = useState<DailyJournal[]>(loadJournals);
  const [factors, setFactors] = useState<LifeExpectancyFactor[]>(loadFactors);
  const [digests, setDigests] = useState<AIDigest[]>(loadDigests);

  // Planning engine state
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>(loadPlannedTasks);
  const [milestones, setMilestones] = useState<Milestone[]>(loadMilestones);
  const [goalDependencies, setGoalDependencies] = useState<GoalDependency[]>(loadGoalDependencies);

  // Toast Notifications
  const [streakToasts, setStreakToasts] = useState<StreakToastData[]>([]);

  // Background plan building state
  const [isPlanBuilding, setIsPlanBuilding] = useState(false);
  const [planBuildingStage, setPlanBuildingStage] = useState<string>('Analyzing your goals…');
  const [planBuildDone, setPlanBuildDone] = useState(false);

  useEffect(() => {
    if (!userConfig.onboarded) return;
    const nextProfile = computeBehaviorProfile(
      dailyLogs,
      goals,
      plannedTasks,
      userConfig.onboardedAt
    );
    const current = JSON.stringify({ ...(userConfig.behaviorProfile || {}), lastComputedAt: undefined });
    const next = JSON.stringify({ ...nextProfile, lastComputedAt: undefined });
    if (current !== next) {
      const updated = { ...userConfig, behaviorProfile: nextProfile };
      setUserConfig(updated);
      saveUserConfig(updated);
    }
  }, [dailyLogs, goals, plannedTasks, userConfig.onboarded, userConfig.onboardedAt, userConfig.behaviorProfile]);

  /** Called by GoalIntakeChat when AI finishes synthesizing a plan */
  const handlePlanReady = useCallback((
    aiGoals: any[],
    aiDeps: any[],
    aiMilestones: any[],
    aiTasks: any[]
  ) => {
    // Validate before committing
    if (aiGoals.length > 0) {
      const validation = validateGoalDrafts(aiGoals);
      if (!validation.valid) {
        console.warn('Plan validation errors:', validation.errors);
        return;
      }
    }

    // Build new Goal objects from AI plan (merged into existing goals)
    const newGoals: Goal[] = aiGoals.map((g: any) => {
      const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const cat = g.category || 'health';
      const adaptive = buildAdaptiveTimeline(
        String(g.title || 'Untitled Goal'),
        String(g.targetDescription || ''),
        userConfig.behaviorProfile,
        '',
        g.timelineRange
      );
      return {
        id,
        name: String(g.title || 'Untitled Goal').slice(0, 120),
        description: String(g.targetDescription || '').slice(0, 500),
        category: cat,
        frequency: 'daily',
        priority: 'active',
        proofPreference: 'auto',
        active: true,
        basePoints: 5,
        effects: [{ category: cat, weight: 4 }],
        isLifePathAligned: true,
        isCognitiveTraining: cat === 'smarts',
        createdAt: new Date().toISOString(),
        planStatus: 'active',
        timelineRange: g.timelineRange || adaptive.timelineRange,
        timelineSummary: g.timelineSummary || adaptive.timelineSummary,
        timelineMap: Array.isArray(g.timelineMap) && g.timelineMap.length ? g.timelineMap : adaptive.timelineMap,
        targetDescription: g.targetDescription,
        fromIntake: true,
      };
    });

    // Build milestones
    const newMilestones: Milestone[] = [];
    aiGoals.forEach((g: any, idx: number) => {
      const goalId = newGoals[idx]?.id;
      if (!goalId) return;
      const ms = Array.isArray(g.milestones) && g.milestones.length
        ? g.milestones
        : buildTimelineMilestones(goalId, newGoals[idx]?.timelineRange, newGoals[idx]?.name);
      ms.forEach((m: any, mi: number) => {
        newMilestones.push({
          id: m.id || `ms-${goalId}-${mi}`,
          goalId,
          title: String(m.title || `Phase ${mi + 1}`),
          completionCondition: String(m.completionCondition || 'Complete consistently'),
          orderIndex: mi,
          status: mi === 0 ? 'active' : 'pending',
          targetDateRange: m.targetDateRange,
        });
      });
    });

    // Build tasks
    const newTasks: PlannedTask[] = [];
    aiGoals.forEach((g: any, idx: number) => {
      const goalId = newGoals[idx]?.id;
      const firstMs = newMilestones.find(m => m.goalId === goalId);
      if (!goalId || !firstMs) return;
      const initialTasks = Array.isArray(g.initialTasks) ? g.initialTasks.slice(0, 3) : [];
      initialTasks.forEach((t: any, ti: number) => {
        for (let d = 0; d < 30; d++) {
          const date = new Date();
          date.setDate(date.getDate() + d);
          const ds = date.toISOString().split('T')[0];
          newTasks.push({
            id: `task-${goalId}-${ti}-${d}-${Date.now()}`,
            milestoneId: firstMs.id,
            goalId,
            title: String(t.title || 'Daily habit'),
            description: t.description ? String(t.description) : undefined,
            scheduledDate: ds,
            durationMinutes: Math.min(480, Math.max(1, Number(t.durationMinutes) || 20)),
            hardness: (Math.min(5, Math.max(1, Number(t.hardness) || 2))) as any,
            isRecurring: true,
            recurrencePattern: 'daily',
            status: 'pending',
          });
        }
      });
    });

    // Build dependencies
    const newDeps: GoalDependency[] = [
      ...aiDeps.map((d: any, i: number) => ({
        id: `dep-${Date.now()}-${i}`,
        fromGoalId: d.fromGoalId,
        toGoalId: d.toGoalId,
        type: d.type || 'shared_infrastructure',
        rationale: d.rationale || '',
      })),
    ];

    // Build or update Master Blueprint
    const synthesizedBlueprint = {
      userName: userConfig.userName || 'Friend',
      masterVision: userConfig.lifePathGoal || 'Build disciplined daily habits for physical health, sharp focus, and continuous personal growth.',
      overallWillpowerIndex: 82,
      categoryBaselines: userConfig.categoryBaselines || { health: 50, spiritual: 50, smarts: 50, selfCare: 50, happiness: 50 },
      plannedGoals: newGoals.map((g, i) => {
        const ms = newMilestones.filter(m => m.goalId === g.id);
        const adaptive = buildAdaptiveTimeline(
          g.name,
          g.description,
          userConfig.behaviorProfile,
          '',
          g.timelineRange
        );
        return {
          name: g.name,
          description: g.description,
          category: g.category,
          reminderTime: '08:30',
          basePoints: 5,
          targetFrequency: 'daily',
          chanceOfAchievement: 85,
          willpowerStrain: 'Low',
          timelinePhase1: ms[0]?.title ? `${ms[0].title}: ${ms[0].completionCondition}` : 'Days 1–30: Foundation phase',
          timelinePhase2: ms[1]?.title ? `${ms[1].title}: ${ms[1].completionCondition}` : 'Days 30–90: Building momentum',
          timelinePhase3: ms[2]?.title ? `${ms[2].title}: ${ms[2].completionCondition}` : 'Days 90–180+: Mastery integration',
          timelineSummary: g.timelineSummary || adaptive.timelineSummary,
          timelineMap: g.timelineMap || adaptive.timelineMap,
          estimatedDaysToMastery: adaptive.estimatedDaysToMastery,
        };
      }),
      goalCorrelations: newDeps.map(d => ({
        goals: [newGoals.find(g => g.id === d.fromGoalId)?.name || 'Goal 1', newGoals.find(g => g.id === d.toGoalId)?.name || 'Goal 2'],
        insight: d.rationale || 'Reinforces daily habit momentum',
      })),
      goalStackUps: [],
      roadblocks: [],
      createdAt: new Date().toISOString(),
    };

    // Commit to state and storage
    const mergedGoals = [...goals, ...newGoals];
    setGoals(mergedGoals);
    saveGoals(mergedGoals);

    const mergedMilestones = [...milestones, ...newMilestones];
    setMilestones(mergedMilestones);
    saveMilestones(mergedMilestones);

    const mergedTasks = [...plannedTasks, ...newTasks];
    setPlannedTasks(mergedTasks);
    savePlannedTasks(mergedTasks);

    const mergedDeps = [...goalDependencies, ...newDeps];
    setGoalDependencies(mergedDeps);
    saveGoalDependencies(mergedDeps);

    const updatedConfig = { ...userConfig, masterBlueprint: synthesizedBlueprint };
    setUserConfig(updatedConfig);
    saveUserConfig(updatedConfig);

    setPlanBuildDone(true);
    triggerStreakToast('NEXUS Blueprint', 0, '🎯 Your personal plan is ready! Check the AI Coach tab');
    setTimeout(() => setPlanBuildDone(false), 8000);
  }, [goals, milestones, plannedTasks, goalDependencies, userConfig]);


  const handleTasksUpdated = useCallback((updated: PlannedTask[]) => {
    setPlannedTasks(updated);
    savePlannedTasks(updated);
  }, []);

  const handleDismissToast = (id: string) => {
    setStreakToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerStreakToast = (goalName: string, streakDays: number, customMsg?: string) => {
    const newToast: StreakToastData = {
      id: `toast-${Date.now()}-${Math.random()}`,
      goalName,
      streakDays,
      message: customMsg,
    };
    setStreakToasts((prev) => [newToast, ...prev].slice(0, 3));
  };

  // Modals
  const [showOnboarding, setShowOnboarding] = useState<boolean>(!userConfig.onboarded);
  const [showTutorial, setShowTutorial] = useState<boolean>(
    userConfig.onboarded && !userConfig.tutorialCompleted
  );
  const [activeProofGoal, setActiveProofGoal] = useState<Goal | undefined>(undefined);
  const [showProofModal, setShowProofModal] = useState<boolean>(false);
  const [activeCompletionGoal, setActiveCompletionGoal] = useState<Goal | undefined>(undefined);
  const [loadingDigest, setLoadingDigest] = useState<boolean>(false);
  const [activeHabitStackPrompt, setActiveHabitStackPrompt] = useState<{
    completedGoal: Goal;
    nextGoal: Goal;
    stackingNote?: string;
  } | null>(null);

  // Compute today's scores
  const scoreData = calculateScoresForDate(todayStr, goals, dailyLogs, userConfig);

  // Handlers
  const handleCompleteOnboarding = (newConfig: UserConfig, synthesizedGoals?: Partial<Goal>[]) => {
    setUserConfig(newConfig);
    saveUserConfig(newConfig);
    setShowOnboarding(false);
    // Show tutorial for newly onboarded users
    if (!newConfig.tutorialCompleted) {
      setShowTutorial(true);
    }

    if (synthesizedGoals && synthesizedGoals.length > 0) {
      handleBatchAddGoals(synthesizedGoals);
      setCurrentTab('aicoach');
    }
  };

  /**
   * Called when user consents to plan build from onboarding chat.
   * Immediately closes onboarding, kicks off background synthesis with live multi-step progress.
   */
  const handleStartBackgroundPlan = useCallback(
    async (
      transcript: { sender: 'user' | 'ai'; text: string }[],
      partialConfig: UserConfig
    ) => {
      // 1. Set user as onboarded immediately — closes modal, enters app
      setUserConfig(partialConfig);
      saveUserConfig(partialConfig);
      setShowOnboarding(false);
      setShowTutorial(!partialConfig.tutorialCompleted);
      setIsPlanBuilding(true);
      setPlanBuildingStage('🔍 Analyzing your goals & personal ambitions…');

      // 2. Run synthesis in background
      try {
        setTimeout(() => setPlanBuildingStage('⚡ Finding habit correlations & multiplier stack-ups…'), 2000);
        setTimeout(() => setPlanBuildingStage('📊 Calibrating realistic timelines & success probabilities…'), 4500);

        const res = await aiClient.synthesizeBlueprint({ transcript });
        const blueprint = res.blueprint;
        setPlanBuildingStage('🎯 Synthesizing milestones & personalized daily actions…');

        const newGoals: Goal[] = (blueprint?.plannedGoals || []).map(
          (pg: any, idx: number) => {
            const id = `goal-ai-${Date.now()}-${idx}`;
            const cat = pg.category || 'smarts';
            const adaptive = buildAdaptiveTimeline(
              String(pg.name || `Goal ${idx + 1}`),
              String(pg.description || ''),
              partialConfig.behaviorProfile,
              '',
              pg.timelineRange
            );
            return {
              id,
              name: pg.name || `Goal ${idx + 1}`,
              description: pg.description || '',
              category: cat,
              frequency: pg.targetFrequency || 'daily',
              reminderTime: pg.reminderTime || '08:30',
              reminderEnabled: true,
              basePoints: pg.basePoints || 5,
              effects: pg.effects || [{ category: cat, weight: 4 }],
              isLifePathAligned: true,
              isCognitiveTraining: cat === 'smarts',
              createdAt: new Date().toISOString(),
              planStatus: 'active',
              fromIntake: true,
              timelineRange: pg.timelineRange || adaptive.timelineRange,
              timelineSummary: pg.timelineSummary || adaptive.timelineSummary,
              timelineMap: Array.isArray(pg.timelineMap) && pg.timelineMap.length ? pg.timelineMap : adaptive.timelineMap,
            };
          }
        );

        // Build milestones for each goal
        const newMilestones: Milestone[] = [];
        newGoals.forEach((goal, gi) => {
          const pg = blueprint?.plannedGoals?.[gi];
          const map = Array.isArray(goal.timelineMap) && goal.timelineMap.length ? goal.timelineMap : [];
          const helperMilestones = buildTimelineMilestones(goal.id, goal.timelineRange || pg?.timelineRange, goal.name);
          if (map.length >= 4) {
            map.slice(0, helperMilestones.length).forEach((segment, idx) => {
              if (helperMilestones[idx]) {
                helperMilestones[idx] = {
                  ...helperMilestones[idx],
                  title: segment,
                };
              }
            });
          }
          newMilestones.push(...helperMilestones);
        });

        // Build daily scheduled tasks for the next 30 days
        const newTasks: PlannedTask[] = [];
        newGoals.forEach((goal, gi) => {
          const ms = newMilestones.find(m => m.goalId === goal.id);
          if (!ms) return;
          for (let d = 0; d < 30; d++) {
            const date = new Date();
            date.setDate(date.getDate() + d);
            const ds = date.toISOString().split('T')[0];
            newTasks.push({
              id: `task-${goal.id}-${d}-${Date.now()}`,
              milestoneId: ms.id,
              goalId: goal.id,
              title: goal.name,
              description: goal.description,
              scheduledDate: ds,
              durationMinutes: 20,
              hardness: 2,
              isRecurring: true,
              recurrencePattern: 'daily',
              status: 'pending',
            });
          }
        });

        // Build dependencies from correlations & stackups
        const newDeps: GoalDependency[] = (blueprint?.goalCorrelations || []).map((gc: any, idx: number) => {
          const g1 = newGoals.find(g => gc.goals?.[0] && g.name.toLowerCase().includes(gc.goals[0].toLowerCase())) || newGoals[0];
          const g2 = newGoals.find(g => gc.goals?.[1] && g.name.toLowerCase().includes(gc.goals[1].toLowerCase())) || newGoals[1] || newGoals[0];
          return {
            id: `dep-${Date.now()}-${idx}`,
            fromGoalId: g1?.id || 'goal-1',
            toGoalId: g2?.id || 'goal-2',
            type: 'shared_infrastructure',
            rationale: gc.insight || 'Reinforces daily habit momentum',
          };
        });

        const baselines = blueprint?.categoryBaselines || {
          health: 50, spiritual: 50, smarts: 50, selfCare: 50, happiness: 50,
        };

        const finalConfig: UserConfig = {
          ...partialConfig,
          userName: blueprint?.userName || partialConfig.userName,
          lifePathGoal: blueprint?.masterVision || partialConfig.lifePathGoal,
          categoryBaselines: baselines,
          masterBlueprint: blueprint
            ? { ...blueprint, createdAt: new Date().toISOString() }
            : undefined,
        };

        setUserConfig(finalConfig);
        saveUserConfig(finalConfig);

        if (newGoals.length > 0) {
          const mergedGoals = [...newGoals, ...goals.filter(g => !newGoals.some(ng => ng.name.toLowerCase() === g.name.toLowerCase()))];
          setGoals(mergedGoals);
          saveGoals(mergedGoals);
        }

        if (newMilestones.length > 0) {
          const mergedMilestones = [...milestones, ...newMilestones];
          setMilestones(mergedMilestones);
          saveMilestones(mergedMilestones);
        }

        if (newTasks.length > 0) {
          const mergedTasks = [...plannedTasks, ...newTasks];
          setPlannedTasks(mergedTasks);
          savePlannedTasks(mergedTasks);
        }

        if (newDeps.length > 0) {
          const mergedDeps = [...goalDependencies, ...newDeps];
          setGoalDependencies(mergedDeps);
          saveGoalDependencies(mergedDeps);
        }

        setPlanBuildDone(true);
        triggerStreakToast('NEXUS Blueprint', 0, '🎯 Your personal growth plan is ready! Check AI Coach and Goals');
        setTimeout(() => setPlanBuildDone(false), 10000);
      } catch (err) {
        console.error('Background blueprint synthesis failed:', err);
        triggerStreakToast('Blueprint', 0, '⚠️ Plan generation hit an issue — you can rebuild it in AI Coach');
      } finally {
        setIsPlanBuilding(false);
      }
    },
    [goals, milestones, plannedTasks, goalDependencies]
  );


  const handleBatchAddGoals = (newGoalsData: Partial<Goal>[]) => {
    setGoals((currentGoals) => {
      const existingNames = new Set(currentGoals.map((g) => g.name.toLowerCase()));
      const createdGoals: Goal[] = newGoalsData
        .filter((ng) => ng.name && !existingNames.has(ng.name.toLowerCase()))
        .map((ng, idx) => ({
          id: ng.id || `goal-added-${Date.now()}-${idx}`,
          name: ng.name!,
          description: ng.description || '',
          category: ng.category || 'smarts',
          frequency: ng.frequency || 'daily',
          priority: ng.priority || 'active',
          proofPreference: ng.proofPreference || 'auto',
          reminderTime: ng.reminderTime || '08:30',
          reminderEnabled: ng.reminderEnabled ?? true,
          basePoints: ng.basePoints || 5,
          effects: ng.effects || [{ category: ng.category || 'smarts', weight: 4 }],
          isLifePathAligned: ng.isLifePathAligned ?? true,
          isCognitiveTraining: ng.isCognitiveTraining ?? (ng.category === 'smarts'),
          createdAt: ng.createdAt || new Date().toISOString(),
        }));

      if (createdGoals.length > 0) {
        const updated = [...createdGoals, ...currentGoals];
        saveGoals(updated);
        return updated;
      }
      return currentGoals;
    });
  };

  const completeGoalWithEvidence = (
    goalId: string,
    resultMsg = 'Completion verified',
    confidence = 70,
    evidenceSummary = 'Journal/proof review completed.'
  ) => {
    const existingIndex = dailyLogs.findIndex(
      (l) => l.goalId === goalId && l.date === todayStr
    );

    let updatedLogs: DailyGoalLog[] = [...dailyLogs];

    if (existingIndex >= 0) {
      const current = updatedLogs[existingIndex];
      updatedLogs[existingIndex] = {
        ...current,
        completed: true,
        proofVerified: true,
        proofVerificationResult: resultMsg,
        verificationStatus: 'verified',
        verificationConfidence: confidence,
        evidenceSummary,
        timestamp: new Date().toISOString(),
      };
    } else {
      updatedLogs.push({
        goalId,
        date: todayStr,
        completed: true,
        proofVerified: true,
        proofVerificationResult: resultMsg,
        verificationStatus: 'verified',
        verificationConfidence: confidence,
        evidenceSummary,
        timestamp: new Date().toISOString(),
      });
    }

    setDailyLogs(updatedLogs);
    saveDailyLogs(updatedLogs);
    triggerHapticFeedback('success');

    const completedGoal = goals.find((g) => g.id === goalId);

    // Habit Stacking Trigger
    if (completedGoal?.linkedGoalId) {
      const nextGoal = goals.find((g) => g.id === completedGoal.linkedGoalId);
      const isNextGoalCompletedToday = updatedLogs.some(
        (l) => l.goalId === nextGoal?.id && l.date === todayStr && l.completed
      );

      if (nextGoal && !nextGoal.archived && !isNextGoalCompletedToday) {
        setActiveHabitStackPrompt({
          completedGoal,
          nextGoal,
          stackingNote: completedGoal.stackingNote,
        });
      }
    }

    const { currentStreak } = calculateGoalStreak(
      goalId,
      updatedLogs,
      todayStr,
      userConfig.absenceThresholdDays || 3
    );

    const milestoneMilestones = [7, 14, 21, 30, 60, 90, 100];
    if (milestoneMilestones.includes(currentStreak) || (currentStreak >= 7 && currentStreak % 7 === 0)) {
      if (completedGoal) {
        triggerStreakToast(completedGoal.name, currentStreak);
        triggerHapticFeedback('heavy');
      }
    }
  };

  const handleToggleGoal = (goalId: string) => {
    const existingIndex = dailyLogs.findIndex(
      (l) => l.goalId === goalId && l.date === todayStr
    );
    const existing = existingIndex >= 0 ? dailyLogs[existingIndex] : undefined;

    if (existing?.completed) {
      const updatedLogs = [...dailyLogs];
      updatedLogs[existingIndex] = {
        ...existing,
        completed: false,
        verificationStatus: 'unchecked',
        timestamp: new Date().toISOString(),
      };
      setDailyLogs(updatedLogs);
      saveDailyLogs(updatedLogs);
      triggerHapticFeedback('light');
      return;
    }

    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      setActiveCompletionGoal(goal);
    }
  };

  const handleSaveGoal = (goal: Goal) => {
    const existingIndex = goals.findIndex((g) => g.id === goal.id);
    let updated: Goal[];
    if (existingIndex >= 0) {
      updated = [...goals];
      updated[existingIndex] = goal;
    } else {
      updated = [goal, ...goals];
    }
    setGoals(updated);
    saveGoals(updated);
  };

  const handleDeleteGoal = (goalId: string) => {
    const updated = goals.filter((g) => g.id !== goalId);
    setGoals(updated);
    saveGoals(updated);
  };

  const handleAddPresetGoals = () => {
    const existingNames = new Set(goals.map((g) => g.name.toLowerCase()));
    const newPresets = SCIENCE_PRESET_GOALS.filter((p) => !existingNames.has(p.name.toLowerCase()));
    if (newPresets.length === 0) {
      triggerStreakToast('Science Presets', 0, 'All science preset habits are already active in your tracker!');
      return;
    }
    const updated = [...goals, ...newPresets];
    setGoals(updated);
    saveGoals(updated);
    triggerStreakToast('Science Presets', 0, `✨ Added ${newPresets.length} science-backed habit presets!`);
  };

  const handleSaveJournal = (journal: DailyJournal) => {
    saveJournal(journal);
    setJournals(loadJournals());

    const hour = new Date().getHours();
    const text = journal.entry.toLowerCase();
    if (journal.date === todayStr && hour >= 20 && journal.entry.trim().length >= 120) {
      goals
        .filter((goal) => !goal.archived)
        .filter((goal) => !dailyLogs.some((log) => log.goalId === goal.id && log.date === todayStr && log.completed))
        .filter((goal) => {
          const nameWords = goal.name.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
          return nameWords.some((word) => text.includes(word));
        })
        .slice(0, 1)
        .forEach((goal) => {
          aiClient
            .verifyProof({
              goalName: goal.name,
              goalDescription: goal.description,
              journalEntry: journal.entry,
              verificationMode: goal.proofPreference === 'reflection' ? 'journal_reflection' : 'journal_challenge',
            })
            .then((res) => {
              if (res.verified) {
                completeGoalWithEvidence(
                  goal.id,
                  res.message || 'Late-day journal verified this completion.',
                  res.confidence || 70,
                  res.evidenceSummary || 'NEXUS matched a specific evening journal entry to this goal.'
                );
                triggerStreakToast(goal.name, 0, 'NEXUS found this in your journal and marked it done.');
              }
            })
            .catch(() => {
              /* Late-day auto verification is best-effort only. */
            });
        });
    }
  };

  const handleSaveFactor = (factor: LifeExpectancyFactor) => {
    const updated = factors.map((f) => (f.id === factor.id ? factor : f));
    setFactors(updated);
    saveFactors(updated);
  };

  const handleGenerateDigest = async () => {
    setLoadingDigest(true);
    try {
      const data = await aiClient.generateInsights({
        logsHistory: dailyLogs,
        scoresHistory: scoreData.scores,
        lifePathGoal: userConfig.lifePathGoal,
      });
      if (data.digest) {
        saveDigest(data.digest);
        setDigests(loadDigests());
      }
    } catch (err) {
      console.error('Digest error:', err);
    } finally {
      setLoadingDigest(false);
    }
  };

  const handleOpenProofModal = (goal?: Goal) => {
    setActiveProofGoal(goal);
    setShowProofModal(true);
  };

  const handleProofVerified = (
    goalId: string,
    resultMsg: string,
    confidence = 85,
    evidenceSummary = 'Proof media and journal details passed review.'
  ) => {
    completeGoalWithEvidence(goalId, resultMsg, confidence, evidenceSummary);
    setActiveCompletionGoal(undefined);
    setShowProofModal(false);
  };

  const handleImportJSON = (jsonStr: string) => {
    const success = importBackupJSON(jsonStr);
    if (success) {
      setUserConfig(loadUserConfig());
      setGoals(loadGoals());
      setDailyLogs(loadDailyLogs());
      setJournals(loadJournals());
      setFactors(loadFactors());
      setDigests(loadDigests());
      alert('Backup data successfully imported!');
    } else {
      alert('Invalid backup file format.');
    }
  };

  const handleUpdateUserConfig = useCallback((updated: UserConfig) => {
    setUserConfig(updated);
    saveUserConfig(updated);
  }, []);

  const handleCompleteTutorial = useCallback(() => {
    setShowTutorial(false);
    const updated = { ...userConfig, tutorialCompleted: true };
    setUserConfig(updated);
    saveUserConfig(updated);
  }, [userConfig]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950 antialiased">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        compositeScore={scoreData.composite}
        categoryScores={scoreData.scores}
        userConfig={userConfig}
        onExport={exportBackupJSON}
        onAnonymizeExport={exportAnonymizedBackupJSON}
        onImport={handleImportJSON}
        onResetOnboarding={() => setShowOnboarding(true)}
        settingsContent={
          <div className="space-y-4">
            <AiServerSettings
              userConfig={userConfig}
              onUpdateUserConfig={handleUpdateUserConfig}
            />
            <LocationSettings
              userConfig={userConfig}
              onUpdateUserConfig={handleUpdateUserConfig}
            />
            <SmartReminderNotifier
              goals={goals}
              dailyLogs={dailyLogs}
              todayStr={todayStr}
              onToggleGoal={handleToggleGoal}
              showControls
              runScheduler={false}
            />
            <NexusNotificationCenter
              goals={goals}
              dailyLogs={dailyLogs}
              todayStr={todayStr}
              scoreData={scoreData}
              userConfig={userConfig}
              onToggleGoal={handleToggleGoal}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          </div>
        }
      />
      {/* Keeps content below the fixed top bar */}
      <div className="app-topbar-spacer" aria-hidden="true" />

      <SmartReminderNotifier
        goals={goals}
        dailyLogs={dailyLogs}
        todayStr={todayStr}
        onToggleGoal={handleToggleGoal}
        showControls={false}
      />

      {/* Background plan building indicator */}
      {isPlanBuilding && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-zinc-950/95 border border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-950/40 ring-1 ring-amber-500/30 backdrop-blur-md max-w-sm sm:max-w-md w-full mx-4">
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white tracking-wide">NEXUS AI Planner</p>
            <p className="text-[11px] text-amber-300/90 truncate mt-0.5">{planBuildingStage}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Plan built success indicator - interactive CTA */}
      {planBuildDone && !isPlanBuilding && (
        <div
          onClick={() => setCurrentTab('aicoach')}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-950/95 border border-emerald-500/50 rounded-2xl shadow-2xl ring-1 ring-emerald-500/30 backdrop-blur-md cursor-pointer hover:bg-emerald-900/95 transition-all max-w-sm sm:max-w-md w-full mx-4 animate-fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Plan Ready! ✨</p>
              <p className="text-[11px] text-emerald-300 truncate">Tap to view your Master Blueprint & Goals</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg shrink-0">
            View &rarr;
          </span>
        </div>
      )}


      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 pb-28 sm:pb-32">
        {currentTab === 'dashboard' && (
          <Dashboard
            scoreData={scoreData}
            goals={goals}
            dailyLogs={dailyLogs}
            journals={journals}
            todayStr={todayStr}
            userConfig={userConfig}
            onToggleGoal={handleToggleGoal}
            onOpenProofModal={(g) => handleOpenProofModal(g)}
            onOpenAddGoal={() => setCurrentTab('goals')}
            onToggleHealthSync={(enabled) => {
              const updated = { ...userConfig, healthApiSyncEnabled: enabled };
              setUserConfig(updated);
              saveUserConfig(updated);
            }}
            onTriggerStreakToast={triggerStreakToast}
            onUpdateUserConfig={handleUpdateUserConfig}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'aicoach' && (
          <AICoachView
            userConfig={userConfig}
            onUpdateUserConfig={handleUpdateUserConfig}
            onAddGoals={handleBatchAddGoals}
            existingGoals={goals}
            dailyLogs={dailyLogs}
            journals={journals}
            currentScore={scoreData.composite}
          />
        )}

        {currentTab === 'journal' && (
          <JournalView
            todayStr={todayStr}
            journals={journals}
            userConfig={userConfig}
            onSaveJournal={handleSaveJournal}
            onOpenProofModal={() => handleOpenProofModal()}
          />
        )}

        {currentTab === 'goals' && (
          <GoalsManager
            goals={goals}
            userConfig={userConfig}
            onSaveGoal={handleSaveGoal}
            onDeleteGoal={handleDeleteGoal}
            onAddPresetGoals={handleAddPresetGoals}
            plannedTasks={plannedTasks}
            milestones={milestones}
            goalDependencies={goalDependencies}
            onPlanReady={handlePlanReady}
            onTasksUpdated={handleTasksUpdated}
            onToggleGoal={handleToggleGoal}
            onUpdateIntakeState={(intakeState) => {
              const updated = { ...userConfig, intakeState };
              setUserConfig(updated);
              saveUserConfig(updated);
            }}
          />
        )}


        {currentTab === 'trends' && (
          <TrendsView
            goals={goals}
            dailyLogs={dailyLogs}
            todayStr={todayStr}
            userConfig={userConfig}
          />
        )}

        {currentTab === 'insights' && (
          <InsightsView
            digests={digests}
            userConfig={userConfig}
            goals={goals}
            dailyLogs={dailyLogs}
            onGenerateNewDigest={handleGenerateDigest}
            loading={loadingDigest}
          />
        )}

        {currentTab === 'longevity' && (
          <LifeExpectancyView
            userConfig={userConfig}
            factors={factors}
            goals={goals}
            dailyLogs={dailyLogs}
            todayStr={todayStr}
            onSaveFactor={handleSaveFactor}
          />
        )}

        {currentTab === 'achievements' && (
          <AchievementsView
            userConfig={userConfig}
            goals={goals}
            dailyLogs={dailyLogs}
            journals={journals}
            compositeScore={scoreData.composite}
            categoryScores={scoreData.scores}
            onBack={() => setCurrentTab('dashboard')}
            onUpdateUserConfig={handleUpdateUserConfig}
          />
        )}
      </main>

      {/* Onboarding AI Conversation Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleCompleteOnboarding}
        onStartBackgroundPlan={handleStartBackgroundPlan}
        initialConfig={userConfig}
      />

      {/* Step-by-step Tutorial */}
      {showTutorial && !showOnboarding && (
        <TutorialWalkthrough
          onComplete={handleCompleteTutorial}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
      )}

      {/* Proof Verification AI Vision Modal */}
      <ProofVerificationModal
        isOpen={showProofModal}
        onClose={() => setShowProofModal(false)}
        goal={activeProofGoal}
        onVerified={handleProofVerified}
      />

      <CompletionReviewModal
        isOpen={Boolean(activeCompletionGoal)}
        goal={activeCompletionGoal}
        todayStr={todayStr}
        existingJournal={journals.find((j) => j.date === todayStr)}
        onClose={() => setActiveCompletionGoal(undefined)}
        onGoJournal={() => {
          setActiveCompletionGoal(undefined);
          setCurrentTab('journal');
        }}
        onSaveJournal={handleSaveJournal}
        onVerified={handleProofVerified}
      />

      {/* Habit Stacking Interactive Prompt Modal */}
      {activeHabitStackPrompt && (
        <HabitStackPrompt
          completedGoal={activeHabitStackPrompt.completedGoal}
          nextGoal={activeHabitStackPrompt.nextGoal}
          stackingNote={activeHabitStackPrompt.stackingNote}
          onCompleteNextGoal={() => handleToggleGoal(activeHabitStackPrompt.nextGoal.id)}
          onClose={() => setActiveHabitStackPrompt(null)}
        />
      )}

      {/* Streak Milestone Toast Notifications */}
      <StreakToastContainer toasts={streakToasts} onDismiss={handleDismissToast} />

      {/* Floating Translucent Mobile Navigation Bar */}
      <FloatingBottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
}
