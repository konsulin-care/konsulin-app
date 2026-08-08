import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HeaderReminder from '../header-reminder';

describe('HeaderReminder precedence', () => {
  it('renders nothing when no cards are available', () => {
    const { container } = render(<HeaderReminder isSessionUrgent={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the session card when the session is urgent even if research exists', () => {
    render(
      <HeaderReminder
        isSessionUrgent
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    expect(screen.getByText('Session card')).toBeTruthy();
    expect(screen.queryByText('Research card')).toBeNull();
  });

  it('renders the research card when the session is not urgent', () => {
    render(
      <HeaderReminder
        isSessionUrgent={false}
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    expect(screen.getByText('Research card')).toBeTruthy();
    expect(screen.queryByText('Session card')).toBeNull();
  });

  it('falls back to the session card when research is unavailable', () => {
    render(
      <HeaderReminder
        isSessionUrgent={false}
        session={<div>Session card</div>}
      />
    );

    expect(screen.getByText('Session card')).toBeTruthy();
  });

  it('renders nothing when only the research card is absent and the session is not urgent', () => {
    const { container } = render(<HeaderReminder isSessionUrgent={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the session is urgent but the session card is absent', () => {
    const { container } = render(<HeaderReminder isSessionUrgent />);
    expect(container.firstChild).toBeNull();
  });

  it('wraps the single card in the header-reminder testid container', () => {
    render(
      <HeaderReminder isSessionUrgent session={<div>Session card</div>} />
    );

    const wrapper = document.querySelector('[data-testid="header-reminder"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.textContent).toContain('Session card');
  });

  it('renders exactly one static card with no swiper or autoplay markup', () => {
    render(
      <HeaderReminder
        isSessionUrgent={false}
        session={<div>Session card</div>}
        research={<div>Research card</div>}
      />
    );

    expect(document.querySelector('.swiper')).toBeNull();
    const cards = document.querySelectorAll(
      '[data-testid="header-reminder"] > *'
    );
    expect(cards.length).toBe(1);
  });
});
