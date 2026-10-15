import React from 'react';
import { Camera, UtensilsCrossed, Heart, ChefHat, Layers, Crown, Sparkles } from 'lucide-react';
import { AppTab } from '../types';

interface NavigationProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  pantryCount: number;
  recipesCount: number;
  favoritesCount: number;
  hasActiveCookingSession: boolean;
  onResumeCooking: () => void;
}

export const TopBar: React.FC<{
  currentTab: AppTab;
  pantryCount: number;
  onGoToScanner: () => void;
  isPro?: boolean;
  onOpenProModal?: () => void;
}> = ({ currentTab, pantryCount, onGoToScanner, isPro = false, onOpenProModal }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div
          onClick={onGoToScanner}
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <ChefHat className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-stone-900 text-base tracking-tight block leading-tight font-serif">
              SnapChef
            </span>
            <span className="text-[10px] text-amber-700 font-semibold tracking-wider uppercase block">
              AI Vision &amp; Voice Cook
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chef Pro / Premium Badge or Button */}
          {onOpenProModal && (
            <button
              onClick={onOpenProModal}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isPro
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black shadow-amber-500/25 ring-2 ring-amber-400/40'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
              }`}
              title="Chef Pro Premium Features"
            >
              <Crown className={`w-3.5 h-3.5 ${isPro ? 'text-stone-950' : 'text-amber-600'}`} />
              <span>{isPro ? 'Chef Pro' : 'Try Pro'}</span>
            </button>
          )}

          {pantryCount > 0 && currentTab !== 'pantry' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {pantryCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export const BottomTabBar: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  pantryCount,
  recipesCount,
  favoritesCount,
  hasActiveCookingSession,
  onResumeCooking,
}) => {
  // If in active fullscreen cooking mode, the assistant has its own footer
  if (currentTab === 'cooking') return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200 px-3 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div className="max-w-lg mx-auto flex items-center justify-around relative">
        {/* 1. Pantry */}
        <button
          onClick={() => onTabChange('pantry')}
          type="button"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all relative cursor-pointer ${
            currentTab === 'pantry'
              ? 'text-amber-600 font-bold scale-105'
              : 'text-stone-500 hover:text-stone-800 font-medium'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 mb-0.5" />
            {pantryCount > 0 && (
              <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                {pantryCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Pantry</span>
        </button>

        {/* 2. Recipes */}
        <button
          onClick={() => onTabChange('recipes')}
          type="button"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all relative cursor-pointer ${
            currentTab === 'recipes'
              ? 'text-amber-600 font-bold scale-105'
              : 'text-stone-500 hover:text-stone-800 font-medium'
          }`}
        >
          <div className="relative">
            <UtensilsCrossed className="w-5 h-5 mb-0.5" />
            {recipesCount > 0 && (
              <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                {recipesCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Recipes</span>
        </button>

        {/* 3. HERO CENTER CAMERA BUTTON: Auto-opens camera */}
        <div className="relative -top-3">
          <button
            onClick={() => onTabChange('scanner')}
            type="button"
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-white shadow-xl shadow-amber-500/30 transition-all active:scale-95 border-2 border-white cursor-pointer ${
              currentTab === 'scanner'
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 ring-4 ring-amber-400/30 scale-105'
                : 'bg-gradient-to-tr from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
            }`}
            title="Open Camera"
          >
            <Camera className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>

        {/* 4. Favorites */}
        <button
          onClick={() => onTabChange('favorites')}
          type="button"
          className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all relative cursor-pointer ${
            currentTab === 'favorites'
              ? 'text-rose-500 font-bold scale-105'
              : 'text-stone-500 hover:text-stone-800 font-medium'
          }`}
        >
          <div className="relative">
            <Heart
              className={`w-5 h-5 mb-0.5 ${
                favoritesCount > 0 && currentTab === 'favorites' ? 'fill-current' : ''
              }`}
            />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Favorites</span>
        </button>

        {/* 5. Active Cooking Session */}
        {hasActiveCookingSession && (
          <button
            onClick={onResumeCooking}
            type="button"
            className="flex flex-col items-center py-1 px-3 rounded-2xl text-amber-600 font-extrabold animate-pulse cursor-pointer"
          >
            <ChefHat className="w-5 h-5 mb-0.5 text-amber-600" />
            <span className="text-[10px]">Cooking</span>
          </button>
        )}
      </div>
    </div>
  );
};
