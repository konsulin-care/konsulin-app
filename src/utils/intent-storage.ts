export type IntentKind = 'journal' | 'appointment' | 'assessmentResult';

export interface Intent {
  kind: IntentKind;
  payload: any;
  createdAt: number;
}

const STORAGE_KEY = 'konsulin.intent';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

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
    const intent = JSON.parse(raw) as Intent;
    const age = Date.now() - intent.createdAt;

    // prevent reading expired intents
    if (age > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return intent;
  } catch {
    // prevent keeping expired intents
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const clearIntent = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};
