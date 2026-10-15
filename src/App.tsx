/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CameraScanner } from './components/CameraScanner';
import { IngredientReview } from './components/IngredientReview';
import { RecipeList } from './components/RecipeList';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { VoiceCookingAssistant } from './components/VoiceCookingAssistant';
import { FavoritesView } from './components/FavoritesView';
import { TopBar, BottomTabBar } from './components/Navigation';
import { Ingredient, Recipe, AppTab, AiProvider } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('scanner');
  const [aiProvider, setAiProvider] = useState<AiProvider>(() => {
    try {
      const saved = localStorage.getItem('snapchef_ai_provider');
      return saved === 'mistral' ? 'mistral' : 'gemini';
    } catch {
      return 'gemini';
    }
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    try {
      const saved = localStorage.getItem('snapchef_ingredients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem('snapchef_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeCookingRecipe, setActiveCookingRecipe] = useState<Recipe | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearchingRecipes, setIsSearchingRecipes] = useState(false);
  const [isLoadingCustomRecipe, setIsLoadingCustomRecipe] = useState(false);

  const [chefTip, setChefTip] = useState<string>('');
  const [suggestedCuisines, setSuggestedCuisines] = useState<string[]>([]);

  // Persist AI provider
  useEffect(() => {
    try {
      localStorage.setItem('snapchef_ai_provider', aiProvider);
    } catch {
      // ignore
    }
  }, [aiProvider]);

  // Persist ingredients to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('snapchef_ingredients', JSON.stringify(ingredients));
    } catch {
      // ignore
    }
  }, [ingredients]);

  // Persist favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('snapchef_favorites', JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  // Handle ingredients detected by Gemini from photo
  const handleIngredientsDetected = (data: {
    ingredients: any[];
    suggestedCuisines?: string[];
    chefTip?: string;
  }) => {
    if (data.ingredients && data.ingredients.length > 0) {
      setIngredients((prev) => {
        // Deduplicate by name
        const existingNames = new Set(prev.map((i) => i.name.toLowerCase()));
        const newOnes = data.ingredients.filter(
          (i) => !existingNames.has(i.name.toLowerCase())
        );
        return [...prev, ...newOnes];
      });
    }

    if (data.chefTip) setChefTip(data.chefTip);
    if (data.suggestedCuisines) setSuggestedCuisines(data.suggestedCuisines);

    // Switch to pantry review tab
    setCurrentTab('pantry');
  };

  // Toggle ingredient check for search
  const handleToggleCheck = (id: string) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  // Remove single ingredient
  const handleRemoveIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  // Manually add ingredient
  const handleAddIngredient = (name: string, category: string = 'Other') => {
    const newItem: Ingredient = {
      id: `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      category,
      confidence: 'high',
      state: 'Available',
      quantity: '',
      checked: true,
    };
    setIngredients((prev) => [...prev, newItem]);
  };

  // Clear all ingredients
  const handleClearAllIngredients = () => {
    if (confirm('Clear all identified ingredients from your pantry list?')) {
      setIngredients([]);
      setRecipes([]);
    }
  };

  // Generate recipes via selected AI Provider (Gemini or Mistral)
  const handleFindGeminiRecipes = async () => {
    const activeIngredients = ingredients.filter((i) => i.checked).map((i) => i.name);
    if (activeIngredients.length === 0) return;

    setIsSearchingRecipes(true);
    try {
      const endpoint = aiProvider === 'mistral' ? '/api/mistral.ts' : '/api/gemini.ts';
      const payload = { action: 'find-recipes', ingredients: activeIngredients };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMessage = errorData.error || `Failed to generate recipes with ${aiProvider === 'mistral' ? 'Mistral AI' : 'Gemini AI'}`;

        if (aiProvider === 'mistral' && errMessage.includes('MISTRAL_API_KEY')) {
          if (confirm('Mistral AI requires MISTRAL_API_KEY in your .env file. Would you like to generate recipes using Gemini AI instead?')) {
            setAiProvider('gemini');
            const fallbackRes = await fetch('/api/gemini.ts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              setRecipes(fallbackData.recipes || []);
              setCurrentTab('recipes');
              return;
            }
          }
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      setRecipes(data.recipes || []);
      setCurrentTab('recipes');
    } catch (err: any) {
      console.error('Error fetching recipes:', err);
      alert(err.message || 'Could not fetch recipes at this moment');
    } finally {
      setIsSearchingRecipes(false);
    }
  };

  // Generate Bespoke Custom Recipe with selected AI Provider
  const handleGenerateCustomRecipe = async () => {
    const activeIngredients = ingredients.filter((i) => i.checked).map((i) => i.name);
    if (activeIngredients.length === 0) {
      alert('Please check at least 1 ingredient first!');
      return;
    }

    setIsLoadingCustomRecipe(true);
    try {
      const endpoint = aiProvider === 'mistral' ? '/api/mistral.ts' : '/api/gemini.ts';
      const payload = {
        action: 'generate-recipe',
        ingredients: activeIngredients,
        mealType: 'Dinner',
        dietaryPreference: 'None',
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMessage = errorData.error || `Failed to generate custom recipe with ${aiProvider === 'mistral' ? 'Mistral AI' : 'Gemini AI'}`;

        if (aiProvider === 'mistral' && errMessage.includes('MISTRAL_API_KEY')) {
          if (confirm('Mistral AI requires MISTRAL_API_KEY in your .env file. Would you like to create your recipe with Gemini AI instead?')) {
            setAiProvider('gemini');
            const fallbackRes = await fetch('/api/gemini.ts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              if (fallbackData.recipe) {
                setRecipes((prev) => [fallbackData.recipe, ...prev.filter((r) => r.id !== fallbackData.recipe.id)]);
                setSelectedRecipe(fallbackData.recipe);
                setCurrentTab('recipes');
                return;
              }
            }
          }
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      if (data.recipe) {
        setRecipes((prev) => [data.recipe, ...prev.filter((r) => r.id !== data.recipe.id)]);
        setSelectedRecipe(data.recipe);
        setCurrentTab('recipes');
      }
    } catch (err: any) {
      console.error('Custom recipe error:', err);
      alert(err.message || 'Could not generate custom recipe');
    } finally {
      setIsLoadingCustomRecipe(false);
    }
  };

  // Toggle favorite recipe
  const handleToggleFavorite = (recipe: Recipe) => {
    setFavorites((prev) => {
      const exists = prev.some((r) => r.id === recipe.id);
      if (exists) {
        return prev.filter((r) => r.id !== recipe.id);
      } else {
        return [...prev, recipe];
      }
    });
  };

  // Launch Voice Cooking Assistant
  const handleStartCooking = (recipe: Recipe) => {
    setSelectedRecipe(null);
    setActiveCookingRecipe(recipe);
    setCurrentTab('cooking');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans flex flex-col antialiased selection:bg-[#0071e3]/20 selection:text-[#0071e3]">
      {/* Top Bar (Hidden when actively in voice cooking mode) */}
      {currentTab !== 'cooking' && (
        <TopBar
          currentTab={currentTab}
          pantryCount={ingredients.length}
          onGoToScanner={() => setCurrentTab('scanner')}
          aiProvider={aiProvider}
          onSelectAiProvider={setAiProvider}
        />
      )}

      {/* Main Content Body with Responsive Width */}
      <main className={`flex-1 w-full mx-auto ${currentTab === 'recipes' ? 'max-w-5xl' : 'max-w-xl'}`}>
        {/* Tab 1: Scanner */}
        {currentTab === 'scanner' && (
          <CameraScanner
            onIngredientsDetected={handleIngredientsDetected}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
            onViewPantry={() => setCurrentTab('pantry')}
            pantryCount={ingredients.length}
            autoStart={false}
            aiProvider={aiProvider}
            onSelectAiProvider={setAiProvider}
          />
        )}

        {/* Tab 2: Pantry Review */}
        {currentTab === 'pantry' && (
          <IngredientReview
            ingredients={ingredients}
            onToggleCheck={handleToggleCheck}
            onRemoveIngredient={handleRemoveIngredient}
            onAddIngredient={handleAddIngredient}
            onClearAll={handleClearAllIngredients}
            onTakeAnotherPhoto={() => setCurrentTab('scanner')}
            onFindGeminiRecipes={handleFindGeminiRecipes}
            onGenerateCustomRecipe={handleGenerateCustomRecipe}
            chefTip={chefTip}
            suggestedCuisines={suggestedCuisines}
            isSearchingRecipes={isSearchingRecipes}
            aiProvider={aiProvider}
          />
        )}

        {/* Tab 3: Recipes List */}
        {currentTab === 'recipes' && (
          <RecipeList
            recipes={recipes}
            userIngredients={ingredients.filter((i) => i.checked).map((i) => i.name)}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
            onStartCooking={handleStartCooking}
            onGenerateCustomRecipe={handleGenerateCustomRecipe}
            onBackToPantry={() => setCurrentTab('pantry')}
            isLoadingCustomRecipe={isLoadingCustomRecipe}
          />
        )}

        {/* Tab 4: Favorites */}
        {currentTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
            onStartCooking={handleStartCooking}
            onGoToScanner={() => setCurrentTab('scanner')}
          />
        )}

        {/* Tab 5: Dedicated Fullscreen Voice Cooking Assistant */}
        {currentTab === 'cooking' && activeCookingRecipe && (
          <VoiceCookingAssistant
            recipe={activeCookingRecipe}
            onExit={() => {
              setActiveCookingRecipe(null);
              setCurrentTab('recipes');
            }}
            onRecipeCompleted={() => {
              // auto-favorite or celebrate
            }}
          />
        )}
      </main>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        isFavorite={selectedRecipe ? favorites.some((f) => f.id === selectedRecipe.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onStartCooking={handleStartCooking}
      />

      {/* Mobile Floating Bottom Tab Bar */}
      <BottomTabBar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        pantryCount={ingredients.length}
        recipesCount={recipes.length}
        favoritesCount={favorites.length}
        hasActiveCookingSession={!!activeCookingRecipe && currentTab !== 'cooking'}
        onResumeCooking={() => setCurrentTab('cooking')}
      />
    </div>
  );
}
