import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionFab } from '../action-button';
import { FabCustomMenu } from '../custom-menu';
import { FabOverlay } from '../overlay';
import { SelectionFab } from '../selection-button';
import { FabSpeedDial } from '../speed-dial';
import { FabToggleButton } from '../toggle-button';
import { FabToggleShell } from '../toggle-shell';

describe('FabOverlay', () => {
  it('renders a backdrop button', () => {
    const { container } = render(<FabOverlay onClose={vi.fn()} />);
    expect(container.querySelector('button')).toBeInTheDocument();
  });
});

describe('FabToggleButton', () => {
  it('renders a toggle button with plus icon by default', () => {
    const { container } = render(
      <FabToggleButton isOpen={false} onToggle={vi.fn()} />
    );
    expect(container.querySelector('.lucide-plus')).toBeInTheDocument();
  });

  it('rotates when open', () => {
    const { container } = render(<FabToggleButton isOpen onToggle={vi.fn()} />);
    const btn = container.querySelector('button');
    expect(btn?.className).toContain('rotate-45');
  });
});

describe('SelectionFab', () => {
  it('renders delete button with count', () => {
    const { getByText } = render(
      <SelectionFab
        config={{ count: 3, onDelete: vi.fn(), onCancel: vi.fn() }}
      />
    );
    expect(getByText('Delete (3)')).toBeInTheDocument();
  });
});

describe('ActionFab', () => {
  it('renders a labeled action button', () => {
    const { getByText } = render(
      <ActionFab
        config={{
          label: 'Save Journal',
          onAction: vi.fn(),
          variant: 'primary'
        }}
      />
    );
    expect(getByText('Save Journal')).toBeInTheDocument();
  });

  it('renders icon-only circle when label is absent', () => {
    const MockIcon = () => <span data-testid='mock-icon'>Icon</span>;
    const { getByTestId, container } = render(
      <ActionFab
        config={{
          onAction: vi.fn(),
          icon: MockIcon,
          variant: 'primary'
        }}
      />
    );
    expect(getByTestId('mock-icon')).toBeInTheDocument();
    // No label span should be rendered inside button
    const button = container.querySelector('button');
    const labelSpan = button?.querySelector('span:not([data-testid])');
    expect(labelSpan).not.toBeInTheDocument();
  });

  it('applies circle classes when label is absent', () => {
    const MockIcon = () => <span>Icon</span>;
    const { container } = render(
      <ActionFab
        config={{
          onAction: vi.fn(),
          icon: MockIcon
        }}
      />
    );
    const button = container.querySelector('button');
    expect(button?.className).toContain('w-14');
    expect(button?.className).toContain('h-14');
    expect(button?.className).toContain('rounded-full');
    // Should NOT have pill padding
    expect(button?.className).not.toContain('px-6');
  });

  it('applies pill classes when label is present', () => {
    const MockIcon = () => <span>Icon</span>;
    const { container, getByText } = render(
      <ActionFab
        config={{
          label: 'Next',
          onAction: vi.fn(),
          icon: MockIcon
        }}
      />
    );
    expect(getByText('Next')).toBeInTheDocument();
    const button = container.querySelector('button');
    expect(button?.className).toContain('px-6');
    expect(button?.className).toContain('gap-2');
  });
});

describe('FabCustomMenu', () => {
  it('renders a list of action pills', () => {
    const actions = [
      { label: 'Edit', icon: () => null, onAction: vi.fn() }
    ] as const;
    const { getByText } = render(
      <FabCustomMenu actions={actions} onAction={vi.fn()} />
    );
    expect(getByText('Edit')).toBeInTheDocument();
  });
});

describe('FabSpeedDial', () => {
  it('renders a list of pills', () => {
    const pills = [
      {
        label: 'Checkup',
        icon: () => null,
        delay: 0,
        action: 'navigate' as const,
        href: '/checkup'
      }
    ];
    const { getByText } = render(
      <FabSpeedDial pills={pills} onPillClick={vi.fn()} />
    );
    expect(getByText('Checkup')).toBeInTheDocument();
  });
});

describe('FabToggleShell', () => {
  it('renders children when open', () => {
    const { getByText } = render(
      <FabToggleShell isOpen onClose={vi.fn()} onToggle={vi.fn()}>
        <span>Child Content</span>
      </FabToggleShell>
    );
    expect(getByText('Child Content')).toBeInTheDocument();
  });

  it('hides children when closed', () => {
    const { queryByText } = render(
      <FabToggleShell isOpen={false} onClose={vi.fn()} onToggle={vi.fn()}>
        <span>Child Content</span>
      </FabToggleShell>
    );
    expect(queryByText('Child Content')).not.toBeInTheDocument();
  });

  it('applies visibilityClass to container', () => {
    const { container } = render(
      <FabToggleShell
        isOpen={false}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        visibilityClass='translate-y-0 opacity-100'
      >
        <span>Child</span>
      </FabToggleShell>
    );
    const containerDiv = container.querySelector('[class*="fixed"]');
    expect(containerDiv?.className).toContain('translate-y-0');
    expect(containerDiv?.className).toContain('opacity-100');
  });
});
