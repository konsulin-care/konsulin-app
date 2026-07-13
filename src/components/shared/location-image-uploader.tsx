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
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);

    const scale = Math.min(800 / image.width, 800 / image.height, 1);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to get canvas context');
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/webp', 0.8);
    });
    if (!blob) throw new Error('Failed to encode image as WEBP');

    return new File([blob], 'location.webp', { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Load an image from an object URL.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img), { once: true });
    img.addEventListener(
      'error',
      () => reject(new Error('Failed to load image')),
      { once: true }
    );
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

/** Preview/upload-toggle button for location image. */
function LocationImageToggle({
  imageUrl,
  uploading,
  onClick
}: {
  imageUrl: string;
  uploading: boolean;
  onClick: () => void;
}) {
  if (imageUrl) {
    return (
      <button
        type='button'
        onClick={onClick}
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
    );
  }

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={uploading}
      className='border-muted-foreground bg-muted text-muted-foreground hover:border-primary flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-sm'
    >
      {uploading ? (
        <LoadingSpinnerIcon width={24} height={24} />
      ) : (
        <span>Upload location image</span>
      )}
    </button>
  );
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

  /** Handle file selection: process, upload, update URL. */
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
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      <LocationImageToggle
        imageUrl={imageUrl}
        uploading={uploading}
        onClick={() => inputRef.current?.click()}
      />
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={e => {
          void handleFile(e);
        }}
      />
    </div>
  );
}
