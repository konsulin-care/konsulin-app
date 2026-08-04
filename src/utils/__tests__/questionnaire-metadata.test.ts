import { describe, expect, it } from 'vitest';
import { setQuestionnaireDuration } from '../fhir/duration';
import { FhirExtensionUrls, FhirSystems } from '../fhir/extensions';
import { setQuestionnaireCategory } from '../fhir/questionnaire-category';
import {
  appendQuestionnaireContact,
  setQuestionnairePublisherDate
} from '../fhir/questionnaire-metadata';

const DOMAIN_SYSTEM = FhirSystems.assessmentDomain;
const CONTEXT_SYSTEM = FhirSystems.assessmentContext;
const USAGE_CONTEXT_SYSTEM = FhirSystems.usageContext;

describe('setQuestionnaireCategory', () => {
  it('adds domain coding and regular context when useContext is empty', () => {
    const result = setQuestionnaireCategory(
      { resourceType: 'Questionnaire', status: 'draft' },
      'physical-health',
      'Physical Health'
    );

    expect(result.useContext).toHaveLength(2);

    const domain = result.useContext?.find(ctx =>
      ctx.valueCodeableConcept?.coding?.some(c => c.system === DOMAIN_SYSTEM)
    );
    expect(domain?.valueCodeableConcept?.coding?.[0]).toEqual({
      system: DOMAIN_SYSTEM,
      code: 'physical-health',
      display: 'Physical Health'
    });

    const context = result.useContext?.find(ctx =>
      ctx.valueCodeableConcept?.coding?.some(
        c => c.system === CONTEXT_SYSTEM && c.code === 'regular'
      )
    );
    expect(context?.code?.code).toBe('focus');
    expect(context?.code?.system).toBe(USAGE_CONTEXT_SYSTEM);
  });

  it('replaces an existing domain coding instead of appending', () => {
    const existing = {
      resourceType: 'Questionnaire' as const,
      status: 'draft' as const,
      useContext: [
        {
          code: { system: USAGE_CONTEXT_SYSTEM, code: 'focus' },
          valueCodeableConcept: {
            coding: [
              {
                system: DOMAIN_SYSTEM,
                code: 'mental-emotional-health',
                display: 'Mental & Emotional Health'
              }
            ]
          }
        }
      ]
    };

    const result = setQuestionnaireCategory(
      existing,
      'physical-health',
      'Physical Health'
    );

    const domainCodings = result.useContext?.flatMap(
      ctx => ctx.valueCodeableConcept?.coding ?? []
    );
    const matches = domainCodings?.filter(c => c.system === DOMAIN_SYSTEM);
    expect(matches).toHaveLength(1);
    expect(matches?.[0]).toEqual({
      system: DOMAIN_SYSTEM,
      code: 'physical-health',
      display: 'Physical Health'
    });
  });

  it('preserves unrelated useContext entries', () => {
    const unrelated = {
      code: { system: USAGE_CONTEXT_SYSTEM, code: 'focus' },
      valueCodeableConcept: {
        coding: [{ system: 'https://loinc.org', code: '62744-8' }]
      }
    };
    const result = setQuestionnaireCategory(
      {
        resourceType: 'Questionnaire',
        status: 'draft',
        useContext: [unrelated]
      },
      'functional-capacity',
      'Functional Capacity'
    );

    expect(result.useContext).toContainEqual(unrelated);
  });

  it('does not duplicate the regular assessment-context when already present', () => {
    const existing = {
      resourceType: 'Questionnaire' as const,
      status: 'draft' as const,
      useContext: [
        {
          code: { system: USAGE_CONTEXT_SYSTEM, code: 'focus' },
          valueCodeableConcept: {
            coding: [{ system: CONTEXT_SYSTEM, code: 'regular' }]
          }
        }
      ]
    };

    const result = setQuestionnaireCategory(
      existing,
      'physical-health',
      'Physical Health'
    );

    const regularEntries = result.useContext?.filter(ctx =>
      ctx.valueCodeableConcept?.coding?.some(
        c => c.system === CONTEXT_SYSTEM && c.code === 'regular'
      )
    );
    expect(regularEntries).toHaveLength(1);
  });
});

describe('setQuestionnaireDuration', () => {
  const DURATION_URL = FhirExtensionUrls.questionnaireEstimatedDuration;

  it('adds the duration extension with unit system and code', () => {
    const result = setQuestionnaireDuration(
      { resourceType: 'Questionnaire', status: 'draft' },
      10
    );

    const ext = result.extension?.find(e => e.url === DURATION_URL);
    expect(ext?.valueDuration).toEqual({
      value: 10,
      system: FhirSystems.ucum,
      code: 'min'
    });
  });

  it('replaces an existing duration extension instead of appending', () => {
    const existing = {
      resourceType: 'Questionnaire' as const,
      status: 'draft' as const,
      extension: [
        {
          url: DURATION_URL,
          valueDuration: { value: 5 }
        }
      ]
    };

    const result = setQuestionnaireDuration(existing, 20);

    const durationExtensions = result.extension?.filter(
      e => e.url === DURATION_URL
    );
    expect(durationExtensions).toHaveLength(1);
    expect(durationExtensions?.[0]?.valueDuration?.value).toBe(20);
  });

  it('preserves unrelated extensions', () => {
    const other = {
      url: FhirExtensionUrls.questionnaireImage,
      valueUrl: 'https://example.com/image.png'
    };
    const result = setQuestionnaireDuration(
      { resourceType: 'Questionnaire', status: 'draft', extension: [other] },
      15
    );

    expect(result.extension).toContainEqual(other);
  });
});

describe('setQuestionnairePublisherDate', () => {
  it('sets publisher and date, preserving other fields', () => {
    const result = setQuestionnairePublisherDate(
      {
        resourceType: 'Questionnaire',
        title: 'My Survey',
        status: 'draft'
      },
      'Konsulin Clinic',
      '2026-08-02T00:00:00.000Z'
    );

    expect(result.publisher).toBe('Konsulin Clinic');
    expect(result.date).toBe('2026-08-02T00:00:00.000Z');
    expect(result.title).toBe('My Survey');
    expect(result.status).toBe('draft');
  });

  it('overwrites an existing publisher and date', () => {
    const result = setQuestionnairePublisherDate(
      {
        resourceType: 'Questionnaire',
        status: 'draft',
        publisher: 'Old Publisher',
        date: '2020-01-01'
      },
      'New Publisher',
      '2026-08-02'
    );

    expect(result.publisher).toBe('New Publisher');
    expect(result.date).toBe('2026-08-02');
  });
});

describe('appendQuestionnaireContact', () => {
  it('appends a contact with name and telecom for present fields', () => {
    const result = appendQuestionnaireContact(
      { resourceType: 'Questionnaire', status: 'draft' },
      { name: 'Aly Lamuri', email: 'aly@example.com', phone: '+628123' }
    );

    expect(result.contact).toHaveLength(1);
    expect(result.contact?.[0]).toEqual({
      name: 'Aly Lamuri',
      telecom: [
        { system: 'email', value: 'aly@example.com' },
        { system: 'phone', value: '+628123' }
      ]
    });
  });

  it('preserves existing contacts', () => {
    const existingContact = {
      name: 'Existing',
      telecom: [{ system: 'email' as const, value: 'old@example.com' }]
    };
    const result = appendQuestionnaireContact(
      {
        resourceType: 'Questionnaire',
        status: 'draft',
        contact: [existingContact]
      },
      { name: 'New User', email: 'new@example.com' }
    );

    expect(result.contact).toHaveLength(2);
    expect(result.contact?.[0]).toEqual(existingContact);
  });

  it('omits telecom entries for missing fields', () => {
    const result = appendQuestionnaireContact(
      { resourceType: 'Questionnaire', status: 'draft' },
      { name: 'Only Name' }
    );

    expect(result.contact?.[0]?.name).toBe('Only Name');
    expect(result.contact?.[0]?.telecom).toBeUndefined();
  });

  it('returns the questionnaire unchanged when no contact fields are present', () => {
    const questionnaire = {
      resourceType: 'Questionnaire' as const,
      status: 'draft' as const
    };
    const result = appendQuestionnaireContact(questionnaire, {});

    expect(result).toBe(questionnaire);
    expect(result.contact).toBeUndefined();
  });
});
