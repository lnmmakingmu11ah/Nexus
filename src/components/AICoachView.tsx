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
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { UserConfig, AIChatMessage, Goal, DailyGoalLog, DailyJournal, CATEGORY_NAMES, CATEGORY_COLORS } from '../types';
import { aiClient } from '../services/aiClient';
import { calculateWillpowerAnalytics } from '../utils/willpowerAnalytics';
import { apiOfflineMessage, smartOfflineReply } from '../utils/chatFallback';
import { AiErrorPanel } from './AiErrorPanel';
import { mergeMemory } from '../utils/aiMemory';
import { buildAdaptiveTimeline } from '../utils/timelinePlanner';

interface AICoachViewProps {
  userConfig: UserConfig;
  onUpdateUserConfig: (updated: UserConfig) => void;
  onAddGoals: (goals: Partial<Goal>[]) => void;
  existingGoals: Goal[];
  dailyLogs: DailyGoalLog[];
  journals: DailyJournal[];
  currentScore?: number;
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
  existingGoals,
  dailyLogs,
  journals,
  currentScore,
}) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'chat'>('chat');
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

      const res = await aiClient.chatCompanion({
        messages: apiMessages,
        userContext: {
          userName: userConfig.userName,
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
      });

      setBrainOffline(false);
      setLastAiError(null);
      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedHistory = [...newMessages, aiMsg];
      setChatMessages(updatedHistory);
      // Save chat history immediately
      const configWithHistory = { ...userConfig, aiChatHistory: updatedHistory };
      onUpdateUserConfig(configWithHistory);

            // Extract & merge memory in background (non-blocking)
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
          .then((memRes) => {
            if (memRes?.memory && Object.keys(memRes.memory).length > 0) {
              const merged = mergeMemory(userConfig.aiMemory, memRes.memory);
              onUpdateUserConfig({ ...configWithHistory, aiMemory: merged });
            }
          })
          .catch(() => { /* memory extraction is best-effort */ });
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-amber-950/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-zinc-950 font-bold flex items-center justify-center text-xl shrink-0 shadow-lg shadow-amber-950/50">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                NEXUS AI
              </h1>
              <span className="text-xs font-mono font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                {userConfig.userName || 'Champion'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-light mt-1 max-w-2xl">
              Daily chat + your saved blueprint. Goal scouting happens once at setup.
            </p>
          </div>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('blueprint')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'blueprint'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Master Blueprint</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Talk to NEXUS</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MASTER BLUEPRINT & TIMELINES */}
      {activeTab === 'blueprint' && (
        <div className="space-y-6">
          {/* Master Vision & Overview */}
          {blueprint && (
            <div className="bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>AI Analyzed Core Vision</span>
              </div>
              <h3 className="text-base font-bold text-white leading-snug">
                {blueprint.masterVision}
              </h3>
            </div>
          )}

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
                  const chance = pg.chanceOfAchievement || 80;
                  return (
                    <div key={idx} className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono text-amber-400 font-bold uppercase">{pg.category}</span>
                          <h4 className="text-xs font-bold text-white line-clamp-1">{pg.name}</h4>
                        </div>
                        <span className="text-sm font-bold font-mono text-emerald-400">{chance}%</span>
                      </div>
                      <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${chance}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Scope: {plannedTimelineLabel(pg)}</span>
                        <span className="text-amber-300">Strain: {pg.willpowerStrain || 'Low'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : analytics.goalLikelihoods.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analytics.goalLikelihoods.slice(0, 4).map((gl) => (
                  <div key={gl.goalId} className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono text-amber-400 font-bold">{gl.category}</span>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{gl.goalName}</h4>
                      </div>
                      <span className="text-sm font-bold font-mono text-emerald-400">{gl.likelihoodPercent}%</span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${gl.likelihoodPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Est. Mastery: ~{gl.estimatedMasteryDays}d</span>
                      <span className="text-amber-300">Strain: {gl.willpowerStrain}</span>
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
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-amber-400" />
                <span>Synthesized Goals & Realistic Timelines</span>
              </h3>
              <span className="text-xs text-zinc-400">
                {blueprint?.plannedGoals?.length || 0} Custom Planned Goals
              </span>
            </div>

            {blueprint?.plannedGoals && blueprint.plannedGoals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blueprint.plannedGoals.map((planned: any, idx: number) => {
                  const catColor = CATEGORY_COLORS[planned.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.smarts;
                  const isAlreadyAdded = addedGoalNames.has(planned.name.toLowerCase());
                  const chance = planned.chanceOfAchievement || 80;
                  return (
                    <div
                      key={idx}
                      className="bg-zinc-950/90 border border-amber-500/25 rounded-2xl p-5 shadow-xl space-y-4 hover:border-amber-400/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                              {CATEGORY_NAMES[planned.category as keyof typeof CATEGORY_NAMES] || planned.category}
                            </span>
                            <h4 className="text-base font-bold text-white mt-1.5">{planned.name}</h4>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {planned.reminderTime && (
                              <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>{planned.reminderTime}</span>
                              </div>
                            )}
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              {chance}% Chance
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 font-light leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                          {planned.description}
                        </p>
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
                          onClick={() => handleAddPlannedGoalToActive(planned)}
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

      {/* TAB 2: TALK TO AI ON RANDOM */}
      {activeTab === 'chat' && (
      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col h-[600px] min-h-0 ring-1 ring-amber-500/20">
          {brainOffline && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200 shrink-0">
              NEXUS brain offline — on PC run <span className="font-mono text-amber-300">npm run dev</span> then{' '}
              <span className="font-mono text-amber-300">adb reverse tcp:3000 tcp:3000</span>
            </div>
          )}
          <div className="shrink-0">
            <AiErrorPanel error={lastAiError} onDismiss={() => setLastAiError(null)} />
          </div>
          {/* Messages Container */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 custom-scrollbar bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
            {chatMessages.map((msg) => {
              const isAI = msg.sender === 'ai';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${isAI ? 'justify-start' : 'justify-end'}`}
                >
                  {isAI && (
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-sm shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                      isAI
                        ? 'bg-zinc-900/90 border border-amber-500/20 text-zinc-100 rounded-tl-sm shadow-md'
                        : 'bg-amber-500 text-zinc-950 font-medium rounded-tr-sm shadow-md shadow-amber-950/30'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span
                      className={`text-[9px] font-mono block text-right mt-1 opacity-60 ${
                        isAI ? 'text-zinc-500' : 'text-zinc-900'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {!isAI && (
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center text-sm shrink-0 mt-0.5 font-bold shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center space-x-2 text-zinc-500 text-xs py-1">
                <Bot className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="italic">NEXUS is typing...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>



          {/* Input Bar */}
          <div className="pt-2 space-y-2 shrink-0">
            <p className="text-[10px] text-zinc-500 leading-snug">
              First AI reply can take about a minute if the hosted server is waking up.
            </p>
            <button
              type="button"
              onClick={() => handleSendMessage('What should I do next based on my goals, journal, and current momentum?')}
              disabled={isTyping}
              className="w-full sm:w-auto px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5" />
              <span>What should I do next?</span>
            </button>
            <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center space-x-1"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
