/**
 * SnapChef Image Processing Utility
 * Handles image file reading, HEIC/HEIF conversion, canvas compression, and resizing.
 */

// Dynamically import heic2any only in browser environments if needed
async function convertHeicIfNeeded(file: File | Blob): Promise<Blob> {
  const isHeic =
    (file.type && (file.type.toLowerCase().includes('heic') || file.type.toLowerCase().includes('heif'))) ||
    ('name' in file && typeof file.name === 'string' && /\.(heic|heif)$/i.test(file.name));

  if (!isHeic) {
    return file;
  }

  try {
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default || heic2anyModule;
    const conversionResult = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });

    if (Array.isArray(conversionResult)) {
      return conversionResult[0];
    }
    return conversionResult as Blob;
  } catch (err) {
    console.warn('heic2any conversion fallback warning:', err);
    // If conversion fails, return original file to let standard pipeline attempt decoding
    return file;
  }
}

/**
 * Process any uploaded image file (JPEG, PNG, WebP, HEIC/HEIF, etc.)
 * Resizes down to maxDimension (default 1280px) and returns a clean JPEG data URL.
 */
export async function processImageFile(
  file: File | Blob,
  maxDimension: number = 1280,
  quality: number = 0.82
): Promise<string> {
  if (!file) {
    throw new Error('No image file provided');
  }

  // 1. Convert HEIC if needed
  const normalizedBlob = await convertHeicIfNeeded(file);

  // 2. Load into an Image element via ObjectURL or FileReader
  const objectUrl = URL.createObjectURL(normalizedBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageElement = new Image();
      let hasFinished = false;

      const timeoutId = window.setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Image decoding timed out. Please try a different photo.'));
        }
      }, 15000);

      imageElement.onload = () => {
        if (!hasFinished) {
          hasFinished = true;
          window.clearTimeout(timeoutId);
          resolve(imageElement);
        }
      };

      imageElement.onerror = (err) => {
        if (!hasFinished) {
          hasFinished = true;
          window.clearTimeout(timeoutId);
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to decode image. Please ensure the file is a valid photo.'));
        }
      };

      imageElement.src = objectUrl;
    });

    // 3. Compute scaled dimensions maintaining aspect ratio
    const width = img.naturalWidth || img.width || 720;
    const height = img.naturalHeight || img.height || 960;

    let targetW = width;
    let targetH = height;

    if (targetW > maxDimension || targetH > maxDimension) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDimension) / targetW);
        targetW = maxDimension;
      } else {
        targetW = Math.round((targetW * maxDimension) / targetH);
        targetH = maxDimension;
      }
    }

    // 4. Render to Canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Unable to initialize canvas context for image processing');
    }

    // Smoothing settings for high quality food photography downscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // 5. Output JPEG data URL
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    // Clean up
    URL.revokeObjectURL(objectUrl);
    return dataUrl;
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}
