import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Calendar,
  Compass,
  Zap,
  Target,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Clock,
  Layers,
  Activity,
  ShieldAlert,
  TrendingUp,
  Edit2,
  Trash2,
  X,
  Check,
  Crown,
  ArrowRight,
  ShieldCheck,
  Milestone as MilestoneIcon,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { UserConfig, AIChatMessage, Goal, DailyGoalLog, DailyJournal, CATEGORY_NAMES, CATEGORY_COLORS, LifetimeMegaGoal, CategoryKey, Milestone, PlannedTask } from '../types';
import { aiClient } from '../services/aiClient';
import { calculateWillpowerAnalytics } from '../utils/willpowerAnalytics';
import { apiOfflineMessage, smartOfflineReply } from '../utils/chatFallback';
import { bubblesFromStreamBuffer, liveStreamVisible } from '../utils/chatTyping';
import { AiErrorPanel } from './AiErrorPanel';
import { mergeMemory } from '../utils/aiMemory';
import { buildAdaptiveTimeline } from '../utils/timelinePlanner';
import { ensureNexusPersona } from '../utils/nexusPersona';
import { mergeIdentity } from '../utils/userIdentity';
import { mapToPassiveCategory } from '../utils/blueprintNormalizer';
import { GoalPathwayModal } from './GoalPathwayModal';
import { getGoalPathway } from '../utils/goalPathways';

interface AICoachViewProps {
  userConfig: UserConfig;
  onUpdateUserConfig: (updated: UserConfig) => void;
  onAddGoals: (goals: Partial<Goal>[]) => void;
  onToggleGoal?: (goalId: string) => void;
  onNavigateTab?: (tab: string) => void;
  onSaveJournal?: (journal: DailyJournal) => void;
  onRerunGoalScout?: () => void;
  onOpenPlanReview?: () => void;
  existingGoals: Goal[];
  dailyLogs: DailyGoalLog[];
  journals: DailyJournal[];
  currentScore?: number;
  todayStr?: string;
  plannedTasks?: PlannedTask[];
  milestones?: Milestone[];
  initialTab?: 'blueprint' | 'chat';
}



function parseAndExecuteAction(
  rawText: string,
  existingGoals: Goal[],
  onAddGoals: (goals: Partial<Goal>[]) => void,
  onToggleGoal?: (goalId: string) => void,
  onNavigateTab?: (tab: string) => void,
  onSaveJournal?: (journal: DailyJournal) => void
): { cleanedText: string; actionTag?: string } {
  let cleaned = rawText;
  let actionTag: string | undefined;

  const actionRegex = /<<ACTION:(ADD_GOAL|COMPLETE_GOAL|NAVIGATE|ADD_JOURNAL):([\s\S]*?)>>/gi;
  let match;

  while ((match = actionRegex.exec(rawText)) !== null) {
    const actionType = match[1].toUpperCase();
    const payload = match[2].trim();
    cleaned = cleaned.replace(match[0], '').trim();

    if (actionType === 'ADD_GOAL') {
      try {
        const parsed = JSON.parse(payload);
        if (parsed.name) {
          onAddGoals([{
            name: parsed.name,
            description: parsed.description || 'Created via NEXUS AI chat',
            category: mapToPassiveCategory(parsed.category, parsed.name || '', parsed.description || ''),
            frequency: parsed.frequency || 'daily',
            reminderTime: parsed.reminderTime || '08:30',
            reminderEnabled: true,
            basePoints: 5,
            effects: [{ category: mapToPassiveCategory(parsed.category, parsed.name || '', parsed.description || ''), weight: 4 }],
            isLifePathAligned: true,
          }]);
          actionTag = `⚡ Added Goal: "${parsed.name}"`;
        }
      } catch {
        if (payload) {
          onAddGoals([{
            name: payload,
            description: 'Created via NEXUS AI chat',
            category: 'smarts',
            frequency: 'daily',
            reminderTime: '08:30',
            reminderEnabled: true,
            basePoints: 5,
            effects: [{ category: 'smarts', weight: 4 }],
            isLifePathAligned: true,
          }]);
          actionTag = `⚡ Added Goal: "${payload}"`;
        }
      }
    } else if (actionType === 'COMPLETE_GOAL') {
      const target = payload.toLowerCase();
      const matchGoal = existingGoals.find(g =>
        !g.archived && (
          g.id === target ||
          g.name.toLowerCase() === target ||
          g.name.toLowerCase().includes(target) ||
          target.includes(g.name.toLowerCase())
        )
      );
      if (matchGoal && onToggleGoal) {
        onToggleGoal(matchGoal.id);
        actionTag = `⚡ Marked Complete: "${matchGoal.name}"`;
      }
    } else if (actionType === 'NAVIGATE') {
      const tab = payload.toLowerCase();
      if (onNavigateTab) {
        onNavigateTab(tab);
        actionTag = `⚡ Opened ${tab} view`;
      }
    } else if (actionType === 'ADD_JOURNAL') {
      if (onSaveJournal) {
        const today = new Date().toISOString().split('T')[0];
        const nowIso = new Date().toISOString();
        try {
          const parsed = JSON.parse(payload);
          onSaveJournal({
            date: today,
            entry: parsed.entry || payload,
            mood: parsed.mood || 4,
            updatedAt: nowIso,
          });
        } catch {
          onSaveJournal({
            date: today,
            entry: payload,
            mood: 4,
            updatedAt: nowIso,
          });
        }
        actionTag = `⚡ Journal Saved`;
      }
    }
  }

  return { cleanedText: cleaned, actionTag };
}

function offsetDate(dateStr: string, offsetDays: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

function formatTimelineDays(days?: number): string | undefined {
  if (!days || !Number.isFinite(days)) return undefined;
  if (days < 60) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const years = days / 365;
  return `${years >= 10 ? Math.round(years) : years.toFixed(1)} years`;
}

function goalTimelineLabel(goal: Goal): string | undefined {
  const range = goal.timelineRange;
  if (!range) return undefined;
  const min = formatTimelineDays(range.minDays);
  const max = formatTimelineDays(range.maxDays);
  if (!min || !max) return undefined;
  return min === max ? min : `${min}-${max}`;
}

function plannedTimelineLabel(planned: any): string {
  if (planned.timelineSummary) return planned.timelineSummary;
  const range = planned.timelineRange;
  if (range?.minDays && range?.maxDays) {
    const min = formatTimelineDays(Number(range.minDays));
    const max = formatTimelineDays(Number(range.maxDays));
    if (min && max) return min === max ? min : `${min}-${max}`;
  }
  if (planned.estimatedDaysToMastery) return formatTimelineDays(Number(planned.estimatedDaysToMastery)) || '90 days';
  return '90 days';
}

function plannedTimelineSegments(planned: any, behaviorProfile?: any): string[] {
  if (Array.isArray(planned.timelineMap) && planned.timelineMap.length > 0) return planned.timelineMap;
  if (planned.timelinePhase1Label || planned.timelinePhase2Label || planned.timelinePhase3Label) {
    return [
      planned.timelinePhase1Label || 'Phase 1',
      planned.timelinePhase2Label || 'Phase 2',
      planned.timelinePhase3Label || 'Phase 3',
    ];
  }
  const adaptive = buildAdaptiveTimeline(
    String(planned.name || planned.title || 'Goal'),
    String(planned.description || ''),
    behaviorProfile,
    '',
    planned.timelineRange
  );
  return adaptive.timelineMap;
}

export const AICoachView: React.FC<AICoachViewProps> = ({
  userConfig,
  onUpdateUserConfig,
  onAddGoals,
  onToggleGoal,
  onNavigateTab,
  onSaveJournal,
  onRerunGoalScout,
  onOpenPlanReview,
  existingGoals,
  dailyLogs,
  journals,
  currentScore,
  todayStr = new Date().toISOString().split('T')[0],
  plannedTasks = [],
  milestones = [],
  initialTab = 'chat',
}) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'chat'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>(
    userConfig.aiChatHistory && userConfig.aiChatHistory.length > 0
      ? userConfig.aiChatHistory
      : [
          {
            id: 'init-coach',
            sender: 'ai',
            text: `yo ${userConfig.userName || 'champ'}!! 🔥 what's good? im here — anything on ur mind or just wanna vibe?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]
  );
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [brainOffline, setBrainOffline] = useState(false);
  const [lastAiError, setLastAiError] = useState<string | null>(null);
  const [addedGoalNames, setAddedGoalNames] = useState<Set<string>>(
    new Set(existingGoals.map((g) => g.name.toLowerCase()))
  );

  // Goal Execution Pathway Modal State (for all Master Blueprint & Planned Goals)
  const [activePathwayGoal, setActivePathwayGoal] = useState<Goal | null>(null);

  const handleOpenGoalPathway = (goalLike: any) => {
    if (!goalLike) return;
    const nameToMatch = String(goalLike.name || goalLike.title || '').trim().toLowerCase();
    const live = existingGoals.find(
      (g) => (goalLike.id && g.id === goalLike.id) || g.name.trim().toLowerCase() === nameToMatch
    );
    if (live) {
      setActivePathwayGoal(live);
      return;
    }

    const synthesized: Goal = {
      id: goalLike.id || `blueprint-${nameToMatch.replace(/[^a-z0-9]+/g, '-') || 'goal'}`,
      name: goalLike.name || goalLike.title || 'Blueprint Goal',
      description: goalLike.description || 'Master Blueprint strategic goal',
      frequency: (goalLike.targetFrequency === 'weekly' || goalLike.frequency === 'weekly') ? 'weekly' : 'daily',
      category: (goalLike.category as CategoryKey) || 'smarts',
      basePoints: goalLike.basePoints || 10,
      reminderTime: goalLike.reminderTime || '08:00',
      createdAt: goalLike.createdAt || new Date().toISOString(),
      likelihoodPercent: goalLike.chanceOfAchievement || 85,
      effects: goalLike.effects || [{ category: (goalLike.category as CategoryKey) || 'smarts', weight: 4 }],
      isLifePathAligned: true,
      isCognitiveTraining: goalLike.category === 'smarts',
      timelineSummary: goalLike.description || goalLike.timelineSummary || 'Master Blueprint strategic goal',
    };
    setActivePathwayGoal(synthesized);
  };

  // Mega Goals & Planned Goals Edit State
  const [showMegaGoalModal, setShowMegaGoalModal] = useState(false);
  const [editingMegaGoal, setEditingMegaGoal] = useState<Partial<LifetimeMegaGoal> | null>(null);
  const [editingMegaGoalIndex, setEditingMegaGoalIndex] = useState<number | null>(null);

  const [showPlannedGoalModal, setShowPlannedGoalModal] = useState(false);
  const [editingPlannedGoal, setEditingPlannedGoal] = useState<any | null>(null);
  const [editingPlannedGoalIndex, setEditingPlannedGoalIndex] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping, activeTab]);

  const handleSendMessage = async (customText?: string) => {
    const text = customText || inputText.trim();
    if (!text || isTyping) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    try {
      const apiMessages = newMessages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));
      const today = new Date().toISOString().split('T')[0];
      const yesterday = offsetDate(today, -1);
      const activeGoals = existingGoals.filter((goal) => !goal.archived);
      const completedToday = dailyLogs
        .filter((log) => log.date === today && log.completed)
        .map((log) => activeGoals.find((goal) => goal.id === log.goalId)?.name)
        .filter(Boolean) as string[];
      const completedYesterdayIds = new Set(
        dailyLogs.filter((log) => log.date === yesterday && log.completed).map((log) => log.goalId)
      );
      const missedYesterday = activeGoals
        .filter((goal) => !completedYesterdayIds.has(goal.id))
        .map((goal) => goal.name);
      const recentCompletions = Array.from({ length: 7 }, (_, idx) => {
        const date = offsetDate(today, -idx);
        const goalsDone = dailyLogs
          .filter((log) => log.date === date && log.completed)
          .map((log) => activeGoals.find((goal) => goal.id === log.goalId)?.name)
          .filter(Boolean) as string[];
        return { date, goals: goalsDone };
      });
      const recentJournals = journals
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map((journal) => ({
          date: journal.date,
          entry: journal.entry,
          mood: journal.mood,
        }));
      const goalProgress = analytics.goalLikelihoods.slice(0, 8).map((goal) => ({
        goalId: goal.goalId,
        name: goal.goalName,
        streak: goal.currentStreak,
        likelihoodPercent: goal.likelihoodPercent,
        formattedTimeline: goal.formattedTimeline,
        statusLabel: goal.statusLabel,
      }));

      const liveId = `ai-live-${Date.now()}`;
      const res = await aiClient.chatCompanionStream(
        {
          messages: apiMessages,
          nexusPersona: ensureNexusPersona(userConfig.nexusPersona),
          userContext: {

            userName: userConfig.userName,
            userIdentity: userConfig.userIdentity,
            lifePathGoal: userConfig.lifePathGoal,
            stage: 'open_chat',
            location: userConfig.locationOptIn
              ? {
                  label: userConfig.locationLabel,
                  countryCode: userConfig.countryCode,
                  latitude: userConfig.coordinates?.latitude,
                  longitude: userConfig.coordinates?.longitude,
                }
              : undefined,
            aiMemory: userConfig.aiMemory,
            appContext: {
              today,
              yesterday,
              activeGoals: activeGoals.slice(0, 12).map((goal) => ({
                id: goal.id,
                name: goal.name,
                description: goal.description,
                category: goal.category,
                reminderTime: goal.reminderTime,
                timeline: goalTimelineLabel(goal),
                timelineSummary: goal.timelineSummary,
                timelineMap: goal.timelineMap,
              })),
              completedToday,
              missedYesterday,
              recentCompletions,
              recentJournals,
              currentScore,
              behaviorProfile: userConfig.behaviorProfile,
              goalProgress,
            },
          },
        },
        (_chunk, full) => {
          const { closed, current } = bubblesFromStreamBuffer(full);
          const liveText = liveStreamVisible(current);
          setChatMessages((prev) => {
            const withoutThisTurnAi = prev.filter(
              (m) => m.id !== liveId && !m.id.startsWith(`${liveId}-c`)
            );
            const closedBubbles: AIChatMessage[] = closed
              .map((b, i) => ({
                id: `${liveId}-c${i}`,
                sender: 'ai' as const,
                text: liveStreamVisible(b),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }))
              .filter((b) => b.text);
            const next = [...withoutThisTurnAi, ...closedBubbles];
            if (liveText) {
              next.push({
                id: liveId,
                sender: 'ai',
                text: liveText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }
            return next;
          });
          // Typing indicator stays until the stream fully completes (cleared in finally)
        }
      );

      setBrainOffline(false);
      setLastAiError(null);

      const bubbles: string[] = res.messages && res.messages.length > 0
        ? res.messages
        : [res.reply];

      const finalized: AIChatMessage[] = [];
      bubbles.forEach((rawBubble, i) => {
        const { cleanedText, actionTag } = parseAndExecuteAction(
          rawBubble,
          existingGoals,
          onAddGoals,
          onToggleGoal,
          onNavigateTab,
          onSaveJournal
        );
        const bubbleText = actionTag ? `${cleanedText}\n\n[ ${actionTag} ]` : cleanedText;
        if (!bubbleText.trim()) return;
        finalized.push({
          id: `${liveId}-f${i}`,
          sender: 'ai',
          text: bubbleText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      });

      const runningMessages = finalized.length ? [...newMessages, ...finalized] : newMessages;
      if (finalized.length) setChatMessages(runningMessages);

      // Save entire history + locked persona after stream settles
      const configWithHistory = {
        ...userConfig,
        aiChatHistory: runningMessages,
        nexusPersona: ensureNexusPersona(userConfig.nexusPersona),
      };
      onUpdateUserConfig(configWithHistory);

      Promise.all([
        aiClient
          .extractMemory({
            messages: apiMessages.slice(-10),
            existingMemory: userConfig.aiMemory,
            appContext: {
              today,
              yesterday,
              activeGoals: activeGoals.slice(0, 12).map((goal) => ({
                id: goal.id,
                name: goal.name,
                description: goal.description,
                category: goal.category,
                reminderTime: goal.reminderTime,
                timeline: goalTimelineLabel(goal),
                timelineSummary: goal.timelineSummary,
                timelineMap: goal.timelineMap,
              })),
              completedToday,
              missedYesterday,
              recentCompletions,
              recentJournals,
              currentScore,
              behaviorProfile: userConfig.behaviorProfile,
              goalProgress,
            },
          })
          .catch(() => ({ memory: undefined })),
        aiClient
          .extractIdentity({
            messages: apiMessages.slice(-16),
            existingIdentity: userConfig.userIdentity,
          })
          .catch(() => ({ identity: undefined })),
      ]).then(([memRes, idRes]) => {
        const next = { ...configWithHistory };
        if (memRes?.memory && Object.keys(memRes.memory).length > 0) {
          next.aiMemory = mergeMemory(userConfig.aiMemory, memRes.memory);
        }
        if (idRes?.identity) {
          next.userIdentity = mergeIdentity(userConfig.userIdentity, idRes.identity);
        }
        if (next.aiMemory !== configWithHistory.aiMemory || next.userIdentity !== configWithHistory.userIdentity) {
          onUpdateUserConfig(next);
        }
      });

    } catch (err: any) {
      console.error('NEXUS chat error:', err);
      setBrainOffline(true);
      const errText = err?.detail || err?.message || String(err);
      setLastAiError(errText);
      const isNetwork =
        err?.code === 'NETWORK_OFFLINE' ||
        err?.message === 'NETWORK_OFFLINE' ||
        /Cannot reach local AI server/i.test(errText);
      const reply = isNetwork
        ? `${apiOfflineMessage(Capacitor.isNativePlatform())}\n\n(meanwhile) ${smartOfflineReply(text, 'open_chat', userConfig.userName)}`
        : smartOfflineReply(text, 'open_chat', userConfig.userName);

      const fallbackAiMsg: AIChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const updatedHistory = [...newMessages, fallbackAiMsg];
      setChatMessages(updatedHistory);
      onUpdateUserConfig({
        ...userConfig,
        aiChatHistory: updatedHistory,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddPlannedGoalToActive = (planned: any) => {
    const newGoal: Partial<Goal> = {
      name: planned.name,
      description: planned.description,
      category: planned.category || 'smarts',
      frequency: planned.targetFrequency || 'daily',
      reminderTime: planned.reminderTime || '08:30',
      reminderEnabled: true,
      basePoints: planned.basePoints || 5,
      effects: planned.effects || [{ category: planned.category || 'smarts', weight: 4 }],
      isLifePathAligned: true,
      isCognitiveTraining: planned.category === 'smarts',
    };

    onAddGoals([newGoal]);
    setAddedGoalNames((prev) => new Set(prev).add(planned.name.toLowerCase()));
  };

  const handleOpenNewMegaGoal = () => {
    setEditingMegaGoal({
      title: '',
      description: '',
      timelineEstimate: '3-5 years',
      category: 'life',
    });
    setEditingMegaGoalIndex(null);
    setShowMegaGoalModal(true);
  };

  const handleOpenEditMegaGoal = (goal: LifetimeMegaGoal, index: number) => {
    setEditingMegaGoal({ ...goal });
    setEditingMegaGoalIndex(index);
    setShowMegaGoalModal(true);
  };

  const handleSaveMegaGoal = () => {
    if (!editingMegaGoal?.title?.trim()) return;
    const currentMega = [...(userConfig.masterBlueprint?.lifetimeMegaGoals || [])];
    const newEntry: LifetimeMegaGoal = {
      title: editingMegaGoal.title.trim(),
      description: editingMegaGoal.description?.trim() || '',
      timelineEstimate: editingMegaGoal.timelineEstimate?.trim() || 'Long-term',
      category: editingMegaGoal.category || 'life',
    };

    if (editingMegaGoalIndex !== null && editingMegaGoalIndex >= 0) {
      currentMega[editingMegaGoalIndex] = newEntry;
    } else {
      currentMega.push(newEntry);
    }

    const updatedBlueprint = {
      ...(userConfig.masterBlueprint || {
        userName: userConfig.userName || 'Champion',
        masterVision: userConfig.lifePathGoal || 'Living with purpose and focus',
        createdAt: new Date().toISOString(),
        plannedGoals: [],
        roadblocks: [],
      }),
      lifetimeMegaGoals: currentMega,
    };

    onUpdateUserConfig({
      ...userConfig,
      masterBlueprint: updatedBlueprint,
    });
    setShowMegaGoalModal(false);
    setEditingMegaGoal(null);
    setEditingMegaGoalIndex(null);
  };

  const handleDeleteMegaGoal = (index: number) => {
    const currentMega = [...(userConfig.masterBlueprint?.lifetimeMegaGoals || [])];
    currentMega.splice(index, 1);
    const updatedBlueprint = {
      ...userConfig.masterBlueprint!,
      lifetimeMegaGoals: currentMega,
    };
    onUpdateUserConfig({
      ...userConfig,
      masterBlueprint: updatedBlueprint,
    });
  };

  const handleOpenNewPlannedGoal = () => {
    setEditingPlannedGoal({
      name: '',
      description: '',
      category: 'health',
      reminderTime: '08:00',
      basePoints: 5,
      targetFrequency: 'daily',
      chanceOfAchievement: 85,
      willpowerStrain: 'Low',
      timelinePhase1: 'Days 1–30: Foundation',
      timelinePhase2: 'Days 30–90: Consistency',
      timelinePhase3: 'Days 90+: Mastery',
      timelineSummary: 'Mastery arc',
    });
    setEditingPlannedGoalIndex(null);
    setShowPlannedGoalModal(true);
  };

  const handleOpenEditPlannedGoal = (goal: any, index: number) => {
    setEditingPlannedGoal({ ...goal });
    setEditingPlannedGoalIndex(index);
    setShowPlannedGoalModal(true);
  };

  const handleSavePlannedGoal = () => {
    if (!editingPlannedGoal?.name?.trim()) return;
    const currentGoals = [...(userConfig.masterBlueprint?.plannedGoals || [])];
    const newEntry = {
      ...editingPlannedGoal,
      name: editingPlannedGoal.name.trim(),
      description: editingPlannedGoal.description?.trim() || '',
      category: editingPlannedGoal.category || 'health',
      reminderTime: editingPlannedGoal.reminderTime || '08:00',
      targetFrequency: editingPlannedGoal.targetFrequency || 'daily',
      basePoints: editingPlannedGoal.basePoints || 5,
    };

    if (editingPlannedGoalIndex !== null && editingPlannedGoalIndex >= 0) {
      currentGoals[editingPlannedGoalIndex] = newEntry;
    } else {
      currentGoals.push(newEntry);
    }

    const updatedBlueprint = {
      ...(userConfig.masterBlueprint || {
        userName: userConfig.userName || 'Champion',
        masterVision: userConfig.lifePathGoal || 'Living with purpose',
        createdAt: new Date().toISOString(),
        plannedGoals: [],
        roadblocks: [],
      }),
      plannedGoals: currentGoals,
    };

    onUpdateUserConfig({
      ...userConfig,
      masterBlueprint: updatedBlueprint,
    });
    setShowPlannedGoalModal(false);
    setEditingPlannedGoal(null);
    setEditingPlannedGoalIndex(null);
  };

  const handleDeletePlannedGoal = (index: number) => {
    const currentGoals = [...(userConfig.masterBlueprint?.plannedGoals || [])];
    currentGoals.splice(index, 1);
    const updatedBlueprint = {
      ...userConfig.masterBlueprint!,
      plannedGoals: currentGoals,
    };
    onUpdateUserConfig({
      ...userConfig,
      masterBlueprint: updatedBlueprint,
    });
  };

  const blueprint = userConfig.masterBlueprint;

  // Calculate Willpower & Goal Likelihood Analytics
  const analytics = calculateWillpowerAnalytics(
    existingGoals,
    dailyLogs,
    new Date().toISOString().split('T')[0],
    userConfig,
    30
  );



  return (
    <div className="space-y-0 max-w-6xl mx-auto">

      {/* ─── TOP TAB BAR ─── Full-page ChatGPT style */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/60 px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: NEXUS wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/40">
            <Bot className="w-4 h-4 text-zinc-950" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight hidden sm:block">NEXUS</span>
        </div>

        {/* Center: Tab Pills */}
        <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-xl p-1 gap-0.5 flex-1 max-w-xs mx-auto">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>NEXUS</span>
          </button>
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
              activeTab === 'blueprint'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Blueprint</span>
          </button>
          {onRerunGoalScout && (
            <button
              onClick={onRerunGoalScout}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Scout</span>
            </button>
          )}
        </div>

        {/* Right: Plan Review */}
        {onOpenPlanReview && (
          <button
            type="button"
            onClick={onOpenPlanReview}
            className="shrink-0 p-2 text-zinc-400 hover:text-amber-300 transition-colors rounded-lg hover:bg-zinc-800/60"
            title="Review Plan"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* TAB 1: MASTER BLUEPRINT & TIMELINES */}
      {activeTab === 'blueprint' && (
        <div className="space-y-6 pt-4 px-0">
          {userConfig.adaptiveWarnings && userConfig.adaptiveWarnings.length > 0 && (
            <div className="bg-zinc-950 border border-amber-500/25 rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Timeline shifts</h3>
              {userConfig.adaptiveWarnings.slice(-4).reverse().map((w) => (
                <p key={w.id} className={`text-[11px] leading-relaxed ${w.direction === 'slipped' ? 'text-rose-300' : 'text-emerald-300'}`}>
                  {w.message}
                </p>
              ))}
            </div>
          )}

          {/* Master Vision & Executive Strategy */}
          {blueprint && (
            <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>AI Analyzed Core Vision & Executive Strategy</span>
              </div>
              <h3 className="text-base font-bold text-white leading-snug">
                {blueprint.masterVision}
              </h3>
              {blueprint.executiveSummary && (
                <div className="bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                    Executive Strategy Roadmap
                  </span>
                  <p className="text-xs text-amber-100/90 leading-relaxed">
                    {blueprint.executiveSummary}
                  </p>
                </div>
              )}

              {/* Diagnostic Profile Summary */}
              {(blueprint.diagnosticSummary?.currentBaseline ||
                blueprint.diagnosticSummary?.primaryBlockers?.length ||
                userConfig.userIdentity?.currentBaseline ||
                userConfig.userIdentity?.primaryBlockers?.length) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-zinc-800/80 pt-3">
                  {(blueprint.diagnosticSummary?.currentBaseline || userConfig.userIdentity?.currentBaseline) && (
                    <div className="bg-zinc-900/70 border border-zinc-800 p-2.5 rounded-xl">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold block">
                        Starting Baseline
                      </span>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        {blueprint.diagnosticSummary?.currentBaseline || userConfig.userIdentity?.currentBaseline}
                      </p>
                    </div>
                  )}
                  {(blueprint.diagnosticSummary?.primaryBlockers?.length || userConfig.userIdentity?.primaryBlockers?.length) && (
                    <div className="bg-zinc-900/70 border border-zinc-800 p-2.5 rounded-xl">
                      <span className="text-[10px] font-mono uppercase text-rose-400 font-semibold block">
                        Neutralizing Primary Blockers
                      </span>
                      <p className="text-xs text-rose-200/90 mt-0.5">
                        {(blueprint.diagnosticSummary?.primaryBlockers || userConfig.userIdentity?.primaryBlockers || []).join(' · ')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {blueprint.userProfileSummary && (
                <p className="text-xs text-zinc-400 font-light leading-relaxed border-t border-zinc-800/80 pt-3">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase">About you: </span>
                  {blueprint.userProfileSummary}
                </p>
              )}
              {userConfig.behaviorProfile?.engagementTier && (
                <p className="text-[11px] text-amber-200/80">
                  Coaching mode:{' '}
                  {userConfig.behaviorProfile.engagementTier === 'struggling'
                    ? 'rebuild — tiny tasks, more badges'
                    : userConfig.behaviorProfile.engagementTier === 'disciplined'
                      ? 'disciplined — meaningful work, fewer micro-rewards'
                      : 'building — ramping difficulty with your consistency'}
                </p>
              )}
            </div>
          )}

          {/* Macro-View: Multi-Year / Phase Breakdown */}
          {blueprint?.macroPhases && blueprint.macroPhases.length > 0 && (
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <MilestoneIcon className="w-4 h-4 text-amber-400" />
                  <span>Macro-View: Multi-Stage Phase Breakdown</span>
                </div>
                <p className="text-xs text-zinc-400 font-light mt-0.5">
                  Sequential phases across stages with concrete milestone conditions required to transition to next phase.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {blueprint.macroPhases.map((phase: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-zinc-900/90 border border-amber-500/20 hover:border-amber-500/40 p-4 rounded-xl space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                          Phase {phase.phaseNumber || idx + 1}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {phase.timeline || `Stage ${idx + 1}`}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{phase.title}</h4>
                      <p className="text-xs text-zinc-300 font-light leading-relaxed">
                        {phase.description}
                      </p>
                    </div>

                    {phase.transitionCondition && (
                      <div className="bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-lg space-y-1">
                        <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Transition Condition
                        </span>
                        <p className="text-[11px] text-emerald-200/90 leading-tight">
                          {phase.transitionCondition}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medium-View: Checkpoint Schedule */}
          {blueprint?.checkpoints && blueprint.checkpoints.length > 0 && (
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>Medium-View: Checkpoint Schedule & Target Output Metrics</span>
                </div>
                <p className="text-xs text-zinc-400 font-light mt-0.5">
                  Clear output milestones per timeframe so tomorrow is clearly differentiated from today.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {blueprint.checkpoints.map((cp: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {cp.period}
                      </span>
                      <h4 className="text-xs font-semibold text-zinc-200 mt-1">{cp.description}</h4>
                    </div>

                    <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 space-y-1">
                      <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold">
                        Target Output Metric
                      </span>
                      <p className="text-xs font-semibold text-amber-300 leading-snug">
                        {cp.targetOutputMetric}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Micro-View: Daily & Weekly Action Progression */}
          {blueprint?.microProgression && blueprint.microProgression.length > 0 && (
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>Micro-View: Daily & Weekly Action Progression</span>
                </div>
                <p className="text-xs text-zinc-400 font-light mt-0.5">
                  Evolving daily tasks that build on one another over time (Task A enabling Task B).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {blueprint.microProgression.map((prog: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          {prog.dayRange}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">{prog.focus}</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] font-mono uppercase text-zinc-500 font-bold">
                          Daily Action Protocol
                        </span>
                        <ul className="space-y-1 text-xs text-zinc-300">
                          {(prog.dailyActions || []).map((action: string, actIdx: number) => (
                            <li key={actIdx} className="flex items-start gap-1.5 leading-snug">
                              <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {prog.progressionMechanism && (
                      <div className="bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-lg space-y-1">
                        <span className="text-[9px] font-mono font-bold uppercase text-amber-400">
                          Why Task A Enables Task B
                        </span>
                        <p className="text-[11px] text-amber-200/90 leading-tight">
                          {prog.progressionMechanism}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Major Lifetime Goals & Endpoints (Beyond the 5 Daily Pillars) */}
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Major Life Targets & Endpoints</span>
                </div>
                <p className="text-xs text-zinc-400 font-light mt-0.5">
                  Big destination goals beyond daily habit categories (e.g. Become a millionaire, 80kg athletic physique, start a venture).
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewMegaGoal}
                className="self-start sm:self-auto px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Major Goal</span>
              </button>
            </div>

            {((blueprint?.lifetimeMegaGoals && blueprint.lifetimeMegaGoals.length > 0) ||
              (userConfig.userIdentity?.lifeGoals && userConfig.userIdentity.lifeGoals.length > 0)) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(blueprint?.lifetimeMegaGoals || (userConfig.userIdentity?.lifeGoals || []).map((g) => ({ title: g, description: 'Major life target', timelineEstimate: 'Long-term', category: 'life' }))).map((mg: LifetimeMegaGoal, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenGoalPathway(mg)}
                    className="bg-zinc-900/90 border border-amber-500/20 hover:border-amber-500/50 p-4 rounded-xl space-y-2.5 flex flex-col justify-between transition-all group cursor-pointer hover:shadow-lg hover:shadow-amber-500/10"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[9px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                          {mg.timelineEstimate || 'Lifetime Target'}
                        </span>
                        <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditMegaGoal(mg, idx);
                            }}
                            className="p-1 text-zinc-400 hover:text-amber-300 transition-colors"
                            title="Edit Major Goal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMegaGoal(idx);
                            }}
                            className="p-1 text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-amber-300 transition-colors">{mg.title}</h4>
                      {mg.description && (
                        <p className="text-xs text-zinc-300 font-light leading-relaxed">
                          {mg.description}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 pt-1 border-t border-zinc-800/60">
                      {mg.category && (
                        <div className="text-[10px] text-zinc-500 font-mono">
                          Domain: <span className="text-zinc-300">{mg.category}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGoalPathway(mg);
                        }}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-amber-400" />
                          <span>View AI Roadmap & Steps</span>
                        </span>
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl text-center space-y-2">
                <p className="text-xs text-zinc-400">
                  No major lifetime targets added yet. Click &ldquo;Add Major Goal&rdquo; to add your ultimate visions like &ldquo;Become a Millionaire&rdquo; or &ldquo;80kg Athletic Body&rdquo;.
                </p>
              </div>
            )}
          </div>

          {/* AI Calculated Willpower & Goal Likelihood Overview */}
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>AI Analyzed Habit Mastery Probabilities</span>
              </h3>
              {(blueprint?.overallWillpowerIndex || analytics.overallWillpowerIndex > 0) && (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Willpower Index: {blueprint?.overallWillpowerIndex || analytics.overallWillpowerIndex}%
                </span>
              )}
            </div>

            {blueprint?.plannedGoals && blueprint.plannedGoals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {blueprint.plannedGoals.slice(0, 4).map((pg: any, idx: number) => {
                  const live = existingGoals.find((g) => g.name.toLowerCase() === String(pg.name || '').toLowerCase());
                  const chance = live?.likelihoodPercent || pg.chanceOfAchievement || 80;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenGoalPathway(pg)}
                      className="bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 p-3.5 rounded-xl space-y-2 cursor-pointer transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono text-amber-400 font-bold uppercase">{pg.category}</span>
                          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">{pg.name}</h4>
                        </div>
                        <span className="text-sm font-bold font-mono text-emerald-400">{chance}%</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${chance}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                        <span>Scope: {plannedTimelineLabel(pg)}</span>
                        <span className="text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Roadmap</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : analytics.goalLikelihoods.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analytics.goalLikelihoods.slice(0, 4).map((gl) => (
                  <div
                    key={gl.goalId}
                    onClick={() => handleOpenGoalPathway({ id: gl.goalId, name: gl.goalName, category: gl.category })}
                    className="bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 p-3.5 rounded-xl space-y-2 cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono text-amber-400 font-bold">{gl.category}</span>
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">{gl.goalName}</h4>
                      </div>
                      <span className="text-sm font-bold font-mono text-emerald-400">{gl.likelihoodPercent}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${gl.likelihoodPercent}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                      <span>Est. Mastery: ~{gl.estimatedMasteryDays}d</span>
                      <span className="text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Roadmap</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/60 rounded-xl text-center space-y-1">
                <p className="text-xs text-zinc-400">
                  No habits analyzed yet. Start a chat with NEXUS or create goals to see your calculated mastery likelihoods and willpower strain.
                </p>
              </div>
            )}
          </div>

          {/* AI Planned Goals & Realistic Timelines */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  <span>Synthesized Goals & Realistic Timelines</span>
                </h3>
                <span className="text-xs text-zinc-400">
                  {blueprint?.plannedGoals?.length || 0} Custom Planned Goals
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenNewPlannedGoal}
                className="self-start sm:self-auto px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Goal</span>
              </button>
            </div>

            {blueprint?.plannedGoals && blueprint.plannedGoals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blueprint.plannedGoals.map((planned: any, idx: number) => {
                  const catColor = CATEGORY_COLORS[planned.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.smarts;
                  const isAlreadyAdded = addedGoalNames.has(planned.name.toLowerCase());
                  const live = existingGoals.find((g) => g.name.toLowerCase() === String(planned.name || '').toLowerCase());
                  const chance = live?.likelihoodPercent || planned.chanceOfAchievement || 80;
                  const goalForPathway: Goal = live || {
                    id: planned.id || `planned-${String(planned.name || 'goal').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    name: planned.name,
                    description: planned.description || 'Master Blueprint planned goal',
                    frequency: (planned.targetFrequency === 'weekly' || planned.frequency === 'weekly') ? 'weekly' : 'daily',
                    category: (planned.category as CategoryKey) || 'smarts',
                    basePoints: planned.basePoints || 10,
                    reminderTime: planned.reminderTime || '08:00',
                    createdAt: new Date().toISOString(),
                    likelihoodPercent: chance,
                    effects: planned.effects || [{ category: (planned.category as CategoryKey) || 'smarts', weight: 4 }],
                    isLifePathAligned: true,
                    isCognitiveTraining: planned.category === 'smarts',
                    timelineSummary: planned.description || 'Master Blueprint planned goal',
                  };
                  const pathway = getGoalPathway(goalForPathway, plannedTasks, milestones, dailyLogs, userConfig, todayStr);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenGoalPathway(planned)}
                      className="bg-zinc-950/90 border border-amber-500/25 rounded-2xl p-5 shadow-xl space-y-4 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/10 transition-all flex flex-col justify-between cursor-pointer group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                              Tracking: {CATEGORY_NAMES[planned.category as keyof typeof CATEGORY_NAMES] || planned.category}
                            </span>
                            <h4 className="text-base font-bold text-white mt-1.5 group-hover:text-amber-300 transition-colors">{planned.name}</h4>
                            {planned.autoAdded && (
                              <span className="inline-block mt-1 text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-full">
                                NEXUS added
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center space-x-1">
                              {planned.reminderTime && (
                                <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>{planned.reminderTime}</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditPlannedGoal(planned, idx);
                                }}
                                className="p-1 text-zinc-400 hover:text-amber-300 transition-colors"
                                title="Edit Goal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePlannedGoal(idx);
                                }}
                                className="p-1 text-zinc-400 hover:text-rose-400 transition-colors"
                                title="Remove Goal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              {chance}% Chance
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 font-light leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                          {planned.description}
                        </p>

                        {/* Interactive Tomorrow Step & AI Progression Banner */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGoalPathway(planned);
                          }}
                          className="bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-500/5 hover:from-amber-500/30 hover:via-orange-500/25 border border-amber-500/40 hover:border-amber-400 p-3.5 rounded-xl transition-all cursor-pointer space-y-2 group/step shadow-sm ring-1 ring-amber-500/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Compass className="w-3.5 h-3.5 text-amber-400 group-hover/step:rotate-45 transition-transform" />
                              <span>AI Progression & Tomorrow's Step</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 group-hover/step:translate-x-1 transition-transform">
                              <span>Tap for Roadmap</span>
                              <ArrowRight className="w-3 h-3 text-amber-400" />
                            </span>
                          </div>

                          <div className="bg-zinc-900/90 border border-amber-500/20 p-2.5 rounded-lg space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-amber-400" />
                                <span>Tomorrow's Expected Step:</span>
                              </span>
                              <span className="text-[10px] font-mono text-amber-300 font-semibold">~{pathway.tomorrowTask.durationMinutes}m</span>
                            </div>
                            <p className="text-xs text-amber-200/95 font-medium leading-snug">
                              {pathway.tomorrowTask.title}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-0.5 text-[10px] font-mono">
                            <div className="bg-black/30 px-2 py-1 rounded border border-zinc-800/80">
                              <span className="text-zinc-400 block text-[9px] uppercase">Week Target:</span>
                              <span className="text-emerald-300 font-semibold truncate block">{pathway.horizons.thisWeek.title}</span>
                            </div>
                            <div className="bg-black/30 px-2 py-1 rounded border border-zinc-800/80">
                              <span className="text-zinc-400 block text-[9px] uppercase">Month Target:</span>
                              <span className="text-amber-300 font-semibold truncate block">{pathway.horizons.thisMonth.title}</span>
                            </div>
                          </div>
                        </div>

                        {planned.autoAddedReason && (
                          <p className="text-[11px] text-violet-300/90 font-light leading-relaxed bg-violet-500/5 p-2.5 rounded-lg border border-violet-500/20">
                            {planned.autoAddedReason}
                          </p>
                        )}
                        {(planned.goalScope || planned.scopeNote || plannedTimelineLabel(planned)) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
                              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Scope</span>
                              <p className="text-[11px] text-zinc-200 mt-0.5">
                                {planned.goalScope || planned.scopeNote || 'Long-range growth arc'}
                              </p>
                            </div>
                            <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
                              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Estimated Arc</span>
                              <p className="text-[11px] text-amber-300 mt-0.5 font-semibold">
                                {plannedTimelineLabel(planned)}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Timeline Map */}
                        <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                          <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                            <Layers className="w-3 h-3 text-amber-400" />
                            <span>Adaptive Timeline Map</span>
                          </span>

                          <div className="flex flex-wrap gap-2">
                            {plannedTimelineSegments(planned, userConfig.behaviorProfile).map((segment: string, segmentIdx: number) => (
                              <div
                                key={`${planned.name}-${segmentIdx}`}
                                className="min-w-[140px] flex-1 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60"
                              >
                                <span className="block font-bold text-amber-400 text-[11px] leading-tight">
                                  {segment}
                                </span>
                              </div>
                            ))}
                          </div>
                          {planned.timelineSummary && (
                            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                              {planned.timelineSummary}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPlannedGoalToActive(planned);
                          }}
                          disabled={isAlreadyAdded}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shadow-md ${
                            isAlreadyAdded
                              ? 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-amber-950/40 cursor-pointer'
                          }`}
                        >
                          {isAlreadyAdded ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Active in Daily Goals</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              <span>Add Goal to Daily Tracker</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-3">
                <Target className="w-10 h-10 text-amber-400/40 mx-auto" />
                <h4 className="text-sm font-bold text-white">No custom blueprint yet</h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Talk with NEXUS in the chat tab to discover your goals and build your custom plan with realistic timelines.
                </p>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-colors inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Start Chat with NEXUS</span>
                </button>
              </div>
            )}
          </div>

          {/* Goal Correlations & Habit Stackups */}
          {blueprint?.goalCorrelations && blueprint.goalCorrelations.length > 0 && (
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>Habit Correlations & Stack-Ups</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {blueprint.goalCorrelations.map((gc: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      {Array.isArray(gc.goals) ? gc.goals.join(' ⚡ ') : 'Multiplier Link'}
                    </span>
                    <p className="text-xs text-zinc-300 font-light leading-relaxed">
                      {gc.insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Identified Roadblocks & AI Solutions */}
          {blueprint?.roadblocks && blueprint.roadblocks.length > 0 && (
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Identified Roadblocks & AI Solutions</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {blueprint.roadblocks.map((rb: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2"
                  >
                    <span className="text-[10px] font-mono uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      Roadblock: {rb.roadblock}
                    </span>
                    {Array.isArray(rb.affectedGoals) && rb.affectedGoals.length > 0 && (
                      <p className="text-[10px] text-zinc-400 font-mono">
                        Threatens: {rb.affectedGoals.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-zinc-200 font-light leading-relaxed">
                      <strong className="text-emerald-400 font-semibold">AI Solution:</strong> {rb.solution}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NEXUS CHAT — Full-page ChatGPT style */}
      {activeTab === 'chat' && (
        <div className="flex flex-col bg-black" style={{ minHeight: 'calc(100vh - 56px)' }}>

          {/* Offline / Error Banners */}
          {brainOffline && (
            <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200 shrink-0">
              NEXUS brain offline — on PC run <span className="font-mono text-amber-300">npm run dev</span> then{' '}
              <span className="font-mono text-amber-300">adb reverse tcp:3000 tcp:3000</span>
            </div>
          )}
          <div className="shrink-0 px-4 pt-2">
            <AiErrorPanel error={lastAiError} onDismiss={() => setLastAiError(null)} />
          </div>

          {/* ─── Messages Canvas ─── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
            {chatMessages.map((msg) => {
              const isAI = msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isAI ? 'justify-start items-start gap-2.5' : 'justify-end'}`}
                >
                  {/* AI: small avatar */}
                  {isAI && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-amber-950/40">
                      <Bot className="w-3.5 h-3.5 text-zinc-950" />
                    </div>
                  )}

                  <div className={`${isAI ? 'flex-1 max-w-[88%]' : 'max-w-[78%]'}`}>
                    {/* AI: text directly on dark canvas, no bubble */}
                    {isAI ? (
                      <div className="space-y-0.5">
                        <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[9px] font-mono text-zinc-600 block mt-1">{msg.timestamp}</span>
                      </div>
                    ) : (
                      /* User: amber rounded pill, right-aligned */
                      <div className="bg-amber-500 text-zinc-950 px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-md shadow-amber-950/30 ml-auto">
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[9px] font-mono text-zinc-800 block text-right mt-0.5 opacity-70">{msg.timestamp}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shrink-0 shadow-md shadow-amber-950/40">
                  <Bot className="w-3.5 h-3.5 text-zinc-950" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ─── Input Bar ─── */}
          <div className="shrink-0 border-t border-zinc-800/60 bg-black px-4 pt-3 pb-4 space-y-2">
            {/* Quick-action chip */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => handleSendMessage('What should I do next based on my goals, journal, and current momentum?')}
                disabled={isTyping}
                className="shrink-0 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-amber-300 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Target className="w-3 h-3 text-amber-400" />
                <span>What should I do next?</span>
              </button>
            </div>

            {/* Text row */}
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-zinc-900 border border-zinc-700 focus-within:border-amber-500/60 rounded-2xl px-4 py-3 flex items-end gap-2 transition-colors">
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Message NEXUS..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed max-h-[120px] overflow-y-auto"
                  style={{ height: '24px' }}
                />
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isTyping}
                className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 flex items-center justify-center transition-all shadow-lg shadow-amber-950/40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 text-center leading-snug">
              First reply may take ~1 min if server is waking up · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}



      {/* ─── MODAL: Add / Edit Major Lifetime Mega Goal ─── */}
      {showMegaGoalModal && editingMegaGoal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>{editingMegaGoalIndex !== null ? 'Edit Major Life Target' : 'Add Major Life Target'}</span>
              </h3>
              <button
                type="button"
                onClick={() => { setShowMegaGoalModal(false); setEditingMegaGoal(null); }}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Major Goal Title *
                </label>
                <input
                  type="text"
                  value={editingMegaGoal.title || ''}
                  onChange={(e) => setEditingMegaGoal({ ...editingMegaGoal, title: e.target.value })}
                  placeholder="e.g. Become a Millionaire, 80kg Athletic Body"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                    Timeline Arc
                  </label>
                  <input
                    type="text"
                    value={editingMegaGoal.timelineEstimate || ''}
                    onChange={(e) => setEditingMegaGoal({ ...editingMegaGoal, timelineEstimate: e.target.value })}
                    placeholder="e.g. 3-5 years, 10 years"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                    Domain / Category
                  </label>
                  <input
                    type="text"
                    value={editingMegaGoal.category || ''}
                    onChange={(e) => setEditingMegaGoal({ ...editingMegaGoal, category: e.target.value })}
                    placeholder="e.g. Wealth, Fitness, Career"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Description / Success Criteria
                </label>
                <textarea
                  value={editingMegaGoal.description || ''}
                  onChange={(e) => setEditingMegaGoal({ ...editingMegaGoal, description: e.target.value })}
                  placeholder="What will your life look like when this is achieved? What is the core metric?"
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => { setShowMegaGoalModal(false); setEditingMegaGoal(null); }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMegaGoal}
                disabled={!editingMegaGoal.title?.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-xs font-bold rounded-xl shadow-md"
              >
                Save Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Add / Edit Blueprint Planned Habit Goal ─── */}
      {showPlannedGoalModal && editingPlannedGoal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 text-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>{editingPlannedGoalIndex !== null ? 'Edit Blueprint Goal' : 'Add Goal to Blueprint'}</span>
              </h3>
              <button
                type="button"
                onClick={() => { setShowPlannedGoalModal(false); setEditingPlannedGoal(null); }}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  value={editingPlannedGoal.name || ''}
                  onChange={(e) => setEditingPlannedGoal({ ...editingPlannedGoal, name: e.target.value })}
                  placeholder="e.g. Weight Training (Push/Pull/Legs), Reading 20 Pages"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Execution Description
                </label>
                <textarea
                  value={editingPlannedGoal.description || ''}
                  onChange={(e) => setEditingPlannedGoal({ ...editingPlannedGoal, description: e.target.value })}
                  placeholder="Specific daily/weekly action steps to execute this habit"
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                    Life Pillar
                  </label>
                  <select
                    value={editingPlannedGoal.category || 'health'}
                    onChange={(e) => setEditingPlannedGoal({ ...editingPlannedGoal, category: e.target.value as CategoryKey })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="health">Health (Physicality)</option>
                    <option value="smarts">Smarts (Learning/Career)</option>
                    <option value="selfCare">Self Care (Rest/Recovery)</option>
                    <option value="happiness">Happiness (Joy/Fun)</option>
                    <option value="spiritual">Spiritual (Purpose/Mind)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                    Frequency
                  </label>
                  <select
                    value={editingPlannedGoal.targetFrequency || 'daily'}
                    onChange={(e) => setEditingPlannedGoal({ ...editingPlannedGoal, targetFrequency: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  >
                    <option value="daily">Daily Habit</option>
                    <option value="weekly">Weekly Target</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                    Reminder Time
                  </label>
                  <input
                    type="time"
                    value={editingPlannedGoal.reminderTime || '08:00'}
                    onChange={(e) => setEditingPlannedGoal({ ...editingPlannedGoal, reminderTime: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Timeline / Arc Notes
                </label>
                <input
                  type="text"
                  value={editingPlannedGoal.timelineSummary || ''}
                  onChange={(e) => setEditingPlannedGoal({ ...editingPlannedGoal, timelineSummary: e.target.value })}
                  placeholder="e.g. 6-month ramp to 80kg or career milestone"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => { setShowPlannedGoalModal(false); setEditingPlannedGoal(null); }}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlannedGoal}
                disabled={!editingPlannedGoal.name?.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-xs font-bold rounded-xl shadow-md"
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Goal Execution Pathway & Multi-Horizon Roadmap ─── */}
      {activePathwayGoal && (
        <GoalPathwayModal
          goal={activePathwayGoal}
          plannedTasks={plannedTasks}
          milestones={milestones}
          dailyLogs={dailyLogs}
          userConfig={userConfig}
          todayStr={todayStr}
          onClose={() => setActivePathwayGoal(null)}
          onToggleGoal={onToggleGoal || (() => {})}
        />
      )}
    </div>
  );
};
