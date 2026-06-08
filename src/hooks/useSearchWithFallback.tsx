import { useEffect, useMemo, useReducer, useRef } from 'react';

export interface SearchField {
  path: string;
  transform?: (value: unknown) => string;
}

export interface UseSearchWithFallbackParams<T> {
  data: T[] | undefined;
  searchFields: Array<keyof T | SearchField>;
  serverSearchFunction: (searchTerm: string) => Promise<T[]>;
  searchTerm: string;
  debounceDelay?: number;
  minCharsForServerSearch?: number;
}

type ServerState<T> = {
  isServerSearching: boolean;
  showServerResults: boolean;
  serverSearchTerm: string;
  serverData: T[] | undefined;
  serverSearchCompleted: boolean;
};

type ServerAction<T> =
  | { type: 'RESET' }
  | { type: 'START_SEARCH' }
  | { type: 'SEARCH_SUCCESS'; results: T[]; searchTerm: string }
  | { type: 'SEARCH_ERROR'; searchTerm: string };

function serverReducer<T>(
  state: ServerState<T>,
  action: ServerAction<T>
): ServerState<T> {
  switch (action.type) {
    case 'RESET':
      return {
        isServerSearching: false,
        showServerResults: false,
        serverSearchTerm: '',
        serverData: undefined,
        serverSearchCompleted: false
      };
    case 'START_SEARCH':
      return {
        ...state,
        isServerSearching: true,
        showServerResults: false
      };
    case 'SEARCH_SUCCESS':
      return {
        isServerSearching: false,
        showServerResults: true,
        serverSearchTerm: action.searchTerm,
        serverData: action.results,
        serverSearchCompleted: true
      };
    case 'SEARCH_ERROR':
      return {
        isServerSearching: false,
        showServerResults: false,
        serverSearchTerm: action.searchTerm,
        serverData: undefined,
        serverSearchCompleted: true
      };
    default:
      return state;
  }
}

/** Convert a value to a searchable string, avoiding [object Object]. */
function toSearchString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function getNestedValue(item: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = item;
  for (const part of parts) {
    if (
      current &&
      typeof current === 'object' &&
      Object.hasOwn(current, part)
    ) {
      current = (current as Record<string, unknown>)[part];
    } else {
      current = undefined;
      break;
    }
  }
  return current;
}

function matchesField<T>(
  item: T,
  field: keyof T | SearchField,
  lowerSearchTerm: string
): boolean {
  if (
    typeof field === 'string' ||
    typeof field === 'number' ||
    typeof field === 'symbol'
  ) {
    try {
      const value = (item as Record<string, unknown>)[field as string];
      return (
        value != null &&
        toSearchString(value).toLowerCase().includes(lowerSearchTerm)
      );
    } catch {
      return false;
    }
  }
  try {
    const rawValue = getNestedValue(item, field.path);
    let finalValue = rawValue;
    if (field.transform && rawValue !== undefined) {
      try {
        finalValue = field.transform(rawValue);
      } catch {
        finalValue = rawValue;
      }
    }
    return (
      finalValue != null &&
      toSearchString(finalValue).toLowerCase().includes(lowerSearchTerm)
    );
  } catch {
    return false;
  }
}

/**
 *
 */
export function useSearchWithFallback<T>({
  data,
  searchFields,
  serverSearchFunction,
  searchTerm,
  debounceDelay = 1000,
  minCharsForServerSearch = 3
}: UseSearchWithFallbackParams<T>) {
  const [serverState, dispatch] = useReducer(serverReducer<T>, {
    isServerSearching: false,
    showServerResults: false,
    serverSearchTerm: '',
    serverData: undefined,
    serverSearchCompleted: false
  });

  // Client-side filtering with memoization for performance
  const filteredData = useMemo(() => {
    if (!data || !searchTerm.trim()) {
      return data || [];
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    return data.filter(item => {
      // Skip null/undefined items
      if (!item) return false;

      return searchFields.some(field =>
        matchesField(item, field, lowerSearchTerm)
      );
    });
  }, [data, searchFields, searchTerm]);

  // Track previous search term to prevent duplicate searches
  const prevSearchTermRef = useRef<string>('');
  const serverSearchExecutedRef = useRef<string>('');

  // Use refs for values that shouldn't trigger effect re-runs
  const dataRef = useRef(data);
  const searchFieldsRef = useRef(searchFields);
  const serverSearchFunctionRef = useRef(serverSearchFunction);

  // Update refs when values change
  useEffect(() => {
    dataRef.current = data;
    searchFieldsRef.current = searchFields;
    serverSearchFunctionRef.current = serverSearchFunction;
  }, [data, searchFields, serverSearchFunction]);

  // Server fallback logic with proper prevention of duplicate searches
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    let isMounted = true;

    // Reset server state if search term changes
    if (prevSearchTermRef.current !== searchTerm) {
      prevSearchTermRef.current = searchTerm;
      serverSearchExecutedRef.current = '';

      // Clear server results on new search term
      dispatch({ type: 'RESET' });
    }

    const performServerSearch = () => {
      // Only search if we haven't already searched for this term
      const searchKey = `${searchTerm}-${JSON.stringify(searchFieldsRef.current)}`;
      if (serverSearchExecutedRef.current === searchKey) {
        return; // Prevent duplicate searches
      }

      // Check condition for client-side results using ref
      const lowerSearchTerm = searchTerm.toLowerCase();
      const currentData = dataRef.current || [];
      const clientResults: T[] = [];
      for (const item of currentData) {
        if (!item) continue;
        for (const field of searchFieldsRef.current) {
          if (matchesField(item, field, lowerSearchTerm)) {
            clientResults.push(item);
            break;
          }
        }
      }

      // Only trigger server search if no client results and criteria met
      if (
        searchTerm.length >= minCharsForServerSearch &&
        clientResults.length === 0
      ) {
        // Mark that we're searching for this term
        serverSearchExecutedRef.current = searchKey;
        dispatch({ type: 'START_SEARCH' });

        // Use async IIFE to handle the promise
        (async () => {
          try {
            const results = await serverSearchFunctionRef.current(searchTerm);

            if (isMounted) {
              dispatch({ type: 'SEARCH_SUCCESS', results, searchTerm });
            }
          } catch (error) {
            console.error('Server search failed:', error);
            if (isMounted) {
              dispatch({ type: 'SEARCH_ERROR', searchTerm });
            }
          }
        })();
      }
    };

    // Set up debounce timer only for valid search terms
    if (searchTerm.length >= minCharsForServerSearch) {
      debounceTimer = setTimeout(performServerSearch, debounceDelay);
    }

    return () => {
      // Cleanup
      clearTimeout(debounceTimer);
      isMounted = false;
    };
  }, [searchTerm, debounceDelay, minCharsForServerSearch]);

  return {
    filteredData,
    isServerSearching: serverState.isServerSearching,
    showServerResults: serverState.showServerResults,
    serverSearchTerm: serverState.serverSearchTerm,
    serverData: serverState.serverData,
    serverSearchCompleted: serverState.serverSearchCompleted
  };
}
