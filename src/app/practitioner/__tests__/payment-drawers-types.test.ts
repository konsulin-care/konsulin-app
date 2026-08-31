import { describe, expect, it } from 'vitest';
import type { PayAppointmentFn, PractitionerAvatar } from '../payment-drawer';
import PaymentDrawers from '../payment-drawers';

describe('PaymentDrawers type exports', () => {
  it('exports PayAppointmentFn type from payment-drawer', () => {
    // Type-level check: ensure the type is importable
    const fn: PayAppointmentFn = async () => ({ data: undefined });
    expect(fn).toBeDefined();
  });

  it('exports PractitionerAvatar type from payment-drawer', () => {
    // Type-level check: ensure the type is importable
    const avatar: PractitionerAvatar = { photoUrl: 'test.jpg' };
    expect(avatar).toBeDefined();
  });

  it('PaymentDrawers component is importable', () => {
    expect(PaymentDrawers).toBeDefined();
  });
});
