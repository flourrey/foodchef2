import React, { useState } from 'react';
import { Heart, Search, Play, Clock, ChefHat, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { Recipe } from '../types';

interface FavoritesViewProps {
  favorites: Recipe[];
  onToggleFavorite: (recipe: Recipe) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
  onGoToScanner: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onToggleFavorite,
  onSelectRecipe,
  onStartCooking,
  onGoToScanner,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = favorites.filter(
    (recipe) =>
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-28 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-current" />
            Favorite Recipes
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {favorites.length} saved {favorites.length === 1 ? 'recipe' : 'recipes'} for quick access
          </p>
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved recipes..."
            className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      )}

      {/* List */}
      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-stone-300 p-6">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-800 text-sm">
              {favorites.length === 0 ? 'No Favorites Saved Yet' : 'No matching favorites'}
            </h3>
            <p className="text-stone-500 text-xs mt-1 max-w-xs mx-auto">
              {favorites.length === 0
                ? 'Tap the heart icon on any recipe to save it here for fast access whenever you cook.'
                : 'Try searching with a different recipe name or cuisine.'}
            </p>
            {favorites.length === 0 && (
              <button
                onClick={onGoToScanner}
                type="button"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-600/20"
              >
                Scan Ingredients to Find Recipes
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex items-center p-3 gap-3"
            >
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-20 h-20 rounded-xl object-cover shrink-0 cursor-pointer"
                onClick={() => onSelectRecipe(recipe)}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-medium">
                  <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    {recipe.area}
                  </span>
                  <span>•</span>
                  <span>{recipe.category}</span>
                  <span>•</span>
                  <span>{recipe.estimatedTimeMinutes}m</span>
                </div>

                <h3
                  onClick={() => onSelectRecipe(recipe)}
                  className="font-bold text-stone-900 text-sm leading-snug truncate mt-1 cursor-pointer hover:text-amber-600"
                >
                  {recipe.title}
                </h3>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => onStartCooking(recipe)}
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Cook
                  </button>

                  <button
                    onClick={() => onSelectRecipe(recipe)}
                    type="button"
                    className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold"
                  >
                    Details
                  </button>

                  <button
                    onClick={() => onToggleFavorite(recipe)}
                    type="button"
                    className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg ml-auto"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
