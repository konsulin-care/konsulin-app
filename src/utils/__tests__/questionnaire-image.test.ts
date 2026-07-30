import type { Questionnaire } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  getQuestionnaireImageUrl,
  setQuestionnaireImageUrl
} from '../fhir/questionnaire-image';

describe('getQuestionnaireImageUrl', () => {
  it('returns null when no image extension exists', () => {
    const q: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check'
    };
    expect(getQuestionnaireImageUrl(q)).toBeNull();
  });

  it('returns the URL from the image extension', () => {
    const q: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/questionnaireImage',
          valueUrl: 'https://res.cloudinary.com/test/image/upload/v1/q.webp'
        }
      ]
    };
    expect(getQuestionnaireImageUrl(q)).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
  });

  it('returns null when extensions array is empty', () => {
    const q: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: []
    };
    expect(getQuestionnaireImageUrl(q)).toBeNull();
  });

  it('returns null when matching extension has no valueUrl', () => {
    const q: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/questionnaireImage'
        }
      ]
    };
    expect(getQuestionnaireImageUrl(q)).toBeNull();
  });

  it('returns null when extension URL does not match', () => {
    const q: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/someOther',
          valueUrl: 'https://example.com/photo.jpg'
        }
      ]
    };
    expect(getQuestionnaireImageUrl(q)).toBeNull();
  });
});

describe('setQuestionnaireImageUrl', () => {
  it('adds image extension to a questionnaire without extensions', () => {
    const q: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check'
    };
    const result = setQuestionnaireImageUrl(
      q,
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
    const ext = result.extension?.find(
      e =>
        e.url ===
        'https://konsulin.id/fhir/StructureDefinition/questionnaireImage'
    );
    expect(ext?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
  });

  it('replaces existing image extension', () => {
    const q: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/questionnaireImage',
          valueUrl: 'https://res.cloudinary.com/test/image/upload/v1/old.webp'
        }
      ]
    };
    const result = setQuestionnaireImageUrl(
      q,
      'https://res.cloudinary.com/test/image/upload/v1/new.webp'
    );
    const ext = result.extension?.find(
      e =>
        e.url ===
        'https://konsulin.id/fhir/StructureDefinition/questionnaireImage'
    );
    expect(ext?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/new.webp'
    );
    expect(result.extension).toHaveLength(1);
  });

  it('preserves other extensions when adding image', () => {
    const q: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: 'https://konsulin.id/fhir/StructureDefinition/questionnaireCategory',
          valueString: 'mental-health'
        }
      ]
    };
    const result = setQuestionnaireImageUrl(
      q,
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
    const imgExt = result.extension?.find(
      e =>
        e.url ===
        'https://konsulin.id/fhir/StructureDefinition/questionnaireImage'
    );
    const otherExt = result.extension?.find(
      e =>
        e.url ===
        'https://konsulin.id/fhir/StructureDefinition/questionnaireCategory'
    );
    expect(imgExt?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
    expect(otherExt?.valueString).toBe('mental-health');
    expect(result.extension).toHaveLength(2);
  });
});
