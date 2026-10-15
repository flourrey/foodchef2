import dotenv from 'dotenv';
dotenv.config();

import { Mistral } from '@mistralai/mistralai';

// Helper to send JSON across runtimes (Express, Vite connect middleware, Serverless)
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

// Parse request body for stream-based runtimes
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

function getMistralClient(): { client: Mistral; apiKey: string } {
  const apiKey = (process.env.MISTRAL_API_KEY || process.env.MISTRAL_KEY || '').trim();
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY is not configured in environment variables');
  }
  const client = new Mistral({ apiKey });
  return { client, apiKey };
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
export function handleMistralKeyStatus(_req: any, res: any) {
  try {
    const apiKey = (process.env.MISTRAL_API_KEY || process.env.MISTRAL_KEY || '').trim();
    if (!apiKey) {
      return sendJson(res, 200, {
        configured: false,
        status: 'missing_key',
        provider: 'Mistral AI',
        message: 'No MISTRAL_API_KEY found in environment variables.',
      });
    }

    const masked = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '****';

    return sendJson(res, 200, {
      configured: true,
      status: 'ready',
      provider: 'Mistral AI',
      keySource: 'MISTRAL_API_KEY',
      maskedKey: masked,
      models: {
        vision: 'pixtral-12b-2409',
        recipes: 'mistral-small-latest',
      },
      message: 'Mistral AI connection is active and ready.',
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      configured: false,
      status: 'error',
      message: err?.message || 'Error checking Mistral key status',
    });
  }
}

// 2. Photo Analysis: Identify Ingredients using Pixtral Vision
export async function handleMistralIdentify(req: any, res: any) {
  try {
    const body = req.body || {};
    const rawImage = body.imageBase64 || body.image;

    if (!rawImage || typeof rawImage !== 'string') {
      return sendJson(res, 400, { error: 'Image data is required (imageBase64)' });
    }

    const { client } = getMistralClient();

    let cleanMime = body.mimeType || 'image/jpeg';
    let dataUrl = rawImage;

    if (!rawImage.startsWith('data:')) {
      dataUrl = `data:${cleanMime};base64,${rawImage}`;
    } else {
      const mimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      if (mimeMatch) {
        cleanMime = mimeMatch[1];
      }
    }

    console.log(`[Mistral Pixtral Vision] Analyzing image with Pixtral: MIME ${cleanMime}`);

    const prompt = `Analyze this image carefully to identify ALL visible food ingredients, raw vegetables, fruits, meats, seafood, dairy, eggs, pantry staples, herbs, spices, or condiments.
Respond ONLY with a valid JSON object matching this exact schema:
{
  "ingredients": [
    {
      "name": "Singular culinary English name (e.g. Tomato, Garlic, Egg)",
      "category": "Produce" | "Meat & Seafood" | "Dairy & Eggs" | "Pantry & Seasonings" | "Bakery & Grains" | "Other",
      "confidence": "high" | "medium" | "low",
      "state": "Fresh" | "Ripe" | "Raw" | "Chopped" | "Canned",
      "quantity": "estimated quantity if visible"
    }
  ],
  "suggestedCuisines": ["Cuisine 1", "Cuisine 2"],
  "chefTip": "Short culinary chef advice for these ingredients"
}`;

    const response = await client.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', imageUrl: dataUrl },
          ],
        },
      ],
      responseFormat: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    let rawText = typeof content === 'string' ? content : '';
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
      id: `mistral-ing-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: item.name || 'Ingredient',
      category: item.category || 'Produce',
      confidence: item.confidence || 'high',
      state: item.state || 'Fresh',
      quantity: item.quantity || '',
      checked: true,
    }));

    return sendJson(res, 200, {
      ingredients: ingredientsWithIds,
      suggestedCuisines: parsed.suggestedCuisines || ['French Bistro', 'Mediterranean', 'Comfort Food'],
      chefTip: parsed.chefTip || 'Fresh seasonal ingredients bring exceptional vibrancy to your table.',
      provider: 'Mistral AI (Pixtral)',
    });
  } catch (error: any) {
    console.error('Error in handleMistralIdentify:', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to analyze image with Mistral AI',
    });
  }
}

// 3. Multi-Recipe Discovery via Mistral
export async function handleMistralFindRecipes(req: any, res: any) {
  try {
    const body = req.body || {};
    const { ingredients = [], preferences = '' } = body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return sendJson(res, 400, { error: 'At least one ingredient is required' });
    }

    const { client } = getMistralClient();

    const prompt = `You are an acclaimed culinary chef. Generate 5 diverse, realistic, delicious recipes that make maximum use of these user ingredients:
${ingredients.join(', ')}.

Preferences: ${preferences || 'Balanced variety: 1 quick 15-min meal, 1 comforting classic, 1 fresh healthy dish, 1 creative gourmet option'}.

Instructions:
1. Maximize use of user ingredients. Basic pantry items (salt, pepper, cooking oil, water, butter) can be assumed available.
2. For each ingredient in every recipe, explicitly set:
   - "hasIngredient": true if the user provided it, false if it's an extra item.
   - "isStaple": true if it's a basic kitchen staple.
3. Compute an honest matchPercentage (0 to 100) based on how much of the dish can be made with user's items.
4. Break each recipe into clear, numbered cooking steps.
5. Provide realistic prepTimeMinutes, cookTimeMinutes, difficulty ("Easy", "Medium", "Hard"), and servings.

Respond ONLY with valid JSON in this structure:
{
  "recipes": [
    {
      "title": "Recipe Title",
      "description": "Short appetizing description",
      "category": "Course or category",
      "area": "Cuisine/Region",
      "difficulty": "Easy",
      "prepTimeMinutes": 10,
      "cookTimeMinutes": 20,
      "servings": 2,
      "ingredients": [
        { "name": "Ingredient name", "measure": "Quantity with unit", "hasIngredient": true, "isStaple": false }
      ],
      "steps": [
        { "stepNumber": 1, "instruction": "Clear spoken instruction", "estimatedMinutes": 5, "tip": "Chef tip" }
      ],
      "matchPercentage": 85,
      "chefNotes": "Pro chef advice"
    }
  ]
}`;

    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    let rawText = typeof content === 'string' ? content : '';
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
        id: `mistral-rec-${Date.now()}-${index}`,
        title: recipe.title,
        source: 'Mistral AI',
        description: recipe.description || 'Crafted with Mistral AI culinary intelligence.',
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
        chefNotes: recipe.chefNotes || 'Cook with precision and season thoughtfully.',
      };
    });

    processedRecipes.sort((a: any, b: any) => b.matchPercentage - a.matchPercentage);

    return sendJson(res, 200, {
      recipes: processedRecipes,
      totalFound: processedRecipes.length,
      userIngredients: ingredients,
      provider: 'Mistral AI',
    });
  } catch (error: any) {
    console.error('Error in handleMistralFindRecipes:', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to generate recipes with Mistral AI',
    });
  }
}

// 4. Single Bespoke Custom Recipe via Mistral
export async function handleMistralCustomRecipe(req: any, res: any) {
  try {
    const body = req.body || {};
    const { ingredients = [], mealType = 'Dinner', dietaryPreference = 'None' } = body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return sendJson(res, 400, { error: 'Ingredients list is required' });
    }

    const { client } = getMistralClient();

    const prompt = `You are an expert chef creating a single bespoke gourmet recipe using these available ingredients:
${ingredients.join(', ')}.
Meal type preference: ${mealType}.
Dietary preference: ${dietaryPreference}.

Requirements:
1. Create a clear appetizing recipe title.
2. Maximize usage of user's provided ingredients.
3. Provide realistic prep time, cook time, difficulty, and servings.
4. Break down the cooking process into concise, well-sequenced steps.
5. Add timer recommendations where cooking or simmering is needed.
6. Provide chef notes.

Respond ONLY with valid JSON in this schema:
{
  "title": "Recipe Title",
  "description": "Short description",
  "category": "Main Course",
  "area": "Cuisine",
  "difficulty": "Easy",
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 20,
  "servings": 2,
  "ingredients": [
    { "name": "Name", "measure": "Quantity", "hasIngredient": true, "isStaple": false }
  ],
  "steps": [
    { "stepNumber": 1, "instruction": "Step instruction", "estimatedMinutes": 5, "tip": "Chef tip" }
  ],
  "chefNotes": "Advice"
}`;

    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    let rawText = typeof content === 'string' ? content : '';
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
      id: `mistral-custom-${Date.now()}`,
      title: parsed.title || 'Mistral Chef Special Creation',
      source: 'Mistral AI',
      description: parsed.description || 'Custom crafted recipe by Mistral AI based on your fresh ingredients.',
      category: parsed.category || 'Chef Special',
      area: parsed.area || 'French/Continental',
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

    return sendJson(res, 200, { recipe: customRecipe, provider: 'Mistral AI' });
  } catch (error: any) {
    console.error('Error in handleMistralCustomRecipe:', error);
    return sendJson(res, 500, {
      error: error?.message || 'Failed to generate custom recipe with Mistral AI',
    });
  }
}

// Universal Serverless Function Handler for /api/mistral.ts
export default async function handler(req: any, res: any) {
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

  req.body = await parseRequestBody(req);

  const url = req.url || '';
  const action = req.body?.action;

  if (req.method === 'GET' || url.includes('status') || action === 'status' || action === 'check-key') {
    return handleMistralKeyStatus(req, res);
  }
  if (url.includes('identify') || action === 'identify' || action === 'identify-ingredients' || req.body?.imageBase64 || req.body?.image) {
    return handleMistralIdentify(req, res);
  }
  if (url.includes('generate-recipe') || action === 'generate-recipe' || action === 'custom-recipe') {
    return handleMistralCustomRecipe(req, res);
  }
  if (url.includes('find-recipes') || action === 'find-recipes' || action === 'search-recipes' || (req.body?.ingredients && !req.body?.imageBase64)) {
    return handleMistralFindRecipes(req, res);
  }

  return sendJson(res, 400, {
    error: 'Missing or unrecognized action. Expected: status, identify, find-recipes, or generate-recipe',
  });
}
