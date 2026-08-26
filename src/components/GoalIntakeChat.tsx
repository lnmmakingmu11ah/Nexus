import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle, AlertTriangle, Zap, ChevronRight, X } from 'lucide-react';
import { UserConfig, IntakeState, PlannedGoalDraft, CategoryKey } from '../types';
import { aiClient } from '../services/aiClient';
import { getCachedResearch, setCachedResearch } from '../utils/researchCache';
import { validateGoalDrafts } from '../utils/planValidator';
import { fallbackGoalDraft, fallbackLapseRecovery } from '../utils/planFallbacks';

interface GoalIntakeChatProps {
  userConfig: UserConfig;
  onPlanReady: (goals: any[], dependencies: any[], milestones: any[], tasks: any[]) => void;
  onUpdateIntakeState: (state: IntakeState) => void;
}

const PHASE_LABELS: Record<string, string> = {
  discovery: 'Getting to know you',
  disambiguation: 'Clarifying goals',
  feasibility: 'Checking timelines',
  willpower_check: 'Commitment check',
  confirmed: 'Building your plan…',
  complete: 'Plan ready!',
};

const hardnessLabels: Record<number, string> = { 1: 'trivial', 2: 'easy', 3: 'moderate', 4: 'hard', 5: 'extreme' };

export const GoalIntakeChat: React.FC<GoalIntakeChatProps> = ({ userConfig, onPlanReady, onUpdateIntakeState }) => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: `yo ${userConfig.userName || 'fam'}! 👋 lets figure out what u actually wanna build. just talk to me — what's the main thing on ur mind rn, like what do u wanna change or achieve?` },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<IntakeState['phase']>('discovery');
  const [collectedGoals, setCollectedGoals] = useState<PlannedGoalDraft[]>([]);
  const [constraints, setConstraints] = useState<Partial<IntakeState['constraints']>>({});
  const [feasibilityQueue, setFeasibilityQueue] = useState<{ goal: PlannedGoalDraft; index: number } | null>(null);
  const [overrideCandidate, setOverrideCandidate] = useState<PlannedGoalDraft | null>(null);
  const [isBuildingPlan, setIsBuildingPlan] = useState(false);
  const [planDone, setPlanDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const addMsg = (sender: 'user' | 'ai', text: string) =>
    setMessages(prev => [...prev, { sender, text }]);

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || isLoading) return;
    if (!overrideText) setInput('');
    addMsg('user', text);
    setIsLoading(true);

    try {
      const allMsgs = [...messages, { sender: 'user' as const, text }];

      if (phase === 'willpower_check') {
        // Run willpower assessment on user's response
        const lastGoal = collectedGoals[collectedGoals.length - 1];
        const assessment = await aiClient.runWillpowerAssessment({
          goalTitle: lastGoal?.title || 'goal',
          rawTimeline: lastGoal?.rawUserTimeline || 'unstated timeline',
          messages: allMsgs,
        });
        if (assessment.canOverride) {
          addMsg('ai', `ok i respect it — ur score is ${assessment.score}/10. that's enough to push forward on ur timeline. just know im holding u accountable 👀\n\n${assessment.message}`);
          // Mark goal as user-overridden
          setCollectedGoals(prev => prev.map((g, i) =>
            i === prev.length - 1 ? { ...g, feasibility: { ...g.feasibility, pass: true, userOverride: true } } : g
          ));
          setPhase('discovery');
        } else {
          addMsg('ai', `${assessment.message}\n\nhonestly i'd recommend the realistic version here — what do u think?`);
          setPhase('feasibility');
        }
        setIsLoading(false);
        return;
      }

      const result = await aiClient.intakeTurn({
        messages: allMsgs,
        intakePhase: phase,
        collectedGoals,
        constraints,
        userName: userConfig.userName,
      });

      addMsg('ai', result.reply);

      if (result.readyForFeasibility && collectedGoals.length > 0) {
        // Move to feasibility phase
        setPhase('feasibility');
        await runFeasibilityForNext(collectedGoals, 0, allMsgs);
      }
    } catch {
      addMsg('ai', 'connection dropped for a sec — try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const runFeasibilityForNext = async (
    goals: PlannedGoalDraft[],
    idx: number,
    currentMsgs: { sender: 'user' | 'ai'; text: string }[]
  ) => {
    const goal = goals[idx];
    if (!goal || !goal.rawUserTimeline) {
      // All goals checked, move to confirm
      setPhase('confirmed');
      triggerPlanBuild(goals);
      return;
    }

    setIsLoading(true);
    try {
      const result = await aiClient.runFeasibilityCheck({
        goalTitle: goal.title,
        goalDescription: goal.targetDescription,
        rawTimeline: goal.rawUserTimeline,
        constraints: { weeklyHoursAvailable: constraints.weeklyHoursAvailable, pastAttempts: constraints.pastAttempts },
      });

      const updatedGoal = { ...goal, feasibility: result };
      const updatedGoals = goals.map((g, i) => i === idx ? updatedGoal : g);
      setCollectedGoals(updatedGoals);

      if (!result.pass) {
        const revision = result.proposedRevision;
        const msg = `ok real talk on "${goal.title}" — ${result.reason}\n\n${revision ? `realistic version: ${revision.scopeNote} (${revision.timelineRange.minDays}–${revision.timelineRange.maxDays} days)` : ''}\n\nwant to go with the realistic version, or do u think u can pull off ur original timeline?`;
        addMsg('ai', msg);
        setFeasibilityQueue({ goal: updatedGoal, index: idx });
        setPhase('feasibility');
      } else {
        // Pass — move to next goal
        await runFeasibilityForNext(updatedGoals, idx + 1, currentMsgs);
      }
    } catch {
      // Feasibility check failed — assume pass, move on
      await runFeasibilityForNext(goals, idx + 1, currentMsgs);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeasibilityResponse = async (userChoice: 'accept' | 'override') => {
    if (!feasibilityQueue) return;
    const { goal, index } = feasibilityQueue;

    if (userChoice === 'accept') {
      const revision = goal.feasibility?.proposedRevision;
      const accepted = { ...goal, timelineRange: revision?.timelineRange || goal.timelineRange };
      const updatedGoals = collectedGoals.map((g, i) => i === index ? accepted : g);
      setCollectedGoals(updatedGoals);
      addMsg('ai', 'solid choice — realistic > fantasy any day fr');
      setFeasibilityQueue(null);
      await runFeasibilityForNext(updatedGoals, index + 1, messages);
    } else {
      // Override path — run willpower assessment
      setOverrideCandidate(goal);
      setPhase('willpower_check');
      addMsg('ai', `aight bet — but before i let u run with that timeline, i gotta ask u some real questions. ur call if u can handle it 👀\n\nfirst: what specifically are u gonna give up or change in ur schedule to make "${goal.title}" happen in that timeframe?`);
      setFeasibilityQueue(null);
    }
  };

  const triggerPlanBuild = async (goals: PlannedGoalDraft[]) => {
    setIsBuildingPlan(true);
    addMsg('ai', "🔥 plan is building in the background — go vibe, check the Goals section in a sec");
    setPhase('complete');

    try {
      // Fetch research context (cached)
      let researchContext = '';
      for (const g of goals) {
        const cached = getCachedResearch(g.category as CategoryKey, g.title);
        if (cached) { researchContext += cached + '\n'; continue; }
        try {
          const r = await aiClient.fetchResearch({ category: g.category, goalType: g.title });
          if (r.findings) { setCachedResearch(g.category as CategoryKey, g.title, r.findings); researchContext += r.findings + '\n'; }
        } catch { /* skip */ }
      }

      const result = await aiClient.synthesizePlan({
        collectedGoals: goals,
        constraints,
        researchContext: researchContext.slice(0, 2000),
        behaviorProfile: userConfig.behaviorProfile,
        userName: userConfig.userName,
      });

      // Validate AI output before committing
      const validation = validateGoalDrafts(result.goals);
      if (!validation.valid) {
        console.warn('Plan validation failed:', validation.errors);
        // Use fallback goals
        const fallbacks = goals.map(g => fallbackGoalDraft(g.title, g.category as CategoryKey));
        onPlanReady(fallbacks, [], [], []);
      } else {
        onPlanReady(result.goals, result.dependencies || [], [], []);
      }
      setPlanDone(true);
    } catch (err) {
      console.error('Plan synthesis error:', err);
      const fallbacks = goals.map(g => fallbackGoalDraft(g.title, g.category as CategoryKey));
      onPlanReady(fallbacks, [], [], []);
      setPlanDone(true);
    } finally {
      setIsBuildingPlan(false);
    }
  };

  // Parse goal mentions from user messages and add to collected goals
  const parseAndAddGoal = (text: string) => {
    // Simple heuristic: if user mentions a goal keyword and timeline, add it
    // More sophisticated extraction done by AI on the server side
    // This is just a local draft that gets confirmed after feasibility
  };

  const phaseColor: Record<string, string> = {
    discovery: 'text-indigo-400',
    disambiguation: 'text-amber-400',
    feasibility: 'text-orange-400',
    willpower_check: 'text-red-400',
    confirmed: 'text-emerald-400',
    complete: 'text-emerald-500',
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Goal Intake</p>
          <p className={`text-sm font-medium mt-0.5 ${phaseColor[phase] || 'text-white'}`}>
            {PHASE_LABELS[phase] || phase}
          </p>
        </div>
        <div className="flex gap-1">
          {(['discovery', 'feasibility', 'confirmed', 'complete'] as const).map((p, i) => (
            <div key={p} className={`w-2 h-2 rounded-full transition-all ${phase === p || (i < (['discovery','feasibility','confirmed','complete'] as const).indexOf(phase as any)) ? 'bg-indigo-400' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-white/10 text-white/90 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Feasibility action buttons */}
        {feasibilityQueue && phase === 'feasibility' && (
          <div className="flex gap-2 justify-start pl-1">
            <button
              onClick={() => handleFeasibilityResponse('accept')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Go realistic
            </button>
            <button
              onClick={() => handleFeasibilityResponse('override')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-medium hover:bg-orange-500/30 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> I'll prove it
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {isBuildingPlan && (
          <div className="flex items-center gap-2 text-xs text-amber-400 px-1 py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Building your plan with DeepSeek R1…
          </div>
        )}

        {planDone && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 px-1 py-2 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Plan ready! Scroll down in Goals Manager to see it.
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      {phase !== 'complete' && (
        <div className="p-3 border-t border-white/10 bg-white/5">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={phase === 'willpower_check' ? "show me ur commitment…" : "tell me what u want to build…"}
              rows={1}
              disabled={isLoading || isBuildingPlan}
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 min-h-[40px] max-h-[100px]"
              style={{ height: 'auto' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isBuildingPlan}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center disabled:opacity-40 hover:bg-indigo-500 transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
