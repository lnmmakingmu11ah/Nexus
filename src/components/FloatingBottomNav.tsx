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
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(false);
  const reachedBottomOnceRef = useRef(false);
  const reachedBottomAtRef = useRef(0);
  const touchStartY = useRef(0);
  const touchStartedAtBottom = useRef(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
          const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
          const totalHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          );

          const isAtBottom = (windowHeight + currentScrollY) >= (totalHeight - 25);

          if (!isAtBottom) {
            // Anywhere in the body/middle or top: hide bottom nav
            setIsBottomNavVisible(false);
            reachedBottomOnceRef.current = false;
            reachedBottomAtRef.current = 0;
          } else {
            // Reached bottom of page
            // First time reaching bottom: do not show yet ("then not yet")
            if (!reachedBottomOnceRef.current) {
              reachedBottomOnceRef.current = true;
              reachedBottomAtRef.current = Date.now();
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    // When already at the bottom, a second scroll gesture (swiping up or wheeling down) reveals the bottom nav
    const handleWheel = (e: WheelEvent) => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const totalHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const isAtBottom = (windowHeight + currentScrollY) >= (totalHeight - 25);

      const hasSettledAtBottom = Date.now() - reachedBottomAtRef.current > 220;
      if (isAtBottom && reachedBottomOnceRef.current && hasSettledAtBottom && e.deltaY > 0) {
        setIsBottomNavVisible(true);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      // The gesture that reaches the bottom must not also reveal navigation.
      // Only a fresh upward pull that starts at the bottom can do that.
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const totalHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      touchStartedAtBottom.current =
        (windowHeight + currentScrollY) >= (totalHeight - 25) && reachedBottomOnceRef.current;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const totalHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const isAtBottom = (windowHeight + currentScrollY) >= (totalHeight - 25);
      const pullUpDistance = touchStartY.current - e.touches[0].clientY;

      // When user is at the bottom, has arrived at bottom, and swipes up:
      if (touchStartedAtBottom.current && isAtBottom && reachedBottomOnceRef.current && pullUpDistance > 25) {
        setIsBottomNavVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
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
        className={`fixed left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md z-40 md:hidden will-change-transform transition-[transform,opacity,filter] duration-[1800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isBottomNavVisible || showMoreDrawer
            ? 'translate-y-0 opacity-100 blur-0 pointer-events-auto'
            : 'translate-y-28 opacity-0 blur-[3px] pointer-events-none'
        }`}
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <nav className="bg-zinc-900/72 backdrop-blur-2xl border border-white/[0.12] border-t-white/[0.18] rounded-full p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.75),0_0_32px_rgba(245,158,11,0.06)] flex items-center justify-between ring-1 ring-white/[0.05]">
          {/* 4 Primary Navigation Tabs */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all duration-200 active:scale-95 relative min-h-[46px] select-none will-change-transform ${
                  isActive
                    ? 'text-white bg-white/[0.1] shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 font-normal'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-amber-400' : 'text-zinc-400'
                  }`}
                />
                <span className="text-[10px] mt-0.5 font-medium tracking-tight truncate max-w-[58px]">
                  {item.label}
                </span>

                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 bg-amber-400 rounded-full shadow-sm shadow-amber-400" />
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
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all duration-200 active:scale-95 relative min-h-[46px] select-none will-change-transform ${
                  isActive
                    ? 'text-white bg-white/[0.1] shadow-sm font-semibold'
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
