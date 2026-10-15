export interface Ingredient {
  id: string;
  name: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  state?: string;
  quantity?: string;
  checked?: boolean;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  estimatedMinutes?: number;
  tip?: string;
}

export interface RecipeIngredient {
  name: string;
  measure: string;
  hasIngredient: boolean;
  isStaple?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  source: 'Gemini AI' | 'Mistral AI' | 'AI Chef';
  description?: string;
  category: string;
  area: string;
  imageUrl: string;
  youtubeUrl?: string;
  tags?: string[];
  instructions?: string;
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
  matchedCount: number;
  missingCount: number;
  totalIngredients: number;
  matchPercentage: number;
  estimatedTimeMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings?: number;
  chefNotes?: string;
  isFavorite?: boolean;
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  stepNumber?: number;
}

export type AppTab = 'scanner' | 'pantry' | 'recipes' | 'favorites' | 'cooking';

export type AiProvider = 'gemini' | 'mistral';
