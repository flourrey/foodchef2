import React, { useState } from 'react';
import { Sparkles, SlidersHorizontal, ChefHat, Search, ArrowLeft, RefreshCw } from 'lucide-react';
import { Recipe } from '../types';
import { RecipeCard } from './RecipeCard';

interface RecipeListProps {
  recipes: Recipe[];
  userIngredients: string[];
  favorites: Recipe[];
  onToggleFavorite: (recipe: Recipe) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
  onGenerateCustomRecipe: () => void;
  onBackToPantry: () => void;
  isLoadingCustomRecipe: boolean;
  onAdjustPhoto?: (recipe: Recipe) => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({
  recipes,
  userIngredients,
  favorites,
  onToggleFavorite,
  onSelectRecipe,
  onStartCooking,
  onGenerateCustomRecipe,
  onBackToPantry,
  isLoadingCustomRecipe,
  onAdjustPhoto,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const favoriteIds = new Set(favorites.map((f) => f.id));

  // Extract unique categories
  const categories = ['All', 'High Match (75%+)', 'Quick (<30m)', 'AI Chef', ...Array.from(new Set(recipes.map((r) => r.category).filter(Boolean)))];

  const filteredRecipes = recipes.filter((recipe) => {
    // Search query match
    const matchesSearch =
      recipe.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      recipe.area.toLowerCase().includes(filterQuery.toLowerCase()) ||
      recipe.category.toLowerCase().includes(filterQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Filter tags
    if (selectedTag === 'High Match (75%+)') {
      return recipe.matchPercentage >= 75;
    }
    if (selectedTag === 'Quick (<30m)') {
      return recipe.estimatedTimeMinutes <= 30;
    }
    if (selectedTag === 'AI Chef') {
      return recipe.source === 'AI Chef';
    }
    if (selectedTag !== 'All') {
      return recipe.category === selectedTag;
    }
    return true;
  });

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-28 pt-2">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <button
          onClick={onBackToPantry}
          type="button"
          className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Pantry Items
        </button>
        <span className="text-xs font-semibold text-stone-500">
          {recipes.length} Recipes Found
        </span>
      </div>

      {/* Hero AI Chef Callout */}
      <div className="mt-3 p-4 rounded-3xl bg-gradient-to-br from-stone-900 to-stone-800 text-white shadow-lg border border-stone-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Bespoke Culinary AI
            </span>
            <h2 className="text-base font-extrabold text-white mt-1.5">
              Want a Tailored Dish?
            </h2>
            <p className="text-stone-300 text-xs mt-1 leading-relaxed">
              Let Claude AI craft a gourmet recipe using the exact items you just photographed.
            </p>
          </div>
        </div>

        <button
          onClick={onGenerateCustomRecipe}
          disabled={isLoadingCustomRecipe}
          type="button"
          className="mt-3.5 w-full py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoadingCustomRecipe ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Generating Custom Recipe...
            </>
          ) : (
            <>
              <ChefHat className="w-4 h-4 text-stone-950" />
              Generate Custom AI Recipe
            </>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Filter recipes by name or cuisine..."
          className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
      </div>

      {/* Quick Filter Categories */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 mt-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedTag(cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedTag === cat
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recipe Cards List */}
      <div className="mt-3 space-y-4">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-stone-200 p-6">
            <ChefHat className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <h3 className="font-bold text-stone-800 text-sm">No Recipes Found</h3>
            <p className="text-stone-500 text-xs mt-1 max-w-xs mx-auto">
              Try taking photos of more ingredients, or generate an AI Chef recipe to fit your current items.
            </p>
            <button
              onClick={onGenerateCustomRecipe}
              type="button"
              className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-600/20"
            >
              Generate with AI Chef
            </button>
          </div>
        ) : (
          filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={favoriteIds.has(recipe.id)}
              onToggleFavorite={onToggleFavorite}
              onSelectRecipe={onSelectRecipe}
              onStartCooking={onStartCooking}
              onAdjustPhoto={onAdjustPhoto}
            />
          ))
        )}
      </div>
    </div>
  );
};
