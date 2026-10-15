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
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasGeminiKey = Boolean(process.env.GEMINI_KEY || process.env.GEMINI_API_KEY);

  return sendJson(res, 200, {
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    engine: hasAnthropicKey ? 'Claude AI (Anthropic)' : hasGeminiKey ? 'Claude AI (Bridge)' : 'Claude AI (Pending Key)',
    environment: {
      anthropicConfigured: hasAnthropicKey,
      geminiFallbackConfigured: hasGeminiKey,
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  });
}
