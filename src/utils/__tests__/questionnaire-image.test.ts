import type { Questionnaire } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { FhirExtensionUrls } from '../fhir/extensions';
import {
  getQuestionnaireImageUrl,
  setQuestionnaireImageUrl
} from '../fhir/questionnaire-image';

describe('getQuestionnaireImageUrl', () => {
  it('returns null when no image extension exists', () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check'
    };
    expect(getQuestionnaireImageUrl(questionnaire)).toBeNull();
  });

  it('returns the URL from the image extension', () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: FhirExtensionUrls.questionnaireImage,
          valueUrl: 'https://res.cloudinary.com/test/image/upload/v1/q.webp'
        }
      ]
    };
    expect(getQuestionnaireImageUrl(questionnaire)).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
  });

  it('returns null when extensions array is empty', () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: []
    };
    expect(getQuestionnaireImageUrl(questionnaire)).toBeNull();
  });

  it('returns null when matching extension has no valueUrl', () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: FhirExtensionUrls.questionnaireImage
        }
      ]
    };
    expect(getQuestionnaireImageUrl(questionnaire)).toBeNull();
  });

  it('returns null when extension URL does not match', () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: 'https://example.org/extension/someOther',
          valueUrl: 'https://example.com/photo.jpg'
        }
      ]
    };
    expect(getQuestionnaireImageUrl(questionnaire)).toBeNull();
  });
});

describe('setQuestionnaireImageUrl', () => {
  it('adds image extension to a questionnaire without extensions', () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check'
    };
    const result = setQuestionnaireImageUrl(
      questionnaire,
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
    const ext = result.extension?.find(
      e => e.url === FhirExtensionUrls.questionnaireImage
    );
    expect(ext?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
  });

  it('replaces existing image extension', () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: FhirExtensionUrls.questionnaireImage,
          valueUrl: 'https://res.cloudinary.com/test/image/upload/v1/old.webp'
        }
      ]
    };
    const result = setQuestionnaireImageUrl(
      questionnaire,
      'https://res.cloudinary.com/test/image/upload/v1/new.webp'
    );
    const ext = result.extension?.find(
      e => e.url === FhirExtensionUrls.questionnaireImage
    );
    expect(ext?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/new.webp'
    );
    expect(result.extension).toHaveLength(1);
  });

  it('preserves other extensions when adding image', () => {
    const questionnaire: Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Wellness Check',
      extension: [
        {
          url: 'https://example.org/extension/questionnaireCategory',
          valueString: 'mental-health'
        }
      ]
    };
    const result = setQuestionnaireImageUrl(
      questionnaire,
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
    const imgExt = result.extension?.find(
      e => e.url === FhirExtensionUrls.questionnaireImage
    );
    const otherExt = result.extension?.find(
      e => e.url === 'https://example.org/extension/questionnaireCategory'
    );
    expect(imgExt?.valueUrl).toBe(
      'https://res.cloudinary.com/test/image/upload/v1/q.webp'
    );
    expect(otherExt?.valueString).toBe('mental-health');
    expect(result.extension).toHaveLength(2);
  });
});
