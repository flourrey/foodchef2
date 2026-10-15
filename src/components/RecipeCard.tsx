import React from 'react';
import { Heart, Clock, ChefHat, Play, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
  onAdjustPhoto?: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  isFavorite,
  onToggleFavorite,
  onSelectRecipe,
  onStartCooking,
  onAdjustPhoto,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group">
      {/* Top Image Banner */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-stone-100 cursor-pointer" onClick={() => onSelectRecipe(recipe)}>
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe);
          }}
          type="button"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
            isFavorite
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              : 'bg-black/40 text-white hover:bg-black/60'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Adjust Photo Button */}
        {onAdjustPhoto && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdjustPhoto(recipe);
            }}
            type="button"
            className="absolute top-3 right-14 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all active:scale-90 cursor-pointer"
            title="Adjust dish photo"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
          </button>
        )}

        {/* Source Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {recipe.isReverseEngineered ? (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 backdrop-blur-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-stone-950" />
              Chef Pro Reverse Recipe
            </span>
          ) : (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/90 text-stone-900 backdrop-blur-md shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-600" />
              Claude AI Chef
            </span>
          )}
        </div>

        {/* Match Percentage Pill */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold shadow-sm backdrop-blur-md ${
            recipe.matchPercentage >= 75
              ? 'bg-emerald-600/90 text-white'
              : recipe.matchPercentage >= 50
              ? 'bg-amber-600/90 text-white'
              : 'bg-stone-800/90 text-white'
          }`}>
            <CheckCircle2 className="w-3 h-3" />
            {recipe.matchPercentage}% Match
          </span>

          <span className="text-[11px] text-white/90 font-medium bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
            {recipe.matchedCount}/{recipe.totalIngredients} items
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Tags / Cuisine */}
          <div className="flex items-center gap-2 text-stone-500 text-xs mb-1.5 flex-wrap">
            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              {recipe.area}
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-stone-600 font-medium">
              {recipe.category}
            </span>
            <span className="text-stone-300">•</span>
            <span className="flex items-center gap-1 text-stone-500">
              <Clock className="w-3 h-3" />
              {recipe.estimatedTimeMinutes}m
            </span>
          </div>

          {/* Title */}
          <h2
            onClick={() => onSelectRecipe(recipe)}
            className="font-extrabold text-stone-900 text-base leading-snug line-clamp-1 hover:text-amber-600 cursor-pointer transition-colors"
          >
            {recipe.title}
          </h2>

          {/* Ingredient Preview */}
          <div className="mt-2.5 flex flex-wrap gap-1">
            {recipe.ingredients.slice(0, 4).map((ing, i) => (
              <span
                key={i}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                  ing.hasIngredient
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {ing.hasIngredient ? '✓ ' : ''}{ing.name}
              </span>
            ))}
            {recipe.ingredients.length > 4 && (
              <span className="text-[10px] text-stone-400 font-medium self-center pl-1">
                +{recipe.ingredients.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-stone-100">
          <button
            onClick={() => onSelectRecipe(recipe)}
            type="button"
            className="py-2.5 px-3 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors"
          >
            View Recipe
          </button>

          <button
            onClick={() => onStartCooking(recipe)}
            type="button"
            className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-extrabold shadow-sm shadow-amber-600/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Voice Cook
          </button>
        </div>
      </div>
    </div>
  );
};
