import { FhirExtensionUrls } from '@/utils/fhir/extensions';
import { fireEvent, render, screen } from '@testing-library/react';
import type { HealthcareService } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import ServiceCard from '../service-card';

const activeService: HealthcareService = {
  resourceType: 'HealthcareService',
  id: 'svc-1',
  active: true,
  name: 'General Consultation',
  extraDetails: 'Standard checkup',
  extension: [
    {
      url: FhirExtensionUrls.fee,
      valueMoney: { value: 150_000, currency: 'IDR' }
    },
    { url: FhirExtensionUrls.serviceDuration, valueInteger: 30 }
  ]
};

const inactiveService: HealthcareService = {
  resourceType: 'HealthcareService',
  id: 'svc-2',
  active: false,
  name: 'Old Service',
  extraDetails: 'No longer offered'
};

const minimalService: HealthcareService = {
  resourceType: 'HealthcareService',
  id: 'svc-3',
  active: true,
  name: 'Minimal Service'
};

describe('ServiceCard', () => {
  it.each([
    ['service name', 'General Consultation'],
    ['fee formatted as IDR', 'Rp 150,000'],
    ['duration in minutes', '30 min'],
    ['extra details', 'Standard checkup']
  ])('renders %s', (_, text) => {
    render(<ServiceCard service={activeService} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('does not render fee when absent', () => {
    render(<ServiceCard service={minimalService} />);
    expect(screen.queryByText(/Rp/)).not.toBeInTheDocument();
  });

  it('does not render duration when absent', () => {
    render(<ServiceCard service={minimalService} />);
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
  });

  it('does not render extra details when absent', () => {
    render(<ServiceCard service={minimalService} />);
    expect(screen.queryByText('Standard checkup')).not.toBeInTheDocument();
  });

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <ServiceCard service={activeService} isSelected />
    );
    const button = container.querySelector('button');
    expect(button).toHaveClass('border-primary-500');
    expect(button).toHaveClass('ring-2');
    expect(button).toHaveClass('ring-primary-500');
    expect(button).toHaveClass('bg-primary-50');
  });

  it('applies normal border when not selected', () => {
    const { container } = render(<ServiceCard service={activeService} />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('border-gray-200');
    expect(button).toHaveClass('bg-white');
    expect(button).not.toHaveClass('border-primary-500');
  });

  it('renders inactive service with opacity-50', () => {
    const { container } = render(<ServiceCard service={inactiveService} />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('opacity-50');
  });

  it('renders active service without opacity-50', () => {
    const { container } = render(<ServiceCard service={activeService} />);
    const button = container.querySelector('button');
    expect(button).not.toHaveClass('opacity-50');
  });

  it('triggers onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ServiceCard service={activeService} onClick={onClick} />);
    fireEvent.click(screen.getByText('General Consultation'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('triggers onContextMenu on right-click', () => {
    const onContextMenu = vi.fn();
    render(
      <ServiceCard service={activeService} onContextMenu={onContextMenu} />
    );
    const button = screen.getByRole('button');
    fireEvent.contextMenu(button);
    expect(onContextMenu).toHaveBeenCalledOnce();
  });

  it('triggers touch event handlers', () => {
    const onTouchStart = vi.fn();
    const onTouchMove = vi.fn();
    const onTouchEnd = vi.fn();
    render(
      <ServiceCard
        service={activeService}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
    );
    const button = screen.getByRole('button');
    fireEvent.touchStart(button);
    expect(onTouchStart).toHaveBeenCalledOnce();
    fireEvent.touchMove(button);
    expect(onTouchMove).toHaveBeenCalledOnce();
    fireEvent.touchEnd(button);
    expect(onTouchEnd).toHaveBeenCalledOnce();
  });
});
