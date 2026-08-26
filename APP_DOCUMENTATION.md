# NEXUS Life Companion - Comprehensive System Documentation & Calculation Engine Guide

Welcome to the official documentation for the **NEXUS Life Companion** application. This guide explains every feature, formula, score derivative, analytics model, and AI system powering the platform.

---

## Table of Contents
1. [Overview & Core Philosophy](#1-overview--core-philosophy)
2. [5-Category Life Balance Model](#2-5-category-life-balance-model)
3. [Scoring Algorithms & Mathematical Formulas](#3-scoring-algorithms--mathematical-formulas)
   - [Daily Goal Execution & Points](#31-daily-goal-execution--points)
   - [Category Score Normalization (0–100)](#32-category-score-normalization-0100)
   - [Composite Life Score](#33-composite-life-score)
   - [Extended Absence & Score Decay System](#34-extended-absence--score-decay-system)
4. [Willpower Analytics & Work Effort Engine](#4-willpower-analytics--work-effort-engine)
   - [Willpower Index Formula](#41-willpower-index-formula)
   - [Work Effort Velocity Formula](#42-work-effort-velocity-formula)
   - [Burnout Risk Matrix](#43-burnout-risk-matrix)
5. [Trends, Growth Derivatives & Moving Averages](#5-trends-growth-derivatives--moving-averages)
   - [Growth Acceleration (1st Derivative ΔScore/Δt)](#51-growth-acceleration-1st-derivative-ΔscoreΔt)
   - [7-Day vs 30-Day Moving Averages](#52-7-day-vs-30-day-moving-averages)
6. [Goal Achievement Likelihood & Multi-Year Timelines](#6-goal-achievement-likelihood--multi-year-timelines)
   - [Achievement Probability Calculation](#61-achievement-probability-calculation)
   - [Timeline Estimation Engine (Up to 70+ Years)](#62-timeline-estimation-engine-up-to-70-years)
7. [Longevity & Life Expectancy Calculation Engine](#7-longevity--life-expectancy-calculation-engine)
8. [NEXUS AI Companion & Neural Modules](#8-nexus-ai-companion--neural-modules)
   - [Conversational Goal Discovery & Blueprint Synthesis](#81-conversational-goal-discovery--blueprint-synthesis)
   - [Journal Reflection & Habit Stacking](#82-journal-reflection--habit-stacking)
   - [Adaptive Circadian Scheduler](#83-adaptive-circadian-scheduler)

---

## 1. Overview & Core Philosophy

NEXUS is a quantitative life-companion app designed to bridge long-term identity visions with daily habit execution. Instead of static checklist tracking, NEXUS treats personal growth as a dynamic system governed by momentum, willpower friction, mathematical decay, and multi-year trajectory projections.

---

## 2. 5-Category Life Balance Model

NEXUS organizes all human endeavor into 5 holistic categories:

1. **Health (`health`)**: Physical vitality, fitness, nutrition, sleep quality, and physiological stamina.
2. **Spiritual Resonance (`spiritual`)**: Values alignment, mindfulness, purpose, philosophical grounding, and inner peace.
3. **Smarts (`smarts`)**: Intellectual growth, cognitive problem-solving, math/logic drills, reading, and skill mastery.
4. **Self-Care (`selfCare`)**: Recovery, emotional hygiene, stress management, boundary setting, and grooming.
5. **Happiness (`happiness`)**: Joy, social connections, leisure, gratitude, and emotional fulfillment.

---

## 3. Scoring Algorithms & Mathematical Formulas

### 3.1 Daily Goal Execution & Points
Each goal has a base point value ($P_{base}$, default = 5) and a difficulty weight ($W_{diff}$):
- **Low Difficulty**: $W_{diff} = 1.0$
- **Medium Difficulty**: $W_{diff} = 2.0$
- **High Difficulty**: $W_{diff} = 3.0$

When a goal $g$ is completed on date $d$, it generates earned impact points across one or more categories defined in its `effects` array:
$$\text{EarnedPoints}(c) = \sum_{g \in \text{CompletedGoals}} \left( P_{base}(g) \times W_{diff}(g) \times \text{Weight}(g, c) \right)$$

### 3.2 Category Score Normalization (0–100)
Target daily score per category is dynamically calculated based on active scheduled goals. The daily raw score for category $c$ is:
$$\text{RawScore}(c, d) = \min\left(100, \frac{\text{EarnedPoints}(c, d)}{\text{TargetPoints}(c)} \times 100\right)$$

### 3.3 Composite Life Score
The overall Composite Life Score is the arithmetic mean of all 5 category scores on date $d$:
$$\text{CompositeScore}(d) = \frac{\text{Score}_{\text{health}} + \text{Score}_{\text{spiritual}} + \text{Score}_{\text{smarts}} + \text{Score}_{\text{selfCare}} + \text{Score}_{\text{happiness}}}{5}$$

### 3.4 Extended Absence & Score Decay System
NEXUS enforces accountability through an **Absence Decay Engine**:
- **Absence Threshold ($T_{abs}$)**: Configurable consecutive days without logged activity (default = 3 days).
- **Daily Decay Rate ($R_{decay}$)**: Configurable daily percentage reduction (default = 5% per day).

If no completed log is recorded for category $c$ for $k > T_{abs}$ consecutive days:
$$\text{Score}(c, d) = \max\left(0, \text{Score}(c, d - 1) \times \left(1 - \frac{R_{decay}}{100}\right)\right)$$
*Note: Completing a single goal in that category instantly halts decay and resets streak calculations.*

---

## 4. Willpower Analytics & Work Effort Engine

### 4.1 Willpower Index Formula
The **Willpower Index** ($0 - 100$) measures mental friction and discipline required for execution:
$$\text{WillpowerIndex} = \min\left(100, (0.5 \times C_{rate}) + B_{diff} + B_{morning} + B_{proof}\right)$$
Where:
- $C_{rate} = \text{Daily Habit Completion Rate (\%)}$
- $B_{diff} = \min(20, \text{High Difficulty Completed} \times 10)$
- $B_{morning} = \min(15, \text{Executions before 9:00 AM} \times 7.5)$
- $B_{proof} = \min(15, \text{Photo Proof Verifications} \times 7.5)$

### 4.2 Work Effort Velocity Formula
**Work Effort Velocity** ($0 - 100$) quantifies total physical/mental volume delivered relative to daily capacity:
$$\text{WorkEffort} = \min\left(100, \frac{\sum \text{Earned Points}}{\sum \text{Target Scheduled Points}} \times 100\right)$$

### 4.3 Burnout Risk Matrix
NEXUS evaluates overexertion vs recovery capacity:
- **High Burnout Risk**: Work Effort $> 85\%$ AND Willpower Index $< 50\%$ (high exertion with declining mental resistance/recovery).
- **Moderate Burnout Risk**: Work Effort $> 70\%$ AND Willpower Index $< 65\%$.
- **Low Risk / Optimal Resilience**: Balanced exertion with high willpower stability.

---

## 5. Trends, Growth Derivatives & Moving Averages

### 5.1 Growth Acceleration (1st Derivative $\Delta\text{Score}/\Delta t$)
Measures the rate of change in composite performance from yesterday to today:
$$\frac{\Delta \text{Score}}{\Delta t} = \text{CompositeScore}(t) - \text{CompositeScore}(t - 1)$$
- **Positive ($\Delta > 0$)**: Positive growth acceleration and building momentum.
- **Negative ($\Delta < 0$)**: Velocity reduction or decay from missed habits.

### 5.2 7-Day vs 30-Day Moving Averages
- **Micro-Momentum (7-Day MA)**:
  $$\text{MA}_7(t) = \frac{1}{7} \sum_{i=0}^{6} \text{CompositeScore}(t - i)$$
- **Macro-Baseline (30-Day MA)**:
  $$\text{MA}_{30}(t) = \frac{1}{30} \sum_{i=0}^{29} \text{CompositeScore}(t - i)$$

When $MA_7 > MA_{30}$, short-term execution is outperforming the long-term baseline (positive inflection point).

---

## 6. Goal Achievement Likelihood & Multi-Year Timelines

### 6.1 Achievement Probability Calculation
For each active goal, achievement likelihood ($10\% - 99\%$) is calculated as:
$$\text{Likelihood} = \min\left(99, \max\left(10, (0.6 \times C_{30d}) + \min(30, S_{current} \times 2.5) + M_{diff} + 15\right)\right)$$
Where:
- $C_{30d} = \text{30-Day Goal Completion Rate (\%)}$
- $S_{current} = \text{Current Consecutive Day Streak}$
- $M_{diff} = +10\%$ for Low Difficulty, $-10\%$ for High Difficulty (requires higher willpower strain).

### 6.2 Timeline Estimation Engine (Up to 70+ Years)
NEXUS does **not** artificially truncate timelines to short months. Goals can span days, months, years, or decades (up to 70+ years for lifelong visions like physical longevity, scientific mastery, or financial legacy):
1. **Explicit Year Parsing**: Scans goal titles and descriptions for declarations (e.g. "5 years", "10 years", "decade", "70 years", "lifetime").
2. **Timeline Calculation**: $\text{Days} = \text{Years} \times 365$.
3. **Format Output**:
   - $< 60$ Days $\rightarrow$ `X Days`
   - $60 \le \text{Days} < 365$ $\rightarrow$ `X Months`
   - $\ge 365$ Days $\rightarrow$ `X.X Years` (e.g., `2.5 Years`, `10.0 Years`, `70.0 Years`).

---

## 7. Longevity & Life Expectancy Calculation Engine

NEXUS computes estimated remaining life expectancy and target life horizon:
$$\text{Base Expectancy} = \begin{cases} 79.0 \text{ years} & \text{if Female} \\ 74.0 \text{ years} & \text{if Male} \\ 76.5 \text{ years} & \text{if Other/Neutral} \end{cases}$$

**Dynamic Health & Spiritual Adjustments**:
$$\text{Projected Lifespan} = \text{Base Expectancy} + \left(\frac{\text{HealthScore} - 50}{10}\right) \times 1.5 + \left(\frac{\text{SelfCareScore} - 50}{10}\right) \times 0.8$$

The countdown displays remaining years, days, hours, minutes, and seconds in real-time to reinforce temporal awareness and purpose.

---

## 8. NEXUS AI Companion & Neural Modules

### 8.1 Conversational Goal Discovery & Blueprint Synthesis
- **Name & Persona**: NEXUS is a close AI life companion texting in a friendly, human-like voice.
- **Synthesis Engine**: Converts onboarding chat inputs into structured 5-category goals with assigned base points, difficulty weights, and multi-year timelines.

### 8.2 Journal Reflection & Habit Stacking
- **Journal Reflection**: Analyzes daily free-text journal entries against stated life-path goals using Gemini AI to return empathetic guidance.
- **Habit Stacking**: Links complementary habits (e.g., "Pour water immediately after morning stretch") to lower activation energy.

### 8.3 Adaptive Circadian Scheduler
Calculates peak cognitive and physical performance windows based on chronotype, placing high-difficulty habits in optimal circadian slots.

### 8.4 Proactive Notification Center & Persona Nudge Engine
- **Contextual Schedule Monitoring**: Evaluates time-of-day slots (Morning Launchpad, Midday Momentum, Evening Sunset, Night Recovery), uncompleted habit schedules, active streaks, category decay risks, and composite score progress in real-time.
- **NEXUS Persona Voice**: All nudges are delivered in NEXUS's best-friend, casual, encouraging texting tone ("yo champ", "protect that streak fr", "omg legend status", "let's lock in!").
- **Interactive Quick Completion**: Users can mark habits complete directly from nudge cards (`Quick Complete`), switch directly to NEXUS AI Chat (`Talk to NEXUS`), snooze, or dismiss nudges.
- **Live Gemini AI Nudges**: Integrates server-side `/api/ai/nudge` endpoint powered by Gemini 3.6 Flash to synthesize live custom text nudges tailored to the user's progress.

---
*NEXUS Life Companion Engine — Quantified Personal Mastery.*
