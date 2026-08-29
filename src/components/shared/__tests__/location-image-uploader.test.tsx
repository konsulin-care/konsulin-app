import LocationImageUploader, {
  uploadImage
} from '@/components/shared/location-image-uploader';
import { getAPI } from '@/services/api';
import { fetchCSRFToken } from '@/services/auth';
import { fireEvent, render, screen } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/auth', () => ({
  fetchCSRFToken: vi.fn()
}));

const mockAxiosInstance = { post: vi.fn() };

describe('LocationImageUploader', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadImage', () => {
    it('calls getAPI with proxy:false and multipart:true for file upload', async () => {
      vi.mocked(fetchCSRFToken).mockResolvedValue('test-csrf-token-123');
      vi.mocked(getAPI).mockResolvedValue(
        mockAxiosInstance as unknown as AxiosInstance
      );
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: { url: 'https://res.cloudinary.com/test/image.webp' }
      });

      const file = new File(['fake-image'], 'test.webp', {
        type: 'image/webp'
      });
      const result = await uploadImage(file);

      expect(getAPI).toHaveBeenCalledWith({ proxy: false, multipart: true });
      expect(fetchCSRFToken).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/media/location',
        expect.any(FormData),
        { headers: { 'X-CSRF-Token': 'test-csrf-token-123' } }
      );
      expect(result).toBe('https://res.cloudinary.com/test/image.webp');
    });

    it('proceeds without X-CSRF-Token header when fetchCSRFToken returns null', async () => {
      vi.mocked(fetchCSRFToken).mockResolvedValue(null);
      vi.mocked(getAPI).mockResolvedValue(
        mockAxiosInstance as unknown as AxiosInstance
      );
      vi.mocked(mockAxiosInstance.post).mockResolvedValue({
        data: { url: 'https://res.cloudinary.com/test/image.webp' }
      });

      const file = new File(['fake-image'], 'test.webp', {
        type: 'image/webp'
      });
      const result = await uploadImage(file);

      expect(getAPI).toHaveBeenCalledWith({ proxy: false, multipart: true });
      expect(fetchCSRFToken).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/media/location',
        expect.any(FormData),
        { headers: {} }
      );
      expect(result).toBe('https://res.cloudinary.com/test/image.webp');
    });
  });

  describe('rendering', () => {
    it('renders full-width upload button when imageUrl is empty', () => {
      render(<LocationImageUploader imageUrl='' onImageUrlChange={vi.fn()} />);

      const btn = screen.getByRole('button', { name: /upload/i });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain('w-full');
      expect(btn.className).toContain('h-32');
    });

    it('renders image preview without a clear button when imageUrl is set', () => {
      render(
        <LocationImageUploader
          imageUrl='https://res.cloudinary.com/test/image/upload/v1/sample.webp'
          onImageUrlChange={vi.fn()}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        'src',
        'https://res.cloudinary.com/test/image/upload/v1/sample.webp'
      );
      expect(img.className).toContain('w-full');
      expect(img.className).toContain('h-48');

      // Clear button must NOT be present
      expect(
        screen.queryByRole('button', { name: /clear/i })
      ).not.toBeInTheDocument();
    });

    it('wraps image preview in a clickable button that does not clear the image on cancel', () => {
      const onImageUrlChange = vi.fn();
      render(
        <LocationImageUploader
          imageUrl='https://res.cloudinary.com/test/image/upload/v1/sample.webp'
          onImageUrlChange={onImageUrlChange}
        />
      );

      const img = screen.getByRole('img');
      const parentButton = img.closest('button');
      expect(parentButton).toBeInTheDocument();
      expect(parentButton).toHaveAttribute('type', 'button');

      // Clicking the button does not call onImageUrlChange (cancelling retains image)
      fireEvent.click(parentButton);
      expect(onImageUrlChange).not.toHaveBeenCalled();
    });
  });
});
