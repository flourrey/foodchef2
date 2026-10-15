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

export interface DeconstructedComponent {
  componentName: string;
  description: string;
  ingredients?: string[];
}

export interface FlavorProfile {
  savory: number;
  umami: number;
  acidity: number;
  sweetness: number;
  richness: number;
}

export interface Recipe {
  id: string;
  title: string;
  source: 'Gemini AI' | 'AI Chef';
  description?: string;
  category: string;
  area: string;
  imageUrl: string;
  originalPhotoUrl?: string;
  dishVisualType?: string;
  dishAppearance?: string;
  platingStyle?: string;
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
  isReverseEngineered?: boolean;
  detectedTechniques?: string[];
  flavorProfile?: FlavorProfile;
  deconstructedComponents?: DeconstructedComponent[];
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  stepNumber?: number;
}

export interface ReverseEngineerResult {
  recipe: Recipe;
  dishName: string;
  cuisine: string;
  flavorProfile: FlavorProfile;
  detectedTechniques: string[];
  secretChefTip: string;
  deconstructedComponents: DeconstructedComponent[];
}

export type AppTab = 'scanner' | 'pantry' | 'recipes' | 'favorites' | 'cooking';
