import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsList, TabsTrigger } from '../tabs';

describe('Tabs', () => {
  it('renders TabsList with the token surface classes', () => {
    render(
      <Tabs defaultValue='one'>
        <TabsList data-testid='list'>
          <TabsTrigger value='one'>One</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    const list = screen.getByTestId('list');
    expect(list.className).toContain('h-11');
    expect(list.className).toContain('rounded-lg');
    expect(list.className).toContain('bg-muted');
    expect(list.className).toContain('text-charcoal-700');
  });

  it('renders the active TabsTrigger with the accent state classes', () => {
    render(
      <Tabs defaultValue='one'>
        <TabsList>
          <TabsTrigger value='one'>One</TabsTrigger>
          <TabsTrigger value='two'>Two</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    const active = screen.getByRole('tab', { name: 'One' });
    expect(active.getAttribute('data-state')).toBe('active');
    expect(active.className).toContain('rounded-md');
    expect(active.className).toContain('data-[state=active]:bg-accent');
    expect(active.className).toContain(
      'data-[state=active]:text-accent-foreground'
    );
    expect(active.className).toContain('data-[state=active]:font-semibold');
  });
});
