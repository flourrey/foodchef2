import dotenv from 'dotenv';
dotenv.config();

function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

export default async function handler(_req: any, res: any) {
  const hasGeminiKey = Boolean(process.env.GEMINI_KEY || process.env.GEMINI_API_KEY);
  const hasMistralKey = Boolean(process.env.MISTRAL_API_KEY || process.env.MISTRAL_KEY);

  return sendJson(res, 200, {
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    engines: ['Gemini AI', 'Mistral AI'],
    environment: {
      geminiKeyConfigured: hasGeminiKey,
      mistralKeyConfigured: hasMistralKey,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  });
}
