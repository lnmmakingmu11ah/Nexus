import React, { ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Download, Upload, Hexagon, Flame, RefreshCw, EyeOff, Settings, X, Check, Trophy } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_NAMES, CategoryKey, UserConfig } from '../types';

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
    <header className="app-topbar bg-zinc-950/95 backdrop-blur-2xl border-b border-amber-500/20 text-zinc-100 shadow-2xl shadow-black/80 will-change-transform">
      {/* Top Golden Ambient Glow Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-amber-500/70 via-emerald-400/80 to-amber-500/70 shadow-sm shadow-amber-500/20" />

      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Identity */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer group shrink-0 min-w-0"
            onClick={() => setCurrentTab('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/20 transition-transform group-hover:scale-105 shrink-0">
              <div className="relative flex items-center justify-center">
                <Hexagon className="w-6 h-6 text-emerald-200 stroke-[1.75]" />
                <Flame className="w-3.5 h-3.5 text-amber-300 absolute fill-amber-300/50" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="font-extrabold text-lg sm:text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-emerald-200 to-teal-300 group-hover:to-amber-300 transition-all font-mono drop-shadow-sm">
                  NEXUS
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono font-semibold border border-amber-500/30 shadow-sm">
                  v2.5
                </span>
                <span className="md:hidden text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg shadow-sm">
                  {compositeScore}%
                </span>
              </div>
            </div>
          </div>

          {/* Composite Score Badge & Mini Radar Quick view (Desktop) */}
          <div className="hidden md:flex items-center space-x-3.5 bg-zinc-900/90 py-1.5 px-3.5 rounded-2xl border border-zinc-800 shadow-inner">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">Life Score</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-extrabold font-mono text-emerald-400">{compositeScore}</span>
                <span className="text-xs text-zinc-500">%</span>
              </div>
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center space-x-1.5">
              {(Object.keys(CATEGORY_NAMES) as CategoryKey[]).map((catKey) => (
                <div
                  key={catKey}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border ${CATEGORY_COLORS[catKey].bg} ${CATEGORY_COLORS[catKey].text} ${CATEGORY_COLORS[catKey].border} shadow-sm`}
                  title={`${CATEGORY_NAMES[catKey]}: ${categoryScores[catKey]}%`}
                >
                  {categoryScores[catKey]}%
                </div>
              ))}
            </div>
          </div>

          {/* Export / Import & Settings */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={handleAnonymizeClick}
              title="Anonymize goal names and journal entries before export"
              className="hidden sm:flex px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 text-xs rounded-lg font-medium border border-indigo-500/40 items-center space-x-1.5 transition-colors shadow-sm"
            >
              <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
              <span>Anonymize</span>
            </button>
            <button
              onClick={onExport}
              title="Backup Data to JSON"
              className="p-2 sm:px-2.5 sm:py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg font-medium border border-zinc-700 flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import Data from JSON"
              className="hidden sm:flex px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg font-medium border border-zinc-700 items-center space-x-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import</span>
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              title="Settings & Data Controls"
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors border border-zinc-700 shrink-0"
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
