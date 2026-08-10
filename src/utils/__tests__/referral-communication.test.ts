import { describe, expect, it } from 'vitest';
import { FhirExtensionUrls, FhirSystems } from '../fhir/extensions';
import {
  buildReferralCommunication,
  buildReferralId,
  shouldWriteReferral
} from '../referral-communication';

describe('buildReferralId', () => {
  it('is deterministic, prefixed, and a sha256 hex digest', async () => {
    const parts = {
      recipient: 'referee-id',
      sender: 'DG3F3STPYZ6HX25A',
      batch: 'batch-1'
    };
    const first = await buildReferralId(parts);
    const second = await buildReferralId(parts);
    expect(first).toBe(second);
    expect(first).toMatch(/^referral-[0-9a-f]{64}$/);
  });

  it('changes when any component changes', async () => {
    const base = { recipient: 'r1', sender: 's1', batch: 'b1' };
    const baseId = await buildReferralId(base);
    const changedRecipientId = await buildReferralId({
      ...base,
      recipient: 'r2'
    });
    const changedSenderId = await buildReferralId({ ...base, sender: 's2' });
    const changedBatchId = await buildReferralId({ ...base, batch: 'b2' });
    expect(baseId).not.toBe(changedRecipientId);
    expect(baseId).not.toBe(changedSenderId);
    expect(baseId).not.toBe(changedBatchId);
  });
});

describe('buildReferralCommunication', () => {
  it('builds a completed Communication with sender, recipient, topic, and batch extension', () => {
    const communication = buildReferralCommunication({
      id: 'referral-abc',
      sender: 'DG3F3STPYZ6HX25A',
      recipient: 'referee-id',
      batch: 'batch-1'
    });

    expect(communication.resourceType).toBe('Communication');
    expect(communication.id).toBe('referral-abc');
    expect(communication.status).toBe('completed');
    expect(communication.sender).toEqual({
      reference: 'Patient/DG3F3STPYZ6HX25A'
    });
    expect(communication.recipient).toEqual([
      { reference: 'Patient/referee-id' }
    ]);
    expect(communication.topic?.coding?.[0]).toMatchObject({
      system: FhirSystems.researchReferral,
      code: 'research-referral'
    });
    expect(communication.extension).toEqual([
      {
        url: FhirExtensionUrls.referralBatch,
        valueReference: { reference: 'PlanDefinition/batch-1' }
      }
    ]);
  });
});

describe('shouldWriteReferral', () => {
  it('writes only when a patient ref exists, the batch is complete, and nothing was written', () => {
    expect(
      shouldWriteReferral({
        ref: 'p_DG3F3STPYZ6HX25A',
        batchComplete: true,
        alreadyWritten: false
      })
    ).toBe(true);
  });

  it('refuses when the batch is not complete', () => {
    expect(
      shouldWriteReferral({
        ref: 'p_DG3F3STPYZ6HX25A',
        batchComplete: false,
        alreadyWritten: false
      })
    ).toBe(false);
  });

  it('refuses when already written', () => {
    expect(
      shouldWriteReferral({
        ref: 'p_DG3F3STPYZ6HX25A',
        batchComplete: true,
        alreadyWritten: true
      })
    ).toBe(false);
  });

  it('refuses absent, empty, or guest refs', () => {
    expect(
      shouldWriteReferral({
        ref: null,
        batchComplete: true,
        alreadyWritten: false
      })
    ).toBe(false);
    expect(
      shouldWriteReferral({
        ref: '',
        batchComplete: true,
        alreadyWritten: false
      })
    ).toBe(false);
    expect(
      shouldWriteReferral({
        ref: 'g_guest-1',
        batchComplete: true,
        alreadyWritten: false
      })
    ).toBe(false);
  });
});
