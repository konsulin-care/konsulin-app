import LocationImageUploader from '@/components/shared/location-image-uploader';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('LocationImageUploader', () => {
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
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });
});
