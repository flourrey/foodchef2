import React from 'react';
import { Crown, Sparkles, Check, X, Wand2, Camera, Flame, ChefHat, CheckCircle2 } from 'lucide-react';

interface ChefProModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onTogglePro: () => void;
  targetFeature?: string;
}

export const ChefProModal: React.FC<ChefProModalProps> = ({
  isOpen,
  onClose,
  isPro,
  onTogglePro,
  targetFeature = 'reverse-engineer',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-stone-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-[90vh]">
        {/* Decorative Top Gradient */}
        <div className="h-28 bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 p-6 flex items-start justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-8 opacity-20 pointer-events-none">
            <Crown className="w-36 h-36 text-white" />
          </div>

          <div className="flex items-center gap-2 z-10">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-amber-200">
              <Crown className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">
                Exclusive Tier
              </span>
              <h2 className="text-xl font-black text-white leading-tight">
                SnapChef Pro
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Target Feature Spotlight */}
          {targetFeature === 'reverse-engineer' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Wand2 className="w-3.5 h-3.5" />
                <span>Premium Feature Highlight</span>
              </div>
              <h3 className="font-extrabold text-sm text-stone-100">
                Reverse-Engineer Food Recipe from Photo
              </h3>
              <p className="text-stone-300 text-xs mt-1 leading-relaxed">
                Snap any plated meal or dish at a restaurant or friend's table. Claude AI deconstructs hidden seasonings, secret sauces, pantry matches, and builds a restaurant-quality recipe.
              </p>
            </div>
          )}

          {targetFeature === 'adjust-photo' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Premium Feature Highlight</span>
              </div>
              <h3 className="font-extrabold text-sm text-stone-100">
                Culinary Dish Photo &amp; Plating Adjustments
              </h3>
              <p className="text-stone-300 text-xs mt-1 leading-relaxed">
                Customize your recipe presentation with Michelin Star Minimalist, Rustic Bistro, or Artisan Cafe plating styles reflecting your pantry ingredients.
              </p>
            </div>
          )}

          {/* Perks list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Everything in SnapChef Pro
            </h4>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-200">
                  AI Dish Recipe Deconstruction
                </p>
                <p className="text-[11px] text-stone-400">
                  Detect flavors, secret seasonings, cooking techniques &amp; pantry matches.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-200">
                  Dynamic Dish Photo Adjustment
                </p>
                <p className="text-[11px] text-stone-400">
                  Adjust presentation &amp; plating imagery tailored to your pantry ingredients.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-200">
                  Voice Cooking Assistant
                </p>
                <p className="text-[11px] text-stone-400">
                  Step-by-step hands-free voice guidance and multiple countdown timers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-200">
                  Unlimited Camera AI Scans &amp; High-Res Photo Uploads
                </p>
                <p className="text-[11px] text-stone-400">
                  Instant HEIC conversion, zoom controls, and multi-lens camera switching.
                </p>
              </div>
            </div>
          </div>

          {/* Current Pro Status Badge */}
          <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  isPro
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-700 text-stone-400'
                }`}
              >
                {isPro ? <CheckCircle2 className="w-4 h-4 stroke-[2.5]" /> : <Crown className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-stone-200">
                  Status: {isPro ? 'Chef Pro Active' : 'Free Standard Tier'}
                </p>
                <p className="text-[11px] text-stone-400">
                  {isPro
                    ? 'All premium reverse-engineering features are unlocked.'
                    : 'Unlock reverse recipe and dynamic dish photos.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-stone-950/80 border-t border-stone-800 flex flex-col gap-2.5">
          <button
            onClick={() => {
              onTogglePro();
            }}
            type="button"
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
              isPro
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 shadow-orange-500/20 active:scale-[0.98]'
            }`}
          >
            {isPro ? (
              <>
                <span>Disable Pro (Test Free Tier)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Activate Chef Pro Pass (Free Demo Access)</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            type="button"
            className="w-full py-2 text-stone-400 hover:text-stone-200 text-xs font-semibold transition-colors"
          >
            {isPro ? 'Done & Return to App' : 'Maybe Later'}
          </button>
        </div>
      </div>
    </div>
  );
};
