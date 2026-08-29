import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src as string}
        alt={alt as string}
        data-testid='next-image'
        {...props}
      />
    );
  }
}));

import Avatar from '../avatar';

describe('Avatar fallback', () => {
  it('renders fallback div with teal #13c2c2 when no photoUrl and no seed', () => {
    render(
      <Avatar
        initials='JD'
        backgroundColor=''
        photoUrl=''
        seed=''
        height={32}
        width={32}
      />
    );

    const fallback = screen.getByText('JD');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveStyle({ backgroundColor: '#13c2c2' });
  });

  it('renders fallback div with teal #13c2c2 when photoUrl and seed are empty', () => {
    render(
      <Avatar initials='AB' backgroundColor='' seed='' height={40} width={40} />
    );

    const fallback = screen.getByText('AB');
    expect(fallback).toHaveStyle({ backgroundColor: '#13c2c2' });
  });
});
