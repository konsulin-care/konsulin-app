import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createNextImageMock } from './next-image';

describe('createNextImageMock', () => {
  it('returns an object with __esModule and a default component', () => {
    const mock = createNextImageMock();
    expect(mock).toHaveProperty('__esModule', true);
    expect(mock).toHaveProperty('default');
    expect(typeof mock.default).toBe('function');
  });

  it('renders an img element with src and alt', () => {
    const MockImage = createNextImageMock().default;
    render(<MockImage src='/photo.jpg' alt='Description' />);

    const img = screen.getByTestId('next-image');
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', '/photo.jpg');
    expect(img).toHaveAttribute('alt', 'Description');
  });

  it('filters out next/image-specific props (fill, priority, etc.)', () => {
    const MockImage = createNextImageMock().default;
    render(
      <MockImage
        src='/photo.jpg'
        alt='Test'
        fill
        priority
        loading='lazy'
        placeholder='blur'
        blurDataURL='data:image/placeholder'
        onLoadingComplete={undefined}
        onError={undefined}
      />
    );

    const img = screen.getByTestId('next-image');
    expect(img).not.toHaveAttribute('fill');
    expect(img).not.toHaveAttribute('priority');
    expect(img).not.toHaveAttribute('loading');
    expect(img).not.toHaveAttribute('placeholder');
    expect(img).not.toHaveAttribute('blurDataURL');
    expect(img).not.toHaveAttribute('onLoadingComplete');
    expect(img).not.toHaveAttribute('onError');
  });

  it('passes through standard HTML attributes (className, sizes, width, height)', () => {
    const MockImage = createNextImageMock().default;
    render(
      <MockImage
        src='/photo.jpg'
        alt='Test'
        className='rounded-xl'
        sizes='50vw'
        width={300}
        height={200}
      />
    );

    const img = screen.getByTestId('next-image');
    expect(img).toHaveClass('rounded-xl');
    expect(img).toHaveAttribute('sizes', '50vw');
    expect(img).toHaveAttribute('width', '300');
    expect(img).toHaveAttribute('height', '200');
  });
});
