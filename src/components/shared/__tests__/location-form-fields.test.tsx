import { DayOfWeek, TimeRange } from '@/types/availability';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LocationFormFields from '../location-form-fields';

const emptyHours: Record<DayOfWeek, TimeRange[]> = {
  0: [],
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: []
};

const defaultProps = {
  status: 'active' as const,
  name: '',
  addressLine: '',
  provinceCode: '',
  cityCode: '',
  districtCode: '',
  longitude: '',
  latitude: '',
  listProvinces: [] as { code: string; name: string }[],
  listCities: [] as { code: string; name: string }[],
  listDistricts: [] as { code: string; name: string }[],
  provinceLoading: false,
  cityLoading: false,
  districtLoading: false,
  hours: emptyHours,
  onStatusChange: vi.fn(),
  onNameChange: vi.fn(),
  onAddressLineChange: vi.fn(),
  onProvinceSelect: vi.fn(),
  onCitySelect: vi.fn(),
  onDistrictSelect: vi.fn(),
  onLongitudeChange: vi.fn(),
  onLatitudeChange: vi.fn(),
  onAddTimeRange: vi.fn(),
  onUpdateTimeRange: vi.fn(),
  onDeleteTimeRange: vi.fn()
};

describe('LocationFormFields', () => {
  it('renders status toggle with Open and Closed buttons', () => {
    render(<LocationFormFields {...defaultProps} />);

    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('highlights active status button', () => {
    render(<LocationFormFields {...defaultProps} status='active' />);

    const openBtn = screen.getByText('Open');
    const closedBtn = screen.getByText('Closed');

    // Open should be the active/selected one
    expect(openBtn.className).toContain('bg-secondary');
    expect(closedBtn.className).not.toContain('bg-secondary');
  });

  it('highlights inactive status button when status is inactive', () => {
    render(<LocationFormFields {...defaultProps} status='inactive' />);

    const openBtn = screen.getByText('Open');
    const closedBtn = screen.getByText('Closed');

    expect(closedBtn.className).toContain('bg-secondary');
    expect(openBtn.className).not.toContain('bg-secondary');
  });

  it('calls onStatusChange when Open/Closed clicked', () => {
    const onStatus = vi.fn();
    render(<LocationFormFields {...defaultProps} onStatusChange={onStatus} />);

    fireEvent.click(screen.getByText('Closed'));
    expect(onStatus).toHaveBeenCalledWith('inactive');

    fireEvent.click(screen.getByText('Open'));
    expect(onStatus).toHaveBeenCalledWith('active');
  });

  it('renders name input', () => {
    render(<LocationFormFields {...defaultProps} name='Test Clinic' />);

    const input = screen.getByLabelText('Location Name');
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Test Clinic');
  });

  it('calls onNameChange when name input changes', () => {
    const onName = vi.fn();
    render(<LocationFormFields {...defaultProps} onNameChange={onName} />);

    fireEvent.change(screen.getByLabelText('Location Name'), {
      target: { value: 'New Name' }
    });
    expect(onName).toHaveBeenCalledWith('New Name');
  });

  it('renders address line input', () => {
    render(
      <LocationFormFields {...defaultProps} addressLine='Jl. Test No. 1' />
    );

    const input = screen.getByLabelText('Address');
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('Jl. Test No. 1');
  });

  it('calls onAddressLineChange when address input changes', () => {
    const onAddr = vi.fn();
    render(
      <LocationFormFields {...defaultProps} onAddressLineChange={onAddr} />
    );

    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: 'Jl. Baru No. 5' }
    });
    expect(onAddr).toHaveBeenCalledWith('Jl. Baru No. 5');
  });

  it('renders province combobox', () => {
    render(<LocationFormFields {...defaultProps} />);

    expect(screen.getByText('Select Province')).toBeInTheDocument();
  });

  it('renders city combobox only when province is selected', () => {
    const { rerender } = render(
      <LocationFormFields {...defaultProps} provinceCode='' />
    );

    expect(screen.queryByText('Select City')).not.toBeInTheDocument();

    rerender(<LocationFormFields {...defaultProps} provinceCode='31' />);

    expect(screen.getByText('Select City')).toBeInTheDocument();
  });

  it('renders district combobox only when city is selected', () => {
    const { rerender } = render(
      <LocationFormFields {...defaultProps} provinceCode='31' cityCode='' />
    );

    // City visible, district not visible
    expect(screen.getByText('Select City')).toBeInTheDocument();
    expect(screen.queryByText('Select District')).not.toBeInTheDocument();

    rerender(
      <LocationFormFields {...defaultProps} provinceCode='31' cityCode='3173' />
    );

    expect(screen.getByText('Select District')).toBeInTheDocument();
  });

  it('renders longitude and latitude inputs', () => {
    render(
      <LocationFormFields
        {...defaultProps}
        longitude='106.846'
        latitude='-6.305'
      />
    );

    expect(screen.getByLabelText('Longitude').value).toBe('106.846');
    expect(screen.getByLabelText('Latitude').value).toBe('-6.305');
  });

  it('calls onLongitudeChange and onLatitudeChange', () => {
    const onLon = vi.fn();
    const onLat = vi.fn();
    render(
      <LocationFormFields
        {...defaultProps}
        onLongitudeChange={onLon}
        onLatitudeChange={onLat}
      />
    );

    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '107.0' }
    });
    expect(onLon).toHaveBeenCalledWith('107.0');

    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '-7.0' }
    });
    expect(onLat).toHaveBeenCalledWith('-7.0');
  });

  it('renders LocationHoursEditor component', () => {
    render(<LocationFormFields {...defaultProps} />);

    // Day selector buttons should be visible
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Monday Hours')).toBeInTheDocument();
  });
});
