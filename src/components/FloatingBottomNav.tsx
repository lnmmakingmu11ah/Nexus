import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Target,
  TrendingUp,
  Sparkles,
  HeartPulse,
  Bot,
} from 'lucide-react';

interface FloatingBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'aicoach', label: 'NEXUS AI', icon: Bot },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'insights', label: 'Insights', icon: Sparkles },
    { id: 'longevity', label: 'Longevity', icon: HeartPulse },
  ];

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] max-w-lg z-40 md:hidden"
      style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <nav className="bg-zinc-950/90 backdrop-blur-2xl border border-amber-500/30 rounded-2xl p-1.5 shadow-2xl shadow-black/90 flex items-center justify-around ring-1 ring-amber-500/20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 relative min-w-[44px] min-h-[46px] select-none ${
                isActive
                  ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 font-normal'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform duration-200 ${
                  isActive ? 'scale-110 text-amber-400' : 'text-zinc-400'
                }`}
              />
              <span className="text-[10px] mt-1 font-medium tracking-tight line-clamp-1">
                {item.label}
              </span>

              {isActive && (
                <span className="absolute -bottom-0.5 w-4 h-1 bg-amber-400 rounded-full shadow-sm shadow-amber-400/80" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
