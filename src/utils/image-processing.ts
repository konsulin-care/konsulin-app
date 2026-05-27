/**
 * Utility to crop an image to a centered square, resize to target size,
 * and compress to a specified byte threshold on the client.
 */
export type ProcessedImageResult = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
};

type ProcessImageOptions = {
  targetSizePx?: number;
  maxBytes?: number;
  outputType?: string;
  initialQuality?: number;
  minQuality?: number;
};

const defaultOptions: Required<ProcessImageOptions> = {
  targetSizePx: 250,
  maxBytes: 20_000, // 20KB
  outputType: 'image/webp',
  initialQuality: 0.8,
  minQuality: 0.4
};

const loadImage = (objectUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = objectUrl;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export async function processImageForAvatar(
  file: File,
  options?: ProcessImageOptions
): Promise<ProcessedImageResult> {
  const { targetSizePx, maxBytes, outputType, initialQuality, minQuality } = {
    ...defaultOptions,
    ...options
  };

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    // Step 1: crop to square
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = side;
    cropCanvas.height = side;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) throw new Error('Unable to get crop canvas context');
    cropCtx.drawImage(img, sx, sy, side, side, 0, 0, side, side);

    // Step 2: resize to target
    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetSizePx;
    outCanvas.height = targetSizePx;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) throw new Error('Unable to get output canvas context');
    outCtx.drawImage(
      cropCanvas,
      0,
      0,
      side,
      side,
      0,
      0,
      targetSizePx,
      targetSizePx
    );

    // Step 3: compress with quality fallback
    let quality = initialQuality;
    let blob = await canvasToBlob(outCanvas, outputType, quality);

    while (blob.size > maxBytes && quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.1);
      blob = await canvasToBlob(outCanvas, outputType, quality);
      if (quality === minQuality) break;
    }

    const dataUrl = await blobToDataUrl(blob);

    return {
      blob,
      dataUrl,
      width: targetSizePx,
      height: targetSizePx
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
