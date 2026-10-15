import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Sliders,
  Key,
  Layers,
  ChevronRight,
  Info,
  Check,
} from 'lucide-react';
import { SAMPLE_INGREDIENT_SCENARIOS, SampleItem } from '../utils/samples';
import { AiProvider } from '../types';

interface CameraScannerProps {
  onIngredientsDetected: (data: {
    ingredients: any[];
    suggestedCuisines?: string[];
    chefTip?: string;
    photoUrl?: string;
  }) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  onViewPantry: () => void;
  pantryCount: number;
  autoStart?: boolean;
  aiProvider?: AiProvider;
  onSelectAiProvider?: (provider: AiProvider) => void;
}

interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  isMain: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onIngredientsDetected,
  isAnalyzing,
  setIsAnalyzing,
  onViewPantry,
  pantryCount,
  autoStart = false,
  aiProvider = 'gemini',
  onSelectAiProvider,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Multi-camera devices list and selected main camera
  const [availableBackCameras, setAvailableBackCameras] = useState<CameraDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [currentCameraLabel, setCurrentCameraLabel] = useState<string>('1x Main');

  // AI API Key Status
  const [keyStatus, setKeyStatus] = useState<{
    configured: boolean;
    status: string;
    message: string;
    provider?: string;
    keySource?: string;
    maskedKey?: string;
  } | null>(null);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(false);

  // Camera Zoom state (1.0x to 4.0x)
  const [zoom, setZoom] = useState<number>(1.0);
  const [minZoom, setMinZoom] = useState<number>(1.0);
  const [maxZoom, setMaxZoom] = useState<number>(4.0);
  const [hasHardwareZoom, setHasHardwareZoom] = useState<boolean>(false);
  const [showZoomSlider, setShowZoomSlider] = useState<boolean>(false);
  const [isPinching, setIsPinching] = useState<boolean>(false);

  // Pinch-to-zoom tracking refs
  const touchStartDistanceRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  // Check Active AI Provider Key Status
  const checkKeyStatus = async () => {
    setIsCheckingKey(true);
    try {
      const endpoint = aiProvider === 'mistral' ? '/api/mistral.ts?action=status' : '/api/gemini.ts?action=status';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setKeyStatus(data);
      } else {
        setKeyStatus({
          configured: false,
          status: 'error',
          provider: aiProvider === 'mistral' ? 'Mistral AI' : 'Gemini AI',
          message: `Could not connect to ${aiProvider === 'mistral' ? 'Mistral' : 'Gemini'} backend.`,
        });
      }
    } catch {
      setKeyStatus({
        configured: false,
        status: 'offline',
        provider: aiProvider === 'mistral' ? 'Mistral AI' : 'Gemini AI',
        message: 'Could not reach server to verify API key.',
      });
    } finally {
      setIsCheckingKey(false);
    }
  };

  useEffect(() => {
    checkKeyStatus();
  }, [aiProvider]);

  // Auto-open main camera when camera tab is active
  useEffect(() => {
    if (autoStart && !cameraActive && !previewImage && !cameraError) {
      startCamera('environment');
    }
  }, [autoStart]);

  // Helper to discover cameras
  const discoverCameras = async (): Promise<CameraDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      const backCameras: CameraDeviceInfo[] = videoDevices
        .filter((d) => {
          const l = d.label.toLowerCase();
          return (
            l.includes('back') ||
            l.includes('rear') ||
            l.includes('environment') ||
            l.includes('0') ||
            l.includes('wide') ||
            (!l.includes('front') && !l.includes('user') && !l.includes('selfie'))
          );
        })
        .map((d) => {
          const l = d.label.toLowerCase();
          const isTelephotoOrMacro =
            l.includes('telephoto') ||
            l.includes('macro') ||
            l.includes('depth') ||
            l.includes('virtual') ||
            l.includes('zoom');
          const isMain =
            !isTelephotoOrMacro &&
            (l.includes('0') ||
              l.includes('main') ||
              l.includes('wide') ||
              l.includes('primary') ||
              l.includes('standard'));

          let cleanLabel = d.label || 'Back Camera';
          if (isMain) cleanLabel = '1x Main Wide';
          else if (l.includes('ultra')) cleanLabel = '0.5x Ultra Wide';
          else if (l.includes('tele')) cleanLabel = '2x Telephoto';

          return {
            deviceId: d.deviceId,
            label: cleanLabel,
            isMain,
          };
        });

      backCameras.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
      setAvailableBackCameras(backCameras);
      return backCameras;
    } catch (err) {
      console.warn('Could not enumerate cameras:', err);
      return [];
    }
  };

  const applyZoom = async (targetZoom: number, activeStream?: MediaStream | null) => {
    const clampedZoom = Math.min(Math.max(targetZoom, minZoom), maxZoom);
    setZoom(clampedZoom);

    const s = activeStream !== undefined ? activeStream : stream;
    if (s) {
      const track = s.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
          if (capabilities && 'zoom' in capabilities) {
            await (track as any).applyConstraints({
              advanced: [{ zoom: clampedZoom }],
            });
            setHasHardwareZoom(true);
          }
        } catch {
          // Digital fallback handles magnification
        }
      }
    }
  };

  // Two-Finger Pinch-to-Zoom Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistanceRef.current = dist;
      touchStartZoomRef.current = zoom;
      setIsPinching(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / touchStartDistanceRef.current;
      const targetZoom = Math.min(
        Math.max(touchStartZoomRef.current * scaleFactor, minZoom),
        maxZoom
      );
      applyZoom(parseFloat(targetZoom.toFixed(1)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchStartDistanceRef.current = null;
      setIsPinching(false);
    }
  };

  const startCamera = async (
    mode: 'environment' | 'user' = facingMode,
    targetDeviceId?: string
  ) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      let chosenDeviceId = targetDeviceId || selectedCameraId;
      if (mode === 'environment' && !chosenDeviceId) {
        const foundCameras = await discoverCameras();
        if (foundCameras.length > 0) {
          chosenDeviceId = foundCameras[0].deviceId;
          setSelectedCameraId(chosenDeviceId);
          setCurrentCameraLabel(foundCameras[0].label);
        }
      }

      const videoConstraints: MediaTrackConstraints = chosenDeviceId
        ? {
            deviceId: { exact: chosenDeviceId },
            aspectRatio: { ideal: 0.75 },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          }
        : {
            facingMode: { ideal: mode },
            aspectRatio: { ideal: 0.75 },
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          };

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      setStream(mediaStream);

      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        if (track.label) {
          setCurrentCameraLabel(track.label.includes('front') ? 'Front' : '1x Wide');
        }

        if (track.getCapabilities) {
          const capabilities = track.getCapabilities() as any;
          if (capabilities && capabilities.zoom) {
            const minZ = capabilities.zoom.min || 1.0;
            const maxZ = capabilities.zoom.max || 4.0;
            setMinZoom(minZ);
            setMaxZoom(maxZ);
            setHasHardwareZoom(true);

            try {
              await (track as any).applyConstraints({
                advanced: [{ zoom: minZ }],
              });
            } catch {
              // ignore
            }
          }
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setFacingMode(mode);
      setZoom(1.0);
      discoverCameras();
    } catch (err: any) {
      console.warn('Camera access error:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        setCameraActive(true);
        setFacingMode(mode);
        setZoom(1.0);
      } catch (fallbackErr: any) {
        setCameraError(
          'Camera access not granted. You can select a photo from your library or try a sample.'
        );
        setCameraActive(false);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setZoom(1.0);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setSelectedCameraId('');
    startCamera(nextMode);
  };

  const handleSwitchLens = (deviceId: string, label: string) => {
    setSelectedCameraId(deviceId);
    setCurrentCameraLabel(label);
    startCamera('environment', deviceId);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;

    const maxDim = 1280;
    let targetW = width;
    let targetH = height;
    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (hasHardwareZoom) {
      ctx.drawImage(video, 0, 0, targetW, targetH);
    } else if (zoom > 1.0) {
      const cropW = width / zoom;
      const cropH = height / zoom;
      const cropX = (width - cropW) / 2;
      const cropY = (height - cropH) / 2;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
    } else {
      ctx.drawImage(video, 0, 0, targetW, targetH);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    stopCamera();
    setPreviewImage(dataUrl);
    analyzeImage(dataUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const originalDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxDim = 1280;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewImage(compressed);
          stopCamera();
          analyzeImage(compressed);
        } else {
          setPreviewImage(originalDataUrl);
          stopCamera();
          analyzeImage(originalDataUrl);
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    const providerName = aiProvider === 'mistral' ? 'Mistral AI (Pixtral Vision)' : 'Gemini AI';
    setStatusMessage(`Analyzing food ingredients with ${providerName}...`);

    try {
      const payload = {
        action: 'identify',
        imageBase64: base64Image,
        mimeType: base64Image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
      };

      const endpoint = aiProvider === 'mistral' ? '/api/mistral.ts' : '/api/gemini.ts';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMessage = errorData.error || `Server error: ${response.status}`;
        
        // If Mistral key is missing, offer quick fallback to Gemini
        if (aiProvider === 'mistral' && (errMessage.includes('MISTRAL_API_KEY') || response.status === 500)) {
          if (confirm('Mistral AI requires MISTRAL_API_KEY in your environment (.env). Would you like to analyze this photo using Gemini AI instead?')) {
            onSelectAiProvider?.('gemini');
            const fallbackRes = await fetch('/api/gemini.ts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              onIngredientsDetected({
                ingredients: fallbackData.ingredients || [],
                suggestedCuisines: fallbackData.suggestedCuisines,
                chefTip: fallbackData.chefTip,
                photoUrl: base64Image,
              });
              return;
            }
          }
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      onIngredientsDetected({
        ingredients: data.ingredients || [],
        suggestedCuisines: data.suggestedCuisines,
        chefTip: data.chefTip,
        photoUrl: base64Image,
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      alert(`Ingredient recognition: ${err.message || 'Please try another photo'}`);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  const handleSelectSample = async (sample: SampleItem) => {
    setIsAnalyzing(true);
    setStatusMessage(`Loading ${sample.title}...`);
    try {
      const res = await fetch(sample.imageUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewImage(base64);
        analyzeImage(base64);
      };
      reader.readAsDataURL(blob);
    } catch {
      const mockItems = sample.mockIngredients.map((name, i) => ({
        id: `mock-${Date.now()}-${i}`,
        name,
        category: 'Produce',
        confidence: 'high' as const,
        state: 'Fresh',
        quantity: 'Available',
        checked: true,
      }));
      onIngredientsDetected({
        ingredients: mockItems,
        suggestedCuisines: ['Comfort Food', 'Mediterranean'],
        chefTip: 'Fresh ingredients deliver the brightest flavors.',
        photoUrl: sample.imageUrl,
      });
      setIsAnalyzing(false);
    }
  };

  const zoomPresets = [1.0, 1.5, 2.0, 3.0];

  return (
    <div className="w-full max-w-lg mx-auto pb-24 pt-2">
      {/* Apple-style Key Status Pill */}
      <div className="px-4 mb-3">
        {keyStatus?.configured ? (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-black/[0.03] border border-black/[0.05] text-[#1d1d1f] text-[11px]">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
              <span>{aiProvider === 'mistral' ? 'Mistral AI (Pixtral 12B) Connected' : 'Gemini AI Connected'}</span>
            </div>
            <span className="text-[#86868b] font-mono text-[10px]">
              {keyStatus.keySource || (aiProvider === 'mistral' ? 'MISTRAL_API_KEY' : 'GEMINI_KEY')}
            </span>
          </div>
        ) : keyStatus && !keyStatus.configured ? (
          <div className="p-3 rounded-2xl bg-[#ff9500]/10 border border-[#ff9500]/20 text-[#1d1d1f] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2">
              <Key className="w-4 h-4 text-[#ff9500] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{aiProvider === 'mistral' ? 'Mistral AI API Key Needed' : 'Gemini API Key Missing'}</span>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  {aiProvider === 'mistral' 
                    ? 'Add MISTRAL_API_KEY to your .env file to enable Mistral AI & Pixtral vision.' 
                    : (keyStatus.message || 'Gemini API Key missing in environment.')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {aiProvider === 'mistral' && (
                <button
                  onClick={() => onSelectAiProvider?.('gemini')}
                  type="button"
                  className="px-2.5 py-1 rounded-full bg-white text-[#1d1d1f] border border-black/[0.08] font-medium text-[11px] hover:bg-stone-50 active:scale-95 transition-transform cursor-pointer"
                >
                  Use Gemini
                </button>
              )}
              <button
                onClick={checkKeyStatus}
                disabled={isCheckingKey}
                type="button"
                className="px-2.5 py-1 rounded-full bg-[#1d1d1f] text-white font-medium text-[11px] active:scale-95 transition-transform cursor-pointer"
              >
                {isCheckingKey ? 'Checking...' : 'Check'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Apple Large Title Header */}
      <div className="px-4 mb-3 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f]">
          Capture Ingredients
        </h1>
        <p className="text-[#86868b] text-xs sm:text-sm mt-0.5">
          Take a photo of your kitchen counter or fridge to detect items automatically.
        </p>
      </div>

      {/* iPhone Camera Frame */}
      <div className="px-4">
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full aspect-[4/3] sm:aspect-[3/2] bg-[#000000] rounded-[28px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-black/10 flex flex-col items-center justify-center select-none touch-none"
        >
          {cameraActive ? (
            <>
              {/* Scaled Video */}
              <div className="w-full h-full overflow-hidden flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    transform: !hasHardwareZoom && zoom > 1.0 ? `scale(${zoom})` : 'none',
                    transformOrigin: 'center center',
                    transition: isPinching ? 'none' : 'transform 0.15s ease-out',
                  }}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>

              {/* iOS Camera Focus Target Framing */}
              <div className="absolute inset-5 border border-white/20 rounded-[20px] pointer-events-none flex items-center justify-center">
                {/* Yellow Apple Focus Corners */}
                <div className="w-6 h-6 border-t-[2px] border-l-[2px] border-[#ffd60a] absolute top-0 left-0 rounded-tl-sm" />
                <div className="w-6 h-6 border-t-[2px] border-r-[2px] border-[#ffd60a] absolute top-0 right-0 rounded-tr-sm" />
                <div className="w-6 h-6 border-b-[2px] border-l-[2px] border-[#ffd60a] absolute bottom-0 left-0 rounded-bl-sm" />
                <div className="w-6 h-6 border-b-[2px] border-r-[2px] border-[#ffd60a] absolute bottom-0 right-0 rounded-br-sm" />

                {/* Top Lens Info Pill */}
                <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-medium text-white/90 border border-white/10 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                  {currentCameraLabel}
                </div>

                {/* Zoom Level Indicator */}
                <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-[#ffd60a] border border-white/10 shadow-sm tabular-nums">
                  {zoom.toFixed(1)}x
                </div>
              </div>

              {/* Dynamic Pinch Indicator */}
              {isPinching && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 text-[#ffd60a] font-semibold text-sm shadow-xl tabular-nums">
                    {zoom.toFixed(1)}x Zoom
                  </div>
                </div>
              )}

              {/* iPhone Zoom Dial Control [0.5] [ 1x ] [ 2 ] [ 3 ] */}
              <div className="absolute bottom-3 inset-x-4 flex items-center justify-center gap-1.5 z-10">
                <div className="bg-black/60 backdrop-blur-xl px-2 py-1 rounded-full border border-white/15 flex items-center gap-1 shadow-lg">
                  {zoomPresets.map((preset) => {
                    const isSelected = Math.abs(zoom - preset) < 0.1;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyZoom(preset)}
                        className={`w-8 h-8 rounded-full text-[11px] font-semibold transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black shadow-xs scale-105'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {preset === 1 ? '1x' : preset}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setShowZoomSlider(!showZoomSlider)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ml-0.5 cursor-pointer ${
                      showZoomSlider ? 'text-[#ffd60a] bg-white/20' : 'text-white/70 hover:text-white'
                    }`}
                    title="Fine tune zoom"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Slider overlay */}
              {showZoomSlider && (
                <div className="absolute bottom-16 inset-x-8 bg-black/80 backdrop-blur-xl p-2.5 rounded-2xl border border-white/20 flex items-center gap-2.5 z-10 animate-apple-fade-in shadow-xl">
                  <span className="text-[10px] text-white/60 font-medium">1x</span>
                  <input
                    type="range"
                    min={minZoom}
                    max={maxZoom}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => applyZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-[#ffd60a] cursor-pointer h-1.5 bg-white/25 rounded-lg"
                  />
                  <span className="text-[11px] font-mono font-semibold text-[#ffd60a] min-w-[28px] text-right">
                    {zoom.toFixed(1)}x
                  </span>
                </div>
              )}

              {/* Flip camera shortcut */}
              <button
                onClick={toggleCameraFacing}
                type="button"
                className="absolute top-2.5 right-14 w-8 h-8 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Switch Camera"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          ) : previewImage ? (
            /* Image Preview */
            <div className="relative w-full h-full">
              <img
                src={previewImage}
                alt="Captured ingredients"
                className="w-full h-full object-cover"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin mb-3" />
                  <p className="text-white font-semibold text-sm">
                    Analyzing Ingredients
                  </p>
                  <p className="text-white/70 text-xs mt-1 max-w-xs">
                    {statusMessage}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Standby State with Apple Glass Button */
            <div className="relative w-full h-full group overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80"
                alt="Culinary ingredients standby"
                className="w-full h-full object-cover filter brightness-[0.7] contrast-[1.05] transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 flex flex-col items-center justify-between p-4 text-center">
                <div className="self-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-black/40 backdrop-blur-xl text-white/90 border border-white/10 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
                    Camera Ready
                  </span>
                </div>

                <div className="flex flex-col items-center my-auto">
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    className="px-6 py-3 rounded-full bg-white text-[#1d1d1f] font-semibold text-sm shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-[#f5f5f7] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#1d1d1f]" />
                    <span>Open Camera</span>
                  </button>
                  <p className="text-white/75 text-[11px] mt-2 font-normal">
                    Point at fresh vegetables, pantry items, or spices
                  </p>
                </div>

                <div className="text-[10px] text-white/50 font-normal">
                  Powered by Gemini Vision Intelligence
                </div>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-x-4 bottom-4 p-3 rounded-2xl bg-black/80 border border-red-500/30 text-white text-xs flex items-start gap-2 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#ff453a]" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Shutter Deck Controls */}
      <div className="px-4 mt-4">
        {cameraActive ? (
          <div className="flex items-center justify-between px-6 py-2.5 bg-black rounded-[24px] shadow-sm">
            {/* Cancel Button */}
            <button
              onClick={stopCamera}
              type="button"
              className="text-white/80 hover:text-white text-xs font-medium px-2 py-1 cursor-pointer active:opacity-60"
            >
              Cancel
            </button>

            {/* Apple Concentric Shutter Button */}
            <button
              onClick={capturePhoto}
              type="button"
              aria-label="Take Photo"
              className="w-[68px] h-[68px] rounded-full border-[3px] border-white flex items-center justify-center p-1 cursor-pointer active:scale-90 transition-transform duration-100"
            >
              <div className="w-full h-full rounded-full bg-white transition-opacity active:bg-white/80" />
            </button>

            {/* Flip Lens */}
            <button
              onClick={toggleCameraFacing}
              type="button"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer active:scale-95"
              title="Flip camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startCamera('environment')}
              disabled={isAnalyzing}
              type="button"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white font-semibold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>Use Camera</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              type="button"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white hover:bg-stone-50 active:scale-[0.98] text-[#1d1d1f] font-semibold text-sm border border-black/[0.08] shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 text-[#0071e3]" />
              <span>Photo Library</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* Pantry Notification Banner (Apple Notification Banner style) */}
      {pantryCount > 0 && (
        <div className="px-4 mt-4">
          <div className="p-3.5 rounded-2xl bg-white border border-black/[0.06] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#34c759]/10 text-[#34c759] flex items-center justify-center font-bold text-xs">
                {pantryCount}
              </div>
              <div>
                <p className="text-[#1d1d1f] font-semibold text-xs">
                  {pantryCount} Ingredient{pantryCount > 1 ? 's' : ''} in Pantry
                </p>
                <p className="text-[#86868b] text-[11px]">
                  Ready to discover tailored recipes
                </p>
              </div>
            </div>
            <button
              onClick={onViewPantry}
              type="button"
              className="px-3.5 py-1.5 rounded-full bg-[#1d1d1f] text-white text-xs font-medium hover:bg-black transition-colors cursor-pointer active:scale-95"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Instant Demo Presets (Apple Photos / Album Style) */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">
            Quick Test Samples
          </h2>
          <span className="text-[11px] text-[#86868b]">Tap to analyze</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SAMPLE_INGREDIENT_SCENARIOS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              disabled={isAnalyzing}
              type="button"
              className="group text-left p-2.5 rounded-[20px] bg-white border border-black/[0.06] hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <div className="aspect-[16/10] w-full rounded-[14px] overflow-hidden mb-2 relative bg-stone-100">
                <img
                  src={sample.imageUrl}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                />
              </div>
              <h3 className="font-semibold text-[#1d1d1f] text-xs leading-snug truncate">
                {sample.title}
              </h3>
              <p className="text-[#86868b] text-[10px] truncate mt-0.5">
                {sample.subtitle}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
