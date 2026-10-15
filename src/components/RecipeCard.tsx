import React from 'react';
import { Heart, Clock, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  isFavorite,
  onToggleFavorite,
  onSelectRecipe,
  onStartCooking,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group">
      {/* Editorial Image Deck */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100 cursor-pointer"
        onClick={() => onSelectRecipe(recipe)}
      >
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe);
          }}
          type="button"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
            isFavorite
              ? 'bg-[#ff2d55] text-white shadow-sm'
              : 'bg-black/40 text-white hover:bg-black/60'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Source Badge (Translucent Glass) */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {recipe.source || 'AI Chef'}
          </span>
        </div>

        {/* Match Percentage Indicator */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/90 text-[#1d1d1f] backdrop-blur-md shadow-xs tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759]" />
            {recipe.matchPercentage}% Match
          </span>
          <span className="text-[11px] text-white/90 font-medium tabular-nums drop-shadow-xs">
            {recipe.matchedCount}/{recipe.totalIngredients} items
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata Line with Middots */}
          <div className="flex items-center gap-1.5 text-xs text-[#86868b] mb-1">
            <span className="font-medium text-[#1d1d1f]">{recipe.area}</span>
            <span aria-hidden="true">·</span>
            <span>{recipe.category}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" />
              {recipe.estimatedTimeMinutes}m
            </span>
          </div>

          {/* Title */}
          <h2
            onClick={() => onSelectRecipe(recipe)}
            className="font-bold text-[16px] text-[#1d1d1f] leading-snug line-clamp-1 group-hover:text-[#0071e3] cursor-pointer transition-colors"
          >
            {recipe.title}
          </h2>

          {/* Clean Ingredient Inline Preview */}
          <p className="text-xs text-[#86868b] mt-1.5 line-clamp-1">
            {recipe.ingredients.slice(0, 4).map((ing, i) => (
              <span key={i} className={ing.hasIngredient ? 'text-[#1d1d1f] font-medium' : ''}>
                {ing.name}{i < Math.min(3, recipe.ingredients.length - 1) ? ', ' : ''}
              </span>
            ))}
            {recipe.ingredients.length > 4 && (
              <span className="text-[#86868b]"> +{recipe.ingredients.length - 4} more</span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-black/[0.05]">
          <button
            onClick={() => onSelectRecipe(recipe)}
            type="button"
            className="py-2 px-3 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            Details
          </button>

          <button
            onClick={() => onStartCooking(recipe)}
            type="button"
            className="py-2 px-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            Voice Cook
          </button>
        </div>
      </div>
    </div>
  );
};
