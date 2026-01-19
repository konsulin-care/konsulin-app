const STORAGE_KEY = 'konsulin.guestAssessmentResponseIds';

function safeParseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );
  } catch {
    return [];
  }
}

export function getGuestAssessmentResponseIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return safeParseIds(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function setGuestAssessmentResponseIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const unique = Array.from(
      new Set(
        ids.filter(
          (id): id is string => typeof id === 'string' && id.length > 0
        )
      )
    );

    if (unique.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  } catch {
    // ignore
  }
}

export function addGuestAssessmentResponseId(id: string): void {
  if (!id) return;
  const existing = getGuestAssessmentResponseIds();
  if (existing.includes(id)) return;
  setGuestAssessmentResponseIds([...existing, id]);
}

export function clearGuestAssessmentResponseIds(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
