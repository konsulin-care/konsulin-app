import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConsentDrawer from '../consent-drawer';

describe('ConsentDrawer', () => {
  it('renders the informed consent copy with a single CTA', () => {
    render(<ConsentDrawer open onClose={vi.fn()} onAgree={vi.fn()} />);

    expect(screen.getByText(/participation is voluntary/i)).toBeTruthy();
    expect(screen.getByText(/pseudonymized form/i)).toBeTruthy();
    expect(screen.getByText(/By agreeing to participate/i)).toBeTruthy();
    expect(
      screen.getByText(/Every questionnaire you complete counts/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Indonesia's Personal Data Protection Law \(UU PDP\)/i)
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Agree to Participate' })
    ).toBeTruthy();
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
});
