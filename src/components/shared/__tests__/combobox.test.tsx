import AppDrawer from '@/components/ui/app-drawer';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Combobox, { type ComboboxOption } from '../combobox';

const PROVINCES: readonly ComboboxOption[] = [
  { code: '31', name: 'DKI Jakarta' },
  { code: '32', name: 'Jawa Barat' },
  { code: '33', name: 'Jawa Tengah' }
];

const TWO_OPTIONS: readonly ComboboxOption[] = [
  { code: 'a', name: 'Option A' },
  { code: 'b', name: 'Option B' }
];

/** Make (max-width: 640px) match so the sheet variant renders. */
function stubMobileViewport() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('(max-width: 640px)'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Combobox (desktop popover)', () => {
  it('renders the placeholder in the trigger when nothing is selected', () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Select province');
  });

  it('keeps role=combobox and aria-expanded on the trigger', () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a popover with a search input and all options', async () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Select province')
      ).toBeInTheDocument();
      expect(screen.getByText('DKI Jakarta')).toBeInTheDocument();
      expect(screen.getByText('Jawa Barat')).toBeInTheDocument();
    });
  });

  it('filters options by name when typing', async () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    const input = await waitFor(() =>
      screen.getByPlaceholderText('Select province')
    );
    fireEvent.change(input, { target: { value: 'Jawa' } });

    await waitFor(() => {
      expect(screen.getByText('Jawa Barat')).toBeInTheDocument();
      expect(screen.queryByText('DKI Jakarta')).not.toBeInTheDocument();
    });
  });

  it('filters by searchText (e.g. code) when provided', async () => {
    render(
      <Combobox
        options={[
          {
            code: '103T00000X',
            name: 'Psychologist',
            searchText: '103T00000X Psychologist'
          },
          {
            code: '2084P0800X',
            name: 'Psychiatry Physician',
            searchText: '2084P0800X Psychiatry Physician'
          }
        ]}
        value=''
        onSelect={vi.fn()}
        placeholder='Select specialty'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    const input = await waitFor(() =>
      screen.getByPlaceholderText('Select specialty')
    );
    fireEvent.change(input, { target: { value: '103T' } });

    await waitFor(() => {
      expect(screen.getByText('Psychologist')).toBeInTheDocument();
      expect(
        screen.queryByText('Psychiatry Physician')
      ).not.toBeInTheDocument();
    });
  });

  it('renders group headings in the popover', async () => {
    render(
      <Combobox
        options={[
          { code: 'a', name: 'Option A', group: 'Group One' },
          { code: 'b', name: 'Option B', group: 'Group One' },
          { code: 'c', name: 'Option C', group: 'Group Two' },
          { code: 'd', name: 'Option D' }
        ]}
        value=''
        onSelect={vi.fn()}
        placeholder='Select items'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Group One')).toBeInTheDocument();
      expect(screen.getByText('Group Two')).toBeInTheDocument();
      expect(screen.getByText('Option D')).toBeInTheDocument();
    });
  });

  it('selects an option and closes the popover on pick', async () => {
    const onSelect = vi.fn();
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={onSelect}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await waitFor(() => screen.getByText('DKI Jakarta')));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ code: '31', name: 'DKI Jakarta' })
    );
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });
  });

  it('toggles multi-select values without closing the popover', async () => {
    const onSelect = vi.fn();
    render(
      <Combobox
        multiple
        options={TWO_OPTIONS}
        value={[]}
        onSelect={onSelect}
        placeholder='Select items'
      />
    );

    // The cmdk search input also exposes role=combobox once open, so keep a
    // reference to the trigger button for assertions while the list is open.
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    fireEvent.click(await waitFor(() => screen.getByText('Option A')));

    expect(onSelect).toHaveBeenCalledWith(['a']);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('caps the popover list height to maxVisibleOptions rows', async () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
        maxVisibleOptions={5}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      const list = document.querySelector('[cmdk-list]');
      expect(list).not.toBeNull();
      expect((list as HTMLElement).style.maxHeight).toBe('200px');
    });
  });
});

describe('Combobox (mobile sheet)', () => {
  beforeEach(() => {
    stubMobileViewport();
  });

  it('renders a sheet with a pinned search input instead of a popover', async () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(
        screen.getByTestId('combobox-sheet-input-header')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Select province')
      ).toBeInTheDocument();
      expect(screen.getByText('DKI Jakarta')).toBeInTheDocument();
    });
  });

  it('keeps the search input inside the pinned header above the list', async () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      const header = screen.getByTestId('combobox-sheet-input-header');
      expect(header.querySelector('input')).not.toBeNull();
      expect(document.querySelector('[cmdk-list]')).not.toBeNull();
    });
  });

  it('insets the search field as a rounded chip on a padded white header', async () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      const header = screen.getByTestId('combobox-sheet-input-header');
      expect(header.className).toContain('p-3');
      expect(header.className).toContain('bg-white');

      const wrapper = header.querySelector('[data-cmdk-input-wrapper]');
      expect(wrapper).not.toBeNull();
      expect(wrapper?.className).toContain('rounded-xl');
      expect(wrapper?.className).toContain('bg-[#efefef]');
    });
  });

  it('keeps role=combobox and aria-expanded on the trigger in sheet mode', async () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('closes the sheet on single select', async () => {
    const onSelect = vi.fn();
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={onSelect}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await waitFor(() => screen.getByText('DKI Jakarta')));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ code: '31' })
    );
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });
  });

  it('keeps the sheet open for multi-select toggling', async () => {
    const onSelect = vi.fn();
    render(
      <Combobox
        multiple
        options={TWO_OPTIONS}
        value={[]}
        onSelect={onSelect}
        placeholder='Select items'
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    fireEvent.click(await waitFor(() => screen.getByText('Option A')));

    expect(onSelect).toHaveBeenCalledWith(['a']);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('floors the sheet height so short option lists sit mid-screen', async () => {
    render(
      <Combobox
        options={TWO_OPTIONS}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      const panel = document.querySelector('[data-vaul-drawer]');
      expect(panel).not.toBeNull();
      expect((panel as HTMLElement).className).toContain('min-h-[40dvh]');
    });
  });

  it('suspends the host AppDrawer while the sheet is open and restores it on close', async () => {
    render(
      <AppDrawer open onClose={vi.fn()} title='Address' description='Edit'>
        <Combobox
          options={PROVINCES}
          value=''
          onSelect={vi.fn()}
          placeholder='Select province'
        />
      </AppDrawer>
    );

    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(document.querySelector('[data-suspended="true"]')).toBeNull();

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(
        screen.getByTestId('combobox-sheet-input-header')
      ).toBeInTheDocument();
      // The host panel is hidden but its children stay mounted.
      expect(document.querySelector('[data-suspended="true"]')).not.toBeNull();
      expect(screen.getByText('Address')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('DKI Jakarta'));

    await waitFor(() => {
      expect(document.querySelector('[data-suspended="true"]')).toBeNull();
      expect(screen.getByText('Address')).toBeInTheDocument();
    });
  });

  it('suspends nothing when the sheet has no host AppDrawer', async () => {
    render(
      <Combobox
        options={PROVINCES}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(
        screen.getByTestId('combobox-sheet-input-header')
      ).toBeInTheDocument();
      expect(document.querySelector('[data-suspended]')).toBeNull();
    });
  });
});
