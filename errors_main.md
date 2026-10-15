# SnapChef AI - Error Log & Solutions Reference (`errors_main.md`)

This document catalogs all technical issues, runtime bugs, and errors encountered during the development of **SnapChef AI**, along with their root causes, detailed fixes, and verification methods.

---

## Error Summary Matrix

| ID | Symptom / Error Message | Component / Module | Root Cause | Resolution |
|----|-------------------------|--------------------|------------|------------|
| **ERR-01** | `Could not identify ingredients: server returned 500` | `/api/gemini.ts` / `vite.config.ts` | In dev mode, Vite was not processing `/api/gemini.ts` through an SSR middleware runner, resulting in 404/500 responses | Implemented `serverlessApiPlugin` in `vite.config.ts` to dynamically execute `/api/gemini.ts` using `server.ssrLoadModule()` |
| **ERR-02** | Base64 Image Payload Exceeding Limits / Network Timeout | Canvas capture & File input | Full-resolution mobile camera pictures (3000px+ / 10MB+) generated excessive base64 strings | Implemented canvas max-dimension downsampling (1280px) and JPEG quality compression (0.82) before transmission |
| **ERR-03** | Camera feed black / only renders after clicking "Flip Camera" | `CameraScanner.tsx` | Strict video constraints caused stream tracks to not bind immediately to unmounted video element | Kept video element permanently in DOM, invoked `video.play()` on metadata load, relaxed initial constraints to environment |
| **ERR-04** | Camera region dominating mobile screen height | Viewfinder UI | Full viewport aspect ratio forced user to scroll excessively | Resized viewfinder to compact `h-64 sm:h-72 max-w-md` frame with 1x-4x zoom overlay |
| **ERR-05** | Viewfinder blank black box before activation | Camera standby state | No placeholder state existed when user had not granted camera access | Added high-definition culinary photo standby background with dark gradient, badge, and "Initialise Camera" button |
| **ERR-06** | Camera starting automatically on tab view | Scanner lifecycle | `autoStart={true}` prop triggered `getUserMedia` unconditionally on mount | Removed autoStart effect; camera now strictly initializes only upon clicking "Initialise Camera" |
| **ERR-07** | `git push origin main` rejected (Authentication Required) | Git CLI | Headless build container had no stored GitHub credentials or Personal Access Token | Executed authenticated push via HTTPS URL token: `https://<TOKEN>@github.com/cyudr/foodrun.git` |
| **ERR-08** | Git URL parsing error (`https://<token>@https://github...`) | Git CLI | User provided URL containing duplicate `https://` protocol prefix | Sanitized remote URL to `https://<token>@github.com/cyudr/foodrun.git` and successfully pushed |
| **ERR-09** | "Choose Photo" opens camera app instead of photo library | `CameraScanner.tsx` file input | `capture="environment"` attribute instructed mobile browsers (iOS/Android) to bypass photo picker and open camera hardware directly | Removed `capture="environment"` from file input, allowing system photo gallery selection |
| **ERR-10** | Choose photo allows select photo but photo cannot be loaded for detection | `imageProcessor.ts` / `CameraScanner.tsx` | HEIC format from iPhones, memory overload on raw files, missing timeout/error handling | Implemented `processImageFile` with dynamic HEIC conversion via `heic2any`, canvas downsampling to 1280px, and timeout guards |
| **ERR-11** | Dish photos static / need reverse-engineering recipe from photo | `dishPhotos.ts` / `api/gemini.ts` | Dish photos were hardcoded fallback loops; food dish photos lacked dedicated deconstruction | Built `resolveDishPhoto`, `adjustDishPhotoPresentation`, `ReverseEngineerModal`, `ChefProModal`, and `handleReverseEngineerRecipe` endpoint |

---

## Deep-Dive Analysis & Fix Details

### ERR-01: Server 500 on Ingredient Identification & Routing Mismatch

#### Symptom:
When taking a photo or uploading an image, the client alerted:
```text
Could not identify ingredients: server returned 500. Make sure you are not routing through server.ts, route through /api/gemini.ts instead
```

#### Root Cause:
1. The client was previously falling back between `/api/gemini` and `/server.ts`.
2. When the dev server ran with Vite, requests to `/api/gemini.ts` were treated as static file requests or unhandled paths by Vite's connect server, causing 404s or 500 internal errors.
3. The serverless route needed a Node SSR execution environment to parse POST request streams and run `@google/genai`.

#### Resolution:
Added a custom Vite plugin `serverlessApiPlugin` in `vite.config.ts`:

```typescript
// vite.config.ts
function serverlessApiPlugin(): Plugin {
  return {
    name: 'serverless-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/gemini.ts') || url === '/api/gemini' || url.startsWith('/api/gemini/')) {
          try {
            const mod = await server.ssrLoadModule('/api/gemini.ts');
            return await mod.default(req, res);
          } catch (err: any) {
            console.error('[API gemini.ts error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err?.message || 'Server error' }));
          }
        }
        next();
      });
    },
  };
}
```

Updated client calls in `src/App.tsx` and `src/components/CameraScanner.tsx` to target `/api/gemini.ts` directly.

---

### ERR-02: Large Base64 Payload Overflow on Mobile Camera Snaps

#### Symptom:
Photos snapped on modern high-resolution phone cameras (12MP–48MP) resulted in requests stalling or failing with body limit errors.

#### Root Cause:
`canvas.toDataURL('image/jpeg')` without dimension constraints converted full 4000x3000 video frames into multi-megabyte base64 strings, exceeding HTTP body parsing thresholds.

#### Resolution:
Added canvas image resizing in `CameraScanner.tsx` for both live camera capture and gallery uploads:

```typescript
// In capturePhoto:
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
// draw and compress with quality 0.82
const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
```

---

### ERR-03: Video Stream Delay / Only Rendering After Camera Flip

#### Symptom:
Upon opening the camera, the viewfinder displayed a black screen. Live video only appeared once the user clicked the "Flip Camera" button.

#### Root Cause:
1. The `<video>` element was conditionally mounted in JSX only when `cameraActive` was true, creating a race condition between `stream` state updates and DOM node mounting.
2. The initial camera constraint used strict deviceId constraints before the browser had granted permissions, selecting a secondary or inactive camera index.

#### Resolution:
1. Kept the `<video>` element permanently rendered in the DOM with a CSS `hidden`/`block` toggle so `videoRef.current` is never null.
2. Added an explicit `useEffect` to attach `video.srcObject = stream` and invoke `video.play()` immediately when `stream` updates:
```typescript
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
```
3. Prioritized `facingMode: { ideal: 'environment' }` with a broad fallback to ensure the primary rear camera connects immediately on first tap.

---

### ERR-04: Viewfinder Size and Standby User Experience

#### Symptom:
The live camera container consumed excessive vertical screen real estate, pushing user controls and recipe actions off the bottom of the screen. When the camera was off, the box was an empty black rectangle.

#### Root Cause:
The camera container had `h-[500px]` or `aspect-[3/4]` sizing without max-height constraints, and lacked an idle visual design.

#### Resolution:
1. Constrained viewfinder height to `h-64 sm:h-72 max-w-md mx-auto` with rounded corners (`rounded-2xl`).
2. Added a standby view featuring a curated culinary image with a subtle dark gradient, a "Camera Standby" pill badge, and an actionable **"Initialise Camera"** button:
```tsx
{!cameraActive && !previewImage && (
  <div className="relative w-full h-full group overflow-hidden">
    <img
      src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80"
      alt="Fresh culinary ingredients standby"
      className="w-full h-full object-cover filter brightness-[0.65] contrast-[1.05]"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-stone-950/60 flex flex-col items-center justify-between p-3.5 text-center">
      {/* Standby Badge & Initialise Camera Button */}
      <button
        type="button"
        onClick={() => startCamera('environment')}
        className="px-5 py-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-extrabold text-sm shadow-xl"
      >
        <Camera className="w-4 h-4 stroke-[2.2]" />
        <span>Initialise Camera</span>
      </button>
    </div>
  </div>
)}
```

---

### ERR-05: Unwanted Camera Auto-Start

#### Symptom:
Navigating to the Scanner tab immediately triggered the browser's camera permission prompt and activated the camera stream without explicit user action.

#### Root Cause:
`App.tsx` passed `autoStart={true}`, and `CameraScanner.tsx` had an effect:
```typescript
useEffect(() => {
  if (autoStart && !cameraActive && !previewImage && !cameraError) {
    startCamera('environment');
  }
}, [autoStart]);
```

#### Resolution:
1. Removed `autoStart` prop and the automated `useEffect` completely.
2. The camera now remains strictly dormant until the user explicitly taps **"Initialise Camera"**.

---

### ERR-06: Git Push Remote Authentication

#### Symptom:
Running `git push origin main` failed with:
```text
fatal: could not read Username for 'https://github.com': No such device or address
```

#### Root Cause:
The environment lacks interactive TTY login and had no GitHub Personal Access Token or SSH keys configured.

#### Resolution:
Pushed using HTTPS authentication with the user-provided Personal Access Token:
```bash
git push https://<GITHUB_PAT>@github.com/cyudr/foodrun.git main
```
Result: All commits successfully synchronized with GitHub `origin/main`.

---

### ERR-09: "Choose Photo" Opens Camera App Instead of Photos

#### Symptom:
When clicking the "Choose Photo" button on mobile devices (iOS Safari, Android Chrome), the browser immediately opened the device's camera app/viewfinder rather than presenting the user's photo gallery, camera roll, or photo library.

#### Root Cause:
The underlying file input element was defined as:
```html
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  className="hidden"
  onChange={handleFileChange}
/>
```
In the W3C HTML Media Capture standard, the presence of the `capture="environment"` attribute specifies that the user agent should directly invoke capture via the outward-facing camera device rather than opening the system file or photo chooser.

#### Resolution:
Removed the `capture="environment"` attribute and provided explicit image mime-types:
```html
<input
  ref={fileInputRef}
  type="file"
  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
  className="hidden"
  onChange={handleFileChange}
/>
```
Now, clicking "Choose Photo" triggers the native system photo library and album picker as expected.

---

### ERR-10: Selected Photo Fails to Load for Detection (HEIC & Memory Stall)

#### Symptom:
Users were able to select an existing photo from their gallery/library, but the photo would not load for detection or would freeze with no visual feedback.

#### Root Cause:
1. **HEIC/HEIF Encoding**: Photos taken on Apple devices (iPhones/iPads) are saved in HEIC format by default. Native Web browsers (Chrome, Firefox, non-Safari or webviews) cannot directly decode HEIC blobs into `<canvas>` or `Image()` objects without conversion.
2. **Memory Overload & Silent Promise Hang**: Large raw camera files (15MB - 30MB) passed to `FileReader.readAsDataURL` consumed excessive memory, and images without explicit `onerror` and timeout fallbacks stalled the execution pipeline indefinitely.
3. **Empty Processor File**: During previous server error, `src/utils/imageProcessor.ts` was left empty (0 bytes), resulting in missing function definitions.

#### Resolution:
1. Created robust `src/utils/imageProcessor.ts` featuring:
   - Dynamic conversion of HEIC/HEIF files via `heic2any`.
   - Rapid blob URL handling using `URL.createObjectURL(file)`.
   - Explicit `onload`, `onerror`, and 15-second timeout protections.
   - Intelligent canvas downsampling (max dimension 1280px) to output high-quality, lightweight (~200KB) JPEG data URLs.
2. Updated `CameraScanner.tsx` with immediate loading spinners, retake/clear buttons, and graceful error alerts.

---

### ERR-11: Reverse-Engineering & Dish Photo Dynamic Routing

#### Symptom:
Need to distinguish between raw pantry ingredient photos and finished plated dishes, deconstruct restaurant recipes with secrets, and adjust dish photography according to pantry ingredients.

#### Root Cause:
The API previously only supported basic raw ingredient listing and cycled through 6 hardcoded fallback images regardless of the actual recipe or pantry composition.

#### Resolution:
1. Enhanced `api/gemini.ts` with `handleReverseEngineerRecipe` and `handleAdjustDishPhoto`.
2. Created `src/utils/dishPhotos.ts` providing an intelligent culinary photo registry matching recipes to styles like Rustic Bistro, Michelin Star Minimalist, and Cozy Homestyle.
3. Implemented `ChefProModal.tsx`, `ReverseEngineerModal.tsx`, and `AdjustDishPhotoModal.tsx` for full premium feature experience.


