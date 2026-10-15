import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Pause,
  Sparkles,
  Check,
  X,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Recipe, RecipeStep, ActiveTimer } from '../types';
import { speechController } from '../utils/speech';

interface VoiceCookingAssistantProps {
  recipe: Recipe;
  onExit: () => void;
  onRecipeCompleted?: () => void;
}

export const VoiceCookingAssistant: React.FC<VoiceCookingAssistantProps> = ({
  recipe,
  onExit,
  onRecipeCompleted,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoReadSteps, setAutoReadSteps] = useState(true);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isListening, setIsListening] = useState(false);
  const [lastHeardCommand, setLastHeardCommand] = useState<string>('');
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Kitchen Timers
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);

  const currentStep: RecipeStep =
    recipe.steps[currentStepIndex] || {
      stepNumber: 1,
      instruction: 'Prepare your workspace and ingredients.',
    };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch {
      // AudioContext fallback
    }
  };

  const speakCurrentStep = (stepText?: string) => {
    const textToSpeak = stepText || `Step ${currentStep.stepNumber}. ${currentStep.instruction}`;
    setIsSpeaking(true);
    speechController.speak(textToSpeak, {
      rate: speechRate,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stopSpeaking = () => {
    speechController.stop();
    setIsSpeaking(false);
  };

  useEffect(() => {
    const supported = speechController.isVoiceSupported();
    setIsVoiceSupported(supported);

    if (supported) {
      speechController.initVoiceRecognition(
        (cmd, transcript) => {
          setLastHeardCommand(`Heard: "${transcript}"`);
          handleVoiceCommand(cmd, transcript);
        },
        (listening) => {
          setIsListening(listening);
        }
      );
    }

    if (autoReadSteps) {
      const timer = setTimeout(() => {
        speakCurrentStep();
      }, 500);
      return () => clearTimeout(timer);
    }

    return () => {
      speechController.stop();
      speechController.stopListening();
    };
  }, []);

  const goToStep = (index: number) => {
    if (index < 0 || index >= recipe.steps.length) return;
    setCurrentStepIndex(index);

    if (autoReadSteps) {
      const targetStep = recipe.steps[index];
      setTimeout(() => {
        speakCurrentStep(`Step ${targetStep.stepNumber}. ${targetStep.instruction}`);
      }, 200);
    }
  };

  const handleVoiceCommand = (cmd: string, transcript: string) => {
    if (cmd === 'next') {
      if (currentStepIndex < recipe.steps.length - 1) {
        goToStep(currentStepIndex + 1);
      } else {
        handleFinishRecipe();
      }
    } else if (cmd === 'back') {
      if (currentStepIndex > 0) {
        goToStep(currentStepIndex - 1);
      }
    } else if (cmd === 'repeat') {
      speakCurrentStep();
    } else if (cmd === 'stop') {
      stopSpeaking();
    } else if (cmd === 'timer') {
      const match = transcript.match(/(\d+)\s*(?:mins?|minutes?)/i);
      const minutes = match ? parseInt(match[1], 10) : 5;
      addTimer(minutes * 60, `${minutes} min timer`);
      speechController.speak(`Starting timer for ${minutes} minutes.`);
    } else if (cmd === 'ingredients') {
      const ingList = recipe.ingredients.slice(0, 5).map((i) => i.name).join(', ');
      speechController.speak(`This recipe uses ${ingList}, and more.`);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers((prev) =>
        prev.map((t) => {
          if (!t.isRunning || t.remainingSeconds <= 0) return t;
          const next = t.remainingSeconds - 1;
          if (next === 0) {
            playBeep();
            speechController.speak(`Timer for ${t.label} is done!`);
          }
          return {
            ...t,
            remainingSeconds: next,
            isRunning: next > 0,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addTimer = (seconds: number, label: string) => {
    const newTimer: ActiveTimer = {
      id: `timer-${Date.now()}`,
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: true,
      stepNumber: currentStep.stepNumber,
    };
    setActiveTimers((prev) => [...prev, newTimer]);
  };

  const removeTimer = (id: string) => {
    setActiveTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTimerRunning = (id: string) => {
    setActiveTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleFinishRecipe = () => {
    setIsCompleted(true);
    stopSpeaking();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    speechController.speak(`Your ${recipe.title} is ready. Enjoy your meal!`);
    onRecipeCompleted?.();
  };

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col justify-between overflow-hidden animate-apple-fade-in select-none">
      {/* Siri Ambient Glow Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-blue-600/15 via-purple-600/10 to-amber-500/15 blur-[100px] animate-siri-glow" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 px-4 py-3 apple-glass-dark border-b border-white/10 flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
          type="button"
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-all cursor-pointer active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        <div className="text-center px-2 min-w-0 max-w-[50%]">
          <p className="text-[11px] font-medium text-white/50 truncate">
            {recipe.title}
          </p>
          <p className="text-xs font-semibold text-white mt-0.5 tabular-nums">
            Step {currentStepIndex + 1} of {recipe.steps.length}
          </p>
        </div>

        {/* Voice Recognition & Audio Controls */}
        <div className="flex items-center gap-2">
          {isVoiceSupported && (
            <button
              onClick={() => {
                if (isListening) {
                  speechController.stopListening();
                } else {
                  speechController.startListening();
                }
              }}
              type="button"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                isListening
                  ? 'bg-[#0071e3] text-white shadow-sm ring-2 ring-[#0071e3]/40 animate-pulse'
                  : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
              }`}
              title="Hands-free voice recognition"
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else {
                speakCurrentStep();
              }
            }}
            type="button"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isSpeaking
                ? 'bg-[#34c759] text-white shadow-sm'
                : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
            }`}
            title="Read step out loud"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 w-full bg-white/10 h-1 shrink-0">
        <div
          className="bg-[#0071e3] h-full transition-all duration-300"
          style={{
            width: `${((currentStepIndex + 1) / recipe.steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Main Instruction Body */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center max-w-xl mx-auto w-full text-center">
        {!isCompleted ? (
          <div className="space-y-6 w-full">
            {/* Step Number Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-white/80 tabular-nums">
              Step {currentStepIndex + 1}
            </div>

            {/* Instruction Headline (Apple San Francisco Display style) */}
            <p className="text-2xl sm:text-3xl font-bold text-white leading-snug tracking-tight px-2">
              {currentStep.instruction}
            </p>

            {/* Chef Tip Card */}
            {currentStep.tip && (
              <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 text-left max-w-md mx-auto flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-white/80 leading-relaxed">
                  <span className="font-semibold text-white">Chef Tip:</span> {currentStep.tip}
                </p>
              </div>
            )}

            {/* Quick Timer trigger button */}
            {currentStep.estimatedMinutes && (
              <div className="pt-1">
                <button
                  onClick={() =>
                    addTimer(
                      currentStep.estimatedMinutes! * 60,
                      `Step ${currentStep.stepNumber} Timer`
                    )
                  }
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 text-[#ffd60a] font-semibold text-xs border border-white/10 transition-all cursor-pointer tabular-nums"
                >
                  <Clock className="w-3.5 h-3.5 text-[#ffd60a]" />
                  <span>Start {currentStep.estimatedMinutes} min Timer</span>
                </button>
              </div>
            )}

            {/* Listening State indicator */}
            {isListening && (
              <div className="text-[11px] text-white/50 flex items-center justify-center gap-2 pt-2">
                <span className="w-2 h-2 rounded-full bg-[#0071e3] animate-ping" />
                <span>
                  {lastHeardCommand ||
                    'Say "Next", "Back", "Repeat", or "Timer 5 min"'}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Finished State */
          <div className="space-y-4 py-6">
            <div className="w-20 h-20 rounded-full bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <Award className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Dish Ready!
            </h2>
            <p className="text-white/70 text-sm max-w-xs mx-auto leading-relaxed">
              You've completed <span className="text-white font-semibold">{recipe.title}</span>. Enjoy your meal!
            </p>
            <div className="pt-4 flex flex-col gap-2.5 w-full max-w-xs mx-auto">
              <button
                onClick={onExit}
                type="button"
                className="w-full py-3.5 px-4 rounded-full bg-white text-[#1d1d1f] font-semibold text-sm shadow-lg hover:bg-stone-100 transition-all cursor-pointer active:scale-95"
              >
                Back to Recipes
              </button>
            </div>
          </div>
        )}

        {/* Apple Watch style Active Timers Dock */}
        {activeTimers.length > 0 && (
          <div className="w-full max-w-md mt-6 space-y-2">
            {activeTimers.map((timer) => (
              <div
                key={timer.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between backdrop-blur-xl transition-all ${
                  timer.remainingSeconds === 0
                    ? 'bg-[#ff3b30]/20 border-[#ff3b30]/40 text-[#ff453a] animate-pulse'
                    : 'bg-white/10 border-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Clock className={`w-4 h-4 ${timer.remainingSeconds === 0 ? 'text-[#ff453a]' : 'text-[#ffd60a]'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-white/70 font-medium">{timer.label}</p>
                    <p className="text-base font-bold font-mono tracking-wider tabular-nums">
                      {timer.remainingSeconds === 0 ? 'TIME IS UP' : formatTimerDisplay(timer.remainingSeconds)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleTimerRunning(timer.id)}
                    type="button"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer active:scale-90"
                  >
                    {timer.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => removeTimer(timer.id)}
                    type="button"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer active:scale-90"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messy-Hands Friendly Action Dock */}
      <div className="relative z-10 p-4 apple-glass-dark border-t border-white/10 shrink-0">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => goToStep(currentStepIndex - 1)}
            disabled={currentStepIndex === 0}
            type="button"
            className="flex-1 py-3.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            onClick={() => speakCurrentStep()}
            type="button"
            className={`py-3.5 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
              isSpeaking
                ? 'bg-[#34c759] text-white shadow-sm'
                : 'bg-white/15 hover:bg-white/20 text-white'
            }`}
            title="Read instruction again"
          >
            <Volume2 className="w-4 h-4" />
            <span>Repeat</span>
          </button>

          {currentStepIndex < recipe.steps.length - 1 ? (
            <button
              onClick={() => goToStep(currentStepIndex + 1)}
              type="button"
              className="flex-1 py-3.5 px-3 rounded-2xl bg-white hover:bg-stone-100 active:scale-95 text-[#1d1d1f] font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinishRecipe}
              type="button"
              className="flex-1 py-3.5 px-3 rounded-2xl bg-[#34c759] hover:bg-[#30b350] active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Finish</span>
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

        {/* Speed & Option Controls */}
        <div className="max-w-lg mx-auto flex items-center justify-between text-white/50 text-xs pt-3 px-1">
          <div className="flex items-center gap-2">
            <span>Voice Speed:</span>
            <button
              onClick={() => setSpeechRate((r) => (r === 1.0 ? 0.8 : r === 0.8 ? 1.2 : 1.0))}
              type="button"
              className="px-2 py-0.5 rounded-full bg-white/10 text-white font-medium hover:bg-white/15 cursor-pointer tabular-nums"
            >
              {speechRate}x
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-white">
            <input
              type="checkbox"
              checked={autoReadSteps}
              onChange={(e) => setAutoReadSteps(e.target.checked)}
              className="rounded bg-white/10 border-white/20 text-[#0071e3] focus:ring-0"
            />
            <span>Auto-read steps</span>
          </label>
        </div>
      </div>
    </div>
  );
};
