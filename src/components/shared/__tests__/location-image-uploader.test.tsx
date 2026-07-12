import LocationImageUploader, {
  uploadImage
} from '@/components/shared/location-image-uploader';
import { getAPI } from '@/services/api';
import { fetchCSRFToken } from '@/services/auth';
import { render, screen } from '@testing-library/react';
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
    it('fetches CSRF token and includes it as X-CSRF-Token header', async () => {
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
    it('renders upload prompt when imageUrl is empty', () => {
      render(<LocationImageUploader imageUrl='' onImageUrlChange={vi.fn()} />);

      expect(screen.getByText(/upload location image/i)).toBeInTheDocument();
    });

    it('renders preview and clear button when imageUrl is set', () => {
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
      expect(
        screen.getByRole('button', { name: /clear/i })
      ).toBeInTheDocument();
    });
  });
});
