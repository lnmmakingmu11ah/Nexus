import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { UserConfig, AIChatMessage, Goal } from '../types';
import { aiClient } from '../services/aiClient';
import { apiOfflineMessage, smartOfflineReply } from '../utils/chatFallback';
import { bubblesFromStreamBuffer, liveStreamVisible } from '../utils/chatTyping';
import { AiErrorPanel } from './AiErrorPanel';
import { mergeIdentity } from '../utils/userIdentity';
import { ensureNexusPersona } from '../utils/nexusPersona';
import { UserIdentity } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (config: UserConfig, synthesizedGoals?: Partial<Goal>[]) => void;
  onStartBackgroundPlan?: (
    transcript: { sender: 'user' | 'ai'; text: string }[],
    partialConfig: UserConfig
  ) => void;
  initialConfig: UserConfig;
}

function stripPlanToken(text: string) {
  return text.replace(/<<READY_FOR_PLAN>>/gi, '').trim();
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onStartBackgroundPlan,
  initialConfig,
}) => {
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: "hey welcome to NEXUS 😊 im gonna get to know u — not just this year, but ur whole life vision. where u live, what u do, what u wanna become, what's been holding u back... then i build u a lifetime plan. what should i call u?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [brainOffline, setBrainOffline] = useState(false);
  const [lastAiError, setLastAiError] = useState<string | null>(null);
  const [readyForPlan, setReadyForPlan] = useState(false);
  const [userNameInput, setUserNameInput] = useState('');
  const [isStartingPlan, setIsStartingPlan] = useState(false);
  const [identity, setIdentity] = useState<UserIdentity | undefined>(initialConfig.userIdentity);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maybeExtractName = (text: string) => {
    const m = text.match(/^(?:call me|i'?m|im|my name is)\s+([A-Za-z][A-Za-z\-']{1,20})/i);
    if (m?.[1] && !userNameInput) setUserNameInput(m[1]);
  };

  const handleLaunchBackgroundPlan = () => {
    if (isStartingPlan) return;
    setIsStartingPlan(true);
    const transcript = chatMessages.map((m) => ({ sender: m.sender, text: m.text }));

    const partialConfig: UserConfig = {
      ...initialConfig,
      onboarded: true,
      userName: userNameInput || identity?.name || 'Friend',
      userIdentity: identity,
      nexusPersona: ensureNexusPersona(initialConfig.nexusPersona),
      lifePathGoal: 'Live with wisdom, focus, physical strength, and purpose',
      masterBlueprint: undefined,
      aiChatHistory: [],
      tutorialCompleted: false,
    };

    // Request permissions proactively on user interaction
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    if (typeof navigator !== 'undefined' && navigator.geolocation && !initialConfig.locationOptIn) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          partialConfig.locationOptIn = true;
          partialConfig.coordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 1000 * 60 * 60 }
      );
    }

    if (onStartBackgroundPlan) {
      onStartBackgroundPlan(transcript, partialConfig);
    } else {
      onComplete(partialConfig, []);
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || isTyping || isStartingPlan) return;

    maybeExtractName(text);

    if (
      /build my plan|lock the plan|generate|make the plan|yea (lock|build)|build it in the background/i.test(text) &&
      (readyForPlan || chatMessages.length >= 4)
    ) {
      setInputText('');
      handleLaunchBackgroundPlan();
      return;
    }

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
      const liveId = `ai-live-${Date.now()}`;
      const res = await aiClient.chatCompanionStream(
        {
          messages: newMessages.map((m) => ({ sender: m.sender, text: m.text })),
          nexusPersona: ensureNexusPersona(initialConfig.nexusPersona),
          userContext: {
            stage: 'onboarding',
            userName: userNameInput || identity?.name || undefined,
            userIdentity: identity,
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
                text: stripPlanToken(b),
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
      if (res.readyForPlan) setReadyForPlan(true);

      const finalBubbles = (res.messages && res.messages.length > 0 ? res.messages : [res.reply])
        .map((b) => stripPlanToken(b))
        .filter(Boolean);
      if (finalBubbles.length) {
        setChatMessages((prev) => {
          const withoutThisTurnAi = prev.filter(
            (m) => m.id !== liveId && !m.id.startsWith(`${liveId}-c`)
          );
          return [
            ...withoutThisTurnAi,
            ...finalBubbles.map((textOut, i) => ({
              id: `${liveId}-f${i}`,
              sender: 'ai' as const,
              text: textOut,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })),
          ];
        });
      }

      const extractMsgs = [
        ...newMessages.map((m) => ({ sender: m.sender, text: m.text })),
        ...finalBubbles.map((text) => ({ sender: 'ai' as const, text })),
      ];
      aiClient
        .extractIdentity({ messages: extractMsgs.slice(-16), existingIdentity: identity })
        .then((r) => {
          if (r?.identity) {
            setIdentity((prev) => {
              const merged = mergeIdentity(prev, r.identity);
              if (merged.name && !userNameInput) setUserNameInput(merged.name);
              return merged;
            });
          }
        })
        .catch(() => {});
    } catch (err: any) {
      console.error('Onboarding chat error:', err);
      setBrainOffline(true);
      const errText = err?.detail || err?.message || String(err);
      setLastAiError(errText);
      const isNetwork = err?.code === 'NETWORK_OFFLINE' || /Cannot reach/i.test(errText);
      const reply = isNetwork
        ? `${apiOfflineMessage(Capacitor.isNativePlatform())}\n\n(meanwhile) ${smartOfflineReply(text, 'onboarding', userNameInput || undefined)}`
        : smartOfflineReply(text, 'onboarding', userNameInput || undefined);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSkip = () => {
    const partialConfig: UserConfig = {
      ...initialConfig,
      onboarded: true,
      userName: userNameInput || identity?.name || 'Friend',
      userIdentity: identity,
      nexusPersona: ensureNexusPersona(initialConfig.nexusPersona),
      lifePathGoal: 'Achieve daily growth and balance across physical, cognitive, and purpose goals',
      aiChatHistory: [],
      tutorialCompleted: false,
    };
    onComplete(partialConfig, []);
  };

  const showPlanCta = readyForPlan || chatMessages.filter((m) => m.sender === 'user').length >= 5;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto flex justify-center items-start p-3 sm:p-4">
      <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-amber-500/30 rounded-2xl max-w-lg w-full text-zinc-100 shadow-2xl relative overflow-hidden flex flex-col my-4 sm:my-8 ring-1 ring-amber-500/20">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-zinc-950 shadow-md shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                Goal Scout <span className="text-amber-400 font-mono text-[10px]">1-time setup</span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-light truncate">
                {brainOffline ? 'Offline mode' : 'Talk with NEXUS — plan builds in the background'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs font-medium text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-zinc-800 shrink-0"
          >
            Skip
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex flex-col flex-1 min-h-0 h-[560px] max-h-[70vh]">
          <div className="px-3 pt-2 shrink-0">
            <AiErrorPanel error={lastAiError} onDismiss={() => setLastAiError(null)} />
          </div>

          <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3.5 bg-zinc-950/40">
            {chatMessages.map((msg) => {
              const isAI = msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}
                >
                  {isAI && (
                    <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isAI
                        ? 'bg-zinc-900/90 border border-amber-500/20 text-zinc-100 rounded-tl-sm'
                        : 'bg-amber-500 text-zinc-950 font-medium rounded-tr-sm'
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
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
            {isTyping && (
              <div className="flex items-center space-x-2 text-zinc-500 text-xs py-1">
                <Bot className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span className="italic">NEXUS is typing...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Background plan CTA â€” appears after enough discovery */}
          {showPlanCta && (
            <div className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-t border-amber-500/30 flex items-center justify-between gap-2">
              <span className="text-[11px] text-amber-300 font-light flex items-center gap-1 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Ready! Plan builds while u explore the app âœ¨</span>
              </span>
              <button
                type="button"
                onClick={handleLaunchBackgroundPlan}
                disabled={isStartingPlan}
                className="shrink-0 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {isStartingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Build in Background
              </button>
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 p-3 bg-zinc-950 border-t border-zinc-800/80 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Tell NEXUS what u want to build or achieve..."
              disabled={isStartingPlan}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping || isStartingPlan}
              className="shrink-0 p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
