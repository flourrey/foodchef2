import React from 'react';
import { Camera, Utensils, Heart, ChefHat, Package, Sparkles } from 'lucide-react';
import { AppTab, AiProvider } from '../types';

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
  aiProvider: AiProvider;
  onSelectAiProvider: (provider: AiProvider) => void;
}> = ({ currentTab, pantryCount, onGoToScanner, aiProvider, onSelectAiProvider }) => {
  return (
    <header className="sticky top-0 z-40 apple-glass border-b border-black/[0.06] transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Apple Wordmark Lockup */}
        <button
          onClick={onGoToScanner}
          type="button"
          className="flex items-center gap-2.5 text-left group transition-opacity active:opacity-70 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-[10px] bg-[#1d1d1f] flex items-center justify-center text-white shadow-xs group-hover:scale-[1.02] transition-transform">
            <ChefHat className="w-4 h-4 text-amber-400 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px] text-[#1d1d1f] tracking-tight leading-none">
              SnapChef
            </span>
            <span className="text-[10px] text-[#86868b] font-medium tracking-normal mt-0.5">
              AI Vision &amp; Cooking Assistant
            </span>
          </div>
        </button>

        {/* Right Status & AI Provider Selector */}
        <div className="flex items-center gap-2">
          {/* iOS Segmented Control for AI Engine: Gemini vs Mistral */}
          <div className="flex items-center p-0.5 rounded-full bg-black/[0.05] border border-black/[0.04]">
            <button
              onClick={() => onSelectAiProvider('gemini')}
              type="button"
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                aiProvider === 'gemini'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
              title="Google Gemini AI (Multimodal Vision & Recipes)"
            >
              Gemini
            </button>
            <button
              onClick={() => onSelectAiProvider('mistral')}
              type="button"
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                aiProvider === 'mistral'
                  ? 'bg-white text-[#1d1d1f] shadow-xs'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
              title="Mistral AI (Pixtral Vision & Mistral Recipes)"
            >
              Mistral
            </button>
          </div>

          {pantryCount > 0 && currentTab !== 'pantry' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.04] text-[#1d1d1f] text-xs font-medium border border-black/[0.04]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
              <span className="tabular-nums font-semibold">{pantryCount}</span>
              <span className="text-[#86868b]">pantry</span>
            </div>
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
  if (currentTab === 'cooking') return null;

  const tabs: { id: AppTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'scanner',
      label: 'Camera',
      icon: <Camera className="w-[21px] h-[21px] stroke-[2]" />,
    },
    {
      id: 'pantry',
      label: 'Pantry',
      icon: <Package className="w-[21px] h-[21px] stroke-[2]" />,
      badge: pantryCount,
    },
    {
      id: 'recipes',
      label: 'Recipes',
      icon: <Utensils className="w-[21px] h-[21px] stroke-[2]" />,
      badge: recipesCount,
    },
    {
      id: 'favorites',
      label: 'Saved',
      icon: <Heart className={`w-[21px] h-[21px] stroke-[2] ${currentTab === 'favorites' && favoritesCount > 0 ? 'fill-current' : ''}`} />,
      badge: favoritesCount,
    },
  ];

  return (
    <nav
      aria-label="App Navigation"
      className="fixed bottom-0 inset-x-0 z-40 apple-glass border-t border-black/[0.07] px-3 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-colors"
    >
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-150 min-h-[44px] cursor-pointer active:scale-95 ${
                isActive ? 'text-[#0071e3]' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {tab.icon}
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#ff3b30] text-white text-[10px] font-bold flex items-center justify-center tabular-nums leading-none shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight leading-none ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Active Cooking Session Indicator */}
        {hasActiveCookingSession && (
          <button
            onClick={onResumeCooking}
            type="button"
            className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl text-[#ff9500] min-h-[44px] cursor-pointer active:scale-95"
          >
            <div className="relative flex items-center justify-center">
              <ChefHat className="w-[21px] h-[21px] stroke-[2.2] animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-[#ff9500] absolute -top-0.5 -right-0.5" />
            </div>
            <span className="text-[10px] font-semibold mt-1 tracking-tight leading-none">
              Cooking
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
