import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Camera,
  Sparkles,
  Layers,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Ingredient, AiProvider } from '../types';

interface IngredientReviewProps {
  ingredients: Ingredient[];
  onToggleCheck: (id: string) => void;
  onRemoveIngredient: (id: string) => void;
  onAddIngredient: (name: string, category?: string) => void;
  onClearAll: () => void;
  onTakeAnotherPhoto: () => void;
  onFindGeminiRecipes: () => void;
  onGenerateCustomRecipe: () => void;
  chefTip?: string;
  suggestedCuisines?: string[];
  isSearchingRecipes: boolean;
  aiProvider?: AiProvider;
}

export const IngredientReview: React.FC<IngredientReviewProps> = ({
  ingredients,
  onToggleCheck,
  onRemoveIngredient,
  onAddIngredient,
  onClearAll,
  onTakeAnotherPhoto,
  onFindGeminiRecipes,
  onGenerateCustomRecipe,
  chefTip,
  suggestedCuisines,
  isSearchingRecipes,
  aiProvider = 'gemini',
}) => {
  const [newIngredientName, setNewIngredientName] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  const selectedCount = ingredients.filter((i) => i.checked).length;
  const categories = ['All', ...Array.from(new Set(ingredients.map((i) => i.category || 'Other')))];

  const filteredIngredients =
    selectedCategoryFilter === 'All'
      ? ingredients
      : ingredients.filter((i) => (i.category || 'Other') === selectedCategoryFilter);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientName.trim()) return;
    onAddIngredient(newIngredientName.trim(), 'Other');
    setNewIngredientName('');
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-28 pt-2">
      {/* Apple Large Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
            Pantry List
          </h1>
          <p className="text-xs text-[#86868b] mt-0.5">
            <span className="font-semibold text-[#1d1d1f] tabular-nums">{selectedCount}</span> of {ingredients.length} items selected
          </p>
        </div>

        {ingredients.length > 0 && (
          <button
            onClick={onClearAll}
            type="button"
            className="text-[#86868b] hover:text-[#ff3b30] text-xs font-medium transition-colors px-2.5 py-1 rounded-lg hover:bg-black/[0.04] cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Chef Note Card (Apple Intelligence aesthetic) */}
      {(chefTip || (suggestedCuisines && suggestedCuisines.length > 0)) && (
        <div className="mt-3.5 p-4 rounded-2xl bg-white border border-black/[0.06] shadow-xs relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              {chefTip && (
                <p className="text-xs text-[#1d1d1f] leading-relaxed">
                  <span className="font-semibold">Chef Tip:</span> {chefTip}
                </p>
              )}
              {suggestedCuisines && suggestedCuisines.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2 text-xs text-[#86868b]">
                  <span className="font-medium text-[#1d1d1f]">Suggested styles:</span>
                  {suggestedCuisines.map((c, idx) => (
                    <React.Fragment key={c}>
                      <span className="text-[#1d1d1f] font-medium">{c}</span>
                      {idx < suggestedCuisines.length - 1 && <span className="text-[#d2d2d7]">·</span>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS Segmented Category Control */}
      {categories.length > 2 && (
        <div className="flex items-center gap-1 p-1 bg-black/[0.05] rounded-xl mt-3 overflow-x-auto scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Grouped Inset List (Apple Reminders / Health style) */}
      <div className="mt-3.5">
        {filteredIngredients.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xs">
            <Layers className="w-9 h-9 text-[#86868b] mx-auto mb-2 opacity-40" />
            <h3 className="text-[#1d1d1f] font-semibold text-sm">Pantry Empty</h3>
            <p className="text-[#86868b] text-xs mt-1 max-w-xs mx-auto">
              Snap a photo with your camera or add an ingredient manually.
            </p>
            <button
              onClick={onTakeAnotherPhoto}
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0071e3] text-white font-medium text-xs shadow-xs hover:bg-[#0077ed] active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              Open Camera
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/[0.06] shadow-xs divide-y divide-black/[0.04] overflow-hidden">
            {filteredIngredients.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-stone-50/60"
              >
                {/* Left: Apple Reminders circular checkbox & text */}
                <div
                  className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
                  onClick={() => onToggleCheck(item.id)}
                >
                  <div
                    className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                      item.checked
                        ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-xs'
                        : 'border-[#d2d2d7] bg-white hover:border-[#86868b]'
                    }`}
                  >
                    {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`font-semibold text-[14px] text-[#1d1d1f] truncate ${
                        !item.checked ? 'line-through text-[#86868b]' : ''
                      }`}
                    >
                      {item.name}
                    </p>
                    {/* Unboxed metadata with middots per design discipline */}
                    <div className="flex items-center gap-1.5 text-xs text-[#86868b] mt-0.5">
                      <span>{item.category}</span>
                      {item.state && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.state}</span>
                        </>
                      )}
                      {item.quantity && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{item.quantity}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(item.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868b] hover:text-[#ff3b30] hover:bg-black/[0.04] transition-colors ml-2 cursor-pointer active:scale-90"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Ingredient Input (Apple Search/Input style) */}
      <form onSubmit={handleAddSubmit} className="mt-3.5 flex gap-2">
        <input
          type="text"
          value={newIngredientName}
          onChange={(e) => setNewIngredientName(e.target.value)}
          placeholder="Add extra ingredient (e.g., Garlic, Olive Oil)..."
          className="flex-1 bg-white border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] shadow-xs"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-[#1d1d1f] hover:bg-black active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </form>

      {/* Add more photo button */}
      <button
        onClick={onTakeAnotherPhoto}
        type="button"
        className="mt-3 w-full py-2.5 px-4 rounded-xl border border-black/[0.08] bg-white hover:bg-stone-50 text-[#1d1d1f] font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-xs"
      >
        <Camera className="w-3.5 h-3.5 text-[#0071e3]" />
        <span>Snap Another Photo</span>
      </button>

      {/* Primary Action Buttons: Apple Blue & Onyx Buttons */}
      <div className="mt-5 space-y-2.5">
        <button
          onClick={onFindGeminiRecipes}
          disabled={selectedCount === 0 || isSearchingRecipes}
          type="button"
          className="w-full py-3.5 px-4 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
        >
          {isSearchingRecipes ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>Find Recipes with {aiProvider === 'mistral' ? 'Mistral AI' : 'Gemini AI'} ({selectedCount})</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onGenerateCustomRecipe}
          disabled={selectedCount === 0 || isSearchingRecipes}
          type="button"
          className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-stone-50 active:scale-[0.98] text-[#1d1d1f] font-semibold text-xs border border-black/[0.08] shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Generate Custom {aiProvider === 'mistral' ? 'Mistral' : 'Gemini'} Dish</span>
        </button>
      </div>
    </div>
  );
};
