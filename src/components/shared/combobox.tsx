'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape accepted by the combobox: at minimum a code and a display name. */
export type ComboboxOption = {
  code: string;
  name: string;
  /** Optional group heading rendered as a cmdk group label. */
  group?: string;
  /** Optional text added to the item filter value (e.g. code + classification). */
  searchText?: string;
};

type BaseProps = {
  readonly options: readonly ComboboxOption[];
  readonly placeholder: string;
  readonly loading?: boolean;
  /** Visible rows before the list scrolls (popover mode only). */
  readonly maxVisibleOptions?: number;
  /** Search input placeholder; defaults to `placeholder`. */
  readonly searchPlaceholder?: string;
  /** Message shown when the search yields no results. */
  readonly emptyMessage?: string;
  /** Subset shown while the search input is empty (quick picks). */
  readonly quickOptions?: readonly ComboboxOption[];
  /** testid passthrough for the floating content. */
  readonly contentTestId?: string;
  /** ARIA role of the trigger: combobox (default) or plain button. */
  readonly triggerRole?: 'combobox' | 'button';
};

type SingleSelectProps = BaseProps & {
  readonly multiple?: false;
  readonly value: string;
  readonly onSelect: (option: ComboboxOption) => void;
};

type MultiSelectProps = BaseProps & {
  readonly multiple: true;
  readonly value: string[];
  readonly onSelect: (codes: string[]) => void;
};

export type ComboboxProps = SingleSelectProps | MultiSelectProps;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Below this width the picker renders as a bottom sheet instead of a popover. */
const MOBILE_QUERY = '(max-width: 640px)';
/** Per-row height used to cap the popover list. */
const ROW_HEIGHT_PX = 40;
/** Default rows visible before the popover list scrolls. */
const DEFAULT_VISIBLE_ROWS = 5;

// ---------------------------------------------------------------------------
// Shared list
// ---------------------------------------------------------------------------

/**
 * cmdk command list shared by the popover and sheet variants: a search input
 * pinned above a scroll-capped list, with optional quick picks and grouping.
 */
function OptionList({
  multiple,
  options,
  quickOptions,
  value,
  placeholder,
  emptyMessage,
  listStyle,
  listClassName,
  inputHeaderTestId,
  onSelect,
  onPick
}: Readonly<{
  multiple: boolean;
  options: readonly ComboboxOption[];
  quickOptions?: readonly ComboboxOption[];
  value: string | string[];
  placeholder: string;
  emptyMessage: string;
  listStyle?: CSSProperties;
  listClassName?: string;
  inputHeaderTestId?: string;
  onSelect: (option: ComboboxOption) => void;
  onPick: () => void;
}>) {
  const quickCodes = useMemo(
    () => new Set((quickOptions ?? []).map(option => option.code)),
    [quickOptions]
  );
  const optionByFilterValue = useMemo(() => {
    const byValue = new Map<string, ComboboxOption>();
    for (const option of options) {
      byValue.set(option.searchText ?? option.name, option);
    }
    return byValue;
  }, [options]);

  /** cmdk filter: quick picks while empty, name/synonym match while typing. */
  const filter = (itemValue: string, search: string): number => {
    if (search === '') {
      if (quickCodes.size > 0) {
        const option = optionByFilterValue.get(itemValue);
        return option && quickCodes.has(option.code) ? 1 : 0;
      }
      return 1;
    }
    return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
  };

  /** Check if an option is selected (works for both string and string[] value). */
  const isSelected = (code: string): boolean =>
    multiple ? (value as string[]).includes(code) : (value as string) === code;

  /** Group options by heading, preserving input order; ungrouped share ''. */
  const groupedOptions = (): Map<string, ComboboxOption[]> => {
    const groups = new Map<string, ComboboxOption[]>();
    for (const option of options) {
      const key = option.group ?? '';
      const list = groups.get(key);
      if (list) list.push(option);
      else groups.set(key, [option]);
    }
    return groups;
  };

  return (
    <Command filter={filter}>
      <div
        data-testid={inputHeaderTestId}
        className={cn(
          'shrink-0',
          inputHeaderTestId !== undefined &&
            'bg-background sticky top-0 z-10 border-b'
        )}
      >
        <CommandInput placeholder={placeholder} />
      </div>
      <CommandList style={listStyle} className={listClassName}>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {[...groupedOptions()].map(([group, groupOptions]) => (
          <CommandGroup key={group || 'ungrouped'} heading={group || undefined}>
            {groupOptions.map(option => (
              <CommandItem
                key={option.code}
                value={option.searchText ?? option.name}
                onSelect={() => {
                  onSelect(option);
                  onPick();
                }}
              >
                {multiple ? (
                  <Checkbox
                    checked={isSelected(option.code)}
                    className='mr-2 h-4 w-4'
                  />
                ) : (
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      isSelected(option.code) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                )}
                {option.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Responsive combobox with single and multi-select modes.
 *
 * Desktop (`min-width: 640px`): shadcn Popover + cmdk, unchanged styling.
 * Mobile: a bare vaul `Drawer` sheet with the search input pinned at the top —
 * deliberately NOT `AppDrawer`, so the one-open-at-a-time drawer registry is
 * never triggered and a parent drawer (profile/clinic/record) stays open.
 *
 * Single-select closes on pick in both modes; multi-select stays open.
 */
export default function Combobox(props: ComboboxProps) {
  const { multiple = false, options = [], placeholder, loading } = props;
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const listMaxHeight =
    (props.maxVisibleOptions ?? DEFAULT_VISIBLE_ROWS) * ROW_HEIGHT_PX;

  // ---- Resolve values based on mode ----
  const singleValue = multiple ? '' : (props as SingleSelectProps).value;
  const multiValue = multiple ? (props as MultiSelectProps).value : [];

  const selectedOptions = options.filter(option =>
    multiple ? multiValue.includes(option.code) : option.code === singleValue
  );
  const triggerText =
    selectedOptions.length > 0
      ? selectedOptions.map(option => option.name).join(', ')
      : placeholder;

  /** Handle item selection: toggle in multi mode, replace in single mode. */
  const handleSelect = (option: ComboboxOption) => {
    if (multiple) {
      const next = multiValue.includes(option.code)
        ? multiValue.filter(code => code !== option.code)
        : [...multiValue, option.code];
      (props as MultiSelectProps).onSelect(next);
    } else {
      (props as SingleSelectProps).onSelect(option);
    }
  };

  const triggerA11y =
    props.triggerRole === 'button'
      ? {}
      : { role: 'combobox' as const, 'aria-expanded': open };
  const triggerClassName =
    'h-[56px] w-full justify-between bg-white px-3 text-sm font-normal';

  /** Shared search+list props for both the popover and the sheet body. */
  const listProps = {
    multiple,
    options,
    quickOptions: props.quickOptions,
    value: multiple ? multiValue : singleValue,
    placeholder: props.searchPlaceholder ?? placeholder,
    emptyMessage: props.emptyMessage ?? 'No results found.',
    onSelect: handleSelect,
    onPick: () => {
      if (!multiple) setOpen(false);
    }
  };

  const triggerContent: ReactNode = loading ? (
    <span className='flex items-center gap-2'>
      <Loader2 className='h-4 w-4 animate-spin' />
      Loading...
    </span>
  ) : (
    <span
      className={cn(
        selectedOptions.length === 0 && 'text-muted-foreground',
        'truncate'
      )}
    >
      {triggerText}
    </span>
  );

  if (isMobile) {
    return (
      <div>
        <Button
          type='button'
          variant='outline'
          {...triggerA11y}
          disabled={loading}
          onClick={() => {
            setOpen(true);
          }}
          className={triggerClassName}
        >
          {triggerContent}
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <OptionList
              {...listProps}
              listClassName='max-h-[55dvh] overflow-y-auto'
              inputHeaderTestId='combobox-sheet-input-header'
            />
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          {...triggerA11y}
          disabled={loading}
          className={triggerClassName}
        >
          {triggerContent}
          <ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-testid={props.contentTestId}
        className='w-[var(--radix-popover-trigger-width)] overflow-hidden p-0'
      >
        <OptionList {...listProps} listStyle={{ maxHeight: listMaxHeight }} />
      </PopoverContent>
    </Popover>
  );
}
