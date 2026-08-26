import { Goal, LifeExpectancyFactor, UserConfig } from './types';

export const DEFAULT_USER_CONFIG: UserConfig = {
  onboarded: false,
  lifePathGoal: 'Live with wisdom, calm discipline, physical strength, and purpose',
  age: 30,
  sex: 'male',
  categoryBaselines: {
    health: 50,
    spiritual: 50,
    smarts: 50,
    selfCare: 50,
    happiness: 50,
  },
  absenceThresholdDays: 3,
  dailyDecayRate: 2.0,
  maxStreakMultiplier: 1.8,
  streakRampDays: 10,
  healthApiSyncEnabled: false,
  privacyAccepted: false,
  unlockedBadges: [],
  aiServerUrl: 'https://nexus-kp8w.onrender.com',
  locationOptIn: false,
};

// Standard actuarial baseline life expectancy at given age (approx based on actuarial tables)
export function getActuarialBaseline(age: number, sex: 'male' | 'female' | 'other'): number {
  const baseAvg = sex === 'female' ? 81.5 : sex === 'male' ? 76.5 : 79.0;
  // Remaining life expectancy increases slightly as age increases (actuarial survival probability)
  if (age <= 20) return baseAvg;
  if (age <= 40) return baseAvg + (age - 20) * 0.05;
  if (age <= 60) return baseAvg + 1.0 + (age - 40) * 0.08;
  return baseAvg + 2.6 + (age - 60) * 0.12;
}

export const INITIAL_LIFE_EXPECTANCY_FACTORS: LifeExpectancyFactor[] = [
  {
    id: 'exercise',
    name: 'Regular Exercise',
    category: 'Physical Activity',
    description: '150+ mins/week moderate-to-vigorous aerobic exercise',
    currentValue: 'Active (3-4x/week)',
    coefficientYears: 3.8,
    source: 'BMJ / Harvard T.H. Chan School of Public Health (2020)',
    isEditable: true,
  },
  {
    id: 'sleep',
    name: 'Optimal Sleep Quality',
    category: 'Sleep',
    description: '7-8 hours restful nightly sleep & circadian consistency',
    currentValue: '7.5 hours / consistent',
    coefficientYears: 2.4,
    source: 'European Heart Journal & National Sleep Foundation (2021)',
    isEditable: true,
  },
  {
    id: 'smoking',
    name: 'Non-Smoker Status',
    category: 'Toxic Exposures',
    description: 'Zero tobacco or nicotine combustion product exposure',
    currentValue: 'Never smoked',
    coefficientYears: 8.5,
    source: 'CDC Actuarial Health Reports & JAMA Internal Medicine',
    isEditable: true,
  },
  {
    id: 'alcohol',
    name: 'Moderate / Zero Alcohol Intake',
    category: 'Diet & Substance',
    description: '<1 drink/day or alcohol-free lifestyle',
    currentValue: 'Minimal (<2 drinks/week)',
    coefficientYears: 1.6,
    source: 'The Lancet Global Burden of Disease Study',
    isEditable: true,
  },
  {
    id: 'meditation',
    name: 'Stress Reduction & Mindful Practice',
    category: 'Mental & Spiritual',
    description: 'Daily mindfulness or spiritual resonance practice lowering cortisol',
    currentValue: 'Daily 10 mins',
    coefficientYears: 2.1,
    source: 'Psychoneuroendocrinology & NIH Longevity Trials',
    isEditable: true,
  },
  {
    id: 'nutrition',
    name: 'Whole-Food Mediterranean Diet',
    category: 'Nutrition',
    description: 'High in greens, omega-3 fatty acids, fiber, low ultra-processed foods',
    currentValue: 'Balanced whole foods',
    coefficientYears: 2.9,
    source: 'PLOS Medicine Dietary Longevity Model (2022)',
    isEditable: true,
  },
];

export const DEFAULT_FOLDERS: string[] = ['Wellness', 'Work', 'Hobbies', 'Personal'];

/**
 * STARTER_GOALS is empty so users start clean with zero demo goals.
 */
export const STARTER_GOALS: Goal[] = [];

/**
 * SCIENCE_PRESET_GOALS: Evidence-based presets added when user clicks "Add Science Presets".
 */
export const SCIENCE_PRESET_GOALS: Goal[] = [
  {
    id: 'preset-sunlight',
    name: 'Morning Sunlight & Hydration (10m)',
    description: 'Get natural sunlight in your eyes within 60 mins of waking + drink 500ml water to anchor circadian cortisol rhythm.',
    category: 'health',
    frequency: 'daily',
    reminderTime: '07:00',
    reminderEnabled: true,
    basePoints: 5,
    difficulty: 'low',
    folder: 'Wellness',
    effects: [
      { category: 'health', weight: 4 },
      { category: 'selfCare', weight: 3 },
    ],
    isLifePathAligned: true,
    isCognitiveTraining: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'preset-focus',
    name: 'Deep Focus Cognitive Block (45m)',
    description: 'Single-task deep work session with phone in another room to build prefrontal cortex cognitive endurance.',
    category: 'smarts',
    frequency: 'daily',
    reminderTime: '09:30',
    reminderEnabled: true,
    basePoints: 7,
    difficulty: 'high',
    folder: 'Work',
    effects: [
      { category: 'smarts', weight: 6 },
      { category: 'spiritual', weight: 2 },
    ],
    isLifePathAligned: true,
    isCognitiveTraining: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'preset-cardio',
    name: 'Daily Movement / Zone 2 Cardio (30m)',
    description: 'Brisk walk, jogging, cycling, or resistance training to trigger BDNF neurogenesis and cardiovascular resilience.',
    category: 'health',
    frequency: 'daily',
    reminderTime: '17:00',
    reminderEnabled: true,
    basePoints: 6,
    difficulty: 'medium',
    folder: 'Wellness',
    effects: [
      { category: 'health', weight: 5 },
      { category: 'happiness', weight: 3 },
    ],
    isLifePathAligned: true,
    isCognitiveTraining: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'preset-mindfulness',
    name: 'Mindful Reflection & Evening Journal (10m)',
    description: 'Reflect on daily wins, process thoughts, and write 3 things you are grateful for before bed.',
    category: 'spiritual',
    frequency: 'daily',
    reminderTime: '21:00',
    reminderEnabled: true,
    basePoints: 5,
    difficulty: 'low',
    folder: 'Personal',
    effects: [
      { category: 'spiritual', weight: 5 },
      { category: 'happiness', weight: 3 },
    ],
    isLifePathAligned: true,
    isCognitiveTraining: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'preset-sleep',
    name: 'Digital Sunset & Sleep Protocol',
    description: 'No screens or blue light 45 mins before sleep. Keep bedroom cool and dark for restorative deep sleep.',
    category: 'selfCare',
    frequency: 'daily',
    reminderTime: '22:00',
    reminderEnabled: true,
    basePoints: 5,
    difficulty: 'medium',
    folder: 'Wellness',
    effects: [
      { category: 'selfCare', weight: 5 },
      { category: 'health', weight: 3 },
    ],
    isLifePathAligned: true,
    isCognitiveTraining: false,
    createdAt: new Date().toISOString(),
  },
];
