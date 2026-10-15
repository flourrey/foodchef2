import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Camera,
  Search,
  Sparkles,
  Layers,
  Info,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Ingredient } from '../types';

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
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Produce: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Meat & Seafood': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Dairy & Eggs': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Pantry & Seasonings': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Bakery & Grains': { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  Other: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
};

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
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Identified Ingredients
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {selectedCount} of {ingredients.length} items selected for recipes
          </p>
        </div>

        {ingredients.length > 0 && (
          <button
            onClick={onClearAll}
            type="button"
            className="text-stone-400 hover:text-red-500 text-xs font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Chef Tip & Suggested Cuisines Callout */}
      {(chefTip || (suggestedCuisines && suggestedCuisines.length > 0)) && (
        <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              {chefTip && (
                <p className="text-xs text-stone-800 font-medium leading-relaxed">
                  <span className="font-bold text-amber-900">Chef Note:</span> {chefTip}
                </p>
              )}
              {suggestedCuisines && suggestedCuisines.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] font-semibold text-amber-900 uppercase tracking-wider">
                    Ideal for:
                  </span>
                  {suggestedCuisines.map((c, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-semibold bg-white px-2 py-0.5 rounded-full border border-amber-300 text-amber-900"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Pills Filter */}
      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 mt-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategoryFilter === cat
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Ingredient Items List */}
      <div className="mt-3 space-y-2">
        {filteredIngredients.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-stone-300 p-6">
            <Layers className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h3 className="text-stone-800 font-bold text-sm">No Ingredients Yet</h3>
            <p className="text-stone-500 text-xs mt-1 max-w-xs mx-auto">
              Snap a photo with your mobile camera or type an ingredient manually below.
            </p>
            <button
              onClick={onTakeAnotherPhoto}
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs shadow-md shadow-amber-600/20"
            >
              <Camera className="w-3.5 h-3.5" />
              Take Photo
            </button>
          </div>
        ) : (
          filteredIngredients.map((item) => {
            const catStyle =
              CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'];

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  item.checked
                    ? 'bg-white border-stone-200 shadow-xs'
                    : 'bg-stone-50/70 border-stone-200 opacity-60'
                }`}
              >
                {/* Left: Checkbox & Name */}
                <div
                  className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0"
                  onClick={() => onToggleCheck(item.id)}
                >
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      item.checked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-stone-300 bg-white'
                    }`}
                  >
                    {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-bold text-stone-900 text-sm capitalize truncate ${!item.checked ? 'line-through text-stone-400' : ''}`}>
                        {item.name}
                      </span>
                      {item.state && (
                        <span className="text-[10px] text-stone-600 font-medium bg-stone-100 px-1.5 py-0.5 rounded-md">
                          {item.state}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {item.category}
                      </span>
                      {item.quantity && (
                        <span className="text-[10px] text-stone-600">
                          • {item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(item.id)}
                  className="p-2 text-stone-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors ml-2"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Ingredient Add Bar */}
      <form onSubmit={handleAddSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newIngredientName}
          onChange={(e) => setNewIngredientName(e.target.value)}
          placeholder="Add extra ingredient (e.g., Pasta, Olive Oil)..."
          className="flex-1 bg-white border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
        />
        <button
          type="submit"
          className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-white rounded-2xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </form>

      {/* Multi-photo repetition prompt (Item 4: repeat 1-4 as needed) */}
      <div className="mt-4 pt-3 border-t border-stone-200">
        <button
          onClick={onTakeAnotherPhoto}
          type="button"
          className="w-full py-3 px-4 rounded-2xl border border-dashed border-amber-400 bg-amber-50/60 hover:bg-amber-100/70 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <Camera className="w-4 h-4 text-amber-700" />
          📸 Take Another Photo to Add More Ingredients
        </button>
        <p className="text-[11px] text-stone-600 text-center mt-1">
          Add items from your fridge, spice rack, or pantry shelf.
        </p>
      </div>

      {/* Primary Action Buttons: Find with Claude AI */}
      <div className="mt-5 space-y-2.5">
        <button
          onClick={onFindGeminiRecipes}
          disabled={selectedCount === 0 || isSearchingRecipes}
          type="button"
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-md shadow-orange-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {isSearchingRecipes ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate Recipes with Claude AI ({selectedCount})
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onGenerateCustomRecipe}
          disabled={selectedCount === 0 || isSearchingRecipes}
          type="button"
          className="w-full py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-amber-400 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-stone-800"
        >
          <Sparkles className="w-3.5 h-3.5" />
          ✨ Create Single Custom Dish (Exact Match)
        </button>
      </div>
    </div>
  );
};
