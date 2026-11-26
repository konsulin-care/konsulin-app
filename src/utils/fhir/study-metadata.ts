import {
  FhirExtensionUrls,
  getExtension,
  upsertExtension
} from '@/utils/fhir/extensions';
import type { Extension } from 'fhir/r4';

type WithExtension = { extension?: Extension[] };

export type EthicsCode = 'applying' | 'approved' | 'exempt';

export interface EthicsStatus {
  code: EthicsCode;
  reference?: string;
}

/**
 * Set the who-can-join text.
 * @param resource - resource with extensions
 * @param text - who can join
 * @returns new resource
 */
export function setWhoCanJoin<T extends WithExtension>(
  resource: T,
  text: string
): T {
  return upsertExtension(resource, {
    url: FhirExtensionUrls.researchWhoCanJoin,
    valueString: text
  });
}

/**
 * Read the who-can-join text.
 * @param resource - resource with extensions
 * @returns text or undefined
 */
export function getWhoCanJoin(resource: WithExtension): string | undefined {
  return getExtension(resource, FhirExtensionUrls.researchWhoCanJoin)
    ?.valueString;
}

/**
 * Set the ethics status with optional approval reference.
 * @param resource - resource with extensions
 * @param status - code and optional reference
 * @returns new resource
 */
export function setEthicsStatus<T extends WithExtension>(
  resource: T,
  status: EthicsStatus
): T {
  const sub: Extension[] = [{ url: 'code', valueCode: status.code }];
  if (status.reference) {
    sub.push({ url: 'reference', valueString: status.reference });
  }
  return upsertExtension(resource, {
    url: FhirExtensionUrls.researchEthicsStatus,
    extension: sub
  });
}

/**
 * Read the ethics status.
 * @param resource - resource with extensions
 * @returns status or undefined when absent
 */
export function getEthicsStatus(
  resource: WithExtension
): EthicsStatus | undefined {
  const ext = getExtension(resource, FhirExtensionUrls.researchEthicsStatus);
  const code = ext?.extension?.find(e => e.url === 'code')?.valueCode;
  if (code !== 'applying' && code !== 'approved' && code !== 'exempt') {
    return undefined;
  }
  const reference = ext?.extension?.find(
    e => e.url === 'reference'
  )?.valueString;
  return reference ? { code, reference } : { code };
}

/**
 * Set whether findings are shared.
 * @param resource - resource with extensions
 * @param value - shares findings
 * @returns new resource
 */
export function setSharesFindings<T extends WithExtension>(
  resource: T,
  value: boolean
): T {
  return upsertExtension(resource, {
    url: FhirExtensionUrls.researchSharesFindings,
    valueBoolean: value
  });
}

/**
 * Read whether findings are shared.
 * @param resource - resource with extensions
 * @returns boolean or undefined
 */
export function getSharesFindings(
  resource: WithExtension
): boolean | undefined {
  return getExtension(resource, FhirExtensionUrls.researchSharesFindings)
    ?.valueBoolean;
}
