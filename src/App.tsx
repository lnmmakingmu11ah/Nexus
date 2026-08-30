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
import { FocusStudio } from './components/FocusStudio';
import { ProofVerificationModal } from './components/ProofVerificationModal';
import { CompletionReviewModal } from './components/CompletionReviewModal';
import { StreakToastContainer, StreakToastData } from './components/StreakToast';
import { SmartReminderNotifier } from './components/SmartReminderNotifier';
import { NexusNotificationCenter } from './components/NexusNotificationCenter';
import { LocationSettings } from './components/LocationSettings';
import { AiServerSettings } from './components/AiServerSettings';
import { PlanReviewModal } from './components/PlanReviewModal';
import { HabitStackPrompt } from './components/HabitStackPrompt';
import { triggerHapticFeedback } from './utils/haptics';
import { aiClient } from './services/aiClient';
import { mergeMemory } from './utils/aiMemory';

import {
  AIDigest,
  AIPlannedGoal,
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
import { applyAdaptiveTimelinesToGoals, mergeAdaptiveWarnings, syncBlueprintFromGoals, adaptPendingTasks } from './utils/adaptiveEngine';
import { filterIntakePlanArtifacts, materializeBlueprintPlan } from './utils/planMaterializer';
import { checkAndUnlockBadges } from './utils/badges';
import { ensureNexusPersona } from './utils/nexusPersona';
import { rewriteBlueprintFromCompletions, shouldRewriteBlueprint } from './utils/weeklyBlueprint';
import { mergeIdentity } from './utils/userIdentity';
import { applyDailyCapToGoals, capFromProfile } from './utils/dailyCap';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [todayStr] = useState<string>(new Date().toISOString().split('T')[0]);

  // Persistent States
  const [userConfig, setUserConfig] = useState<UserConfig>(() => {
    const loaded = loadUserConfig();
    const next = { ...loaded, nexusPersona: ensureNexusPersona(loaded.nexusPersona) };
    if (!loaded.nexusPersona?.locked) saveUserConfig(next);
    return next;
  });
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
    const profileChanged = current !== next;

    const { goals: adaptedGoals, warnings } = applyAdaptiveTimelinesToGoals(goals, dailyLogs, nextProfile);
    const timelinesChanged = adaptedGoals.some((g, i) =>
      g.estimatedDaysToMastery !== goals[i]?.estimatedDaysToMastery ||
      g.likelihoodPercent !== goals[i]?.likelihoodPercent ||
      g.adaptiveTimelineUpdatedAt !== goals[i]?.adaptiveTimelineUpdatedAt
    );

    const adaptedTasks = adaptPendingTasks(plannedTasks, nextProfile, todayStr);
    const tasksChanged = adaptedTasks.some(
      (t, i) => t.hardness !== plannedTasks[i]?.hardness || t.durationMinutes !== plannedTasks[i]?.durationMinutes
    );

    if (!profileChanged && !timelinesChanged && !tasksChanged) return;

    if (timelinesChanged) {
      setGoals(adaptedGoals);
      saveGoals(adaptedGoals);
    }
    if (tasksChanged) {
      setPlannedTasks(adaptedTasks);
      savePlannedTasks(adaptedTasks);
    }

    const updated: UserConfig = {
      ...userConfig,
      behaviorProfile: nextProfile,
      ...(timelinesChanged
        ? {
            lastAdaptiveSyncAt: new Date().toISOString(),
            adaptiveWarnings: mergeAdaptiveWarnings(userConfig.adaptiveWarnings, warnings),
            masterBlueprint: syncBlueprintFromGoals(userConfig.masterBlueprint, adaptedGoals),
          }
        : {}),
    };
    setUserConfig(updated);
    saveUserConfig(updated);
  }, [dailyLogs, goals, plannedTasks, userConfig.onboarded, userConfig.onboardedAt, todayStr]);

  useEffect(() => {
    if (!shouldRewriteBlueprint(userConfig, dailyLogs)) return;
    const { goals: nextGoals, rewrite, blueprint, dailyCap } = rewriteBlueprintFromCompletions(goals, dailyLogs, userConfig);
    setGoals(nextGoals);
    saveGoals(nextGoals);
    const updated: UserConfig = {
      ...userConfig,
      lastBlueprintRewriteAt: rewrite.at,
      lastBlueprintRewrite: rewrite,
      masterBlueprint: blueprint || userConfig.masterBlueprint,
      behaviorProfile: userConfig.behaviorProfile
        ? { ...userConfig.behaviorProfile, currentDailyCap: dailyCap }
        : userConfig.behaviorProfile,
    };
    setUserConfig(updated);
    saveUserConfig(updated);
  }, [dailyLogs, goals, userConfig.onboarded, userConfig.lastBlueprintRewriteAt, userConfig.masterBlueprint]);

  // Automatically prompt for push notifications & location permissions on startup / onboarding
  useEffect(() => {
    if (!userConfig.onboarded) return;

    // 1. Request Notification Permission
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
        .then((perm) => {
          if (perm === 'granted') {
            try {
              new Notification('NEXUS Notifications Enabled! 🎯', {
                body: 'You will now receive smart reminders when your daily habits and goals are due.',
              });
            } catch {
              /* ignore notification constructor errors on mobile */
            }
          }
        })
        .catch(() => {});
    }

    // 2. Request Location Permission if not yet saved
    if (!userConfig.locationOptIn && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const updated: UserConfig = {
            ...userConfig,
            locationOptIn: true,
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          };
          setUserConfig(updated);
          saveUserConfig(updated);
        },
        () => {
          /* permission denied or unavailable */
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 60 }
      );
    }
  }, [userConfig.onboarded]);

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
      // Preserve any roadblocks from the existing blueprint (they come from GoalScout synthesis)
      roadblocks: userConfig.masterBlueprint?.roadblocks || [],
      // Preserve lifetimeMegaGoals from existing blueprint
      lifetimeMegaGoals: userConfig.masterBlueprint?.lifetimeMegaGoals || [],
      extractedSetbacks: userConfig.masterBlueprint?.extractedSetbacks || [],
      createdAt: new Date().toISOString(),
    };

    // Commit to state and storage
    const mergedGoals = applyDailyCapToGoals(
      [...goals, ...newGoals],
      capFromProfile(userConfig.behaviorProfile),
      dailyLogs,
      todayStr
    );
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

        const identityRes = await aiClient.extractIdentity({
          messages: transcript,
          existingIdentity: partialConfig.userIdentity,
        }).catch(() => ({ identity: partialConfig.userIdentity }));
        const identity = mergeIdentity(partialConfig.userIdentity, identityRes?.identity);
        const withIdentity: UserConfig = { ...partialConfig, userIdentity: identity, nexusPersona: ensureNexusPersona(partialConfig.nexusPersona) };
        setUserConfig(withIdentity);
        saveUserConfig(withIdentity);

        const res = await aiClient.synthesizeBlueprint({
          transcript,
          userContext: { userName: withIdentity.userName, userIdentity: identity, behaviorProfile: withIdentity.behaviorProfile },
        });
        const blueprint = res.blueprint;
        const reviewConfig: UserConfig = {
          ...withIdentity,
          onboardedAt: partialConfig.onboardedAt || new Date().toISOString(),
          pendingPlanReview: {
            blueprint: { ...blueprint, createdAt: new Date().toISOString(), status: 'pending_review' },
            transcript,
            partialConfig: withIdentity,
          },
        };
        setUserConfig(reviewConfig);
        saveUserConfig(reviewConfig);
        setPlanBuildDone(true);
        triggerStreakToast('NEXUS Blueprint', 0, '🎯 Plan ready — review and lock your goals');
        setTimeout(() => setPlanBuildDone(false), 10000);
      } catch (err) {
        console.error('Background blueprint synthesis failed:', err);
        triggerStreakToast('Blueprint', 0, '⚠️ Plan generation hit an issue — you can rebuild it in AI Coach');
      } finally {
        setIsPlanBuilding(false);
      }
    },
    []
  );

  const handleConfirmPlanReview = useCallback(
    (selected: AIPlannedGoal[]) => {
      const pending = userConfig.pendingPlanReview;
      if (!pending?.blueprint) return;
      const blueprint = { ...pending.blueprint, plannedGoals: selected, status: 'ready' as const };
      const materialized = materializeBlueprintPlan(blueprint, pending.partialConfig, selected);

      const blueprintMemory = mergeMemory(pending.partialConfig.aiMemory, {
        userProfile: blueprint.userProfileSummary || pending.partialConfig.aiMemory?.userProfile,
        knownGoals: materialized.goals.map((g) => g.name),
        setbacks: blueprint.extractedSetbacks || [],
        motivations: blueprint.masterVision ? [blueprint.masterVision] : [],
        personalNotes: blueprint.pillarAutoFillNotes ? [blueprint.pillarAutoFillNotes] : [],
        lastUpdated: new Date().toISOString(),
      });

      const baselines = blueprint.categoryBaselines || pending.partialConfig.categoryBaselines;
      const finalConfig: UserConfig = {
        ...pending.partialConfig,
        userName: blueprint.userName || pending.partialConfig.userName,
        lifePathGoal: blueprint.masterVision || pending.partialConfig.lifePathGoal,
        categoryBaselines: baselines,
        aiMemory: blueprintMemory,
        userIdentity: pending.partialConfig.userIdentity || userConfig.userIdentity,
        nexusPersona: ensureNexusPersona(pending.partialConfig.nexusPersona || userConfig.nexusPersona),
        onboardingTranscript: pending.transcript,
        masterBlueprint: { ...blueprint, createdAt: new Date().toISOString(), status: 'ready' },
        pendingPlanReview: undefined,
        onboardedAt: pending.partialConfig.onboardedAt || new Date().toISOString(),
      };

      setUserConfig(finalConfig);
      saveUserConfig(finalConfig);

      const cleaned = filterIntakePlanArtifacts(goals, milestones, plannedTasks, goalDependencies);
      const mergedGoals = [
        ...materialized.goals,
        ...cleaned.goals.filter((g) => !materialized.goals.some((ng) => ng.name.toLowerCase() === g.name.toLowerCase())),
      ];
      const cappedMerged = applyDailyCapToGoals(mergedGoals, capFromProfile(finalConfig.behaviorProfile), dailyLogs, todayStr);
      setGoals(cappedMerged);
      saveGoals(cappedMerged);
      setMilestones([...cleaned.milestones, ...materialized.milestones]);
      saveMilestones([...cleaned.milestones, ...materialized.milestones]);
      setPlannedTasks([...cleaned.tasks, ...materialized.tasks]);
      savePlannedTasks([...cleaned.tasks, ...materialized.tasks]);
      setGoalDependencies([...cleaned.dependencies, ...materialized.dependencies]);
      saveGoalDependencies([...cleaned.dependencies, ...materialized.dependencies]);
      setCurrentTab('aicoach');
    },
    [userConfig.pendingPlanReview, goals, milestones, plannedTasks, goalDependencies]
  );

  const handleRerunGoalScout = useCallback(() => {
    const confirmed = window.confirm(
      'Re-run Goal Scout? Intake-generated goals and the current blueprint will be cleared so NEXUS can rebuild your lifetime plan.'
    );
    if (!confirmed) return;
    const cleaned = filterIntakePlanArtifacts(goals, milestones, plannedTasks, goalDependencies);
    setGoals(cleaned.goals);
    saveGoals(cleaned.goals);
    setMilestones(cleaned.milestones);
    saveMilestones(cleaned.milestones);
    setPlannedTasks(cleaned.tasks);
    savePlannedTasks(cleaned.tasks);
    setGoalDependencies(cleaned.dependencies);
    saveGoalDependencies(cleaned.dependencies);

    const resetConfig: UserConfig = {
      ...userConfig,
      onboarded: false,
      masterBlueprint: undefined,
      pendingPlanReview: undefined,
      onboardingTranscript: undefined,
      adaptiveWarnings: [],
      aiChatHistory: [],
    };
    setUserConfig(resetConfig);
    saveUserConfig(resetConfig);
    setShowOnboarding(true);
  }, [goals, milestones, plannedTasks, goalDependencies, userConfig]);

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
        const updated = applyDailyCapToGoals(
          [...createdGoals, ...currentGoals],
          capFromProfile(userConfig.behaviorProfile),
          dailyLogs,
          todayStr
        );
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

    const latestScores = calculateScoresForDate(todayStr, goals, updatedLogs, userConfig);
    checkAndUnlockBadges(
      goals,
      updatedLogs,
      journals,
      latestScores.composite,
      latestScores.scores,
      userConfig,
      (updated) => {
        setUserConfig(updated);
        saveUserConfig(updated);
        const newest = (updated.unlockedBadges || []).filter((id) => !(userConfig.unlockedBadges || []).includes(id));
        if (newest[0] && completedGoal) {
          triggerStreakToast(completedGoal.name, currentStreak, `Badge unlocked: ${newest[0].replace(/_/g, ' ')}`);
        }
      }
    );
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
    const capped = applyDailyCapToGoals(updated, capFromProfile(userConfig.behaviorProfile), dailyLogs, todayStr);
    setGoals(capped);
    saveGoals(capped);
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
    const updated = applyDailyCapToGoals(
      [...goals, ...newPresets],
      capFromProfile(userConfig.behaviorProfile),
      dailyLogs,
      todayStr
    );
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
        onResetOnboarding={handleRerunGoalScout}
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
              onUpdateUserConfig={handleUpdateUserConfig}
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
              <p className="text-[11px] text-emerald-300 truncate">
                {userConfig.pendingPlanReview ? 'Tap to review and lock your goals' : 'Tap to view your Master Blueprint & Goals'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg shrink-0">
            View &rarr;
          </span>
        </div>
      )}


      {/* Main Content Area */}
      <main key={currentTab} className="nexus-page-enter max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 pb-nav">
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
            onToggleGoal={handleToggleGoal}
            onNavigateTab={(tab) => setCurrentTab(tab as any)}
            onSaveJournal={handleSaveJournal}
            onRerunGoalScout={handleRerunGoalScout}
            onOpenPlanReview={
              userConfig.pendingPlanReview
                ? () => {
                    const pending = userConfig.pendingPlanReview;
                    if (!pending) return;
                    const updated = { ...userConfig, pendingPlanReview: { ...pending, deferred: false } };
                    setUserConfig(updated);
                    saveUserConfig(updated);
                  }
                : undefined
            }
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

        {currentTab === 'focus' && (
          <FocusStudio
            goals={goals}
            dailyLogs={dailyLogs}
            todayStr={todayStr}
            userConfig={userConfig}
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

      {userConfig.pendingPlanReview?.blueprint && !isPlanBuilding && !userConfig.pendingPlanReview.deferred && (
        <PlanReviewModal
          blueprint={userConfig.pendingPlanReview.blueprint}
          onConfirm={handleConfirmPlanReview}
          onCancel={() => {
            const pending = userConfig.pendingPlanReview;
            if (!pending) return;
            const updated = { ...userConfig, pendingPlanReview: { ...pending, deferred: true } };
            setUserConfig(updated);
            saveUserConfig(updated);
          }}
        />
      )}

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
