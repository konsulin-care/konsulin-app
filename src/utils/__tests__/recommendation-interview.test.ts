import { ASSESSMENT_CATEGORIES } from '@/constants/assessment-categories';
import {
  DECISION_TREE,
  QUICK_COMPLAINT_IDS
} from '@/constants/recommendation-decision-tree';
import {
  SPECIALTY_LABELS,
  SPECIALTY_RESOLUTIONS
} from '@/data/specialty-resolution';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildRecommendationParams,
  clearLastInterviewResult,
  getAllChiefComplaints,
  getQuickComplaints,
  readLastInterviewResult,
  resolveInterviewResult,
  saveLastInterviewResult,
  searchChiefComplaints
} from '../recommendation-interview';

const DOMAIN_CODES = ASSESSMENT_CATEGORIES.map(c => c.code) as string[];

// Mock IndexedDB for persistence tests
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
};

vi.stubGlobal('indexedDB', mockIndexedDB);

let mockDb: IDBDatabase;

function createMockRequest(result?: unknown, error?: DOMException) {
  const req = {
    result: result ?? null,
    error: error ?? null,
    onsuccess: null as unknown as
      | ((this: IDBRequest, ev: Event) => void)
      | null,
    onerror: null as unknown as ((this: IDBRequest, ev: Event) => void) | null,
    onupgradeneeded: null
  };
  return req;
}

function triggerRequest(req: ReturnType<typeof createMockRequest>) {
  if (req.onsuccess) req.onsuccess.call(req, { target: req }); // skipcq: JS-0095 — simulates IDBRequest callback context
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  // Setup mock IndexedDB
  mockDb = {
    transaction: vi.fn(),
    objectStoreNames: ['ui_preferences'],
    version: 3,
    close: vi.fn(),
    addEventListener: vi.fn(),
    onversionchange: null
  } as unknown as IDBDatabase;

  let storedValue: unknown = null;

  /** Creates a request that auto-triggers onsuccess asynchronously. */
  const createAsyncRequest = (result?: unknown) => {
    const req = createMockRequest(result);
    setTimeout(() => triggerRequest(req), 0);
    return req;
  };

  const mockStore = {
    get: vi.fn(() => createAsyncRequest(storedValue)),
    put: vi.fn(value => {
      storedValue = value;
      return createAsyncRequest();
    }),
    delete: vi.fn(() => {
      storedValue = null;
      return createAsyncRequest();
    }),
    clear: vi.fn(),
    getAll: vi.fn(),
    getAllKeys: vi.fn(),
    openCursor: vi.fn(),
    index: vi.fn().mockReturnValue({
      get: vi.fn(),
      getAll: vi.fn(),
      openCursor: vi.fn()
    })
  };

  const mockTransaction = {
    objectStore: vi.fn().mockReturnValue(mockStore),
    oncomplete: null,
    onerror: null,
    onabort: null
  };

  mockDb.transaction = vi.fn().mockReturnValue(mockTransaction);

  mockIndexedDB.open.mockImplementation(() => {
    const req = createMockRequest(mockDb);
    setTimeout(() => triggerRequest(req), 0);
    return req;
  });
});

describe('decision tree data integrity', () => {
  it('covers all 7 ICF domains from ASSESSMENT_CATEGORIES', () => {
    const treeDomains = DECISION_TREE.map(d => d.code);
    for (const code of DOMAIN_CODES) {
      expect(treeDomains).toContain(code);
    }
    expect(treeDomains).toHaveLength(DOMAIN_CODES.length);
  });

  it('keeps complaint ids unique across the whole tree', () => {
    const ids = DECISION_TREE.flatMap(d => d.complaints.map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every complaint within 1..7 options with Other last when present', () => {
    const complaints = DECISION_TREE.flatMap(d => d.complaints);
    for (const complaint of complaints) {
      expect(complaint.options.length).toBeGreaterThanOrEqual(1);
      expect(complaint.options.length).toBeLessThanOrEqual(7);
      const otherIndex = complaint.options.findIndex(o => o.isOther);
      if (otherIndex !== -1) {
        expect(otherIndex).toBe(complaint.options.length - 1);
      }
    }
  });

  it('gives every complaint keywords, serviceTypeCode, icfDomain and red flag', () => {
    const complaints = DECISION_TREE.flatMap(d => d.complaints);
    for (const complaint of complaints) {
      expect(complaint.keywords.length).toBeGreaterThan(0);
      expect(complaint.serviceTypeCode.length).toBeGreaterThan(0);
      expect(complaint.icfDomain).toBe(complaint.icfDomain);
      expect(DOMAIN_CODES).toContain(complaint.icfDomain);
      expect(complaint.redFlag.label.length).toBeGreaterThan(0);
    }
  });

  it('provides emergency resources for every flagged red flag', () => {
    const complaints = DECISION_TREE.flatMap(d => d.complaints);
    for (const complaint of complaints) {
      if (complaint.redFlag.isEmergency) {
        expect(complaint.redFlag.resources.length).toBeGreaterThan(0);
      }
    }
  });

  it('maps the top-5 prevalence complaints into quick chips that exist in the tree', () => {
    const complaintIds = new Set(
      DECISION_TREE.flatMap(d => d.complaints.map(c => c.id))
    );
    expect(QUICK_COMPLAINT_IDS).toHaveLength(5);
    for (const id of QUICK_COMPLAINT_IDS) {
      expect(complaintIds.has(id)).toBe(true);
    }
  });
});

describe('getQuickComplaints and getAllChiefComplaints', () => {
  it('returns quick complaints in exact specified order', () => {
    const quickIds = getQuickComplaints().map(c => c.id);
    expect(quickIds).toEqual([
      'burnout',
      'anxiety-stress',
      'gastrointestinal',
      'pain-musculoskeletal',
      'fever-malaise'
    ]);
  });

  it('getAllChiefComplaints returns all 41 complaints across all domains', () => {
    const all = getAllChiefComplaints();
    expect(all).toHaveLength(41);
  });
});

describe('searchChiefComplaints', () => {
  it('returns the quick complaints for an empty query', () => {
    expect(searchChiefComplaints('').map(c => c.id)).toEqual(
      QUICK_COMPLAINT_IDS
    );
  });

  it('matches complaint labels case-insensitively', () => {
    const hits = searchChiefComplaints('low mood');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].label.toLowerCase()).toContain('mood');
  });

  it('matches synonyms like the Indonesian word for anxious', () => {
    const hits = searchChiefComplaints('cemas');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].keywords.length).toBeGreaterThan(0);
  });

  it('returns an empty list for a dead-end query', () => {
    expect(searchChiefComplaints('zzzz-not-a-complaint')).toEqual([]);
  });
});

describe('getQuickComplaints', () => {
  it('returns five complaints in the declared quick-chip order', () => {
    const quick = getQuickComplaints();
    expect(quick.map(c => c.id)).toEqual(QUICK_COMPLAINT_IDS);
    expect(quick).toHaveLength(5);
  });
});

describe('resolveInterviewResult', () => {
  const pain = DECISION_TREE.flatMap(d => d.complaints).find(
    c => c.id === 'pain-musculoskeletal'
  );
  const mood = DECISION_TREE.flatMap(d => d.complaints).find(
    c => c.id === 'low-mood'
  );

  it('resolves a complaint and option to a deterministic result', () => {
    if (!pain) throw new Error('pain-musculoskeletal complaint missing');
    const optionId = pain.options[0].id;
    const result = resolveInterviewResult('pain-musculoskeletal', optionId);
    expect(result).not.toBeNull();
    expect(result?.icfDomain).toBe('physical-health');
    expect(result?.serviceTypeCode).toBe(pain.serviceTypeCode);
    expect(result?.specialty).toBe(
      SPECIALTY_RESOLUTIONS['pain-musculoskeletal'].nuccCode
    );
  });

  it('maps an Other answer to the generic other-{domain} service code', () => {
    if (!mood) throw new Error('low-mood complaint missing');
    const other = mood.options.find(o => o.isOther);
    expect(other).toBeDefined();
    const result = resolveInterviewResult('low-mood', other?.id ?? '');
    expect(result?.serviceTypeCode).toBe('other-mental-emotional-health');
    expect(result?.specialty).toBe(SPECIALTY_RESOLUTIONS['low-mood'].nuccCode);
  });

  it('returns null for an unknown complaint', () => {
    expect(resolveInterviewResult('not-a-complaint', 'x')).toBeNull();
  });

  it('returns null for an unknown option', () => {
    expect(resolveInterviewResult('low-mood', 'not-an-option')).toBeNull();
  });

  it('resolves without an option to the base complaint result', () => {
    const result = resolveInterviewResult('low-mood');
    expect(result?.specialty).toBe(SPECIALTY_RESOLUTIONS['low-mood'].nuccCode);
    expect(result?.serviceTypeCode).toBe('mood-disorder-care');
  });
});

describe('ontology resolution coverage', () => {
  it('covers every decision-tree complaint id with a label', () => {
    const ids = DECISION_TREE.flatMap(d => d.complaints).map(c => c.id);
    expect(ids).toHaveLength(41);
    for (const id of ids) {
      const resolution = SPECIALTY_RESOLUTIONS[id];
      expect(resolution, `missing resolution for ${id}`).toBeDefined();
      expect(
        SPECIALTY_LABELS[resolution.nuccCode],
        `missing label for ${id}`
      ).toBeTruthy();
    }
  });

  it('every complaint carries authored keywords', () => {
    for (const domain of DECISION_TREE) {
      for (const complaint of domain.complaints) {
        expect(complaint.keywords.length, complaint.id).toBeGreaterThan(0);
      }
    }
  });

  it('resolves curated samples to the ontology codes', () => {
    const samples: Record<string, string> = {
      'pain-musculoskeletal': '207X00000X',
      'low-mood': '2084P0800X',
      burnout: '103T00000X',
      'couple-conflict': '103TS0200X',
      'alcohol-substance': '2084P0802X',
      'eating-weight': '133VN1006X'
    };
    for (const [id, expected] of Object.entries(samples)) {
      expect(SPECIALTY_RESOLUTIONS[id]?.nuccCode, id).toBe(expected);
    }
  });
});

describe('buildRecommendationParams', () => {
  it('maps an interview result onto the BFF query params', () => {
    const result = resolveInterviewResult('low-mood');
    if (!result) throw new Error('result missing');
    const params = buildRecommendationParams(result, -6.2, 106.8);
    expect(params).toEqual({
      specialty: SPECIALTY_RESOLUTIONS['low-mood'].nuccCode,
      serviceTypeCode: result.serviceTypeCode,
      icfDomain: result.icfDomain,
      lat: -6.2,
      lon: 106.8
    });
  });

  it('omits coordinates when not provided', () => {
    const result = resolveInterviewResult('low-mood');
    if (!result) throw new Error('result missing');
    expect(buildRecommendationParams(result)).toEqual({
      specialty: SPECIALTY_RESOLUTIONS['low-mood'].nuccCode,
      serviceTypeCode: result.serviceTypeCode,
      icfDomain: result.icfDomain
    });
  });
});

describe('interview result persistence', () => {
  it('persists and restores the last interview result', async () => {
    const result = resolveInterviewResult('low-mood');
    if (!result) throw new Error('result missing');
    await saveLastInterviewResult(result);
    expect(await readLastInterviewResult()).toEqual(result);
  });

  it('returns null when nothing was stored', async () => {
    await clearLastInterviewResult();
    expect(await readLastInterviewResult()).toBeNull();
  });
});
