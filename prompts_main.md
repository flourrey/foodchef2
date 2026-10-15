# SnapChef AI - Development Prompts History (`prompts_main.md`)

This document chronologically collates all user prompts, feature requests, design iterations, and operational commands provided during the creation and development of **SnapChef AI** ("Deliciously spiced with Gemini").

---

## Chronological Overview

| # | Prompt / Request Summary | Focus Area | Status |
|---|--------------------------|------------|--------|
| **1** | Build SnapChef AI: Vision food assistant, recipe generator, voice chef | Initial Architecture & Core App | Completed |
| **2** | Route all vision and recipes through `/api/gemini`, remove MealDB, add camera zooms | Pure Gemini Integration & Zoom UX | Completed |
| **3** | Fix image analysis fallback, enforce main wide camera, add pinch-to-zoom & key status | Camera Lens Selection & Gestures | Completed |
| **4** | Route camera and photo data via `/api/gemini.ts`, auto-open camera on action buttons | Direct Route Target & Flow | Completed |
| **5** | "Could not identify ingredients: server returned 500. Make sure you are not routing through server.ts, route through /api/gemini.ts instead" | Vite Dev Middleware & 500 Fix | Completed |
| **6** | "1. camera region is too big, resize to smaller; 2. add a default picture when camera is not activated; 3. add a button to initialise the camera" | Compact Viewfinder & Standby UI | Completed |
| **7** | "1. the camera only started getting image data when i flicked flip, fix it. The moment i open the camera, image data should start coming in. choose a default camera to make this happen; 2. remove the gemini connection monitor at the top; 3. Change Gemini AI Food Vision to Deliciously spiced with Gemini" | Instant Video Stream & Branding | Completed |
| **8** | "git push" | Remote Code Sync | Completed |
| **9** | "git push https://<GITHUB_PAT>@https://github.com/cyudr/foodrun" | Authenticated Git Push to GitHub | Completed |
| **10** | "1. collate and store as prompts_main.md; 2. collate all the errors and respective fixes and store as errors_main.md" | Documentation & System History | Completed |
| **11** | "1. only initialise the camera when i hit initialise camera" | User-Controlled Camera Lifecycle | Completed |
| **12** | "The choose photo opens up camera app instead of going to photos, fix it" | File Picker & Photo Library Access | Completed |

---

## Detailed Prompt Breakdown

### Prompt 1: Initial Application Build
- **User Request:**  
  *Build an AI cooking and recipe assistant app that allows users to snap ingredients via camera or upload food photos, detect ingredients via Gemini Vision, recommend practical recipes with matching percentages, and provide a voice cooking assistant with step-by-step guidance.*
- **Key Deliverables:**
  - Responsive mobile-first React SPA with Tailwind CSS.
  - Multi-tab navigation: Scanner (`scanner`), Pantry Review (`pantry`), Recipe Recommendations (`recipes`), and Favorites (`favorites`).
  - Interactive cooking modal with voice synthesis (TTS) and cooking timers.
  - LocalStorage persistence for user pantry items and saved favorite recipes.

---

### Prompt 2: Pure Gemini AI Routing & Multi-Zoom Controls
- **User Request:**  
  *Route all vision and recipes through `/api/gemini`, remove MealDB, add camera zooms.*
- **Key Deliverables:**
  - Completely decommissioned static 3rd-party database dependencies (TheMealDB API).
  - Migrated recipe discovery to dynamic Gemini prompts producing matching percentages, dietary tags, and step-by-step instructions.
  - Implemented 1x, 1.5x, 2x, and 3x hardware and digital zoom presets in the camera scanner.

---

### Prompt 3: Main Camera Selection, Pinch-to-Zoom & Key Monitor
- **User Request:**  
  *Fix image analysis fallback, enforce main wide camera, add pinch-to-zoom and key status.*
- **Key Deliverables:**
  - Added camera enumeration prioritizing the primary rear 1x wide-angle camera (avoiding ultra-wide 0.5x, telephoto, or macro cameras by default).
  - Implemented multi-touch pinch gesture (`handleTouchStart`, `handleTouchMove`, `handleTouchEnd`) with dynamic zoom multiplier calculation and on-screen zoom badge.
  - Added Gemini API key status check and diagnostic endpoint.

---

### Prompt 4: Direct `/api/gemini.ts` Serverless Path
- **User Request:**  
  *Route camera and photo data via `/api/gemini.ts`, auto-open camera on center button and viewfinder icon.*
- **Key Deliverables:**
  - Pointed client HTTP POST requests directly to `/api/gemini.ts` across image analysis, recipe matching, and custom recipe generation.
  - Configured center bottom tab bar button to navigate directly to the camera scanner.

---

### Prompt 5: Server 500 Resolution & Middleware Unification
- **User Request:**  
  *Could not identify ingredients: server returned 500. Make sure you are not routing through server.ts, route through /api/gemini.ts instead.*
- **Key Deliverables:**
  - Diagnosed that in Vite dev mode, requests hitting `/api/gemini.ts` failed because the Vite server lacked an SSR runner middleware for TypeScript API endpoints.
  - Created `serverlessApiPlugin` in `vite.config.ts` using `server.ssrLoadModule('/api/gemini.ts')` to handle API requests directly inside Vite dev server.
  - Added automatic canvas image downsampling (max dimension 1280px) and JPEG compression to eliminate payload size overflow.
  - Added resilient fallback cascade for Gemini models (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.8-flash`).

---

### Prompt 6: Viewfinder Sizing, Standby Graphic & Initialise Button
- **User Request:**  
  *1. camera region is too big, resize to smaller;  
  2. add a default picture when camera is not activated;  
  3. add a button to initialise the camera.*
- **Key Deliverables:**
  - Resized the live camera viewfinder container from full viewport down to a compact `h-64 sm:h-72 max-w-md` frame.
  - Integrated a culinary food standby photograph (Unsplash) with dark gradient overlay, "Camera Standby" badge, and clean framing.
  - Added a dedicated, styled **"Initialise Camera"** action button in the center of the standby display and in the capture controls bar.

---

### Prompt 7: Instant Camera Feed, Branding Update & UI Cleanup
- **User Request:**  
  *1. the camera only started getting image data when i flicked flip, fix it. The moment i open the camera, image data should start coming in. choose a default camera to make this happen;  
  2. remove the gemini connection monitor at the top;  
  3. Change Gemini AI Food Vision to Deliciously spiced with Gemini.*
- **Key Deliverables:**
  - Resolved black screen issue: eliminated restrictive camera constraints, mounted the video element permanently with `playsInline` and `muted`, and invoked `video.play()` inside `onloadedmetadata`.
  - Removed top connection monitor status pill from the header.
  - Updated hero banner badge text to **"Deliciously spiced with Gemini"**.

---

### Prompt 8: Git Push
- **User Request:**  
  *git push*
- **Key Deliverables:**
  - Staged and committed all pending files to local `main` branch.
  - Checked remote configuration and identified that remote GitHub authentication credentials were required.

---

### Prompt 9: Authenticated Git Remote Push
- **User Request:**  
  *git push https://<GITHUB_PAT>@https://github.com/cyudr/foodrun*
- **Key Deliverables:**
  - Cleaned up the nested `https://` token URL format.
  - Successfully pushed all commits to remote `origin/main` at `https://github.com/cyudr/foodrun.git`.

---

### Prompt 10: Collate Prompts and Errors Documentation
- **User Request:**  
  *1. collate and store as prompts_main.md;  
  2. collate all the errors and respective fixes and store as errors_main.md.*
- **Key Deliverables:**
  - Generated `prompts_main.md` with complete chronological user requests and architectural evolution.
  - Generated `errors_main.md` with deep-dive technical root cause analysis, code diffs, and verification steps.

---

### Prompt 11: Explicit User-Initiated Camera Initialization
- **User Request:**  
  *1. only initialise the camera when i hit initialise camera.*
- **Key Deliverables:**
  - Disabled all automated camera startup effects (`autoStart` removed from `App.tsx` and `CameraScanner.tsx`).
  - Ensured hardware camera device access (`navigator.mediaDevices.getUserMedia`) is solely invoked when the user explicitly taps "Initialise Camera".
  - Maintained standby graphic and photo upload picker in an idle, battery-friendly state until explicitly engaged.

---

### Prompt 12: Photo Library Selection Fix
- **User Request:**  
  *The choose photo opens up camera app instead of going to photos, fix it*
- **Key Deliverables:**
  - Removed `capture="environment"` attribute from the file `<input type="file" accept="image/*">` in `CameraScanner.tsx`.
  - When clicking "Choose Photo" on mobile (iOS/Android) and desktop, the browser now invokes the system photo library / gallery file picker instead of forcefully hijacking the hardware camera capture app.

---

### Prompt 13: Robust Photo Loading, Recipe Reverse-Engineering & Dish Photo Adjustment
- **User Request:**  
  *1. The choose photo function is not working, it allows select photo but photo cannot be loaded for detection;  
  2. Add a feature to reverse engineer food recipe based on photo;  
  3. When recipe is generated (based on pantry ingredients), adjust the dish photo accordingly.*
- **Key Deliverables:**
  - **Robust Photo Loading & Decoding**: Built `src/utils/imageProcessor.ts` supporting iPhone HEIC/HEIF dynamic conversion, robust image decoding with timeout guards, and client-side canvas downsampling (max 1280px) to prevent payload crashes or silent decoding freezes.
  - **Recipe Reverse-Engineering Engine**: Built serverless endpoint `/api/recipes/reverse-engineer` and `handleReverseEngineerRecipe` in `api/gemini.ts`. Deconstructs cooked meals and plated food into secret sauces, seasonings, cooking techniques, flavor radar, and restaurant-quality recipe steps.
  - **Dynamic Dish Photo & Plating Resolver**: Built `src/utils/dishPhotos.ts` and `AdjustDishPhotoModal.tsx` mapping recipes to high-resolution culinary photography based on ingredients, cuisine, and plating styles (Rustic Bistro, Michelin Star Minimalist, Cozy Homestyle, Artisan Cafe).

---

### Prompt 14: Premium Tier for Reverse-Engineering (Chef Pro)
- **User Request:**  
  *The reverse engineer recipe feature is a premium feature*
- **Key Deliverables:**
  - Integrated **SnapChef Pro / Premium** tier architecture.
  - Created `ChefProModal.tsx` showcasing exclusive culinary benefits: AI Dish Recipe Deconstruction, Dynamic Dish Photo Adjustments, and Voice Assistant.
  - Added Mode Switcher on the Scanner ("Scan Ingredients" vs "Reverse Recipe - Pro"), with a 1-tap Free Demo Access Pass toggle for immediate testing.
  - Placed Chef Pro status badge and Pro modal trigger in the header navigation TopBar.

---

### Prompt 15: Completion & GitHub Push
- **User Request:**  
  *Continue where you left off. Git push when done using git push https://<GITHUB_PAT>@https://github.com/cyudr/foodrun*
- **Key Deliverables:**
  - Verified full TypeScript compilation and zero build errors.
  - Pushed all updated source code, utilities, components, and documentation to GitHub.

