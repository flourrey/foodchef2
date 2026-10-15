import React, { useState } from 'react';
import { X, Sparkles, Check, Wand2, RefreshCw } from 'lucide-react';
import { Recipe } from '../types';
import { PLATING_PRESETS, adjustDishPhotoPresentation } from '../utils/dishPhotos';

interface AdjustDishPhotoModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onPhotoAdjusted: (updatedRecipe: Recipe) => void;
  userIngredients?: string[];
}

export const AdjustDishPhotoModal: React.FC<AdjustDishPhotoModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onPhotoAdjusted,
  userIngredients = [],
}) => {
  if (!isOpen || !recipe) return null;

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    PLATING_PRESETS[0].id
  );
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string>(
    recipe.imageUrl
  );
  const [selectedPlatingName, setSelectedPlatingName] = useState<string>(
    recipe.platingStyle || 'Rustic Bistro'
  );
  const [isAiAdjusting, setIsAiAdjusting] = useState<boolean>(false);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const result = adjustDishPhotoPresentation(recipe.imageUrl, presetId);
    setCurrentPreviewUrl(result.photoUrl);
    setSelectedPlatingName(result.platingStyleName);
  };

  const handleAiAutoAdjust = async () => {
    setIsAiAdjusting(true);
    try {
      const response = await fetch('/api/adjust-dish-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust-dish-photo',
          recipeTitle: recipe.title,
          ingredients: recipe.ingredients.map((i) => i.name),
          pantryIngredients: userIngredients,
          currentPlatingStyle: selectedPlatingName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.adjustedPhotoUrl) {
          setCurrentPreviewUrl(data.adjustedPhotoUrl);
          setSelectedPlatingName(data.platingStyle || 'Pantry Culinary Match');
        }
      }
    } catch (err) {
      console.warn('AI photo adjustment fallback:', err);
    } finally {
      setIsAiAdjusting(false);
    }
  };

  const handleSaveAndApply = () => {
    const updated: Recipe = {
      ...recipe,
      imageUrl: currentPreviewUrl,
      platingStyle: selectedPlatingName,
    };
    onPhotoAdjusted(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Wand2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">
                Adjust Dish Presentation
              </h2>
              <p className="text-stone-400 text-xs">
                Restyle dish photography to reflect your pantry ingredients
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Live Preview Photo */}
          <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-stone-950 border border-stone-800">
            <img
              src={currentPreviewUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Active Style
                </span>
                <p className="text-sm font-bold text-white leading-tight">
                  {selectedPlatingName}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAiAutoAdjust}
                disabled={isAiAdjusting}
                className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-black/80 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isAiAdjusting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>AI Auto-Tune</span>
              </button>
            </div>
          </div>

          {/* Preset Plating Styles */}
          <div>
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2.5">
              Select Plating &amp; Culinary Style
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PLATING_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                        : 'bg-stone-800/60 border-stone-700/60 text-stone-300 hover:border-stone-600'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-stone-900 border border-stone-700">
                      <img
                        src={preset.previewUrl}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold truncate text-white">
                          {preset.name}
                        </h4>
                        {isSelected && (
                          <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-stone-400 line-clamp-2 mt-0.5 leading-snug">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-950/80 border-t border-stone-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndApply}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Apply to Recipe</span>
          </button>
        </div>
      </div>
    </div>
  );
};
