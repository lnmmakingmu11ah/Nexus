import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Target,
  TrendingUp,
  Sparkles,
  HeartPulse,
  Bot,
  AudioWaveform,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';

interface FloatingBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(0);

  const resetInactivityTimer = (delayMs = 3500) => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setIsVisible(false);
    }, delayMs);
  };

  // When user enters another page, briefly show active tab then auto-hide downwards
  useEffect(() => {
    setIsVisible(true);
    resetInactivityTimer(1500);
  }, [currentTab]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const totalHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );

      const isFullyAtTop = currentScrollY <= 5;
      const isFullyAtBottom = (windowHeight + currentScrollY) >= (totalHeight - 20);

      if (isFullyAtTop || isFullyAtBottom) {
        // Only pops up when scrolled fully to the top or fully to the bottom
        setIsVisible(true);
        resetInactivityTimer(3500);
      } else if (currentScrollY > 20) {
        // Hidden anywhere in between while reading/scrolling
        setIsVisible(false);
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  const primaryNavItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'aicoach', label: 'NEXUS AI', icon: Bot },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'focus', label: 'Focus', icon: AudioWaveform },
  ];

  const secondaryNavItems = [
    {
      id: 'journal',
      label: 'Journal & Proof',
      desc: 'Reflections & verified habit history',
      icon: BookOpen,
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'trends',
      label: 'Trends & Analytics',
      desc: 'Progress curves & performance radar',
      icon: TrendingUp,
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'insights',
      label: 'AI Insights & Digest',
      desc: 'Synthesized feedback & life tips',
      icon: Sparkles,
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'longevity',
      label: 'Life Expectancy',
      desc: 'Biomarkers & health impact factors',
      icon: HeartPulse,
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
  ];

  const isSecondaryActive = secondaryNavItems.some((item) => item.id === currentTab);
  const activeSecondaryItem = secondaryNavItems.find((item) => item.id === currentTab);

  const handleSelectTab = (tabId: string) => {
    setCurrentTab(tabId);
    setShowMoreDrawer(false);
  };

  return (
    <>
      {/* Backdrop for More Drawer */}
      {showMoreDrawer && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setShowMoreDrawer(false)}
        />
      )}

      {/* More Navigation Drawer Sheet */}
      {showMoreDrawer && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md z-50 md:hidden bottom-20 animate-slide-up"
          style={{ bottom: 'calc(max(0.75rem, env(safe-area-inset-bottom, 0px)) + 64px)' }}
        >
          <div className="bg-zinc-950/95 backdrop-blur-2xl border border-amber-500/30 rounded-2xl p-3.5 shadow-2xl shadow-black/90 ring-1 ring-amber-500/20 space-y-2">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white tracking-wide">More Views & Tools</span>
                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  NEXUS
                </span>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                        : 'bg-zinc-900/70 border border-zinc-800/80 text-zinc-300 hover:bg-zinc-850 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl border ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : item.badgeColor
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{item.label}</div>
                        <div className="text-[10px] text-zinc-400 font-light truncate">{item.desc}</div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main 5-Slot Bottom Floating Bar */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md z-40 md:hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible || showMoreDrawer
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-28 opacity-0 pointer-events-none'
        }`}
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <nav className="bg-zinc-950/95 backdrop-blur-2xl border border-amber-500/30 rounded-2xl p-1 shadow-2xl shadow-black/90 flex items-center justify-between ring-1 ring-amber-500/20">
          {/* 4 Primary Navigation Tabs */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 relative min-h-[48px] select-none will-change-transform ${
                  isActive
                    ? 'text-amber-300 bg-amber-500/15 border border-amber-500/35 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 font-normal'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-amber-400' : 'text-zinc-400'
                  }`}
                />
                <span className="text-[10px] mt-1 font-medium tracking-tight truncate max-w-[58px]">
                  {item.label}
                </span>

                {isActive && (
                  <span className="absolute -bottom-0.5 w-4 h-1 bg-amber-400 rounded-full shadow-sm shadow-amber-400/80" />
                )}
              </button>
            );
          })}

          {/* 5th Dynamic More / Active Secondary Tab */}
          {(() => {
            const MoreIcon = isSecondaryActive && activeSecondaryItem ? activeSecondaryItem.icon : MoreHorizontal;
            const moreLabel = isSecondaryActive && activeSecondaryItem ? activeSecondaryItem.label.split(' ')[0] : 'More';
            const isActive = isSecondaryActive || showMoreDrawer;

            return (
              <button
                onClick={() => setShowMoreDrawer((prev) => !prev)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 relative min-h-[48px] select-none will-change-transform ${
                  isActive
                    ? 'text-amber-300 bg-amber-500/15 border border-amber-500/35 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 font-normal'
                }`}
              >
                <MoreIcon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-amber-400' : 'text-zinc-400'
                  }`}
                />
                <span className="text-[10px] mt-1 font-medium tracking-tight truncate max-w-[58px]">
                  {moreLabel}
                </span>

                {isActive && (
                  <span className="absolute -bottom-0.5 w-4 h-1 bg-amber-400 rounded-full shadow-sm shadow-amber-400/80" />
                )}
              </button>
            );
          })()}
        </nav>
      </div>
    </>
  );
};
