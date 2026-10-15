import dotenv from 'dotenv';
dotenv.config();

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

// Dynamic initialization to pick up GEMINI_KEY (or GEMINI_API_KEY)
function getGeminiClient(): { ai: GoogleGenAI; keySource: string } {
  const apiKey = (process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_KEY or GEMINI_API_KEY is not configured in environment variables');
  }

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

// Resilient generateContent helper that starts with ultra-fast gemini-3.5-flash
// and cascades through available fallbacks with retry
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
      console.warn(`[Gemini API] Model ${model} failed, trying next fallback:`, err?.message || err);
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
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
];

// 1. Check Key Status
export function handleKeyStatus(_req: any, res: any) {
  try {
    const apiKey = (process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return sendJson(res, 200, {
        configured: false,
        status: 'missing_key',
        message: 'No GEMINI_KEY or GEMINI_API_KEY found in environment variables.',
      });
    }

    const keySource = process.env.GEMINI_KEY ? 'GEMINI_KEY' : 'GEMINI_API_KEY';
    const masked = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '****';

    return sendJson(res, 200, {
      configured: true,
      status: 'ready',
      keySource,
      maskedKey: masked,
      message: 'Gemini AI connection is active and ready.',
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      configured: false,
      status: 'error',
      message: err?.message || 'Error checking Gemini key status',
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

    const { ai } = getGeminiClient();

    let cleanMime = body.mimeType || 'image/jpeg';
    let cleanBase64 = rawImage;

    const mimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (mimeMatch) {
      cleanMime = mimeMatch[1];
      cleanBase64 = rawImage.slice(mimeMatch[0].length);
    } else {
      cleanBase64 = rawImage.replace(/^data:[^;]+;base64,/, '');
    }

    console.log(`[Gemini Vision] Analyzing image: ~${Math.round(cleanBase64.length / 1024)} KB, MIME: ${cleanMime}`);

    const response = await generateWithFallback(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this image carefully to identify ALL visible food ingredients, raw vegetables, fruits, meats, seafood, dairy, eggs, pantry staples, herbs, spices, or condiments.
For every distinct ingredient identified:
1. Provide the singular culinary English name (e.g., "Tomato", "Chicken Breast", "Garlic", "Onion", "Egg", "Bell Pepper", "Soy Sauce", "Milk", "Potato").
2. Assign an appropriate culinary category: "Produce", "Meat & Seafood", "Dairy & Eggs", "Pantry & Seasonings", "Bakery & Grains", or "Other".
3. Provide confidence ("high", "medium", or "low").
4. Note its state/freshness if apparent (e.g. "Fresh", "Ripe", "Raw", "Chopped", "Canned", "Chilled").
5. Note estimated visible quantity if discernable (e.g. "3 items", "1 bunch", "approx. 250g", "1 carton").

Also provide 2 to 4 cuisine inspiration tags (e.g. "Italian", "Mexican", "Asian", "Mediterranean") and a short chef tip for cooking with these ingredients.
Return valid JSON according to the schema.`,
          },
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

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText || '{}');
    } catch {
      parsed = { ingredients: [] };
    }

    const ingredientsWithIds = (parsed.ingredients || []).map((item: any, idx: number) => ({
      id: `ing-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: item.name || 'Ingredient',
      category: item.category || 'Produce',
      confidence: item.confidence || 'high',
      state: item.state || 'Fresh',
      quantity: item.quantity || '',
      checked: true,
    }));

    return sendJson(res, 200, {
      ingredients: ingredientsWithIds,
      suggestedCuisines: parsed.suggestedCuisines || ['Comfort Food', 'Quick Dinner'],
      chefTip: parsed.chefTip || 'Fresh ingredients deliver the brightest flavors.',
    });
  } catch (error: any) {
    console.error('Error in handleIdentify:', error);
    const isOverload = error?.message?.includes('503') || error?.status === 503;
    return sendJson(res, isOverload ? 503 : 500, {
      error: isOverload
        ? 'Gemini AI is temporarily experiencing high traffic. Please tap snap photo again in a few seconds.'
        : error?.message || 'Failed to analyze image with Gemini',
    });
  }
}

// 3. Multi-Recipe Discovery via Gemini
export async function handleFindRecipes(req: any, res: any) {
  try {
    const body = req.body || {};
    const { ingredients = [], preferences = '' } = body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return sendJson(res, 400, { error: 'At least one ingredient is required' });
    }

    const { ai } = getGeminiClient();

    const prompt = `You are a world-class culinary chef. Generate 5 diverse, mouth-watering, realistic recipes that feature and make maximum use of these user-provided ingredients:
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
6. Provide an imageKeyword for each dish (e.g. "pasta", "soup", "salad", "stir-fry", "curry", "roast").

Return pure JSON matching the schema.`;

    const response = await generateWithFallback(ai, {
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
                  imageKeyword: { type: Type.STRING },
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

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText || '{}');
    } catch {
      parsed = { recipes: [] };
    }

    const processedRecipes = (parsed.recipes || []).map((recipe: any, index: number) => {
      const totalIng = (recipe.ingredients || []).length;
      const matched = (recipe.ingredients || []).filter((i: any) => i.hasIngredient).length;
      const missing = (recipe.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length;
      const fallbackImage = RECIPE_IMAGE_FALLBACKS[index % RECIPE_IMAGE_FALLBACKS.length];

      return {
        id: `gemini-rec-${Date.now()}-${index}`,
        title: recipe.title,
        source: 'Gemini AI',
        description: recipe.description || 'Crafted with Gemini AI chef intelligence.',
        category: recipe.category || 'Chef Special',
        area: recipe.area || 'Fusion',
        imageUrl: fallbackImage,
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
    });
  } catch (error: any) {
    console.error('Error in handleFindRecipes:', error);
    const isOverload = error?.message?.includes('503') || error?.status === 503;
    return sendJson(res, isOverload ? 503 : 500, {
      error: isOverload
        ? 'Gemini AI is temporarily busy. Please tap search recipes again in a moment.'
        : error?.message || 'Failed to generate recipes with Gemini',
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

    const { ai } = getGeminiClient();

    const prompt = `You are an expert chef creating a single bespoke gourmet recipe using these ingredients:
${ingredients.join(', ')}.
Meal type preference: ${mealType}.
Dietary preference: ${dietaryPreference}.

Requirements:
1. Create a clear recipe name that sounds appetizing.
2. Utilize as many of the user's available ingredients as possible.
3. Provide realistic prep time, cook time, difficulty, and servings.
4. Break down the cooking process into concise, well-sequenced, spoken-friendly cooking steps.
5. Add timer recommendation for steps requiring cooking/simmering/baking.
6. Provide chef advice/pro-tips.

Return purely JSON matching the schema.`;

    const response = await generateWithFallback(ai, {
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

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText || '{}');
    } catch {
      parsed = {};
    }

    const customRecipe = {
      id: `custom-${Date.now()}`,
      title: parsed.title || 'Gemini Chef Special Creation',
      source: 'Gemini AI',
      description: parsed.description || 'Custom crafted recipe by Gemini AI based on your fresh ingredients.',
      category: parsed.category || 'Chef Special',
      area: parsed.area || 'Fusion',
      imageUrl: RECIPE_IMAGE_FALLBACKS[0],
      difficulty: parsed.difficulty || 'Easy',
      estimatedTimeMinutes: (parsed.prepTimeMinutes || 10) + (parsed.cookTimeMinutes || 20),
      servings: parsed.servings || 2,
      ingredients: parsed.ingredients || [],
      steps: parsed.steps || [],
      matchPercentage: 95,
      matchedCount: (parsed.ingredients || []).filter((i: any) => i.hasIngredient).length,
      missingCount: (parsed.ingredients || []).filter((i: any) => !i.hasIngredient && !i.isStaple).length,
      totalIngredients: (parsed.ingredients || []).length,
      chefNotes: parsed.chefNotes || 'Adjust seasoning to taste.',
    };

    return sendJson(res, 200, { recipe: customRecipe });
  } catch (error: any) {
    console.error('Error in handleCustomRecipe:', error);
    const isOverload = error?.message?.includes('503') || error?.status === 503;
    return sendJson(res, isOverload ? 503 : 500, {
      error: isOverload
        ? 'Gemini AI is temporarily busy. Please try generating again in a moment.'
        : error?.message || 'Failed to generate custom recipe',
    });
  }
}

// 5. Voice TTS via Gemini
export async function handleTts(req: any, res: any) {
  try {
    const body = req.body || {};
    const { text, voice = 'Kore' } = body;
    if (!text) {
      return sendJson(res, 400, { error: 'Text is required for TTS' });
    }

    const { ai } = getGeminiClient();

    const response = await ai.models.generateContent({
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
    if (!base64Audio) {
      return sendJson(res, 500, { error: 'No audio returned from Gemini TTS' });
    }

    return sendJson(res, 200, {
      audioUrl: `data:audio/wav;base64,${base64Audio}`,
    });
  } catch (err: any) {
    console.warn('TTS request error:', err?.message);
    return sendJson(res, 500, { error: 'TTS fallback needed' });
  }
}

// Universal Serverless Function Handler for /api/gemini.ts
// Compatible with Vercel Serverless, Vite Dev Middleware, Netlify, and Express
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
  if (url.includes('identify') || action === 'identify' || action === 'identify-ingredients' || req.body?.imageBase64 || req.body?.image) {
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
    error: 'Missing or unrecognized action. Expected: identify, find-recipes, generate-recipe, or tts',
  });
}
