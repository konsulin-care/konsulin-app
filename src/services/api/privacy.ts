import { getAPI } from '../api';

/**
 * Purges all research and referral data for the current session patient.
 *
 * Issues DELETE /api/v1/privacy/purge via the default proxy instance, which
 * resolves to /proxy/api/v1/privacy/purge. The Go proxy injects the
 * sAccessToken cookie as a Bearer header (this path is outside /api/v1/auth/*),
 * so the backend can resolve the session patient identity. Requires an
 * authenticated patient session; guest sessions are rejected by the backend.
 *
 * @returns A promise that resolves once the purge completes.
 */
export async function purgeResearchData(): Promise<void> {
  const API = await getAPI();
  await API.delete('/api/v1/privacy/purge');
}
