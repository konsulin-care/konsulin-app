import { FhirExtensionUrls } from '@/utils/fhir/extensions';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ServiceFormDrawer from '../service-form-drawer';

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({
    children,
    open
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-testid='drawer'>{children}</div> : null),
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='drawer-content'>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='drawer-header'>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='drawer-title'>{children}</div>
  ),
  DrawerDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='drawer-description'>{children}</div>
  ),
  DrawerFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='drawer-footer'>{children}</div>
  ),
  DrawerTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='drawer-trigger'>{children}</div>
  )
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    id?: string;
  }) => (
    <input
      type='checkbox'
      data-testid='switch'
      checked={checked}
      onChange={e => onCheckedChange(e.target.checked)}
      id={id}
    />
  )
}));

vi.mock('@/components/ui/switch-field', () => ({
  SwitchField: ({
    checked,
    onCheckedChange,
    label,
    offLabel
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
    offLabel?: string;
  }) => (
    <div data-testid='switch-field'>
      <input
        type='checkbox'
        data-testid='switch'
        checked={checked}
        onChange={e => onCheckedChange(e.target.checked)}
      />
      <span>{checked ? label : (offLabel ?? label)}</span>
    </div>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    id,
    placeholder
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id?: string;
    placeholder?: string;
  }) => (
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
  Textarea: ({
    value,
    onChange,
    id
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    id?: string;
  }) => (
    <textarea
      data-testid='textarea'
      value={value}
      onChange={onChange}
      id={id}
    />
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
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
    expect(screen.getAllByTestId('input').length).toBeGreaterThanOrEqual(2);
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

  it('renders fee input field', () => {
    render(<ServiceFormDrawer {...defaultProps} />);

    expect(screen.getByLabelText('Fee')).toBeInTheDocument();
  });

  it('shows name placeholder without e.g. prefix', () => {
    render(<ServiceFormDrawer {...defaultProps} />);

    const nameInput = screen.getByLabelText('Name');
    expect(nameInput).toHaveAttribute('placeholder', 'General Consultation');
  });

  it('pre-fills fee from existing service extension in edit mode', () => {
    const existing: HealthcareService = {
      resourceType: 'HealthcareService',
      id: 'svc-1',
      active: true,
      name: 'General Consultation',
      extension: [
        {
          url: FhirExtensionUrls.fee,
          valueMoney: { value: 250_000, currency: 'IDR' }
        }
      ]
    };

    render(<ServiceFormDrawer {...defaultProps} service={existing} />);

    const feeInput = screen.getByLabelText('Fee');
    expect(feeInput).toHaveValue('250,000');
  });

  it('includes fee extension on save when fee is entered', () => {
    const onSave = vi.fn();
    render(<ServiceFormDrawer {...defaultProps} onSave={onSave} />);

    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: 'General Consultation' } });

    const feeInput = screen.getByLabelText('Fee');
    fireEvent.change(feeInput, { target: { value: '300000' } });

    const buttons = screen.getAllByTestId('button');
    const saveButton = buttons.find(b => b.textContent === 'Save');
    if (saveButton) fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as HealthcareService;
    expect(saved.extension).toEqual([
      {
        url: FhirExtensionUrls.fee,
        valueMoney: { value: 300_000, currency: 'IDR' }
      }
    ]);
  });

  it('omits fee extension when fee is not entered', () => {
    const onSave = vi.fn();
    render(<ServiceFormDrawer {...defaultProps} onSave={onSave} />);

    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: 'Test Service' } });

    const buttons = screen.getAllByTestId('button');
    const saveButton = buttons.find(b => b.textContent === 'Save');
    if (saveButton) fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as HealthcareService;
    expect(saved.extension).toBeUndefined();
  });

  it('shows fee placeholder without e.g. prefix', () => {
    render(<ServiceFormDrawer {...defaultProps} />);

    const feeInput = screen.getByLabelText('Fee');
    expect(feeInput).toHaveAttribute('placeholder', '250,000');
  });

  it('accepts only numeric digits for fee input', () => {
    render(<ServiceFormDrawer {...defaultProps} />);

    const feeInput = screen.getByLabelText('Fee');
    // Non-numeric characters should be stripped
    fireEvent.change(feeInput, { target: { value: 'abc250def000' } });
    expect(feeInput).toHaveValue('250,000');
  });

  it('shows "Active" label when switch is checked (default)', () => {
    render(<ServiceFormDrawer {...defaultProps} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows "Inactive" label when switch is unchecked', () => {
    render(<ServiceFormDrawer {...defaultProps} />);

    const switchInput = screen.getByTestId('switch');
    fireEvent.click(switchInput);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('omits location from resource when location prop is undefined', () => {
    const onSave = vi.fn();

    render(
      <ServiceFormDrawer
        {...defaultProps}
        location={undefined}
        onSave={onSave}
      />
    );

    const inputs = screen.getAllByTestId('input');
    fireEvent.change(inputs[0], { target: { value: 'No Location Service' } });

    const buttons = screen.getAllByTestId('button');
    const saveButton = buttons.find(b => b.textContent === 'Save');
    if (saveButton) fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as HealthcareService;
    expect(saved.location).toBeUndefined();
    expect(saved.providedBy).toEqual({ reference: 'Organization/clinic-1' });
    expect(saved.name).toBe('No Location Service');
  });
});
