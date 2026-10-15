// Speech Synthesis & Recognition Manager

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

class SpeechController {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  // Speak text using Web Speech API
  public speak(text: string, options: SpeechOptions = {}): boolean {
    if (!this.synth) return false;

    // Cancel any ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    // Pick a natural, expressive voice if available
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Karen') ||
          v.name.includes('Daniel'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      options.onStart?.();
    };

    utterance.onend = () => {
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      // Ignore user-cancelled interruptions
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('Speech error:', e);
        options.onError?.(e);
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return true;
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return !!this.synth && this.synth.speaking;
  }

  // Voice Command Recognition for hands-free cooking
  public initVoiceRecognition(
    onCommand: (command: string, rawText: string) => void,
    onStatusChange?: (listening: boolean) => void
  ): boolean {
    if (typeof window === 'undefined') return false;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('SpeechRecognition API is not supported in this browser environment');
      return false;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        onStatusChange?.(true);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onStatusChange?.(false);
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Voice recognition error:', event.error);
        }
      };

      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        console.log('Spoken transcript:', transcript);

        // Command parsing
        if (
          transcript.includes('next') ||
          transcript.includes('continue') ||
          transcript.includes('forward')
        ) {
          onCommand('next', transcript);
        } else if (
          transcript.includes('back') ||
          transcript.includes('previous') ||
          transcript.includes('last step')
        ) {
          onCommand('back', transcript);
        } else if (
          transcript.includes('repeat') ||
          transcript.includes('again') ||
          transcript.includes('say that') ||
          transcript.includes('read again')
        ) {
          onCommand('repeat', transcript);
        } else if (transcript.includes('timer') || transcript.includes('minute')) {
          onCommand('timer', transcript);
        } else if (transcript.includes('ingredient')) {
          onCommand('ingredients', transcript);
        } else if (transcript.includes('stop') || transcript.includes('pause')) {
          onCommand('stop', transcript);
        }
      };

      return true;
    } catch (e) {
      console.warn('Failed to initialize speech recognition:', e);
      return false;
    }
  }

  public startListening(): boolean {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        return true;
      } catch (err) {
        console.warn('Error starting speech recognition:', err);
      }
    }
    return false;
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Error stopping speech recognition:', err);
      }
    }
  }

  public isVoiceSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }
}

export const speechController = new SpeechController();
