import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Download, Upload, Flame, RefreshCw, EyeOff, Settings, X, Check, Trophy } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_NAMES, CategoryKey, UserConfig } from '../types';
import { NexusLogo } from './NexusLogo';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  compositeScore: number;
  categoryScores: Record<CategoryKey, number>;
  userConfig: UserConfig;
  onExport: () => void;
  onAnonymizeExport: () => void;
  onImport: (jsonStr: string) => void;
  onResetOnboarding: () => void;
  settingsContent?: ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  compositeScore,
  categoryScores,
  userConfig,
  onExport,
  onAnonymizeExport,
  onImport,
  onResetOnboarding,
  settingsContent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (currentScrollY <= 25) {
        // At or reached the very top of the page -> always show
        setIsHeaderHidden(false);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        // Scrolling down -> hide upwards
        setIsHeaderHidden(true);
      } else if (currentScrollY <= 40) {
        // Scrolled all the way back up to the top -> re-pop up
        setIsHeaderHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAnonymizeClick = () => {
    onAnonymizeExport();
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImport(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'aicoach', label: 'NEXUS AI Blueprint' },
    { id: 'journal', label: 'Journal & Proof' },
    { id: 'goals', label: 'Goals & Weights' },
    { id: 'trends', label: 'Trends' },
    { id: 'insights', label: 'AI Insights' },
    { id: 'focus', label: 'Focus Studio' },
    { id: 'longevity', label: 'Life Expectancy' },
  ];

  return (
    <header className={`app-topbar bg-zinc-950/95 backdrop-blur-2xl border-b border-zinc-800/80 text-zinc-100 shadow-xl shadow-black/60 will-change-transform transition-transform duration-300 ease-in-out ${isHeaderHidden ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Left spacer for perfect geometric center balance */}
          <div className="w-10 h-10 shrink-0" />

          {/* Centralized NEXUS Logo & Brand Sign in a cool blending way */}
          <div
            className="flex items-center justify-center cursor-pointer group select-none transition-all duration-300"
            onClick={() => setCurrentTab('dashboard')}
          >
            <div className="relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-teal-500/10 border border-amber-500/25 group-hover:border-amber-400/40 shadow-lg shadow-black/50 backdrop-blur-md transition-all">
              {/* Soft atmospheric ambient glow */}
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/20 to-teal-500/15 blur-sm opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <NexusLogo size="xs" animated={false} />
              </div>
              <span className="relative font-black text-lg sm:text-xl tracking-[0.22em] font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-emerald-200 to-teal-300 group-hover:to-amber-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                NEXUS
              </span>
            </div>
          </div>

          {/* Right Action: Settings Button */}
          <div className="w-10 h-10 flex items-center justify-end shrink-0">
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Settings & Data Controls"
              className="w-10 h-10 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-zinc-800 flex items-center justify-center active:scale-95 shadow-sm cursor-pointer"
              aria-label="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Settings & Privacy Modal */}
        {showSettingsModal && createPortal(
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 text-zinc-100 shadow-2xl space-y-5 relative my-4 sm:my-8 ring-1 ring-white/10">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="sticky top-0 float-right z-10 p-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-colors ml-auto"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>




              <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Settings & Data Sharing</h3>
                  <p className="text-xs text-zinc-400 font-light">
                    Manage privacy settings, mentor sharing, and local data backups
                  </p>
                </div>
              </div>

              {/* Anonymize & Sharing Focus Section */}
              <div className="bg-zinc-950/80 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0 mt-0.5">
                    <EyeOff className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Anonymize Data for Mentor/Coach</h4>
                    <p className="text-xs text-zinc-400 font-light mt-1 leading-relaxed">
                      Replaces all goal names (such as "Goal #1") and journal entry text with generic placeholders before exporting. Keeps all completion scores, category trends, and dates intact so a mentor can review your progress metrics without seeing private details.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
                  <span className="text-xs text-zinc-400 font-mono">
                    Coach Export Package (.json)
                  </span>
                  <button
                    onClick={handleAnonymizeClick}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Anonymize & Export</span>
                  </button>
                </div>

                {copiedNotification && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-300 flex items-center space-x-2 animate-fade-in">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Anonymized data file generated & downloaded successfully!</span>
                  </div>
                )}
              </div>

              {settingsContent && (
                <div className="space-y-4">
                  <h4 className="text-xs font-mono uppercase text-zinc-400">NEXUS Alerts & Reminders</h4>
                  {settingsContent}
                </div>
              )}

              {/* Additional Settings & Tools */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase text-zinc-400">System Actions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setCurrentTab('achievements');
                    }}
                    className="p-3 bg-zinc-950 hover:bg-zinc-800/80 border border-amber-500/25 rounded-xl text-left space-y-1 transition-colors sm:col-span-2"
                  >
                    <div className="text-xs font-medium text-white flex items-center space-x-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Milestones & Badges</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-light">
                      Open your achievements page (removed from Home for a cleaner dashboard)
                    </p>
                  </button>

                  <button
                    onClick={onExport}
                    className="p-3 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-left space-y-1 transition-colors"
                  >
                    <div className="text-xs font-medium text-white flex items-center space-x-1.5">
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Standard Export</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-light">
                      Export full un-anonymized backup with personal text
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      onResetOnboarding();
                    }}
                    className="p-3 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-left space-y-1 transition-colors"
                  >
                    <div className="text-xs font-medium text-white flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Re-run Goal Scout</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-light">
                      One-time goal interview again (optional)
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        , document.body)}

        {/* Top Navigation Tabs (Desktop only - Mobile uses Floating Translucent Bottom Bar) */}
        <nav className="hidden md:flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-zinc-800/60">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
