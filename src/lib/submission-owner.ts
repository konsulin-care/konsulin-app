import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import type { PendingSubmission } from '@/lib/indexeddb';

/** Kind for a queued SOAP bundle submission. */
const SOAP_BUNDLE_KIND = 'soap-bundle';

/** Prefix used for guest owner keys. */
const GUEST_OWNER_PREFIX = 'guest:';

/** Owner key used when a guest payload cannot be bound to an identity. */
const UNBOUND_GUEST_OWNER = 'guest:unbound';

/** Narrows an unknown value to a plain record. */
function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
}

/** Returns `author.reference` when present on the given resource record. */
function authorReferenceOf(
  resource: Record<string, unknown> | null
): string | undefined {
  const author = asRecord(resource?.author);
  const reference = author?.reference;
  return typeof reference === 'string' && reference.length > 0
    ? reference
    : undefined;
}

/** Returns the guest owner key for a payload carrying an anonymous identifier. */
function guestOwnerOf(resource: Record<string, unknown>): string {
  const identifiers = resource.identifier;
  if (Array.isArray(identifiers)) {
    for (const rawIdentifier of identifiers) {
      const identifier = asRecord(rawIdentifier);
      if (!identifier) continue;
      if (identifier.system !== ANONYMOUS_SESSION_IDENTIFIER_SYSTEM) continue;
      const value = identifier.value;
      if (typeof value === 'string' && value.length > 0) {
        return `${GUEST_OWNER_PREFIX}${value}`;
      }
    }
  }
  return UNBOUND_GUEST_OWNER;
}

/** Returns the guest owner key of the first bundle entry with an author. */
function soapBundleOwnerOf(payload: Record<string, unknown>): string {
  const entries = payload.entry;
  if (Array.isArray(entries)) {
    for (const rawEntry of entries) {
      const resource = asRecord(asRecord(rawEntry)?.resource);
      const reference = authorReferenceOf(resource);
      if (reference) return reference;
    }
  }
  return UNBOUND_GUEST_OWNER;
}

/**
 * Derives the owner key for a queued submission from its payload.
 *
 * Authenticated payloads carry an `author.reference` (e.g. `Patient/x`).
 * Guest payloads fall back to the anonymous session identifier and finally
 * to `guest:unbound`. SOAP bundles use the first entry that has an author.
 * Deriving at replay time keeps legacy items with an empty `ownerId` working.
 *
 * @param item - The pending submission whose payload determines ownership.
 * @returns The owner key used to scope replay and cleanup.
 */
export function ownerOf(item: PendingSubmission): string {
  const payload = asRecord(item.payload);
  if (!payload) return UNBOUND_GUEST_OWNER;

  if (item.kind === SOAP_BUNDLE_KIND) {
    return soapBundleOwnerOf(payload);
  }

  return authorReferenceOf(payload) ?? guestOwnerOf(payload);
}
