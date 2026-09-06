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
type SoundDelivery = 'speaker_pulse' | 'binaural_stereo' | 'ambient_drone';

const VISION_KEY = 'nexus_focus_studio_vision_tiles';

const AUDIO_LABELS: Record<SoundMode, { title: string; beatHz: number; carrierHz: number; note: string; desc: string }> = {
  alpha: {
    title: 'Alpha Wave (Relaxed Focus)',
    beatHz: 10,
    carrierHz: 260,
    note: '10 Hz frequency for calm alertness and reducing neural chatter.',
    desc: 'Alpha waves promote effortless focus, flow states, and stress reduction.',
  },
  focus: {
    title: 'Beta Wave (High Concentration)',
    beatHz: 16,
    carrierHz: 300,
    note: '16 Hz active frequency for analytical problem solving & deep work.',
    desc: 'Beta waves sharpen attention, eliminate brain fog, and speed up execution.',
  },
  calm: {
    title: 'Theta Wave (Deep Decompression)',
    beatHz: 6,
    carrierHz: 210,
    note: '6 Hz slow wave for meditation, creative reflection, and unwinding.',
    desc: 'Theta waves support memory consolidation, creativity, and mental reset.',
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
  const [mode, setMode] = useState<SoundMode>('focus');
  const [delivery, setDelivery] = useState<SoundDelivery>('speaker_pulse');
  const [volume, setVolume] = useState(0.55);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tiles, setTiles] = useState<VisionTile[]>(loadVisionTiles);
  const [caption, setCaption] = useState('');
  const [audioMeter, setAudioMeter] = useState<number[]>([15, 30, 20, 45, 25]);

  const audioRef = useRef<{
    context: AudioContext;
    masterGain: GainNode;
    compressor: DynamicsCompressorNode;
    oscillators: OscillatorNode[];
    noiseNode?: AudioNode;
  } | null>(null);
  const visualizerTimerRef = useRef<number | null>(null);

  const activeGoal = useMemo(() => pickGoal(goals, selectedGoalId), [goals, selectedGoalId]);
  const completedToday = dailyLogs.filter((log) => log.date === todayStr && log.completed).length;
  const activeGoals = goals.filter((goal) => !goal.archived).length;
  const engagement = activeGoals > 0 ? Math.round((completedToday / activeGoals) * 100) : 0;
  const sound = AUDIO_LABELS[mode];
  const beatHz = mode === 'focus' && engagement >= 60 ? sound.beatHz + 2 : sound.beatHz;

  useEffect(() => {
    saveVisionTiles(tiles);
  }, [tiles]);

  // Adjust master volume live
  useEffect(() => {
    if (!audioRef.current) return;
    try {
      const { context, masterGain } = audioRef.current;
      masterGain.gain.setTargetAtTime(volume, context.currentTime, 0.05);
    } catch {
      /* AudioContext may be closed */
    }
  }, [volume]);

  // Restart audio graph if mode or delivery changes while playing
  useEffect(() => {
    if (isPlaying) {
      stopAudio();
      const timer = window.setTimeout(() => {
        startAudio();
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [mode, delivery]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Visualizer meter loop
  useEffect(() => {
    if (isPlaying) {
      visualizerTimerRef.current = window.setInterval(() => {
        setAudioMeter([
          20 + Math.random() * 60,
          35 + Math.random() * 55,
          15 + Math.random() * 75,
          40 + Math.random() * 50,
          25 + Math.random() * 65,
          30 + Math.random() * 60,
          20 + Math.random() * 70,
        ]);
      }, 120);
    } else {
      if (visualizerTimerRef.current) clearInterval(visualizerTimerRef.current);
      setAudioMeter([12, 12, 12, 12, 12, 12, 12]);
    }
    return () => {
      if (visualizerTimerRef.current) clearInterval(visualizerTimerRef.current);
    };
  }, [isPlaying]);

  const startAudio = async () => {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      const context = new AudioContextCtor();

      // Crucial for mobile / Android WebView: resume suspended context on user click
      if (context.state === 'suspended') {
        await context.resume();
      }

      // Master dynamics compressor to ensure loudness without distortion
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-12, context.currentTime);
      compressor.knee.setValueAtTime(8, context.currentTime);
      compressor.ratio.setValueAtTime(4, context.currentTime);
      compressor.attack.setValueAtTime(0.005, context.currentTime);
      compressor.release.setValueAtTime(0.08, context.currentTime);

      const masterGain = context.createGain();
      masterGain.gain.setValueAtTime(volume, context.currentTime);

      masterGain.connect(compressor);
      compressor.connect(context.destination);

      const createdOscillators: OscillatorNode[] = [];

      if (delivery === 'speaker_pulse') {
        // ISOCHRONIC PULSE: Audibly clear on phone speakers without headphones
        // Primary carrier oscillator
        const carrierOsc = context.createOscillator();
        carrierOsc.type = 'triangle'; // Richer harmonic profile than pure sine
        carrierOsc.frequency.setValueAtTime(sound.carrierHz, context.currentTime);

        // Harmonic overtone oscillator (ensures small phone speaker resonance)
        const harmonicOsc = context.createOscillator();
        harmonicOsc.type = 'sine';
        harmonicOsc.frequency.setValueAtTime(sound.carrierHz * 1.5, context.currentTime);

        const harmonicGain = context.createGain();
        harmonicGain.gain.setValueAtTime(0.28, context.currentTime);
        harmonicOsc.connect(harmonicGain);

        // Tremolo LFO modulating gain at exact target brainwave beatHz (10Hz, 16Hz, 6Hz)
        const pulseGain = context.createGain();
        pulseGain.gain.setValueAtTime(0.5, context.currentTime);

        const lfoOsc = context.createOscillator();
        lfoOsc.type = 'sine';
        lfoOsc.frequency.setValueAtTime(beatHz, context.currentTime);

        const lfoDepth = context.createGain();
        lfoDepth.gain.setValueAtTime(0.42, context.currentTime);

        lfoOsc.connect(lfoDepth);
        lfoDepth.connect(pulseGain.gain);

        carrierOsc.connect(pulseGain);
        harmonicGain.connect(pulseGain);
        pulseGain.connect(masterGain);

        carrierOsc.start();
        harmonicOsc.start();
        lfoOsc.start();

        createdOscillators.push(carrierOsc, harmonicOsc, lfoOsc);
      } else if (delivery === 'binaural_stereo') {
        // STEREO BINAURAL: Left ear carrier, Right ear carrier + beatHz with overtone
        const merger = context.createChannelMerger(2);

        const leftOsc = context.createOscillator();
        leftOsc.type = 'sine';
        leftOsc.frequency.setValueAtTime(sound.carrierHz, context.currentTime);

        const rightOsc = context.createOscillator();
        rightOsc.type = 'sine';
        rightOsc.frequency.setValueAtTime(sound.carrierHz + beatHz, context.currentTime);

        // Warm subtle overtone so phone speakers still produce perceptible tone
        const overtoneOsc = context.createOscillator();
        overtoneOsc.type = 'triangle';
        overtoneOsc.frequency.setValueAtTime(sound.carrierHz * 2, context.currentTime);
        const overtoneGain = context.createGain();
        overtoneGain.gain.setValueAtTime(0.18, context.currentTime);
        overtoneOsc.connect(overtoneGain);

        const leftGain = context.createGain();
        leftGain.gain.setValueAtTime(0.65, context.currentTime);
        leftOsc.connect(leftGain);
        overtoneGain.connect(leftGain);
        leftGain.connect(merger, 0, 0);

        const rightGain = context.createGain();
        rightGain.gain.setValueAtTime(0.65, context.currentTime);
        rightOsc.connect(rightGain);
        overtoneGain.connect(rightGain);
        rightGain.connect(merger, 0, 1);

        merger.connect(masterGain);

        leftOsc.start();
        rightOsc.start();
        overtoneOsc.start();

        createdOscillators.push(leftOsc, rightOsc, overtoneOsc);
      } else {
        // AMBIENT DRONE: Carrier wave + warm filtered soothing noise buffer
        const droneOsc = context.createOscillator();
        droneOsc.type = 'sine';
        droneOsc.frequency.setValueAtTime(sound.carrierHz, context.currentTime);

        const subOsc = context.createOscillator();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(sound.carrierHz * 0.75, context.currentTime);

        const droneGain = context.createGain();
        droneGain.gain.setValueAtTime(0.55, context.currentTime);
        droneOsc.connect(droneGain);
        subOsc.connect(droneGain);
        droneGain.connect(masterGain);

        // Gentle noise generation
        const bufferSize = context.sampleRate * 2;
        const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2) * 0.08;
        }

        const whiteNoise = context.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, context.currentTime);

        const noiseGain = context.createGain();
        noiseGain.gain.setValueAtTime(0.35, context.currentTime);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);

        droneOsc.start();
        subOsc.start();
        whiteNoise.start();

        createdOscillators.push(droneOsc, subOsc);
      }

      audioRef.current = {
        context,
        masterGain,
        compressor,
        oscillators: createdOscillators,
      };
      setIsPlaying(true);
    } catch (err) {
      console.error('FocusStudio audio initialization failed:', err);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (!audioRef.current) return;
    const { context, masterGain, oscillators } = audioRef.current;
    try {
      masterGain.gain.setTargetAtTime(0, context.currentTime, 0.04);
      window.setTimeout(() => {
        try {
          oscillators.forEach((osc) => {
            try {
              osc.stop();
            } catch {
              /* already stopped */
            }
          });
          context.close();
        } catch {
          /* already closed */
        }
      }, 70);
    } catch {
      /* ignore */
    }
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
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Audible Frequencies & Mental Flow</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Scientifically anchored soundwave pulses and motivational cues. Optimized for both smartphone speakers and headphones to induce deep concentration.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300">
            Today: <span className="font-mono text-emerald-300">{completedToday}/{activeGoals || 0}</span> active goals complete
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Audio Engine Box */}
        <section className="rounded-2xl border border-cyan-500/30 bg-zinc-900/90 p-5 shadow-xl shadow-black/30 space-y-4 relative overflow-hidden ring-1 ring-cyan-500/20">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                <Waves className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Focus Frequency Engine</h3>
                <p className="text-[11px] text-zinc-400 font-light">
                  {isPlaying ? '⚡ Audio active & streaming' : 'Tap Play to start stream'}
                </p>
              </div>
            </div>

            <button
              onClick={isPlaying ? stopAudio : startAudio}
              className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-md active:scale-95 ${
                isPlaying
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                  : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-cyan-950/50'
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Play Sound'}</span>
            </button>
          </div>

          {/* Live Animated Waveform Visualizer */}
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono uppercase text-zinc-500 font-semibold flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-zinc-600'}`} />
                <span>{isPlaying ? 'Engine Live' : 'Engine Idle'}</span>
                <span className="text-cyan-400 font-bold">• {beatHz} Hz Wave</span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">
                {sound.title}
              </p>
            </div>

            {/* Pulsing visualizer bars */}
            <div className="flex items-end gap-1 h-7 px-2">
              {audioMeter.map((val, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-100 ${
                    isPlaying
                      ? 'bg-gradient-to-t from-cyan-500 to-emerald-400'
                      : 'bg-zinc-800'
                  }`}
                  style={{ height: `${isPlaying ? Math.max(15, val) : 12}%` }}
                />
              ))}
            </div>
          </div>

          {/* Delivery Style Toggle (Speaker vs Headphone) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
              Output Style (Phone Speaker or Headphones)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDelivery('speaker_pulse')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  delivery === 'speaker_pulse'
                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 shadow-sm'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="block text-xs font-bold">🔊 Speaker Pulse</span>
                <span className="block text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  Isochronic pulse audible on any phone
                </span>
              </button>

              <button
                onClick={() => setDelivery('binaural_stereo')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  delivery === 'binaural_stereo'
                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 shadow-sm'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="block text-xs font-bold">🎧 Headphones</span>
                <span className="block text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  Stereo binaural beats L/R
                </span>
              </button>

              <button
                onClick={() => setDelivery('ambient_drone')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  delivery === 'ambient_drone'
                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 shadow-sm'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="block text-xs font-bold">🌊 Ambient Flow</span>
                <span className="block text-[10px] text-zinc-400 mt-0.5 leading-tight">
                  Warm harmonic drone & noise bed
                </span>
              </button>
            </div>
          </div>

          {/* Brainwave Frequency Target Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
              Brainwave Target
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(AUDIO_LABELS) as SoundMode[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    mode === item
                      ? 'border-amber-400/60 bg-amber-500/15 text-amber-200 shadow-sm'
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="block text-xs font-bold text-white capitalize">{item} Wave</span>
                  <span className="mt-0.5 block text-[10px] text-amber-300/90 font-mono font-semibold">
                    {AUDIO_LABELS[item].beatHz} Hz target
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Volume Control and Info Note */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">Sound Volume: {Math.round(volume * 100)}%</span>
              <span className="font-mono text-cyan-300 font-semibold">{sound.note}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.02"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-full accent-cyan-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
            />
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
