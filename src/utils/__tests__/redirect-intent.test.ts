/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearIntent, getIntent, saveIntent } from '../redirect-intent';
import { assertDefined } from './test-utils';

const LOCAL_STORAGE_KEY = 'konsulin.intent';

function readStored(): any {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  assertDefined(raw);
  return JSON.parse(raw);
}

describe('saveIntent', () => {
  beforeEach(() => {
    localStorage.clear();
    // eslint-disable-next-line unicorn/no-document-cookie
    document.cookie = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('writes structured intent to localStorage', () => {
    saveIntent('assessmentResult', {
      path: '/record/some-id?tab=results'
    });

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    assertDefined(raw);

    const parsed = JSON.parse(raw);
    expect(parsed.kind).toBe('assessmentResult');
    expect(parsed.payload.path).toBe('/record/some-id?tab=results');
    expect(parsed.createdAt).toBeGreaterThan(0);
  });

  it('writes structured intent to cookie as fallback', () => {
    saveIntent('assessmentResult', {
      path: '/record/abc'
    });

    expect(document.cookie).toContain('redirect_intent=');
    const match = /redirect_intent=([^;]*)/.exec(document.cookie);
    assertDefined(match);

    const raw = decodeURIComponent(match[1]);
    const parsed = JSON.parse(raw);
    expect(parsed.kind).toBe('assessmentResult');
    expect(parsed.payload.path).toBe('/record/abc');
  });

  it('getIntent retrieves intent saved by saveIntent', () => {
    saveIntent('assessmentResult', {
      path: '/record/test-123'
    });

    const intent = getIntent();
    assertDefined(intent);
    expect(intent.kind).toBe('assessmentResult');
    expect(intent.payload.path).toBe('/record/test-123');
  });

  it('clearIntent removes intent from localStorage', () => {
    saveIntent('assessmentResult', { path: '/record/x' });
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).not.toBeNull();

    clearIntent();
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull();
  });

  it('handles multiple kind types', () => {
    saveIntent('journal', { path: '/journal/new' });
    expect(readStored().kind).toBe('journal');

    clearIntent();

    saveIntent('appointment', {
      path: '/practitioner?id=123',
      slot: { date: '2026-06-20', startTime: '10:00' },
      formData: { session_type: 'online', problem_brief: 'Test' }
    });
    const parsed = readStored();
    expect(parsed.kind).toBe('appointment');
    expect(parsed.payload.slot.date).toBe('2026-06-20');
  });
});
