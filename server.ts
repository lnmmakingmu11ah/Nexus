import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv(); // fallback to .env

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getAIAdapter } from './server/aiAdapter';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Capacitor WebView (https://localhost) → local API (http://localhost:3000)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // API Health Endpoint
  app.get('/api/health', (req, res) => {
    const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();
    const hasApiKey =
      provider === 'groq'
        ? !!process.env.GROQ_API_KEY
        : provider === 'kilo' || provider === 'kilo_gateway'
          ? !!process.env.KILO_API_KEY
          : provider === 'nvidia' || provider === 'nvidia_nim'
            ? !!process.env.NVIDIA_API_KEY
            : !!process.env.OPENROUTER_API_KEY;
    res.json({
      status: 'ok',
      hasApiKey,
      aiProvider: getAIAdapter().name,
      provider,
    });
  });

  // 1. AI Onboarding Assistant Endpoint
  const handleOnboarding = async (req: express.Request, res: express.Response) => {
    try {
      const adapter = getAIAdapter();
      const result = await adapter.onboardingReflect(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Onboarding AI error:', err);
      return res.status(500).json({ error: err.message || 'AI service error' });
    }
  };
  app.post('/api/ai/onboarding', handleOnboarding);
  app.post('/api/gemini/onboarding', handleOnboarding);

  // 2. Journal AI Reflection Endpoint
  const handleJournalReflect = async (req: express.Request, res: express.Response) => {
    try {
      const adapter = getAIAdapter();
      const result = await adapter.journalReflect(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Journal reflection AI error:', err);
      return res.status(500).json({ error: err.message || 'AI service error' });
    }
  };
  app.post('/api/ai/reflect', handleJournalReflect);
  app.post('/api/gemini/reflect', handleJournalReflect);

  // 3. Proof Media Vision Verification Endpoint
  const handleVerifyProof = async (req: express.Request, res: express.Response) => {
    try {
      const adapter = getAIAdapter();
      const result = await adapter.verifyProof(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Verify proof AI error:', err);
      return res.json({
        verified: false,
        confidence: 25,
        message: 'NEXUS could not verify this yet. Add a specific journal note, attach proof, or answer the review questions.',
        evidenceSummary: 'Verification failed closed so completions are not auto-approved.',
      });
    }
  };
  app.post('/api/ai/verify-proof', handleVerifyProof);
  app.post('/api/gemini/verify-proof', handleVerifyProof);

  // 4. Insights Correlations Digest Endpoint
  const handleInsights = async (req: express.Request, res: express.Response) => {
    try {
      const adapter = getAIAdapter();
      const result = await adapter.generateInsights(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Insights AI error:', err);
      return res.status(500).json({ error: err.message || 'AI service error' });
    }
  };
  app.post('/api/ai/insights', handleInsights);
  app.post('/api/gemini/insights', handleInsights);

  // 5. Casual AI Text Companion Endpoint
  const handleChatCompanion = async (req: express.Request, res: express.Response) => {
    try {
      const adapter = getAIAdapter();
      const result = await adapter.chatCompanion(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Chat Companion AI error:', err);
      return res.status(500).json({ error: err.message || 'AI service error' });
    }
  };
  app.post('/api/ai/chat', handleChatCompanion);
  app.post('/api/gemini/chat', handleChatCompanion);

  // 6. Synthesize Blueprint & Timelines Endpoint
  const handleSynthesizeBlueprint = async (req: express.Request, res: express.Response) => {
    try {
      const adapter = getAIAdapter();
      const result = await adapter.synthesizeBlueprint(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Synthesize Blueprint AI error:', err);
      return res.status(500).json({ error: err.message || 'AI service error' });
    }
  };
  app.post('/api/ai/synthesize-blueprint', handleSynthesizeBlueprint);
  app.post('/api/gemini/synthesize-blueprint', handleSynthesizeBlueprint);

  // 8. Extract AI Memory from conversation
  const handleExtractMemory = async (req: express.Request, res: express.Response) => {
    try {
      const adapter = getAIAdapter();
      const result = await adapter.extractMemory(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Extract memory AI error:', err);
      return res.status(500).json({ error: err.message || 'AI service error' });
    }
  };
  app.post('/api/ai/extract-memory', handleExtractMemory);

  // 7. Proactive NEXUS Nudge Generator Endpoint
  const handleNudge = async (req: express.Request, res: express.Response) => {
    try {
      const adapter = getAIAdapter();
      const result = await adapter.generateNudge(req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('Nudge AI error:', err);
      return res.status(500).json({ error: err.message || 'AI service error' });
    }
  };
  app.post('/api/ai/nudge', handleNudge);
  app.post('/api/gemini/nudge', handleNudge);

  // ─── Planning Engine Routes ────────────────────────────────────────────────

  // 9. Intake chat turn (routine tier)
  app.post('/api/plan/intake-turn', async (req, res) => {
    try {
      const result = await getAIAdapter().intakeTurn(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('intake-turn error:', err);
      res.status(500).json({ error: err.message || 'AI service error' });
    }
  });

  // 10. Feasibility check (high-stakes tier)
  app.post('/api/plan/feasibility', async (req, res) => {
    try {
      const result = await getAIAdapter().runFeasibilityCheck(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('feasibility error:', err);
      res.status(500).json({ error: err.message || 'AI service error' });
    }
  });

  // 11. Willpower assessment (high-stakes tier)
  app.post('/api/plan/willpower', async (req, res) => {
    try {
      const result = await getAIAdapter().runWillpowerAssessment(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('willpower-assessment error:', err);
      res.status(500).json({ error: err.message || 'AI service error' });
    }
  });

  // 12. Full plan synthesis (high-stakes tier)
  app.post('/api/plan/synthesize', async (req, res) => {
    try {
      const result = await getAIAdapter().synthesizePlan(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('synthesize-plan error:', err);
      res.status(500).json({ error: err.message || 'AI service error' });
    }
  });

  // 13. Goal dependency chaining (routine tier)
  app.post('/api/plan/chain-goals', async (req, res) => {
    try {
      const result = await getAIAdapter().chainGoals(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('chain-goals error:', err);
      res.status(500).json({ error: err.message || 'AI service error' });
    }
  });

  // 14. Frame daily tasks with AI tone (routine tier)
  app.post('/api/plan/frame-tasks', async (req, res) => {
    try {
      const result = await getAIAdapter().frameTasks(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('frame-tasks error:', err);
      res.status(500).json({ error: err.message || 'AI service error' });
    }
  });

  // 15. Lapse recovery framing (routine tier)
  app.post('/api/plan/lapse-recovery', async (req, res) => {
    try {
      const result = await getAIAdapter().lapseRecovery(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('lapse-recovery error:', err);
      res.status(500).json({ error: err.message || 'AI service error' });
    }
  });

  // 16. Research fetch (waterfall: DDG → Serper → Tavily, with cache TTL)
  app.post('/api/research/fetch', async (req, res) => {
    try {
      const { fetchGoalResearch } = await import('./server/searchService');
      const { category, goalType } = req.body;

      if (!category || !goalType) return res.status(400).json({ error: 'category and goalType required' });
      const result = await fetchGoalResearch(
        category,
        goalType,
        process.env.SERPER_API_KEY,
        process.env.TAVILY_API_KEY
      );
      res.json(result);
    } catch (err: any) {
      console.error('research-fetch error:', err);
      res.status(500).json({ error: err.message || 'Research fetch error' });
    }
  });

  // Mount Vite middleware for dev or static files for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Personal Growth Tracker server listening on port ${PORT}`);
  });
}

startServer();
