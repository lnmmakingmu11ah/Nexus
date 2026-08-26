import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Camera, CheckCircle2, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { DailyJournal, Goal } from '../types';
import { aiClient } from '../services/aiClient';

type ProofStyle = 'photo' | 'reflection' | 'challenge';

interface CompletionReviewModalProps {
  isOpen: boolean;
  goal?: Goal;
  todayStr: string;
  existingJournal?: DailyJournal;
  onClose: () => void;
  onGoJournal: () => void;
  onSaveJournal: (journal: DailyJournal) => void;
  onVerified: (goalId: string, resultMessage: string, confidence?: number, evidenceSummary?: string) => void;
}

export const CompletionReviewModal: React.FC<CompletionReviewModalProps> = ({
  isOpen,
  goal,
  todayStr,
  existingJournal,
  onClose,
  onGoJournal,
  onSaveJournal,
  onVerified,
}) => {
  const [journalDraft, setJournalDraft] = useState(existingJournal?.entry || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    verified: boolean;
    message: string;
    confidence?: number;
    evidenceSummary?: string;
    followUpQuestions?: string[];
  } | null>(null);

  const questions = useMemo(() => {
    const text = `${goal?.name || ''} ${goal?.description || ''}`.toLowerCase();
    if (/book|read|chapter|study|learn/.test(text)) {
      return [
        'Which chapter, section, or exact pages did you cover?',
        'Name one specific idea, example, or argument you remember from it.',
        'What confused you or made you pause for a second?',
      ];
    }
    if (/workout|gym|run|walk|exercise|cardio|push|lift/.test(text)) {
      return [
        'What exact workout did you do, including sets, distance, time, or route?',
        'What felt harder than expected today?',
        'What is one body signal you noticed after finishing?',
      ];
    }
    if (/meditat|pray|gratitude|mindful|breath|reflect|calm/.test(text)) {
      return [
        'Where were you, and how long did the session actually last?',
        'What kept interrupting your focus?',
        'What felt different afterward, even slightly?',
      ];
    }
    return [
      'What exactly did you do, and for how long?',
      'Where did it happen, and what was the first step?',
      'What detail would be hard to know if someone was just guessing?',
    ];
  }, [goal?.description, goal?.name]);

  const proofStyle: ProofStyle = useMemo(() => {
    if (goal?.proofPreference && goal.proofPreference !== 'auto') return goal.proofPreference;
    const text = `${goal?.name || ''} ${goal?.description || ''}`.toLowerCase();
    if (/meditat|pray|gratitude|mindful|breath|reflect|journal|therapy|emotion|calm|focus/.test(text)) {
      return 'reflection';
    }
    if (/book|read|chapter|study|learn|course|lecture|practice|deep work/.test(text)) {
      return 'challenge';
    }
    return 'photo';
  }, [goal?.description, goal?.name, goal?.proofPreference]);

  useEffect(() => {
    if (isOpen) {
      setJournalDraft(existingJournal?.entry || '');
      setSelectedImage(null);
      setAnswers(['', '', '']);
      setResult(null);
    }
  }, [existingJournal?.entry, goal?.id, isOpen]);

  if (!isOpen || !goal) return null;

  const journalIsSpecific = journalDraft.trim().length >= 80;
  const enoughAnswers = answers.filter((answer) => answer.trim().length >= 12).length >= 2;
  const canReview =
    journalIsSpecific &&
    (proofStyle === 'reflection' || Boolean(selectedImage) || (proofStyle === 'challenge' && enoughAnswers));
  const styleLabel =
    proofStyle === 'reflection'
      ? 'Reflection Check'
      : proofStyle === 'challenge'
      ? 'Challenge Review'
      : 'Photo Proof';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    if (!canReview) return;
    setLoading(true);
    setResult(null);

    const savedJournal: DailyJournal = {
      date: todayStr,
      entry: journalDraft.trim(),
      aiReflection: existingJournal?.aiReflection,
      mood: existingJournal?.mood,
      updatedAt: new Date().toISOString(),
    };
    onSaveJournal(savedJournal);

    try {
      const verification = await aiClient.verifyProof({
        imageBase64: selectedImage || undefined,
        mimeType: selectedImage ? 'image/jpeg' : undefined,
        goalName: goal.name,
        goalDescription: goal.description,
        journalEntry: journalDraft.trim(),
        challengeAnswers: answers.map((answer) => answer.trim()).filter(Boolean),
        verificationMode: selectedImage
          ? 'proof'
          : proofStyle === 'reflection'
          ? 'journal_reflection'
          : 'journal_challenge',
      });

      setResult(verification);
      if (verification.verified) {
        onVerified(goal.id, verification.message, verification.confidence, verification.evidenceSummary);
      }
    } catch {
      setResult({
        verified: false,
        confidence: 25,
        message: 'NEXUS could not verify this yet. Add stronger proof or answer with more specifics.',
        evidenceSummary: 'Verification failed closed, so this was not marked done.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
      <div className="bg-zinc-950 border border-amber-500/35 rounded-2xl max-w-2xl w-full p-5 sm:p-6 text-zinc-100 shadow-2xl space-y-5 relative my-4 sm:my-8 ring-1 ring-amber-500/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg"
          aria-label="Close completion review"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Completion Review</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {goal.name} uses {styleLabel}. Specifics beat vibes here.
            </p>
          </div>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex gap-2.5 text-xs text-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <p>
            You cannot mark a goal done without evidence. NEXUS chose the proof style for this habit,
            and you can change it later in Goals if it picked weirdly.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
            Journal specifics
          </label>
          <textarea
            value={journalDraft}
            onChange={(e) => {
              setJournalDraft(e.target.value);
              setResult(null);
            }}
            rows={5}
            placeholder="Write what you actually did: time, place, amount, chapter/pages, reps, what felt hard, what changed..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className={journalIsSpecific ? 'text-emerald-300' : 'text-amber-300'}>
              {journalDraft.trim().length}/80 minimum detail
            </span>
            <button
              type="button"
              onClick={onGoJournal}
              className="text-indigo-300 hover:text-indigo-200 font-medium"
            >
              Open full journal
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proofStyle !== 'reflection' ? (
            <label className="border border-dashed border-zinc-700 hover:border-emerald-500/60 bg-zinc-900/70 rounded-xl p-4 cursor-pointer flex flex-col items-center justify-center text-center min-h-40">
              {selectedImage ? (
                <img src={selectedImage} alt="Proof preview" className="max-h-36 object-contain rounded-lg" />
              ) : (
                <>
                  <Upload className="w-7 h-7 text-zinc-500 mb-2" />
                  <span className="text-xs font-medium text-zinc-300">
                    {proofStyle === 'photo' ? 'Attach proof photo' : 'Optional proof photo'}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1">Photos are checked, not stored.</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>
          ) : (
            <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-xl p-4 min-h-40 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                <BookOpen className="w-4 h-4" />
                <span>Reflection Check</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed mt-2">
                For quiet internal habits, NEXUS checks the texture of the journal: timing, setting,
                distraction, emotional shift, and one detail that feels lived-in.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Camera className="w-3.5 h-3.5 text-emerald-300" />
              {proofStyle === 'reflection' ? 'Reflection prompts' : 'No proof? Answer these.'}
            </div>
            {questions.map((question, index) => (
              <div key={question} className="space-y-1">
                <label className="text-[11px] text-zinc-400">{question}</label>
                <input
                  value={answers[index] || ''}
                  onChange={(e) => {
                    const updated = [...answers];
                    updated[index] = e.target.value;
                    setAnswers(updated);
                    setResult(null);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            ))}
          </div>
        </div>

        {result && (
          <div
            className={`p-3 rounded-xl border text-xs space-y-1 ${
              result.verified
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {result.message}
              </span>
              <span className="font-mono">{result.confidence || 0}%</span>
            </div>
            {result.evidenceSummary && <p className="text-[11px] opacity-80">{result.evidenceSummary}</p>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="sm:flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded-xl font-medium"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={!canReview || loading}
            className="sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Reviewing evidence...' : 'Ask NEXUS to verify'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
