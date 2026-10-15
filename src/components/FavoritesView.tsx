import React, { useState } from 'react';
import { Heart, Search, Play, Clock, ArrowRight, Trash2 } from 'lucide-react';
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
      {/* Apple Large Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#ff2d55] fill-current" />
            Saved Recipes
          </h1>
          <p className="text-xs text-[#86868b] mt-0.5">
            <span className="font-semibold text-[#1d1d1f] tabular-nums">{favorites.length}</span> saved {favorites.length === 1 ? 'recipe' : 'recipes'}
          </p>
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="mt-3.5 relative">
          <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved recipes..."
            className="w-full bg-black/[0.05] border-0 rounded-xl pl-9 pr-4 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
          />
        </div>
      )}

      {/* List */}
      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#ff2d55]/10 text-[#ff2d55] flex items-center justify-center mx-auto mb-3">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-[#1d1d1f] text-sm">
              {favorites.length === 0 ? 'No Saved Recipes' : 'No matching recipes'}
            </h3>
            <p className="text-[#86868b] text-xs mt-1 max-w-xs mx-auto">
              {favorites.length === 0
                ? 'Tap the heart icon on any recipe to save it here for quick access in your kitchen.'
                : 'Try searching with another recipe title or cuisine.'}
            </p>
            {favorites.length === 0 && (
              <button
                onClick={onGoToScanner}
                type="button"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0071e3] text-white font-semibold text-xs shadow-xs hover:bg-[#0077ed] active:scale-95 transition-all cursor-pointer"
              >
                <span>Find Recipes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-xs hover:shadow-sm transition-all flex items-center p-3 gap-3"
            >
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-20 h-20 rounded-xl object-cover shrink-0 cursor-pointer"
                onClick={() => onSelectRecipe(recipe)}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-[#86868b]">
                  <span className="font-medium text-[#1d1d1f]">{recipe.area}</span>
                  <span aria-hidden="true">·</span>
                  <span>{recipe.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{recipe.estimatedTimeMinutes}m</span>
                </div>

                <h3
                  onClick={() => onSelectRecipe(recipe)}
                  className="font-semibold text-[#1d1d1f] text-sm leading-snug truncate mt-0.5 cursor-pointer hover:text-[#0071e3] transition-colors"
                >
                  {recipe.title}
                </h3>

                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    onClick={() => onStartCooking(recipe)}
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 text-white text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Cook
                  </button>

                  <button
                    onClick={() => onSelectRecipe(recipe)}
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-xs font-medium cursor-pointer"
                  >
                    Details
                  </button>

                  <button
                    onClick={() => onToggleFavorite(recipe)}
                    type="button"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#86868b] hover:text-[#ff2d55] hover:bg-black/[0.04] transition-colors ml-auto cursor-pointer active:scale-90"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
