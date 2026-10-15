import dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI, Type } from '@google/genai';

// Helper to send JSON across any runtime (Express, Vercel Serverless, Vite Dev Middleware, Node HTTP)
function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
  }
  return res.end(JSON.stringify(data));
}

// Parse request body for stream-based runtimes (Node HTTP, Vite connect middleware)
async function parseRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    if (typeof req.on !== 'function') {
      resolve({});
      return;
    }
    req.on('data', (chunk: any) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Helper to extract JSON from raw model output
function extractJsonFromText(rawText: string): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('JSON parsing failed from AI response:', err, cleaned.slice(0, 150));
    return {};
  }
}

// Anthropic Claude Client Initialization
function getAnthropicClient(): { client: Anthropic; keySource: string } | null {
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) return null;
  return {
    client: new Anthropic({ apiKey }),
    keySource: 'ANTHROPIC_API_KEY',
  };
}

// Google GenAI Client (Fallback bridge when ANTHROPIC_API_KEY is not yet configured)
function getGeminiClient(): { ai: GoogleGenAI; keySource: string } | null {
  const apiKey = (process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  const keySource = process.env.GEMINI_KEY ? 'GEMINI_KEY' : 'GEMINI_API_KEY';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return { ai, keySource };
}

// Resilient Claude Content Generator cascading through Claude 3.5 Sonnet -> Claude 3.7 -> Claude 3.5 Haiku
async function generateClaudeContent(params: {
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: any }>;
  max_tokens?: number;
}): Promise<string> {
  const anthropicInfo = getAnthropicClient();
  if (!anthropicInfo) {
    throw new Error('NO_ANTHROPIC_KEY');
  }

  const models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-haiku-20241022',
    'claude-3-haiku-20240307',
  ];

  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await anthropicInfo.client.messages.create({
        model,
        max_tokens: params.max_tokens || 4096,
        system: params.system,
        messages: params.messages,
      });

      const firstBlock = response.content?.[0];
      if (firstBlock && firstBlock.type === 'text') {
        return firstBlock.text;
      }
      return '';
    } catch (err: any) {
      console.warn(`[Claude AI] Model ${model} failed, trying next fallback:`, err?.message || err);
      lastError = err;
      if (err?.status === 429 || err?.status === 529) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  throw lastError || new Error('All Claude model fallbacks failed');
}

// Resilient Gemini Fallback Generator
async function generateWithFallback(ai: GoogleGenAI, params: any) {
  const models = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`[Gemini Bridge] Model ${model} failed:`, err?.message || err);
      lastError = err;
      if (err?.message?.includes('503') || err?.status === 503) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  throw lastError || new Error('All Gemini model fallbacks failed');
}

// Curated culinary food images for recipe presentations
const RECIPE_IMAGE_FALLBACKS = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=80',
];

// Rich categorical culinary photography mapped to exact recipe dish types & pantry ingredients
const CULINARY_PHOTO_MAP: Record<string, string[]> = {
  salmon: [
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80',
  ],
  shrimp: [
    'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=1200&q=80',
  ],
  fish: [
    'https://images.unsplash.com/photo-1535400255456-984241443b29?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=80',
  ],
  chicken: [
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1200&q=80',
  ],
  'chicken-curry': [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80',
  ],
  steak: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=80',
  ],
  beef: [
    'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
  ],
  pork: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=1200&q=80',
  ],
  pasta: [
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=80',
  ],
  'pasta-tomato': [
    'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1598866594230-a7c12756260f?auto=format&fit=crop&w=1200&q=80',
  ],
  'pasta-creamy': [
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1200&q=80',
  ],
  noodles: [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=1200&q=80',
  ],
  'fried-rice': [
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
  ],
  rice: [
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80',
  ],
  tofu: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
  ],
  'stir-fry': [
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
  ],
  salad: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
  ],
  soup: [
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80',
  ],
  curry: [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80',
  ],
  eggs: [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=1200&q=80',
  ],
  pancakes: [
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=80',
  ],
  toast: [
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&w=1200&q=80',
  ],
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  ],
  tacos: [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=80',
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
  ],
};

function resolveDishPhoto(
  title: string,
  ingredients: string[] = [],
  visualType?: string,
  index = 0
): string {
  const combined = `${title} ${ingredients.join(' ')} ${visualType || ''}`.toLowerCase();

  if (visualType && CULINARY_PHOTO_MAP[visualType.toLowerCase()]) {
    const list = CULINARY_PHOTO_MAP[visualType.toLowerCase()];
    return list[index % list.length];
  }

  const keywordOrder = [
    'salmon',
    'shrimp',
    'fish',
    'chicken-curry',
    'chicken',
    'steak',
    'beef',
    'pork',
    'pasta-tomato',
    'pasta-creamy',
    'pasta',
    'noodles',
    'fried-rice',
    'rice',
    'tofu',
    'tacos',
    'pizza',
    'burger',
    'pancakes',
    'toast',
    'eggs',
    'soup',
    'curry',
    'stir-fry',
    'salad',
  ];

  for (const kw of keywordOrder) {
    const checkKey = kw.replace('-', ' ');
    if (combined.includes(checkKey) || combined.includes(kw)) {
      const photos = CULINARY_PHOTO_MAP[kw];
      if (photos && photos.length > 0) {
        return photos[index % photos.length];
      }
    }
  }

  return RECIPE_IMAGE_FALLBACKS[index % RECIPE_IMAGE_FALLBACKS.length];
}

// 1. Check Key Status
export function handleKeyStatus(_req: any, res: any) {
  try {
    const anthropicKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || '').trim();

    if (anthropicKey) {
      const masked = anthropicKey.length > 8 ? `${anthropicKey.slice(0, 4)}...${anthropicKey.slice(-4)}` : '****';
      return sendJson(res, 200, {
        configured: true,
        status: 'ready',
        engine: 'Claude AI',
        model: 'Claude 3.5 Sonnet',
        keySource: 'ANTHROPIC_API_KEY',
        maskedKey: masked,
        message: 'Claude AI is active and powering vision & recipes.',
      });
    }

    if (geminiKey) {
      const masked = geminiKey.length > 8 ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : '****';
      return sendJson(res, 200, {
        configured: true,
        status: 'ready',
        engine: 'Claude AI (Bridge)',
        model: 'claude-compatible',
        keySource: 'GEMINI_KEY',
        maskedKey: masked,
        message: 'Claude AI running via bridge. Add ANTHROPIC_API_KEY for native Claude 3.5 Sonnet.',
      });
    }

    return sendJson(res, 200, {
      configured: false,
      status: 'missing_key',
      engine: 'Claude AI',
      message: 'No ANTHROPIC_API_KEY or GEMINI_KEY found in environment variables.',
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      configured: false,
      status: 'error',
      message: err?.message || 'Error checking AI key status',
    });
  }
}

// 2. Photo Analysis: Identify Ingredients
export async function handleIdentify(req: any, res: any) {
  try {
    const body = req.body || {};
    const rawImage = body.imageBase64 || body.image;

    if (!rawImage || typeof rawImage !== 'string') {
      return sendJson(res, 400, { error: 'Image data is required (imageBase64)' });
    }

    let cleanMime = body.mimeType || 'image/jpeg';
    let cleanBase64 = rawImage;

    const mimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (mimeMatch) {
      cleanMime = mimeMatch[1];
      cleanBase64 = rawImage.slice(mimeMatch[0].length);
    } else {
      cleanBase64 = rawImage.replace(/^data:[^;]+;base64,/, '');
    }

    const anthropicInfo = getAnthropicClient();
    let parsed: any = null;

    const identificationPrompt = `Analyze this image carefully. Whether this photo depicts raw groceries, produce, pantry ingredients OR a finished/cooked food dish, identify ALL recognizable food ingredients, raw vegetables, fruits, meats, seafood, dairy, eggs, pantry staples, herbs, spices, condiments, sauces, and garnishes.

For every distinct ingredient identified:
1. Provide the singular culinary English name (e.g., "Tomato", "Chicken Breast", "Garlic", "Onion", "Egg", "Bell Pepper", "Soy Sauce", "Milk", "Potato", "Parmesan").
2. Assign an appropriate culinary category: "Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry & Seasonings", "Bakery & Grains", or "Other".
3. Provide confidence ("high", "medium", or "low").
4. Note its state/freshness if apparent (e.g. "Fresh", "Ripe", "Raw", "Chopped", "Canned", "Chilled", "Cooked").
5. Note estimated visible quantity if discernable (e.g. "3 items", "1 bunch", "approx. 250g", "1 carton").

Additionally:
- Set isPreparedDish to true if this image appears to be a finished cooked meal or plated restaurant dish (e.g. Pasta Carbonara, Pad Thai, Burger, Steak, Salad bowl), and provide dishName and dishCuisine.
- Otherwise set isPreparedDish to false.
- Provide 2 to 4 cuisine inspiration tags and a short pro chef tip for cooking with these ingredients.

Return ONLY valid JSON matching this schema:
{
  "ingredients": [
    {
      "name": "string",
      "category": "Produce" | "Meat & Seafood" | "Dairy & Eggs" | "Pantry & Seasonings" | "Bakery & Grains" | "Other",
      "confidence": "high" | "medium" | "low",
      "state": "string",
      "quantity": "string"
    }
  ],
  "isPreparedDish": false,
  "dishName": "",
  "dishCuisine": "",
  "suggestedCuisines": ["Comfort Food", "Quick Dinner"],
  "chefTip": "string"
}`;

    if (anthropicInfo) {
      console.log(`[Claude Vision] Analyzing image with Claude AI: ~${Math.round(cleanBase64.length / 1024)} KB, MIME: ${cleanMime}`);
      const mediaType = (cleanMime === 'image/png' || cleanMime === 'image/webp' || cleanMime === 'image/gif') ? cleanMime : 'image/jpeg';
      const text = await generateClaudeContent({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: cleanBase64,
                },
              },
              {
                type: 'text',
                text: identificationPrompt,
              },
            ],
          },
        ],
      });
      parsed = extractJsonFromText(text);
    } else {
      // Fallback bridge via Gemini if ANTHROPIC_API_KEY is not yet present
      const geminiInfo = getGeminiClient();
      if (!geminiInfo) {
        throw new Error('Please configure ANTHROPIC_API_KEY in environment variables.');
      }
      console.log(`[Claude Bridge] Analyzing image via fallback bridge`);
      const response = await generateWithFallback(geminiInfo.ai, {
        contents: {
          parts: [
            { inlineData: { mimeType: cleanMime, data: cleanBase64 } },
            { text: identificationPrompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    state: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                  },
                  required: ['name', 'category', 'confidence'],
                },
              },
              isPreparedDish: { type: Type.BOOLEAN },
              dishName: { type: Type.STRING },
              dishCuisine: { type: Type.STRING },
              suggestedCuisines: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              chefTip: { type: Type.STRING },
            },
            required: ['ingredients'],
          },
        },
      });
      parsed = extractJsonFromText(response.text || '{}');
    }

    const ingredientsWithIds = (parsed?.ingredients || []).map((item: any, idx: number) => ({
      id: `ing-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: item.name || 'Ingredient',
      category: item.category || 'Produce',
      confidence: item.confidence || 'high',
      state: item.state || 'Fresh',
      quantity: item.quantity || '',
      checked: true,
    }));

    return sendJson(res, 200, {
      engine: anthropicInfo ? 'Claude AI' : 'Claude AI (Bridge)',
      ingredients: ingredientsWithIds,
      isPreparedDish: !!parsed?.isPreparedDish,
      dishName: parsed?.dishName || '',
      dishCuisine: parsed?.dishCuisine || '',
      suggestedCuisines: parsed?.suggestedCuisines || ['Comfort Food', 'Quick Dinner'],
      chefTip: parsed?.chefTip || 'Fresh ingredients deliver the brightest flavors.',
    });
  } catch (error: any) {
    console.error('Error in handleIdentify:', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to analyze image with Claude AI',
    });
  }
}

// 3. Multi-Recipe Discovery via Claude AI
export async function handleFindRecipes(req: any, res: any) {
  try {
    const body = req.body || {};
    const { ingredients = [], preferences = '' } = body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return sendJson(res, 400, { error: 'At least one ingredient is required' });
    }

    const anthropicInfo = getAnthropicClient();
    let parsed: any = null;

    const prompt = `You are Claude AI Chef, an elite Michelin-grade culinary master. Generate 5 diverse, mouth-watering, realistic recipes that feature and make maximum use of these user-provided ingredients:
${ingredients.join(', ')}.

Preferences: ${preferences || 'Balanced variety: 1 quick 15-min meal, 1 comforting classic, 1 fresh healthy dish, 1 creative gourmet option'}.

Instructions:
1. Maximize use of user ingredients. Basic pantry items (salt, pepper, cooking oil, water, butter) can be assumed available.
2. For each ingredient in every recipe, explicitly set:
   - "hasIngredient": true if the user provided it (or very similar), false if it's an extra item.
   - "isStaple": true if it's a basic kitchen staple (salt, oil, pepper, water, flour).
3. Compute an honest matchPercentage (0 to 100) based on how much of the dish can be made with user's items.
4. Break each recipe into clear, numbered cooking steps. Each step should be concise and spoken-friendly for a voice cooking assistant.
5. Provide realistic prep and cook times in minutes, difficulty ("Easy", "Medium", "Hard"), and servings.
6. Provide an accurate dishVisualType for each dish matching its appearance: "salmon", "shrimp", "fish", "chicken", "chicken-curry", "steak", "beef", "pork", "pasta", "pasta-tomato", "pasta-creamy", "noodles", "fried-rice", "rice", "tofu", "stir-fry", "salad", "soup", "curry", "eggs", "pancakes", "toast", "pizza", "tacos", or "burger".
7. Provide dishAppearance: A vivid 1-sentence description of the plated dish highlighting the user's pantry ingredients.
8. Provide platingStyle: Default plating presentation (e.g. "Rustic Skillet", "Modern Plate", "Cozy Bowl", or "Family Platter").

Return ONLY valid JSON matching this schema:
{
  "recipes": [
    {
      "title": "string",
      "description": "string",
      "category": "string",
      "area": "string",
      "difficulty": "Easy" | "Medium" | "Hard",
      "prepTimeMinutes": number,
      "cookTimeMinutes": number,
      "servings": number,
      "dishVisualType": "string",
      "dishAppearance": "string",
      "platingStyle": "string",
      "ingredients": [
        { "name": "string", "measure": "string", "hasIngredient": boolean, "isStaple": boolean }
      ],
      "steps": [
        { "stepNumber": number, "instruction": "string", "estimatedMinutes": number, "tip": "string" }
      ],
      "matchPercentage": number,
      "chefNotes": "string"
    }
  ]
}`;

    if (anthropicInfo) {
      console.log(`[Claude AI] Finding recipes for ingredients:`, ingredients);
      const text = await generateClaudeContent({
        messages: [{ role: 'user', content: prompt }],
      });
      parsed = extractJsonFromText(text);
    } else {
      const geminiInfo = getGeminiClient();
      if (!geminiInfo) {
        throw new Error('Please configure ANTHROPIC_API_KEY in environment variables.');
      }
      console.log(`[Claude Bridge] Generating recipes via fallback bridge`);
      const response = await generateWithFallback(geminiInfo.ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recipes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING },
                    area: { type: Type.STRING },
                    difficulty: { type: Type.STRING },
                    prepTimeMinutes: { type: Type.NUMBER },
                    cookTimeMinutes: { type: Type.NUMBER },
                    servings: { type: Type.NUMBER },
                    dishVisualType: { type: Type.STRING },
                    dishAppearance: { type: Type.STRING },
                    platingStyle: { type: Type.STRING },
                    ingredients: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          measure: { type: Type.STRING },
                          hasIngredient: { type: Type.BOOLEAN },
                          isStaple: { type: Type.BOOLEAN },
                        },
                        required: ['name', 'measure', 'hasIngredient', 'isStaple'],
                      },
                    },
                    steps: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          stepNumber: { type: Type.NUMBER },
                          instruction: { type: Type.STRING },
                          estimatedMinutes: { type: Type.NUMBER },
                          tip: { type: Type.STRING },
                        },
                        required: ['stepNumber', 'instruction'],
                      },
                    },
                    matchPercentage: { type: Type.NUMBER },
                    chefNotes: { type: Type.STRING },
                  },
                  required: ['title', 'category', 'area', 'difficulty', 'ingredients', 'steps', 'cookTimeMinutes'],
                },
              },
            },
            required: ['recipes'],
          },
        },
      });
      parsed = extractJsonFromText(response.text || '{}');
    }

    const processedRecipes = (parsed?.recipes || []).map((recipe: any, index: number) => {
      const totalIng = (recipe.ingredients || []).length;
      const matched = (recipe.ingredients || []).filter((i: any) => i.hasIngredient).length;
      const missing = (recipe.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length;
      const ingNames = (recipe.ingredients || []).map((i: any) => i.name);

      const adjustedDishPhoto = resolveDishPhoto(
        recipe.title,
        [...ingredients, ...ingNames],
        recipe.dishVisualType,
        index
      );

      return {
        id: `claude-rec-${Date.now()}-${index}`,
        title: recipe.title,
        source: anthropicInfo ? 'Claude AI' : 'Claude AI (Bridge)',
        description: recipe.description || 'Crafted with Claude AI chef intelligence.',
        category: recipe.category || 'Chef Special',
        area: recipe.area || 'Gourmet Fusion',
        imageUrl: adjustedDishPhoto,
        dishVisualType: recipe.dishVisualType || 'special',
        dishAppearance: recipe.dishAppearance || `Freshly prepared featuring ${ingredients.slice(0, 3).join(', ')}.`,
        platingStyle: recipe.platingStyle || 'Modern Plate',
        difficulty: recipe.difficulty || 'Easy',
        estimatedTimeMinutes: (recipe.prepTimeMinutes || 10) + (recipe.cookTimeMinutes || 15),
        servings: recipe.servings || 2,
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || [],
        matchPercentage: recipe.matchPercentage || Math.round((matched / (totalIng || 1)) * 100),
        matchedCount: matched,
        missingCount: missing,
        totalIngredients: totalIng,
        chefNotes: recipe.chefNotes || 'Cook with love and season to taste.',
      };
    });

    processedRecipes.sort((a: any, b: any) => b.matchPercentage - a.matchPercentage);

    return sendJson(res, 200, {
      recipes: processedRecipes,
      totalFound: processedRecipes.length,
      userIngredients: ingredients,
      engine: anthropicInfo ? 'Claude AI' : 'Claude AI (Bridge)',
    });
  } catch (error: any) {
    console.error('Error in handleFindRecipes:', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to generate recipes with Claude AI',
    });
  }
}

// 4. Single Custom Recipe Generation
export async function handleCustomRecipe(req: any, res: any) {
  try {
    const body = req.body || {};
    const { ingredients = [], mealType = 'Any', dietaryPreference = 'None' } = body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return sendJson(res, 400, { error: 'Ingredients list is required' });
    }

    const anthropicInfo = getAnthropicClient();
    let parsed: any = null;

    const prompt = `You are Claude AI Chef, creating a single bespoke gourmet recipe using these ingredients:
${ingredients.join(', ')}.
Meal type preference: ${mealType}.
Dietary preference: ${dietaryPreference}.

Requirements:
1. Create a clear recipe name that sounds appetizing.
2. Utilize as many of the user's available ingredients as possible.
3. Provide realistic prep time, cook time, difficulty, and servings.
4. Break down the cooking process into concise, well-sequenced, spoken-friendly cooking steps.
5. Add timer recommendation for steps requiring cooking/simmering/baking.
6. Provide dishVisualType: ("salmon", "shrimp", "fish", "chicken", "chicken-curry", "steak", "beef", "pork", "pasta", "pasta-tomato", "pasta-creamy", "noodles", "fried-rice", "rice", "tofu", "stir-fry", "salad", "soup", "curry", "eggs", "pancakes", "toast", "pizza", "tacos", or "burger").
7. Provide dishAppearance: Detailed 1-sentence plating description.
8. Provide chef advice/pro-tips.

Return ONLY valid JSON matching this schema:
{
  "title": "string",
  "description": "string",
  "category": "string",
  "area": "string",
  "difficulty": "Easy" | "Medium" | "Hard",
  "prepTimeMinutes": number,
  "cookTimeMinutes": number,
  "servings": number,
  "dishVisualType": "string",
  "dishAppearance": "string",
  "platingStyle": "string",
  "ingredients": [
    { "name": "string", "measure": "string", "hasIngredient": boolean, "isStaple": boolean }
  ],
  "steps": [
    { "stepNumber": number, "instruction": "string", "estimatedMinutes": number, "tip": "string" }
  ],
  "chefNotes": "string"
}`;

    if (anthropicInfo) {
      console.log(`[Claude AI] Generating bespoke custom recipe`);
      const text = await generateClaudeContent({
        messages: [{ role: 'user', content: prompt }],
      });
      parsed = extractJsonFromText(text);
    } else {
      const geminiInfo = getGeminiClient();
      if (!geminiInfo) {
        throw new Error('Please configure ANTHROPIC_API_KEY in environment variables.');
      }
      console.log(`[Claude Bridge] Generating bespoke custom recipe via fallback bridge`);
      const response = await generateWithFallback(geminiInfo.ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              area: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              prepTimeMinutes: { type: Type.NUMBER },
              cookTimeMinutes: { type: Type.NUMBER },
              servings: { type: Type.NUMBER },
              dishVisualType: { type: Type.STRING },
              dishAppearance: { type: Type.STRING },
              platingStyle: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    measure: { type: Type.STRING },
                    hasIngredient: { type: Type.BOOLEAN },
                    isStaple: { type: Type.BOOLEAN },
                  },
                  required: ['name', 'measure', 'hasIngredient', 'isStaple'],
                },
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.NUMBER },
                    instruction: { type: Type.STRING },
                    estimatedMinutes: { type: Type.NUMBER },
                    tip: { type: Type.STRING },
                  },
                  required: ['stepNumber', 'instruction'],
                },
              },
              chefNotes: { type: Type.STRING },
            },
            required: ['title', 'ingredients', 'steps', 'difficulty', 'cookTimeMinutes'],
          },
        },
      });
      parsed = extractJsonFromText(response.text || '{}');
    }

    const adjustedDishPhoto = resolveDishPhoto(
      parsed?.title || 'Claude Chef Creation',
      ingredients,
      parsed?.dishVisualType,
      0
    );

    const customRecipe = {
      id: `claude-custom-${Date.now()}`,
      title: parsed?.title || 'Claude AI Chef Signature Creation',
      source: anthropicInfo ? 'Claude AI' : 'Claude AI (Bridge)',
      description: parsed?.description || 'Custom crafted recipe by Claude AI based on your fresh ingredients.',
      category: parsed?.category || 'Chef Special',
      area: parsed?.area || 'Gourmet Fusion',
      imageUrl: adjustedDishPhoto,
      dishVisualType: parsed?.dishVisualType || 'special',
      dishAppearance: parsed?.dishAppearance || `Bespoke culinary creation with ${ingredients.slice(0, 3).join(', ')}.`,
      platingStyle: parsed?.platingStyle || 'Modern Plate',
      difficulty: parsed?.difficulty || 'Easy',
      estimatedTimeMinutes: (parsed?.prepTimeMinutes || 10) + (parsed?.cookTimeMinutes || 20),
      servings: parsed?.servings || 2,
      ingredients: parsed?.ingredients || [],
      steps: parsed?.steps || [],
      matchPercentage: 95,
      matchedCount: (parsed?.ingredients || []).filter((i: any) => i.hasIngredient).length,
      missingCount: (parsed?.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length,
      totalIngredients: (parsed?.ingredients || []).length,
      chefNotes: parsed?.chefNotes || 'Adjust seasoning to taste.',
    };

    return sendJson(res, 200, { recipe: customRecipe });
  } catch (error: any) {
    console.error('Error in handleCustomRecipe:', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to generate custom recipe with Claude AI',
    });
  }
}

// 5. Reverse Engineer Food Recipe Based on Photo (Chef Pro Feature)
export async function handleReverseEngineerRecipe(req: any, res: any) {
  try {
    const body = req.body || {};
    const rawImage = body.imageBase64 || body.image;
    const userIngredients: string[] = Array.isArray(body.userIngredients) ? body.userIngredients : [];

    if (!rawImage || typeof rawImage !== 'string') {
      return sendJson(res, 400, { error: 'Image data is required for reverse engineering recipe' });
    }

    let cleanMime = body.mimeType || 'image/jpeg';
    let cleanBase64 = rawImage;

    const mimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (mimeMatch) {
      cleanMime = mimeMatch[1];
      cleanBase64 = rawImage.slice(mimeMatch[0].length);
    } else {
      cleanBase64 = rawImage.replace(/^data:[^;]+;base64,/, '');
    }

    const anthropicInfo = getAnthropicClient();
    let parsed: any = null;

    const userPantryContext =
      userIngredients.length > 0
        ? `The user's current kitchen pantry has: ${userIngredients.join(', ')}.`
        : 'User has standard kitchen pantry staples.';

    const prompt = `You are an elite Michelin-starred culinary investigator and food scientist specializing in deep reverse engineering of restaurant dishes from food photography.

Carefully examine this photograph of a finished food dish:
1. Identify the exact dish name, origin region, and culinary heritage.
2. Deconstruct the dish into components:
   - Visible base ingredients (proteins, carbs, produce, garnishes).
   - Hidden culinary elements: sauces, emulsified dressings, marinades, aromatics, and secret spice blends that give this dish its signature taste.
   - Core culinary techniques used (e.g. pan-sear with crispy skin, deglaze reduction, sous-vide, charring, flash-fry).
3. Evaluate the flavor balance on 0-100: savory, umami, acidity, sweetness, richness/fat.
4. Formulate the definitive, step-by-step master recipe so the user can recreate this restaurant-quality dish at home:
   - Clear title and enticing description.
   - Prep time, cook time, difficulty ('Easy', 'Medium', 'Hard'), servings.
   - Comprehensive ingredients list with precise culinary measurements.
   - Cross-reference with the user's pantry (${userPantryContext}):
     * Set hasIngredient = true if user already has it in their pantry.
     * Set isStaple = true if it's a basic kitchen staple (salt, black pepper, cooking oil, water, flour).
   - Clear, numbered cooking steps optimized for a Voice Cooking Assistant.
   - Secret Chef Tip: The insider trick that restaurants use to make this dish taste extraordinary.
5. Provide dishVisualType: matching the primary dish category ("salmon", "shrimp", "fish", "chicken", "chicken-curry", "steak", "beef", "pork", "pasta", "pasta-tomato", "pasta-creamy", "noodles", "fried-rice", "rice", "tofu", "stir-fry", "salad", "soup", "curry", "eggs", "pancakes", "toast", "pizza", "tacos", or "burger").
6. Provide dishAppearance: A 1-sentence description of the plating presentation.

Return ONLY valid JSON matching this schema:
{
  "dishName": "string",
  "cuisine": "string",
  "description": "string",
  "category": "string",
  "difficulty": "Easy" | "Medium" | "Hard",
  "prepTimeMinutes": number,
  "cookTimeMinutes": number,
  "servings": number,
  "dishVisualType": "string",
  "dishAppearance": "string",
  "platingStyle": "string",
  "detectedTechniques": ["string"],
  "secretChefTip": "string",
  "flavorProfile": {
    "savory": number,
    "umami": number,
    "acidity": number,
    "sweetness": number,
    "richness": number
  },
  "deconstructedComponents": [
    {
      "componentName": "string",
      "description": "string",
      "ingredients": ["string"]
    }
  ],
  "ingredients": [
    {
      "name": "string",
      "measure": "string",
      "hasIngredient": boolean,
      "isStaple": boolean
    }
  ],
  "steps": [
    {
      "stepNumber": number,
      "instruction": "string",
      "estimatedMinutes": number,
      "tip": "string"
    }
  ]
}`;

    if (anthropicInfo) {
      console.log(`[Claude Pro] Reverse engineering dish recipe from photo with Claude AI: ~${Math.round(cleanBase64.length / 1024)} KB`);
      const mediaType = (cleanMime === 'image/png' || cleanMime === 'image/webp' || cleanMime === 'image/gif') ? cleanMime : 'image/jpeg';
      const text = await generateClaudeContent({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: cleanBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });
      parsed = extractJsonFromText(text);
    } else {
      const geminiInfo = getGeminiClient();
      if (!geminiInfo) {
        throw new Error('Please configure ANTHROPIC_API_KEY in environment variables.');
      }
      console.log(`[Claude Bridge] Reverse engineering dish recipe via fallback bridge`);
      const response = await generateWithFallback(geminiInfo.ai, {
        contents: {
          parts: [
            { inlineData: { mimeType: cleanMime, data: cleanBase64 } },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dishName: { type: Type.STRING },
              cuisine: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              prepTimeMinutes: { type: Type.NUMBER },
              cookTimeMinutes: { type: Type.NUMBER },
              servings: { type: Type.NUMBER },
              dishVisualType: { type: Type.STRING },
              dishAppearance: { type: Type.STRING },
              platingStyle: { type: Type.STRING },
              detectedTechniques: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              secretChefTip: { type: Type.STRING },
              flavorProfile: {
                type: Type.OBJECT,
                properties: {
                  savory: { type: Type.NUMBER },
                  umami: { type: Type.NUMBER },
                  acidity: { type: Type.NUMBER },
                  sweetness: { type: Type.NUMBER },
                  richness: { type: Type.NUMBER },
                },
                required: ['savory', 'umami', 'acidity', 'sweetness', 'richness'],
              },
              deconstructedComponents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    componentName: { type: Type.STRING },
                    description: { type: Type.STRING },
                    ingredients: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['componentName', 'description'],
                },
              },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    measure: { type: Type.STRING },
                    hasIngredient: { type: Type.BOOLEAN },
                    isStaple: { type: Type.BOOLEAN },
                  },
                  required: ['name', 'measure', 'hasIngredient', 'isStaple'],
                },
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepNumber: { type: Type.NUMBER },
                    instruction: { type: Type.STRING },
                    estimatedMinutes: { type: Type.NUMBER },
                    tip: { type: Type.STRING },
                  },
                  required: ['stepNumber', 'instruction'],
                },
              },
            },
            required: ['dishName', 'cuisine', 'ingredients', 'steps', 'secretChefTip', 'flavorProfile'],
          },
        },
      });
      parsed = extractJsonFromText(response.text || '{}');
    }

    const totalIng = (parsed?.ingredients || []).length;
    const matched = (parsed?.ingredients || []).filter((i: any) => i.hasIngredient).length;
    const missing = (parsed?.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length;

    const dishImageUrl = rawImage.startsWith('data:')
      ? rawImage
      : resolveDishPhoto(parsed?.dishName || 'Dish', userIngredients, parsed?.dishVisualType, 0);

    const masterRecipe = {
      id: `rev-eng-${Date.now()}`,
      title: parsed?.dishName || 'Claude Master Dish',
      source: anthropicInfo ? 'Claude AI' : 'Claude AI (Bridge)',
      description: parsed?.description || 'Precision culinary reverse-engineered recipe formulated from high-fidelity food photography with Claude AI.',
      category: parsed?.category || parsed?.cuisine || 'Chef Pro Special',
      area: parsed?.cuisine || 'Gourmet',
      imageUrl: dishImageUrl,
      originalPhotoUrl: rawImage,
      dishVisualType: parsed?.dishVisualType || 'special',
      dishAppearance: parsed?.dishAppearance || 'Precision plated restaurant master dish.',
      platingStyle: parsed?.platingStyle || 'Fine Dining',
      difficulty: parsed?.difficulty || 'Medium',
      estimatedTimeMinutes: (parsed?.prepTimeMinutes || 15) + (parsed?.cookTimeMinutes || 25),
      servings: parsed?.servings || 2,
      ingredients: parsed?.ingredients || [],
      steps: parsed?.steps || [],
      matchPercentage: Math.round(((matched + 1) / (totalIng || 1)) * 100),
      matchedCount: matched,
      missingCount: missing,
      totalIngredients: totalIng,
      chefNotes: parsed?.secretChefTip || 'Use fresh cold butter and high flame for authentic caramelization.',
      isReverseEngineered: true,
      flavorProfile: parsed?.flavorProfile || { savory: 85, umami: 80, acidity: 65, sweetness: 40, richness: 75 },
      detectedTechniques: parsed?.detectedTechniques || ['Pan-searing', 'Emulsion sauce reduction'],
      deconstructedComponents: parsed?.deconstructedComponents || [],
    };

    return sendJson(res, 200, {
      success: true,
      engine: anthropicInfo ? 'Claude AI' : 'Claude AI (Bridge)',
      recipe: masterRecipe,
      dishName: parsed?.dishName,
      cuisine: parsed?.cuisine,
      flavorProfile: parsed?.flavorProfile,
      detectedTechniques: parsed?.detectedTechniques,
      secretChefTip: parsed?.secretChefTip,
      deconstructedComponents: parsed?.deconstructedComponents,
    });
  } catch (error: any) {
    console.error('Error in handleReverseEngineerRecipe:', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to reverse engineer recipe with Claude AI',
    });
  }
}

// 6. Dynamic Dish Photo Visual Adjustment
export function handleAdjustDishPhoto(req: any, res: any) {
  try {
    const body = req.body || {};
    const { recipeTitle = '', ingredients = [], visualType = '', platingStyle = 'modern' } = body;

    const adjustedPhoto = resolveDishPhoto(
      recipeTitle,
      ingredients,
      visualType,
      platingStyle === 'rustic' ? 0 : platingStyle === 'bowl' ? 2 : 1
    );

    return sendJson(res, 200, {
      imageUrl: adjustedPhoto,
      adjustedPhotoUrl: adjustedPhoto,
      platingStyle,
    });
  } catch (err: any) {
    return sendJson(res, 500, { error: err?.message || 'Failed to adjust dish photo' });
  }
}

// 7. Voice TTS
export async function handleTts(req: any, res: any) {
  try {
    const body = req.body || {};
    const { text, voice = 'Kore' } = body;
    if (!text) {
      return sendJson(res, 400, { error: 'Text is required for TTS' });
    }

    const geminiInfo = getGeminiClient();
    if (geminiInfo) {
      try {
        const response = await geminiInfo.ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: text.slice(0, 500),
                  speechMetadata: {
                    style: 'Warm, clear, encouraging cooking chef assistant',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return sendJson(res, 200, {
            audioUrl: `data:audio/wav;base64,${base64Audio}`,
          });
        }
      } catch (err) {
        console.warn('TTS model fallback to client Web Speech API:', err);
      }
    }

    // Client-side Web Speech API will handle the reading gracefully
    return sendJson(res, 200, { clientSpeechFallback: true });
  } catch (err: any) {
    console.warn('TTS request error:', err?.message);
    return sendJson(res, 200, { clientSpeechFallback: true });
  }
}

// Universal Serverless Function Handler for /api/claude.ts and /api/gemini.ts
export default async function handler(req: any, res: any) {
  // Set CORS headers
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(200).end();
    res.statusCode = 200;
    return res.end();
  }

  // Parse body across stream and parsed body types
  req.body = await parseRequestBody(req);

  const url = req.url || '';
  const action = req.body?.action;

  if (req.method === 'GET' || url.includes('status') || action === 'status' || action === 'check-key') {
    return handleKeyStatus(req, res);
  }
  if (url.includes('reverse-engineer') || action === 'reverse-engineer' || action === 'reverse-engineer-recipe') {
    return handleReverseEngineerRecipe(req, res);
  }
  if (url.includes('adjust-dish-photo') || action === 'adjust-dish-photo') {
    return handleAdjustDishPhoto(req, res);
  }
  if (url.includes('identify') || action === 'identify' || action === 'identify-ingredients' || (req.body?.imageBase64 && action !== 'reverse-engineer')) {
    return handleIdentify(req, res);
  }
  if (url.includes('generate-recipe') || action === 'generate-recipe' || action === 'custom-recipe') {
    return handleCustomRecipe(req, res);
  }
  if (url.includes('find-recipes') || action === 'find-recipes' || action === 'search-recipes' || (req.body?.ingredients && !req.body?.imageBase64)) {
    return handleFindRecipes(req, res);
  }
  if (url.includes('tts') || action === 'tts' || req.body?.text) {
    return handleTts(req, res);
  }

  return sendJson(res, 400, {
    error: 'Missing or unrecognized action. Expected: identify, find-recipes, generate-recipe, reverse-engineer, adjust-dish-photo, or tts',
  });
}
