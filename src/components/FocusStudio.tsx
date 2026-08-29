import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioWaveform,
  Bell,
  BookOpenText,
  Brain,
  ImagePlus,
  Pause,
  Play,
  Quote,
  Sparkles,
  Sprout,
  Star,
  Trash2,
  Upload,
  Waves,
} from 'lucide-react';
import { DailyGoalLog, Goal, UserConfig } from '../types';

interface FocusStudioProps {
  goals: Goal[];
  dailyLogs: DailyGoalLog[];
  todayStr: string;
  userConfig: UserConfig;
}

interface VisionTile {
  id: string;
  image: string;
  caption: string;
  goalId?: string;
}

type SoundMode = 'alpha' | 'focus' | 'calm';
type MessageTone = 'grounded' | 'bold' | 'future';

const VISION_KEY = 'nexus_focus_studio_vision_tiles';
const AUDIO_LABELS: Record<SoundMode, { title: string; beatHz: number; carrierHz: number; note: string }> = {
  alpha: {
    title: 'Alpha-inspired unwind',
    beatHz: 10,
    carrierHz: 220,
    note: 'Gentle pulsing for relaxed concentration.',
  },
  focus: {
    title: 'Focus pulse',
    beatHz: 16,
    carrierHz: 240,
    note: 'A brighter pulse for work sessions.',
  },
  calm: {
    title: 'Calm reset',
    beatHz: 6,
    carrierHz: 196,
    note: 'Slow waves for breathing and decompression.',
  },
};

const loadVisionTiles = (): VisionTile[] => {
  try {
    const raw = localStorage.getItem(VISION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveVisionTiles = (tiles: VisionTile[]) => {
  try {
    localStorage.setItem(VISION_KEY, JSON.stringify(tiles));
  } catch {
    /* Vision images can exceed storage on some devices; keep the UI resilient. */
  }
};

const pickGoal = (goals: Goal[], selectedGoalId?: string) =>
  goals.find((goal) => goal.id === selectedGoalId) || goals.find((goal) => !goal.archived) || goals[0];

const affirmationFor = (goal: Goal | undefined, tone: MessageTone, name?: string) => {
  const goalName = goal?.name || 'your next meaningful step';
  const firstName = name || 'You';
  const lines: Record<MessageTone, string> = {
    grounded: `${firstName} can take one honest step toward ${goalName} today. Small proof counts.`,
    bold: `You are building the kind of evidence that makes ${goalName} feel normal, earned, and close.`,
    future: `Picture the version of you who kept showing up for ${goalName}; now give them one more reason to trust you.`,
  };
  return lines[tone];
};

const narrativeFor = (goal: Goal | undefined) => {
  const goalName = goal?.name || 'the path ahead';
  return `A gardener does not tug a seed into becoming a tree. They return with water, light, and patience. ${goalName} grows the same way: through repeated conditions that make success easier to choose. Today is not the whole harvest. It is one careful watering.`;
};

const meditationFor = (goal: Goal | undefined) => {
  const goalName = goal?.name || 'your goal';
  return [
    `Close your eyes and imagine a quiet ordinary day after ${goalName} has become part of your life.`,
    'Notice the room, your posture, the first small sign that this change is real.',
    'Let the scene become practical: what did you do this morning that made the outcome easier?',
    'Open your eyes and choose the smallest version of that action now.',
  ];
};

export const FocusStudio: React.FC<FocusStudioProps> = ({ goals, dailyLogs, todayStr, userConfig }) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals.find((goal) => !goal.archived)?.id || goals[0]?.id || '');
  const [tone, setTone] = useState<MessageTone>('grounded');
  const [mode, setMode] = useState<SoundMode>('alpha');
  const [volume, setVolume] = useState(0.16);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tiles, setTiles] = useState<VisionTile[]>(loadVisionTiles);
  const [caption, setCaption] = useState('');
  const audioRef = useRef<{
    context: AudioContext;
    leftOsc: OscillatorNode;
    rightOsc: OscillatorNode;
    gain: GainNode;
    merger: ChannelMergerNode;
  } | null>(null);

  const activeGoal = useMemo(() => pickGoal(goals, selectedGoalId), [goals, selectedGoalId]);
  const completedToday = dailyLogs.filter((log) => log.date === todayStr && log.completed).length;
  const activeGoals = goals.filter((goal) => !goal.archived).length;
  const engagement = activeGoals > 0 ? Math.round((completedToday / activeGoals) * 100) : 0;
  const sound = AUDIO_LABELS[mode];
  const beatHz = mode === 'focus' && engagement >= 60 ? sound.beatHz + 2 : sound.beatHz;

  useEffect(() => {
    saveVisionTiles(tiles);
  }, [tiles]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.gain.gain.setTargetAtTime(volume, audioRef.current.context.currentTime, 0.05);
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    const { context, leftOsc, rightOsc } = audioRef.current;
    leftOsc.frequency.setTargetAtTime(sound.carrierHz, context.currentTime, 0.08);
    rightOsc.frequency.setTargetAtTime(sound.carrierHz + beatHz, context.currentTime, 0.08);
  }, [sound.carrierHz, beatHz]);

  useEffect(() => {
    return () => stopAudio();
  }, []);

  const startAudio = async () => {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const leftOsc = context.createOscillator();
    const rightOsc = context.createOscillator();
    const leftGain = context.createGain();
    const rightGain = context.createGain();
    const gain = context.createGain();
    const merger = context.createChannelMerger(2);

    leftOsc.type = 'sine';
    rightOsc.type = 'sine';
    leftOsc.frequency.value = sound.carrierHz;
    rightOsc.frequency.value = sound.carrierHz + beatHz;
    gain.gain.value = volume;
    leftGain.gain.value = 0.5;
    rightGain.gain.value = 0.5;

    leftOsc.connect(leftGain).connect(merger, 0, 0);
    rightOsc.connect(rightGain).connect(merger, 0, 1);
    merger.connect(gain).connect(context.destination);
    leftOsc.start();
    rightOsc.start();
    audioRef.current = { context, leftOsc, rightOsc, gain, merger };
    setIsPlaying(true);
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    const nodes = audioRef.current;
    nodes.gain.gain.setTargetAtTime(0, nodes.context.currentTime, 0.03);
    window.setTimeout(() => {
      try {
        nodes.leftOsc.stop();
        nodes.rightOsc.stop();
        nodes.context.close();
      } catch {
        /* Audio may already be stopped by the browser lifecycle. */
      }
    }, 80);
    audioRef.current = null;
    setIsPlaying(false);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 6)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setTiles((current) => [
            {
              id: `vision-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              image: String(reader.result),
              caption: caption.trim() || activeGoal?.name || 'Future proof',
              goalId: activeGoal?.id,
            },
            ...current,
          ].slice(0, 12));
          setCaption('');
        };
        reader.readAsDataURL(file);
      });
  };

  const affirmation = affirmationFor(activeGoal, tone, userConfig.userName);
  const narrative = narrativeFor(activeGoal);
  const meditation = meditationFor(activeGoal);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-zinc-900/80 p-4 sm:p-6 shadow-2xl shadow-black/30">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-mono uppercase tracking-wider">Focus Studio</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Vision, audio, and coaching cues</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Transparent motivational tools for concentration and goal identity. Audio is optional wellness support, not a medical or guaranteed brain-state intervention.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300">
            Today: <span className="font-mono text-emerald-300">{completedToday}/{activeGoals || 0}</span> active goals complete
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-cyan-300" />
              <h3 className="text-base font-semibold text-white">Relaxation Audio</h3>
            </div>
            <button
              onClick={isPlaying ? stopAudio : startAudio}
              className="flex min-h-10 items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/25"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Stop' : 'Play'}</span>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(Object.keys(AUDIO_LABELS) as SoundMode[]).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  mode === item
                    ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <span className="block text-xs font-semibold">{AUDIO_LABELS[item].title}</span>
                <span className="mt-1 block text-[11px] text-zinc-500">{AUDIO_LABELS[item].beatHz} Hz beat</span>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-400">{sound.note}</span>
              <span className="font-mono text-cyan-300">{beatHz} Hz</span>
            </div>
            <label className="mt-3 block text-xs text-zinc-400">
              Volume
              <input
                type="range"
                min="0"
                max="0.35"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="mt-2 w-full accent-cyan-400"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Quote className="h-5 w-5 text-amber-300" />
              <h3 className="text-base font-semibold text-white">Motivational Messaging</h3>
            </div>
            <select
              value={selectedGoalId}
              onChange={(event) => setSelectedGoalId(event.target.value)}
              className="min-h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-emerald-400"
            >
              {goals.filter((goal) => !goal.archived).map((goal) => (
                <option key={goal.id} value={goal.id}>{goal.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex rounded-xl border border-zinc-800 bg-zinc-950/70 p-1">
            {(['grounded', 'bold', 'future'] as MessageTone[]).map((item) => (
              <button
                key={item}
                onClick={() => setTone(item)}
                className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold capitalize transition-colors ${
                  tone === item ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <blockquote className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-lg font-semibold leading-relaxed text-amber-50">
            {affirmation}
          </blockquote>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <BookOpenText className="h-4 w-4 text-emerald-300" />
                Coaching Narrative
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">{narrative}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Brain className="h-4 w-4 text-rose-300" />
                Future Pacing
              </div>
              <ol className="space-y-2 text-sm leading-relaxed text-zinc-300">
                {meditation.map((line, index) => (
                  <li key={line} className="flex gap-2">
                    <span className="font-mono text-rose-300">{index + 1}</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-rose-300" />
            <h3 className="text-base font-semibold text-white">Vision Board</h3>
          </div>
          <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/25">
            <Upload className="h-4 w-4" />
            <span>Add Images</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Caption for the next image"
            className="min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-rose-400"
          />
          <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 text-xs text-zinc-400">
            <Star className="h-4 w-4 text-amber-300" />
            <span>Motifs are visible and user-controlled</span>
          </div>
        </div>

        {tiles.length === 0 ? (
          <div className="mt-4 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center">
            <Sprout className="h-8 w-8 text-emerald-300" />
            <p className="mt-3 max-w-md text-sm text-zinc-400">
              Add images that represent the life you are building. NEXUS will keep the board direct, visible, and under your control.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {tiles.map((tile, index) => (
              <article
                key={tile.id}
                className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-lg"
                style={{ transform: `rotate(${index % 2 === 0 ? '-0.7deg' : '0.7deg'})` }}
              >
                <img src={tile.image} alt={tile.caption} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/65 to-transparent p-3 pt-10">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{tile.caption}</p>
                </div>
                <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/50 p-1.5 text-amber-200 backdrop-blur">
                  {index % 3 === 0 ? <Star className="h-4 w-4" /> : index % 3 === 1 ? <Sprout className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <button
                  onClick={() => setTiles((current) => current.filter((item) => item.id !== tile.id))}
                  className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/55 p-1.5 text-zinc-200 opacity-0 backdrop-blur transition-opacity hover:text-rose-200 group-hover:opacity-100"
                  aria-label="Remove vision board image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Bell className="h-5 w-5 text-emerald-300" />
            Ethical Reminder Preview
          </div>
          <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm leading-relaxed text-emerald-50">
            Your progress is becoming visible to you. Keep the promise small enough to complete today.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/75 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <AudioWaveform className="h-5 w-5 text-cyan-300" />
            Adaptive Audio Note
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Focus mode gently brightens when today&apos;s completion rate passes 60%. The app uses your habit metrics only; it does not infer brain states or require EEG hardware.
          </p>
        </div>
      </section>
    </div>
  );
};
