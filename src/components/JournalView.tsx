import React, { useState } from 'react';
import { BookOpen, Sparkles, Send, Calendar, Smile, Meh, Frown, Camera, Check } from 'lucide-react';
import { DailyJournal, UserConfig } from '../types';
import { aiClient } from '../services/aiClient';

interface JournalViewProps {
  todayStr: string;
  journals: DailyJournal[];
  userConfig: UserConfig;
  onSaveJournal: (entry: DailyJournal) => void;
  onOpenProofModal: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  todayStr,
  journals,
  userConfig,
  onSaveJournal,
  onOpenProofModal,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const existingJournal = journals.find((j) => j.date === selectedDate);

  const [textEntry, setTextEntry] = useState<string>(existingJournal?.entry || '');
  const [mood, setMood] = useState<number>(existingJournal?.mood || 4);
  const [loadingAi, setLoadingAi] = useState(false);
  const [currentAiReflection, setCurrentAiReflection] = useState<string | undefined>(
    existingJournal?.aiReflection
  );

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const found = journals.find((j) => j.date === newDate);
    setTextEntry(found?.entry || '');
    setMood(found?.mood || 4);
    setCurrentAiReflection(found?.aiReflection);
  };

  const handleSaveAndReflect = async () => {
    if (!textEntry.trim()) return;
    setLoadingAi(true);

    let reflectionText = currentAiReflection;

    try {
      const data = await aiClient.journalReflect({
        journalEntry: textEntry,
        lifePathGoal: userConfig.lifePathGoal,
        completedGoals: [],
        scoreSummary: { composite: 50 },
      });
      if (data.reflection) {
        reflectionText = data.reflection;
        setCurrentAiReflection(data.reflection);
      }
    } catch (err) {
      console.error('Reflection error:', err);
    } finally {
      setLoadingAi(false);

      const updatedJournal: DailyJournal = {
        date: selectedDate,
        entry: textEntry.trim(),
        aiReflection: reflectionText,
        mood,
        updatedAt: new Date().toISOString(),
      };
      onSaveJournal(updatedJournal);
    }
  };

  const moodIcons = [
    { value: 1, icon: Frown, label: 'Low Energy' },
    { value: 2, icon: Meh, label: 'Subdued' },
    { value: 3, icon: Meh, label: 'Balanced' },
    { value: 4, icon: Smile, label: 'Grounded' },
    { value: 5, icon: Smile, label: 'Flow State' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Editor Main Section (7 cols) */}
      <div className="lg:col-span-7 bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 transition-all duration-300">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Daily Reflection Journal</h2>
              <p className="text-xs text-zinc-400">
                Free-text entry & human AI coach reflection
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 px-2.5 py-1.5 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Mood Selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-2">
            State of Mind / Energy Level
          </label>
          <div className="flex items-center space-x-2">
            {moodIcons.map((m) => {
              const Icon = m.icon;
              const isSelected = mood === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium flex flex-col items-center space-y-1 transition-all ${
                    isSelected
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Journal Input */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            What went well today? What challenged your values or focus?
          </label>
          <textarea
            value={textEntry}
            onChange={(e) => setTextEntry(e.target.value)}
            rows={7}
            placeholder="Type your reflection..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 leading-relaxed font-sans"
          />
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onOpenProofModal}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Attach Proof Media</span>
          </button>

          <button
            onClick={handleSaveAndReflect}
            disabled={loadingAi || !textEntry.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl flex items-center space-x-2 transition-all shadow-md shadow-indigo-950/40 cursor-pointer"
          >
            {loadingAi ? (
              <span>Reflecting with AI...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Save & Generate Reflection</span>
              </>
            )}
          </button>
        </div>

        {/* AI Reflection Output Box */}
        {currentAiReflection && (
          <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>NEXUS AI Reflection</span>
            </div>
            <p className="text-xs text-zinc-200 leading-relaxed font-light italic">
              "{currentAiReflection}"
            </p>
          </div>
        )}
      </div>

      {/* Journal History Sidebar (5 cols) */}
      <div className="lg:col-span-5 bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-black/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col transition-all duration-300">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
          <span>Journal History</span>
          <span className="text-xs text-zinc-400 font-mono">{journals.length} entries</span>
        </h3>

        {journals.length === 0 ? (
          <div className="my-auto text-center py-12 text-zinc-500 text-xs font-light">
            No journal entries recorded yet. Save your first entry to build your reflection archive.
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {journals.map((j) => (
              <div
                key={j.date}
                onClick={() => handleDateChange(j.date)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedDate === j.date
                    ? 'bg-indigo-950/30 border-indigo-500/40'
                    : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-indigo-300 font-medium">{j.date}</span>
                  {j.mood && (
                    <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded">
                      Energy {j.mood}/5
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-300 line-clamp-2 font-light">{j.entry}</p>
                {j.aiReflection && (
                  <p className="text-[11px] text-indigo-400/80 line-clamp-1 italic mt-1.5">
                    "{j.aiReflection}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
