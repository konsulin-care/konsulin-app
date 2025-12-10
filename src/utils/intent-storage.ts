export type IntentKind = 'journal' | 'appointment' | 'assessmentResult';

export interface Intent {
  kind: IntentKind;
  payload: any;
  createdAt: number;
}

const STORAGE_KEY = 'konsulin.intent';

export const saveIntent = (kind: IntentKind, payload: any) => {
  if (typeof window === 'undefined') return;
  const intent: Intent = {
    kind,
    payload,
    createdAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
};

export const getIntent = (): Intent | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Intent;
  } catch {
    return null;
  }
};

export const clearIntent = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};
