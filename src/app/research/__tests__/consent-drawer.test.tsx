import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConsentDrawer from '../consent-drawer';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

describe('ConsentDrawer', () => {
  it('renders the informed consent copy with a single CTA', () => {
    render(<ConsentDrawer open onClose={vi.fn()} onAgree={vi.fn()} />);

    expect(screen.getByText(/participation is voluntary/i)).toBeTruthy();
    expect(screen.getByText(/pseudonymized form/i)).toBeTruthy();
    expect(screen.getByText(/By agreeing to participate/i)).toBeTruthy();
    expect(
      screen.getByText(/Every questionnaire you complete counts/i)
    ).toBeTruthy();
    expect(screen.queryByText(/participation streak/i)).toBeNull();
    expect(
      screen.getByText(/Indonesia's Personal Data Protection Law \(UU PDP\)/i)
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Agree to Participate' })
    ).toBeTruthy();
  });

  it('names the study and picks the batch line', () => {
    const profile = {
      title: 'Sleep',
      groupName: 'Lab A',
      leadName: 'Dr. Sari',
      batchCount: 3
    };
    const { rerender } = render(
      <ConsentDrawer
        open
        onClose={vi.fn()}
        onAgree={vi.fn()}
        profile={profile}
      />
    );
    expect(
      screen.getByText('Sleep is run by Lab A and led by Dr. Sari.')
    ).toBeTruthy();
    expect(screen.getByText(/This study has 3 batches/)).toBeTruthy();
    expect(screen.queryByText(/fixed period/)).toBeNull();
    rerender(
      <ConsentDrawer
        open
        onClose={vi.fn()}
        onAgree={vi.fn()}
        profile={{ ...profile, batchCount: 1 }}
      />
    );
    expect(screen.getByText(/one-time study/)).toBeTruthy();
  });

  it('fires onAgree when the CTA is clicked', () => {
    const onAgree = vi.fn();
    render(<ConsentDrawer open onClose={vi.fn()} onAgree={onAgree} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Agree to Participate' })
    );

    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(<ConsentDrawer open={false} onClose={vi.fn()} onAgree={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Agree to Participate' })
    ).toBeNull();
  });

  it('uses muted and foreground tokens instead of gray utilities', () => {
    const { container } = render(
      <ConsentDrawer open onClose={vi.fn()} onAgree={vi.fn()} />
    );

    expect(
      screen.getByText(/participation is voluntary/i).closest('.space-y-3')
        ?.className
    ).toContain('text-muted-foreground');
    expect(screen.getByText(/By agreeing to participate/i).className).toContain(
      'text-foreground'
    );
    expect(container.innerHTML).not.toMatch(
      /text-gray-|bg-gray-|border-gray-|text-black/
    );
  });
});
