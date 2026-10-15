import React, { useState } from 'react';
import {
  X,
  Heart,
  Play,
  Clock,
  ChefHat,
  Youtube,
  CheckCircle2,
  ExternalLink,
  Users,
  Flame,
} from 'lucide-react';
import { Recipe } from '../types';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
  onStartCooking: (recipe: Recipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onStartCooking,
}) => {
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  if (!isOpen || !recipe) return null;

  const toggleCheck = (name: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-apple-fade-in"
    >
      <div className="bg-[#f5f5f7] w-full max-w-lg rounded-t-[32px] sm:rounded-[28px] max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl relative border border-black/[0.08]">
        {/* iOS Drag Handle */}
        <div className="sm:hidden w-10 h-1 bg-black/20 rounded-full mx-auto my-2.5 shrink-0" />

        {/* Top Header Image Deck */}
        <div className="relative aspect-[16/10] w-full bg-stone-900 shrink-0 overflow-hidden sm:rounded-t-[28px]">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-3.5 left-3.5 w-8 h-8 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Favorite button */}
          <button
            onClick={() => onToggleFavorite(recipe)}
            type="button"
            className={`absolute top-3.5 right-3.5 w-8 h-8 rounded-full backdrop-blur-md transition-all flex items-center justify-center active:scale-90 cursor-pointer ${
              isFavorite
                ? 'bg-[#ff2d55] text-white shadow-xs'
                : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* Title & Metadata over image bottom */}
          <div className="absolute bottom-4 inset-x-4 text-white">
            <div className="flex items-center gap-1.5 text-xs text-white/80 mb-1">
              <span className="font-semibold text-white">{recipe.area}</span>
              <span aria-hidden="true">·</span>
              <span>{recipe.category}</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#34c759] font-semibold tabular-nums">{recipe.matchPercentage}% match</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight text-white tracking-tight">
              {recipe.title}
            </h1>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 space-y-5">
          {/* iOS Grouped Metric Card */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-white border border-black/[0.06] text-center shadow-xs">
            <div>
              <p className="text-[10px] font-semibold text-[#86868b] uppercase">Prep &amp; Cook</p>
              <p className="text-sm font-bold text-[#1d1d1f] mt-0.5 flex items-center justify-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
                {recipe.estimatedTimeMinutes}m
              </p>
            </div>
            <div className="border-x border-black/[0.06]">
              <p className="text-[10px] font-semibold text-[#86868b] uppercase">Difficulty</p>
              <p className="text-sm font-bold text-[#1d1d1f] mt-0.5">
                {recipe.difficulty}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#86868b] uppercase">Servings</p>
              <p className="text-sm font-bold text-[#1d1d1f] mt-0.5 tabular-nums">
                {recipe.servings || 2}
              </p>
            </div>
          </div>

          {/* Ingredients Section (Apple Notes Checklist Style) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
                Ingredients ({recipe.ingredients.length})
              </h2>
              <span className="text-[11px] text-[#86868b]">
                Tap to check off
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] divide-y divide-black/[0.04] overflow-hidden shadow-xs">
              {recipe.ingredients.map((ing, idx) => {
                const isChecked = !!checkedIngredients[ing.name];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(ing.name)}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      isChecked ? 'bg-stone-50/70 text-[#86868b]' : 'hover:bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-[#0071e3] border-[#0071e3] text-white'
                            : 'border-[#d2d2d7] bg-white'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-xs font-medium ${isChecked ? 'line-through text-[#86868b]' : 'text-[#1d1d1f]'}`}>
                        {ing.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1d1d1f] tabular-nums">
                        {ing.measure}
                      </span>
                      {ing.hasIngredient ? (
                        <span className="text-[10px] text-[#34c759] font-medium">
                          In Pantry
                        </span>
                      ) : ing.isStaple ? (
                        <span className="text-[10px] text-[#86868b] font-medium">
                          Staple
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#ff9500] font-medium">
                          Missing
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* YouTube Tutorial Link */}
          {recipe.youtubeUrl && (
            <a
              href={recipe.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-black/[0.06] text-[#1d1d1f] hover:bg-stone-50 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Youtube className="w-4 h-4 text-[#ff3b30]" />
                Watch Video Demonstration
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#86868b]" />
            </a>
          )}

          {/* Step Sequence Overview */}
          <div>
            <h2 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-2">
              Step-by-Step Instructions ({recipe.steps.length})
            </h2>
            <div className="space-y-2">
              {recipe.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-3.5 rounded-2xl bg-white border border-black/[0.06] text-xs flex gap-3 shadow-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-black/[0.05] text-[#1d1d1f] font-semibold flex items-center justify-center shrink-0 text-xs tabular-nums">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1">
                    <p className="text-[#1d1d1f] leading-relaxed">
                      {step.instruction}
                    </p>
                    {step.estimatedMinutes && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-[#86868b] tabular-nums">
                        Approx. {step.estimatedMinutes} minutes
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 apple-glass border-t border-black/[0.06] shrink-0 sticky bottom-0">
          <button
            onClick={() => {
              onClose();
              onStartCooking(recipe);
            }}
            type="button"
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Voice Cooking Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
};
