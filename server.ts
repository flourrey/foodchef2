import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import geminiHandler from './api/gemini.ts';
import mistralHandler from './api/mistral.ts';
import healthHandler from './api/health.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Direct routes to /api/gemini.ts, /api/mistral.ts, and /api/health.ts
app.all('/api/gemini.ts*', (req, res) => geminiHandler(req, res));
app.all('/api/gemini*', (req, res) => geminiHandler(req, res));
app.all('/api/mistral.ts*', (req, res) => mistralHandler(req, res));
app.all('/api/mistral*', (req, res) => mistralHandler(req, res));
app.all('/api/health.ts*', (req, res) => healthHandler(req, res));
app.all('/api/health*', (req, res) => healthHandler(req, res));

// Direct routing for recipe discovery and identification
app.all('/api/identify-ingredients', (req, res) => {
  req.body = { ...req.body, action: 'identify' };
  return geminiHandler(req, res);
});

app.all('/api/recipes/find-recipes', (req, res) => {
  req.body = { ...req.body, action: 'find-recipes' };
  return geminiHandler(req, res);
});

app.all('/api/recipes/generate-custom', (req, res) => {
  req.body = { ...req.body, action: 'generate-recipe' };
  return geminiHandler(req, res);
});

app.all('/api/tts', (req, res) => {
  req.body = { ...req.body, action: 'tts' };
  return geminiHandler(req, res);
});

// Catch-all for /api to geminiHandler
app.all('/api*', (req, res) => geminiHandler(req, res));

// Host Vite or Static Build
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SnapChef Server running on http://0.0.0.0:${PORT} (Gemini AI API)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
