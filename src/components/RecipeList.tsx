import React, { useState } from 'react';
import { Sparkles, ChefHat, Search, ArrowLeft, RefreshCw } from 'lucide-react';
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
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const favoriteIds = new Set(favorites.map((f) => f.id));

  const categories = [
    'All',
    'High Match (75%+)',
    'Quick (<30m)',
    ...Array.from(new Set(recipes.map((r) => r.category).filter(Boolean))),
  ];

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      recipe.area.toLowerCase().includes(filterQuery.toLowerCase()) ||
      recipe.category.toLowerCase().includes(filterQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedTag === 'High Match (75%+)') {
      return recipe.matchPercentage >= 75;
    }
    if (selectedTag === 'Quick (<30m)') {
      return recipe.estimatedTimeMinutes <= 30;
    }
    if (selectedTag !== 'All') {
      return recipe.category === selectedTag;
    }
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-28 pt-2">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
        <button
          onClick={onBackToPantry}
          type="button"
          className="flex items-center gap-1.5 text-[#0071e3] hover:text-[#0077ed] text-xs font-semibold transition-colors cursor-pointer active:opacity-70"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Pantry List</span>
        </button>
        <span className="text-xs text-[#86868b] tabular-nums">
          {recipes.length} Recipes Found
        </span>
      </div>

      {/* Featured AI Chef Editorial Card (App Store / Apple News Card Style) */}
      <div className="mt-4 p-5 rounded-2xl bg-[#1d1d1f] text-white shadow-sm border border-black/10 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-md">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              Bespoke Recipe
            </span>
            <h2 className="text-lg font-bold text-white mt-1 tracking-tight">
              Craft a Tailored Chef Dish
            </h2>
            <p className="text-[#86868b] text-xs mt-1 leading-relaxed">
              Gemini AI generates a singular custom recipe formulated specifically around the ingredients you selected.
            </p>
          </div>

          <button
            onClick={onGenerateCustomRecipe}
            disabled={isLoadingCustomRecipe}
            type="button"
            className="sm:self-center py-2.5 px-5 rounded-full bg-white hover:bg-stone-100 active:scale-95 text-[#1d1d1f] font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isLoadingCustomRecipe ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Crafting Recipe...</span>
              </>
            ) : (
              <>
                <ChefHat className="w-3.5 h-3.5" />
                <span>Generate Custom Dish</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* iOS Search Bar */}
      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-2.5" />
        <input
          type="text"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder="Search recipes, styles, or ingredients..."
          className="w-full bg-black/[0.05] border-0 rounded-xl pl-9 pr-4 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
        />
      </div>

      {/* Filter Segmented Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 mt-1 scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedTag === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedTag(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1d1d1f] text-white font-semibold shadow-xs'
                  : 'bg-black/[0.05] text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Recipe Cards Responsive Grid */}
      <div className="mt-3">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs max-w-lg mx-auto">
            <ChefHat className="w-10 h-10 text-[#86868b] mx-auto mb-2 opacity-40" />
            <h3 className="font-semibold text-[#1d1d1f] text-sm">No Recipes Found</h3>
            <p className="text-[#86868b] text-xs mt-1 max-w-xs mx-auto">
              Try adjusting your search or generate a bespoke custom dish.
            </p>
            <button
              onClick={onGenerateCustomRecipe}
              type="button"
              className="mt-4 px-4 py-2 rounded-full bg-[#0071e3] text-white text-xs font-semibold shadow-xs hover:bg-[#0077ed] active:scale-95 transition-all cursor-pointer"
            >
              Generate Custom Dish
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorite={favoriteIds.has(recipe.id)}
                onToggleFavorite={onToggleFavorite}
                onSelectRecipe={onSelectRecipe}
                onStartCooking={onStartCooking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
