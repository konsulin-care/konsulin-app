import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ReferralNotice from '../referral-notice';

describe('ReferralNotice', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/research');
  });

  it('renders the consent note when a patient ref is present in the url', () => {
    window.history.replaceState({}, '', '/research?ref=p_DG3F3STPYZ6HX25A');

    render(<ReferralNotice />);

    expect(screen.getByTestId('referral-notice')).toBeInTheDocument();
    expect(screen.getByTestId('referral-notice').textContent).toContain(
      'community credit'
    );
  });

  it('renders nothing without a ref', () => {
    render(<ReferralNotice />);
    expect(screen.queryByTestId('referral-notice')).not.toBeInTheDocument();
  });

  it('renders nothing for a non-patient ref', () => {
    window.history.replaceState({}, '', '/research?ref=g_guest-1');
    render(<ReferralNotice />);
    expect(screen.queryByTestId('referral-notice')).not.toBeInTheDocument();
  });
});
