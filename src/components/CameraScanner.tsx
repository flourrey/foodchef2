import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Zap,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Sliders,
  Layers,
  Crown,
  Wand2,
  UtensilsCrossed,
} from 'lucide-react';
import { SAMPLE_INGREDIENT_SCENARIOS, SampleItem } from '../utils/samples';
import { processImageFile } from '../utils/imageProcessor';

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
  userIngredients?: string[];
  isPro?: boolean;
  onOpenProModal?: (feature?: string) => void;
  onReverseEngineerCompleted?: (recipe: any) => void;
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
  userIngredients = [],
  isPro = false,
  onOpenProModal,
  onReverseEngineerCompleted,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Scanner Mode: 'ingredients' (Pantry) vs 'reverse-engineer' (Chef Pro)
  const [activeMode, setActiveMode] = useState<'ingredients' | 'reverse-engineer'>('ingredients');

  // Prepared dish detection banner when a cooked meal is identified in ingredients mode
  const [detectedPreparedDish, setDetectedPreparedDish] = useState<{
    dishName: string;
    dishCuisine?: string;
    photoUrl: string;
  } | null>(null);

  // Multi-camera devices list and selected main camera
  const [availableBackCameras, setAvailableBackCameras] = useState<CameraDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [currentCameraLabel, setCurrentCameraLabel] = useState<string>('Main Camera');

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

  // Ensure video element receives stream immediately the moment camera opens
  useEffect(() => {
    if (videoRef.current && stream && cameraActive) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch((err) => {
        console.warn('Video playback error:', err);
      });
    }
  }, [stream, cameraActive]);

  // Helper to discover and prioritize the primary Main Wide Camera
  const discoverCameras = async (): Promise<CameraDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      // Separate back/rear cameras
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
          // Detect if this is the main 1x wide camera vs telephoto/macro/virtual
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
          if (isMain) cleanLabel = 'Main Wide (1x)';
          else if (l.includes('ultra')) cleanLabel = 'Ultra Wide (0.5x)';
          else if (l.includes('tele')) cleanLabel = 'Telephoto';

          return {
            deviceId: d.deviceId,
            label: cleanLabel,
            isMain,
          };
        });

      // Sort so main camera is always first
      backCameras.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
      setAvailableBackCameras(backCameras);
      return backCameras;
    } catch (err) {
      console.warn('Could not enumerate cameras:', err);
      return [];
    }
  };

  // Apply zoom to MediaStreamTrack (hardware) and state (digital fallback)
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

  // Start video stream targeting the MAIN camera
  const startCamera = async (
    mode: 'environment' | 'user' = facingMode,
    targetDeviceId?: string
  ) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // First discover available cameras to choose the primary main camera
      let chosenDeviceId = targetDeviceId || selectedCameraId;
      if (mode === 'environment' && !chosenDeviceId) {
        const foundCameras = await discoverCameras();
        if (foundCameras.length > 0 && foundCameras[0].deviceId) {
          chosenDeviceId = foundCameras[0].deviceId;
          setSelectedCameraId(chosenDeviceId);
          setCurrentCameraLabel(foundCameras[0].label);
        }
      }

      // Configure video constraints with standard 3:4 mobile portrait aspect ratio
      const videoConstraints: MediaTrackConstraints =
        chosenDeviceId && chosenDeviceId.trim().length > 0
          ? {
              deviceId: { ideal: chosenDeviceId },
              facingMode: { ideal: mode },
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

      // Immediately connect stream to video element so image data starts flowing instantly
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((playErr) => {
          console.warn('Initial video play caught:', playErr);
        });
      }

      setStream(mediaStream);
      setCameraActive(true);
      setFacingMode(mode);
      setZoom(1.0);

      // Inspect hardware zoom capability and explicitly reset to 1.0x (unzoomed main view)
      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        if (track.getSettings) {
          const settings = track.getSettings();
          if (settings.deviceId && !selectedCameraId) {
            setSelectedCameraId(settings.deviceId);
          }
        }

        if (track.label) {
          const lbl = track.label.toLowerCase();
          setCurrentCameraLabel(
            lbl.includes('front') || lbl.includes('user') || lbl.includes('selfie')
              ? 'Front Camera'
              : 'Main Camera (1x)'
          );
        }

        if (track.getCapabilities) {
          const capabilities = track.getCapabilities() as any;
          if (capabilities && capabilities.zoom) {
            const minZ = capabilities.zoom.min || 1.0;
            const maxZ = capabilities.zoom.max || 4.0;
            setMinZoom(minZ);
            setMaxZoom(maxZ);
            setHasHardwareZoom(true);

            // Force native track to minimum 1.0x wide lens
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

      // Re-enumerate to capture fully populated labels now that permission is active
      discoverCameras();
    } catch (err: any) {
      console.warn('Camera access error:', err);
      // Fallback: try basic environment request
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          fallbackStream.getVideoTracks()[0]?.applyConstraints?.({}).catch(() => {});
          videoRef.current.play().catch(() => {});
        }

        setStream(fallbackStream);
        setCameraActive(true);
        setFacingMode(mode);
        setZoom(1.0);
      } catch (fallbackErr: any) {
        console.error('Camera fallback failed:', fallbackErr);
        setCameraError(
          'Camera access was not granted or not available. You can upload a photo or use a sample.'
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

  // Switch between back lenses (e.g. Main 1x vs Ultra Wide)
  const handleSwitchLens = (deviceId: string, label: string) => {
    setSelectedCameraId(deviceId);
    setCurrentCameraLabel(label);
    startCamera('environment', deviceId);
  };

  // Capture frame from video stream with active zoom applied
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    stopCamera();
    setPreviewImage(dataUrl);

    if (activeMode === 'reverse-engineer') {
      reverseEngineerImage(dataUrl);
    } else {
      analyzeImage(dataUrl);
    }
  };

  // Handle uploaded image file with robust HEIC conversion, hardware decoding & scaling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setStatusMessage(
      activeMode === 'reverse-engineer'
        ? 'Chef Pro AI is reading and preparing dish photograph...'
        : 'Optimizing and loading selected photo...'
    );

    try {
      // Robust processing: handles HEIC from iOS, canvas resize, and memory-safe compression
      const processed = await processImageFile(file, 1280, 0.82);
      setPreviewImage(processed);
      stopCamera();

      if (activeMode === 'reverse-engineer') {
        await reverseEngineerImage(processed);
      } else {
        await analyzeImage(processed);
      }
    } catch (err: any) {
      console.error('Photo reading error:', err);
      alert(`Could not load selected photo: ${err?.message || 'Unsupported format'}. Please try another photo.`);
      setIsAnalyzing(false);
      setStatusMessage('');
    } finally {
      e.target.value = '';
    }
  };

  // Reverse Engineer Food Recipe Based on Photo (Premium Feature)
  const reverseEngineerImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setStatusMessage('Chef Pro AI is deconstructing secret sauces, seasonings & master recipe...');

    try {
      const payload = {
        action: 'reverse-engineer',
        imageBase64: base64Image,
        mimeType: base64Image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
        userIngredients: userIngredients || [],
      };

      const response = await fetch('/api/claude.ts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}: Failed to reverse engineer recipe`);
      }

      const data = await response.json();
      if (data.recipe && onReverseEngineerCompleted) {
        onReverseEngineerCompleted(data.recipe);
      } else {
        throw new Error('No master recipe returned from analysis');
      }
    } catch (err: any) {
      console.error('Reverse engineering error:', err);
      let errMsg = err?.message || 'Please try another photo';
      try {
        if (errMsg.includes('{') && errMsg.includes('}')) {
          const parsed = JSON.parse(errMsg.slice(errMsg.indexOf('{')));
          if (parsed?.error?.message) errMsg = parsed.error.message;
        }
      } catch {}
      alert(`Could not reverse engineer recipe: ${errMsg}`);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  // Send photo to AI serverless endpoint via /api/claude.ts
  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setStatusMessage('Claude AI is examining ingredients, produce, and spices...');

    try {
      const payload = {
        action: 'identify',
        imageBase64: base64Image,
        mimeType: base64Image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
      };

      const response = await fetch('/api/claude.ts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}: Failed to analyze image with Claude AI`);
      }

      const data = await response.json();

      // If Claude detected that this is a cooked meal/plated dish, offer reverse engineering!
      if (data.isPreparedDish && data.dishName) {
        setDetectedPreparedDish({
          dishName: data.dishName,
          dishCuisine: data.dishCuisine,
          photoUrl: base64Image,
        });
      } else {
        setDetectedPreparedDish(null);
      }

      const items = data.ingredients || [];
      if (items.length === 0) {
        alert(
          'Claude AI could not clearly identify individual food items in this photo. Try taking a clearer photo closer to the ingredients, or tap one of the Quick Test Samples below!'
        );
      }

      onIngredientsDetected({
        ingredients: items,
        suggestedCuisines: data.suggestedCuisines,
        chefTip: data.chefTip,
        photoUrl: base64Image,
      });
    } catch (err: any) {
      console.error('Analysis error:', err);
      let errMsg = err?.message || 'Please try another photo';
      try {
        if (errMsg.includes('{') && errMsg.includes('}')) {
          const parsed = JSON.parse(errMsg.slice(errMsg.indexOf('{')));
          if (parsed?.error?.message) errMsg = parsed.error.message;
        }
      } catch {}
      alert(`Could not identify ingredients: ${errMsg}`);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  // Instant Sample Testing
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

        if (sample.isCookedDish || activeMode === 'reverse-engineer') {
          reverseEngineerImage(base64);
        } else {
          analyzeImage(base64);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      if (sample.isCookedDish || activeMode === 'reverse-engineer') {
        setIsAnalyzing(false);
        if (onOpenProModal) onOpenProModal('reverse-engineer');
        return;
      }

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
    <div className="w-full max-w-lg mx-auto pb-24">
      {/* Scanner Mode Switcher (Scan Ingredients vs Reverse Recipe Chef Pro) */}
      <div className="px-4 pt-3 pb-2">
        <div className="bg-stone-200/90 p-1 rounded-2xl flex items-center max-w-sm mx-auto shadow-inner border border-stone-300">
          <button
            type="button"
            onClick={() => {
              setActiveMode('ingredients');
              setPreviewImage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'ingredients'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" />
            <span>Scan Ingredients</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isPro && onOpenProModal) {
                onOpenProModal('reverse-engineer');
              }
              setActiveMode('reverse-engineer');
              setPreviewImage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'reverse-engineer'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-extrabold shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-700" />
            <span>Reverse Recipe</span>
            <span className="text-[9px] bg-black/70 text-amber-300 px-1.5 py-0.2 rounded-full font-black uppercase">
              Pro
            </span>
          </button>
        </div>
      </div>

      {/* Top Title Banner */}
      <div className="px-4 pb-2 text-center">
        {activeMode === 'reverse-engineer' ? (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              Chef Pro AI Recipe Reverse Engineering
            </span>
            <h1 className="text-2xl font-extrabold text-stone-900 mt-2 tracking-tight">
              Reverse-Engineer Food Dish
            </h1>
            <p className="text-stone-600 text-xs mt-1">
              Snap or upload any plated dish to deconstruct secret sauces, seasonings &amp; full recipe!
            </p>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Deliciously spiced with Claude AI
            </span>
            <h1 className="text-2xl font-extrabold text-stone-900 mt-2 tracking-tight">
              Snap Your Ingredients
            </h1>
            <p className="text-stone-600 text-xs mt-1">
              Connected to Main Wide Camera (1x). Pinch with 2 fingers to zoom in &amp; out.
            </p>
          </>
        )}
      </div>

      {/* Compact Viewfinder Region */}
      <div className="px-4 mt-2">
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full h-64 sm:h-72 max-w-md mx-auto bg-stone-950 rounded-2xl overflow-hidden shadow-xl border border-stone-800/80 flex flex-col items-center justify-center select-none touch-none"
        >
          {/* Always-mounted Video element so videoRef.current is never null and receives stream immediately */}
          <div
            className={`w-full h-full overflow-hidden flex items-center justify-center bg-black ${
              cameraActive && !previewImage ? 'block' : 'hidden'
            }`}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                transform: !hasHardwareZoom && zoom > 1.0 ? `scale(${zoom})` : 'none',
                transformOrigin: 'center center',
                transition: isPinching ? 'none' : 'transform 0.15s ease-out',
              }}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>

          {/* Active Camera Viewfinder Overlays & Controls */}
          {cameraActive && !previewImage && (
            <>
              {/* Viewfinder Overlay Targeting Frame */}
              <div className="absolute inset-6 border border-white/30 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-8 h-8 border-t-2 border-l-2 border-amber-400 absolute top-0 left-0 rounded-tl-lg" />
                <div className="w-8 h-8 border-t-2 border-r-2 border-amber-400 absolute top-0 right-0 rounded-tr-lg" />
                <div className="w-8 h-8 border-b-2 border-l-2 border-amber-400 absolute bottom-0 left-0 rounded-bl-lg" />
                <div className="w-8 h-8 border-b-2 border-r-2 border-amber-400 absolute bottom-0 right-0 rounded-br-lg" />

                {/* Main Camera Indicator Badge */}
                <div className="absolute top-2 left-2 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {currentCameraLabel}
                </div>

                {/* Active Zoom Badge */}
                <div className="absolute top-2 right-2 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-white border border-white/20 flex items-center gap-1 shadow-md">
                  <ZoomIn className="w-3 h-3 text-amber-400" />
                  {zoom.toFixed(1)}x
                </div>
              </div>

              {/* Dynamic Pinch Indicator Overlay */}
              {isPinching && (
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-500/50 text-amber-400 font-mono font-extrabold text-lg flex items-center gap-2 shadow-2xl animate-pulse">
                    <ZoomIn className="w-5 h-5 text-amber-400" />
                    {zoom.toFixed(1)}x Zoom
                  </div>
                </div>
              )}

              {/* Multi-Lens Selector Pill (if multiple back cameras exist) */}
              {availableBackCameras.length > 1 && (
                <div className="absolute top-12 left-4 z-10 flex gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/20">
                  {availableBackCameras.slice(0, 3).map((cam) => (
                    <button
                      key={cam.deviceId}
                      type="button"
                      onClick={() => handleSwitchLens(cam.deviceId, cam.label)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                        selectedCameraId === cam.deviceId
                          ? 'bg-amber-500 text-stone-950'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      {cam.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Floating Camera Zoom Controls Bar (1x, 1.5x, 2x, 3x) */}
              <div className="absolute bottom-3 inset-x-4 flex items-center justify-center gap-1.5 z-10">
                <div className="bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 flex items-center gap-1 shadow-lg">
                  {zoomPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyZoom(preset)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                        Math.abs(zoom - preset) < 0.1
                          ? 'bg-amber-500 text-stone-950 scale-105 shadow-xs'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {preset}x
                    </button>
                  ))}

                  {/* Zoom Fine-Tuning Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowZoomSlider(!showZoomSlider)}
                    className={`p-1 rounded-full transition-colors ml-1 ${
                      showZoomSlider ? 'text-amber-400 bg-white/20' : 'text-white/70 hover:text-white'
                    }`}
                    title="Fine tune zoom"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Continuous Zoom Slider when toggled */}
              {showZoomSlider && (
                <div className="absolute bottom-14 inset-x-8 bg-black/85 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 flex items-center gap-2.5 z-10 animate-fade-in shadow-xl">
                  <ZoomOut className="w-3.5 h-3.5 text-white/70" />
                  <input
                    type="range"
                    min={minZoom}
                    max={maxZoom}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => applyZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-white/30 rounded-lg"
                  />
                  <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-mono font-bold text-white min-w-[32px] text-right">
                    {zoom.toFixed(1)}x
                  </span>
                </div>
              )}

              {/* Flip camera button */}
              <button
                onClick={toggleCameraFacing}
                type="button"
                className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-all active:scale-95 cursor-pointer z-10"
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Preview of captured/selected image */}
          {previewImage && (
            <div className="relative w-full h-full">
              <img
                src={previewImage}
                alt="Selected food photo"
                className="w-full h-full object-cover"
              />

              {!isAnalyzing && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewImage(null);
                    setDetectedPreparedDish(null);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-bold backdrop-blur-md transition-all shadow-md cursor-pointer flex items-center gap-1.5 z-20 border border-white/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake / Clear</span>
                </button>
              )}

              {isAnalyzing && (
                <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <p className="text-white font-bold text-sm mt-4">
                    {activeMode === 'reverse-engineer' ? 'Chef Pro AI Deconstructing Dish...' : 'Gemini AI Vision Analyzing...'}
                  </p>
                  <p className="text-amber-200/90 text-xs mt-1 max-w-xs leading-relaxed">
                    {statusMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Standby State with Default Picture when Camera is Not Activated */}
          {!cameraActive && !previewImage && (
            <div className="relative w-full h-full group overflow-hidden">
              {/* Default Culinary Food Photography */}
              <img
                src={
                  activeMode === 'reverse-engineer'
                    ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'
                    : 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80'
                }
                alt="Culinary preview"
                className="w-full h-full object-cover filter brightness-[0.65] contrast-[1.05] transition-transform duration-500 group-hover:scale-105"
              />

              {/* Standby Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-stone-950/60 flex flex-col items-center justify-between p-3.5 text-center">
                {/* Standby Badge */}
                <div className="self-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/30 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Camera Standby
                  </span>
                </div>

                {/* Central Button to Initialise Camera */}
                <div className="flex flex-col items-center my-auto">
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-extrabold text-sm shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-white/20 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 stroke-[2.2]" />
                    <span>Initialise Camera</span>
                  </button>
                  <p className="text-stone-300 text-[11px] mt-1.5 font-medium drop-shadow-md">
                    {activeMode === 'reverse-engineer'
                      ? 'Tap to start live camera to snap cooked dish'
                      : 'Tap to start live scanner & zoom'}
                  </p>
                </div>

                {/* Bottom hint */}
                <div className="text-[10px] text-stone-300/80 font-medium">
                  {activeMode === 'reverse-engineer'
                    ? 'Chef Pro Master Recipe & Sauce Deconstruction'
                    : 'Main Wide Camera (1x) • AI Ingredient Detection'}
                </div>
              </div>
            </div>
          )}

          {/* Camera Error Notice */}
          {cameraError && (
            <div className="absolute inset-x-4 bottom-4 p-3 rounded-xl bg-red-950/90 border border-red-800 text-red-200 text-xs flex items-start gap-2 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Capture Controls */}
      <div className="px-4 mt-4">
        {cameraActive ? (
          <div className="flex items-center justify-between gap-3 bg-stone-900/90 p-3 rounded-2xl border border-stone-800">
            <button
              onClick={stopCamera}
              type="button"
              className="px-4 py-2.5 rounded-xl text-stone-300 text-xs font-medium hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Shutter Button */}
            <button
              onClick={capturePhoto}
              type="button"
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 p-1 shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title="Capture Photo"
            >
              <div className="w-13 h-13 rounded-full border-2 border-white flex items-center justify-center bg-white/20">
                <div className="w-9 h-9 rounded-full bg-white shadow-xs" />
              </div>
            </button>

            <button
              onClick={toggleCameraFacing}
              type="button"
              className="px-4 py-2.5 rounded-xl text-stone-300 text-xs font-medium hover:bg-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Flip
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startCamera('environment')}
              disabled={isAnalyzing}
              type="button"
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-amber-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Initialise Camera
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              type="button"
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              Choose Photo
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* Prepared Dish Detected Banner */}
      {detectedPreparedDish && !isAnalyzing && (
        <div className="px-4 mt-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-transparent border border-amber-500/40 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-stone-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
                <Crown className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                  Cooked Dish Detected
                </span>
                <p className="text-stone-900 font-extrabold text-xs">
                  {detectedPreparedDish.dishName}
                </p>
                <p className="text-stone-600 text-[11px]">
                  Deconstruct secret sauces &amp; master steps?
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isPro && onOpenProModal) {
                  onOpenProModal('reverse-engineer');
                  return;
                }
                reverseEngineerImage(detectedPreparedDish.photoUrl);
              }}
              type="button"
              className="px-3 py-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-stone-950 text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
            >
              Reverse Recipe →
            </button>
          </div>
        </div>
      )}

      {/* Pantry Status Banner */}
      {pantryCount > 0 && (
        <div className="px-4 mt-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                {pantryCount}
              </div>
              <div>
                <p className="text-emerald-900 font-semibold text-xs">
                  {pantryCount} Ingredient{pantryCount > 1 ? 's' : ''} Collected
                </p>
                <p className="text-emerald-700 text-[11px]">
                  Snap more items or view pantry to get Gemini recipes.
                </p>
              </div>
            </div>
            <button
              onClick={onViewPantry}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
            >
              View List →
            </button>
          </div>
        </div>
      )}

      {/* Instant Demo Presets Section */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Quick Test Samples
          </h2>
          <span className="text-[11px] text-stone-600 font-medium">1-Tap Analyze</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {SAMPLE_INGREDIENT_SCENARIOS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              disabled={isAnalyzing}
              type="button"
              className="group text-left p-2.5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="aspect-16/10 w-full rounded-xl overflow-hidden mb-2 relative">
                <img
                  src={sample.imageUrl}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <span className="text-[10px] text-white font-medium bg-amber-600/90 px-1.5 py-0.5 rounded-md">
                    Click to Scan
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-stone-800 text-xs leading-snug line-clamp-1">
                {sample.title}
              </h3>
              <p className="text-stone-600 text-[10px] line-clamp-1 mt-0.5">
                {sample.subtitle}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Privacy and Camera Tip */}
      <div className="px-6 mt-6 flex items-center justify-center gap-2 text-stone-600 text-[11px] text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
        <span>Main wide camera connected. Images are processed directly by Gemini AI.</span>
      </div>
    </div>
  );
};
