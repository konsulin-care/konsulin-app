/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ServiceFormDrawer from '../service-form-drawer';

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: any) =>
    open ? <div data-testid='drawer'>{children}</div> : null,
  DrawerContent: ({ children }: any) => (
    <div data-testid='drawer-content'>{children}</div>
  ),
  DrawerHeader: ({ children }: any) => (
    <div data-testid='drawer-header'>{children}</div>
  ),
  DrawerTitle: ({ children }: any) => (
    <div data-testid='drawer-title'>{children}</div>
  ),
  DrawerDescription: ({ children }: any) => (
    <div data-testid='drawer-description'>{children}</div>
  ),
  DrawerFooter: ({ children }: any) => (
    <div data-testid='drawer-footer'>{children}</div>
  ),
  DrawerTrigger: ({ children }: any) => (
    <div data-testid='drawer-trigger'>{children}</div>
  )
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <input
      type='checkbox'
      data-testid='switch'
      checked={checked}
      onChange={e => onCheckedChange(e.target.checked)}
      id={id}
    />
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, id, placeholder }: any) => (
    <input
      data-testid='input'
      value={value}
      onChange={onChange}
      id={id}
      placeholder={placeholder}
    />
  )
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, id }: any) => (
    <textarea
      data-testid='textarea'
      value={value}
      onChange={onChange}
      id={id}
    />
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button data-testid='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}));

import type { HealthcareService } from 'fhir/r4';

describe('ServiceFormDrawer', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    providedBy: 'Organization/clinic-1',
    location: 'Location/loc-1'
  };

  it('renders form fields in create mode (empty service)', () => {
    render(<ServiceFormDrawer {...defaultProps} />);

    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    expect(screen.getByTestId('switch')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('textarea')).toBeInTheDocument();
  });

  it('pre-fills fields from existing service in edit mode', () => {
    const existing: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-1',
      active: true,
      name: 'General Consultation',
      extraDetails: 'Standard consultation'
    };

    render(<ServiceFormDrawer {...defaultProps} service={existing} />);

    const inputs = screen.getAllByTestId('input');
    expect(inputs[0]).toHaveValue('General Consultation');

    const textareas = screen.getAllByTestId('textarea');
    expect(textareas[0]).toHaveValue('Standard consultation');
  });

  it('shows providedBy and location as read-only context', () => {
    render(<ServiceFormDrawer {...defaultProps} />);

    expect(screen.getByText(/Organization\/clinic-1/)).toBeInTheDocument();
    expect(screen.getByText(/Location\/loc-1/)).toBeInTheDocument();
  });

  it('calls onSave with service data on submit', () => {
    const onSave = vi.fn();

    render(<ServiceFormDrawer {...defaultProps} onSave={onSave} />);

    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: 'Test Service' } });

    const buttons = screen.getAllByTestId('button');
    const saveButton = buttons.find(b => b.textContent === 'Save');
    if (saveButton) fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Service',
        active: true,
        providedBy: { reference: 'Organization/clinic-1' },
        location: [{ reference: 'Location/loc-1' }]
      })
    );
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = vi.fn();

    render(<ServiceFormDrawer {...defaultProps} onClose={onClose} />);

    const buttons = screen.getAllByTestId('button');
    const cancelButton = buttons.find(b => b.textContent === 'Cancel');
    if (cancelButton) fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
