import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../button';

describe('Button', () => {
  it('renders the default variant with token classes', () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('text-primary-foreground');
    expect(button.className).toContain('hover:bg-charcoal-700');
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('rounded-lg');
  });

  it('renders secondary as a bordered card surface', () => {
    render(<Button variant='secondary'>Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('border');
    expect(button.className).toContain('border-border');
    expect(button.className).toContain('bg-card');
    expect(button.className).toContain('text-foreground');
    expect(button.className).not.toContain('bg-secondary');
  });

  it('renders link with the turquoise deep text', () => {
    render(<Button variant='link'>Link</Button>);
    expect(screen.getByRole('button').className).toContain(
      'text-turquoise-deep'
    );
  });

  it.each([
    ['sm', ['h-9']],
    ['lg', ['h-12']],
    ['icon', ['h-11', 'w-11']]
  ] as const)('renders the %s size with its height', (size, classes) => {
    render(<Button size={size}>Sized</Button>);
    const button = screen.getByRole('button');
    for (const cls of classes) {
      expect(button.className).toContain(cls);
    }
  });
});
