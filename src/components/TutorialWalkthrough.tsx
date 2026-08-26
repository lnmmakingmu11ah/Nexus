import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Activity,
  Bot,
  Target,
  TrendingUp,
  Heart,
  BookOpen,
  Sparkles,
  BarChart3,
  Clock,
  Zap,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { UserConfig } from '../types';

interface TutorialWalkthroughProps {
  onComplete: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface TutorialSlide {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  subtitle: string;
  body: string;
  highlight?: string;
  tab?: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
}

const SLIDES: TutorialSlide[] = [
  {
    id: 'welcome',
    icon: <Sparkles className="w-8 h-8" />,
    emoji: '🔥',
    title: 'Welcome to NEXUS',
    subtitle: 'Your AI life companion',
    body: 'NEXUS tracks your life across 5 core categories — Health, Smarts, Spiritual Resonance, Self-Care, and Happiness. Every habit you complete moves your score. Every day you skip, it decays. Let\'s walk through the app real quick.',
    accentColor: 'amber',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-orange-500/10',
  },
  {
    id: 'dashboard',
    icon: <Activity className="w-8 h-8" />,
    emoji: '📊',
    title: 'Dashboard',
    subtitle: 'Your daily command center',
    body: 'The radar chart shows your 5-category balance in real time. Below it is your daily habit checklist — tap to complete habits, build streaks, and watch your scores climb.',
    highlight: 'Scores decay if you skip 3+ days, so stay consistent!',
    tab: 'dashboard',
    accentColor: 'emerald',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-teal-500/10',
  },
  {
    id: 'goals',
    icon: <Target className="w-8 h-8" />,
    emoji: '🎯',
    title: 'Goals Manager',
    subtitle: 'Build your habit system',
    body: 'Create custom habits, assign them to life categories, set reminder times, and chain them together with Habit Stacking. Each habit has category weight effects — a workout can boost both Health AND Happiness.',
    highlight: 'AI builds goals from your discovery chat automatically.',
    tab: 'goals',
    accentColor: 'indigo',
    gradientFrom: 'from-indigo-500/20',
    gradientTo: 'to-purple-500/10',
  },
  {
    id: 'aicoach',
    icon: <Bot className="w-8 h-8" />,
    emoji: '🤖',
    title: 'NEXUS AI',
    subtitle: 'Your close friend + blueprint',
    body: 'Chat with NEXUS anytime. The Blueprint tab shows your AI-analyzed plan: goal correlations, stack-ups, and realistic multi-phase timelines. Discuss the plan, tweak it, and add goals to your daily tracker from here.',
    highlight: 'NEXUS remembers everything you tell it over time.',
    tab: 'aicoach',
    accentColor: 'amber',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-yellow-500/10',
  },
  {
    id: 'trends',
    icon: <TrendingUp className="w-8 h-8" />,
    emoji: '📈',
    title: 'Trends & Analytics',
    subtitle: 'See your momentum over time',
    body: 'The Trends tab visualizes your 7-day and 30-day moving averages, willpower index, work effort velocity, and growth acceleration. See which habits are building your long-term momentum.',
    tab: 'trends',
    accentColor: 'cyan',
    gradientFrom: 'from-cyan-500/20',
    gradientTo: 'to-blue-500/10',
  },
  {
    id: 'journal',
    icon: <BookOpen className="w-8 h-8" />,
    emoji: '📓',
    title: 'Journal',
    subtitle: 'Daily reflection with AI insight',
    body: 'Log your thoughts and feelings each day. NEXUS AI reads your entry and reflects back what it sees — connecting your daily experience to your long-term life vision.',
    tab: 'journal',
    accentColor: 'rose',
    gradientFrom: 'from-rose-500/20',
    gradientTo: 'to-pink-500/10',
  },
  {
    id: 'proof',
    icon: <ShieldCheck className="w-8 h-8" />,
    emoji: '🔎',
    title: 'Proof Before Done',
    subtitle: 'Completions need evidence',
    body: 'Before a goal counts, NEXUS asks for a specific journal note. It chooses a proof style per goal: photo proof for visible actions, reflection checks for quiet habits like meditation, and challenge questions for study or reading.',
    highlight: 'Vague check-ins stay unverified. Specific proof gets confidence, without forcing weird photos.',
    tab: 'journal',
    accentColor: 'amber',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-yellow-500/10',
  },
  {
    id: 'longevity',
    icon: <Heart className="w-8 h-8" />,
    emoji: '⏳',
    title: 'Longevity Counter',
    subtitle: 'Your life expectancy — live',
    body: 'A real-time countdown of your estimated remaining life, calculated from actuarial data + your health habits. It\'s not morbid — it\'s motivating. Every habit you build adds projected years.',
    tab: 'longevity',
    accentColor: 'rose',
    gradientFrom: 'from-rose-500/15',
    gradientTo: 'to-red-500/10',
  },
  {
    id: 'local_xp',
    icon: <Sparkles className="w-8 h-8" />,
    emoji: 'XP',
    title: 'Local Moves & XP',
    subtitle: 'Optional Maps plus simple rewards',
    body: 'In Settings, you can opt into local context so NEXUS can suggest nearby activities and open Google Maps searches. Completing daily and weekly goals earns NEXUS XP, with verified wins getting a bonus.',
    highlight: 'Location stays off until you turn it on. XP rewards real completions, not random tapping.',
    tab: 'achievements',
    accentColor: 'cyan',
    gradientFrom: 'from-cyan-500/20',
    gradientTo: 'to-emerald-500/10',
  },
  {
    id: 'ready',
    icon: <CheckCircle2 className="w-8 h-8" />,
    emoji: '🚀',
    title: "You're all set!",
    subtitle: 'Go build your best life',
    body: "NEXUS is working on your personal plan in the background right now. Head to the AI Coach tab to see it when it's ready. Your goals will appear in the Dashboard. Let's get it 💪",
    accentColor: 'emerald',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-green-500/10',
  },
];

const ACCENT_STYLES: Record<string, { bg: string; text: string; border: string; btn: string; dot: string }> = {
  amber: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    btn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950',
    dot: 'bg-amber-500',
  },
  emerald: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    btn: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white',
    dot: 'bg-emerald-500',
  },
  indigo: {
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    btn: 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white',
    dot: 'bg-indigo-500',
  },
  cyan: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    btn: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white',
    dot: 'bg-cyan-500',
  },
  rose: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    btn: 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white',
    dot: 'bg-rose-500',
  },
};

export const TutorialWalkthrough: React.FC<TutorialWalkthroughProps> = ({
  onComplete,
  onNavigateTab,
}) => {
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const slide = SLIDES[step];
  const accent = ACCENT_STYLES[slide.accentColor] || ACCENT_STYLES.amber;
  const isLast = step === SLIDES.length - 1;
  const isFirst = step === 0;

  const goTo = (next: number, dir: 'forward' | 'back' = 'forward') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setStep(next);
      setIsAnimating(false);
    }, 200);
  };

  const handleNext = () => {
    if (isLast) {
      if (onNavigateTab) onNavigateTab('aicoach');
      onComplete();
      return;
    }
    const nextSlide = SLIDES[step + 1];
    if (nextSlide?.tab && onNavigateTab) {
      onNavigateTab(nextSlide.tab);
    }
    goTo(step + 1, 'forward');
  };

  const handleBack = () => {
    if (isFirst) return;
    goTo(step - 1, 'back');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`relative bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border ${accent.border} rounded-3xl w-full max-w-md shadow-2xl overflow-hidden`}
        style={{ transition: 'border-color 0.3s ease' }}
      >
        {/* Background gradient aura */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${slide.gradientFrom} ${slide.gradientTo} pointer-events-none opacity-60`}
        />

        {/* Skip button */}
        <button
          onClick={() => { if (onNavigateTab) onNavigateTab('dashboard'); onComplete(); }}
          className="absolute top-4 right-4 z-10 text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > step ? 'forward' : 'back')}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? `w-6 h-2 ${accent.dot}`
                  : i < step
                  ? `w-2 h-2 ${accent.dot} opacity-60`
                  : 'w-2 h-2 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Content area */}
        <div
          className={`relative z-10 p-8 pt-14 pb-6 flex flex-col items-center text-center transition-all duration-200 ${
            isAnimating
              ? direction === 'forward'
                ? 'opacity-0 translate-x-4'
                : 'opacity-0 -translate-x-4'
              : 'opacity-100 translate-x-0'
          }`}
          style={{ transform: isAnimating ? (direction === 'forward' ? 'translateX(16px)' : 'translateX(-16px)') : 'translateX(0)' }}
        >
          {/* Large emoji */}
          <div className="text-5xl mb-3 animate-bounce" style={{ animationDuration: '3s' }}>
            {slide.emoji}
          </div>

          {/* Icon circle */}
          <div
            className={`w-16 h-16 rounded-2xl ${accent.bg} border ${accent.border} ${accent.text} flex items-center justify-center mb-5 shadow-lg`}
          >
            {slide.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
            {slide.title}
          </h2>
          <p className={`text-sm font-medium ${accent.text} mb-4`}>{slide.subtitle}</p>

          {/* Body */}
          <p className="text-sm text-zinc-300 font-light leading-relaxed mb-4 max-w-sm">
            {slide.body}
          </p>

          {/* Highlight callout */}
          {slide.highlight && (
            <div
              className={`w-full ${accent.bg} border ${accent.border} rounded-xl px-4 py-3 mb-4 flex items-start gap-2`}
            >
              <Zap className={`w-4 h-4 ${accent.text} shrink-0 mt-0.5`} />
              <p className={`text-xs ${accent.text} text-left font-medium leading-relaxed`}>
                {slide.highlight}
              </p>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="relative z-10 px-8 pb-8 flex items-center gap-3">
          {!isFirst && (
            <button
              onClick={handleBack}
              disabled={isAnimating}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-all border border-zinc-700"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={isAnimating}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${accent.btn}`}
          >
            {isLast ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Let's go!
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Step counter */}
        <div className="absolute bottom-4 left-8 text-[10px] font-mono text-zinc-600">
          {step + 1} / {SLIDES.length}
        </div>
      </div>
    </div>
  );
};
