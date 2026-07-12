'use client';

import LoadingSpinnerIcon from '@/components/icons/loading-spinner-icon';
import { getAPI } from '@/services/api';
import { fetchCSRFToken } from '@/services/auth';
import { type ChangeEvent, useRef, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  readonly imageUrl: string;
  readonly onImageUrlChange: (url: string) => void;
};

/**
 * Resize an image file to max 800px on the longest side and encode as WEBP.
 *
 * @param file - The source image file
 * @returns A processed File (WEBP format, ≤800px longest side)
 */
async function processImage(file: File): Promise<File> {
  const img = await loadImage(URL.createObjectURL(file));

  const scale = Math.min(800 / img.width, 800 / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to get canvas context');
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/webp', 0.8)
  );
  if (!blob) throw new Error('Failed to encode image as WEBP');

  return new File([blob], 'location.webp', { type: 'image/webp' });
}

/**
 * Load an image from an object URL.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const handleLoad = () => resolve(img);
    const handleError = () => reject(new Error('Failed to load image'));
    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', handleError, { once: true });
    img.src = url;
  });
}

/**
 * Upload a processed image file to the media endpoint.
 *
 * @param file - The processed WEBP file
 * @returns The secure URL returned by the server
 */
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);

  const csrfToken = await fetchCSRFToken();
  const API = await getAPI({ proxy: false, multipart: true });
  const resp = await API.post<{ url: string }>('/api/media/location', fd, {
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
  });

  return resp.data.url;
}

/**
 * File picker + preview for location images.
 *
 * Handles client-side resize (max 800px, WEBP), upload via
 * the Go BFF media endpoint, and visual state management
 * (empty, uploading, uploaded).
 */
export default function LocationImageUploader({
  imageUrl,
  onImageUrlChange
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const processed = await processImage(file);
      const url = await uploadImage(processed);
      onImageUrlChange(url);
    } catch {
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      // Reset input so re-selecting the same file triggers change
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      {imageUrl ? (
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className='w-full'
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt='Location preview'
            className='h-48 w-full rounded-lg object-cover'
          />
        </button>
      ) : (
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className='border-muted-foreground bg-muted text-muted-foreground hover:border-primary flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-sm'
        >
          {uploading ? (
            <LoadingSpinnerIcon width={24} height={24} />
          ) : (
            <span>Upload location image</span>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={e => {
          handleFile(e).catch(() => {
            /* errors handled inside handleFile */
          });
        }}
      />
    </div>
  );
}
