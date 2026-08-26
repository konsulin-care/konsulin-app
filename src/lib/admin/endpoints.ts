/**
 * Static curated superadmin endpoint catalog derived from the backend RBAC
 * policy (`../backend/resources/rbac_policy.csv`) and the superadmin API docs
 * (`../backend/docs/api`). One entry per resource path with the methods granted
 * to the superadmin role.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface AdminEndpoint {
  /** Backend path (via /proxy), e.g. /fhir/Organization. */
  path: string;
  /** HTTP methods the superadmin role may use on this path. */
  methods: HttpMethod[];
  /** FHIR resource type when the path maps to a resource (else undefined). */
  resourceType?: string;
}

const FHIR_PATHS: ReadonlySet<string> = new Set([
  'Appointment',
  'Communication',
  'Condition',
  'Consent',
  'HealthcareService',
  'Invoice',
  'Location',
  'Media',
  'Organization',
  'Patient',
  'Person',
  'PlanDefinition',
  'Practitioner',
  'PractitionerRole',
  'Questionnaire',
  'QuestionnaireResponse',
  'ResearchStudy',
  'ResearchSubject',
  'Schedule',
  'Slot'
]);

/**
 * Superadmin-granted methods per FHIR resource, transcribed from the RBAC CSV:
 *   p, Superadmin, <METHOD>, /fhir/<Resource>
 */
const FHIR_METHODS: Record<string, HttpMethod[]> = {
  Appointment: ['POST'],
  Communication: ['GET'],
  Condition: ['PUT'],
  Consent: ['GET'],
  HealthcareService: ['GET', 'POST', 'PUT'],
  Invoice: ['GET'],
  Location: ['GET', 'POST', 'PUT'],
  Media: ['GET', 'POST', 'PUT'],
  Organization: ['GET', 'POST', 'PUT', 'DELETE'],
  Patient: ['GET', 'POST'],
  Person: ['POST'],
  PlanDefinition: ['GET', 'POST', 'PUT'],
  Practitioner: ['GET'],
  PractitionerRole: ['GET', 'POST', 'PUT'],
  Questionnaire: ['GET', 'POST', 'PUT'],
  QuestionnaireResponse: ['GET'],
  ResearchStudy: ['GET', 'POST', 'PUT'],
  ResearchSubject: ['GET'],
  Schedule: ['GET', 'POST', 'PUT'],
  Slot: ['GET', 'PUT']
};

// Resources whose methods are exercised on both the collection and the item
// path (e.g. DELETE /fhir/Organization/{id}). The item entry carries the same
// methods as the collection entry.
const ITEM_PATHS = new Set([
  'Condition',
  'HealthcareService',
  'Location',
  'Media',
  'Organization',
  'PlanDefinition',
  'PractitionerRole',
  'Questionnaire',
  'ResearchStudy',
  'Schedule',
  'Slot'
]);

function buildFhirEndpoints(): AdminEndpoint[] {
  const endpoints: AdminEndpoint[] = [];
  for (const resource of FHIR_PATHS) {
    const methods = FHIR_METHODS[resource];
    if (!methods) continue;
    endpoints.push({
      path: `/fhir/${resource}`,
      methods,
      resourceType: resource
    });
    if (ITEM_PATHS.has(resource)) {
      endpoints.push({
        path: `/fhir/${resource}/{id}`,
        methods,
        resourceType: resource
      });
    }
  }
  return endpoints;
}

const SPECIAL_ENDPOINTS: AdminEndpoint[] = [
  { path: '/fhir/metadata', methods: ['GET'] },
  { path: '/api/v1/tx', methods: ['GET'] },
  { path: '/hook/synchronous/send-wa-link', methods: ['POST'] },
  { path: '/api/v1/auth/magiclink', methods: ['POST'] }
];

/** Full curated superadmin endpoint catalog. */
export const ADMIN_ENDPOINTS: AdminEndpoint[] = [
  ...buildFhirEndpoints(),
  ...SPECIAL_ENDPOINTS
];

/**
 * Filters the catalog to endpoints supporting the given HTTP method.
 *
 * @param method - HTTP method to filter by
 * @returns endpoints that include the method in their allowed set
 */
export function getEndpointsForMethod(method: HttpMethod): AdminEndpoint[] {
  return ADMIN_ENDPOINTS.filter(e => e.methods.includes(method));
}

/**
 * Extracts the FHIR resource type from a proxy path.
 *
 * @param path - request path (e.g. /fhir/Organization or /fhir/Slot/{id})
 * @returns the resource type, or undefined when the path is not a FHIR resource
 */
export function resourceTypeFromPath(path: string): string | undefined {
  const match = /^\/fhir\/([^/]+)/.exec(path);
  if (!match) return undefined;
  const candidate = match[1];
  if (candidate === 'metadata' || !FHIR_PATHS.has(candidate)) {
    return undefined;
  }
  return candidate;
}
