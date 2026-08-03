import { fireEvent, render, screen } from '@testing-library/react';
import type { Questionnaire } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: Record<string, string>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  )
}));

import { FhirExtensionUrls, FhirSystems } from '@/utils/fhir/extensions';
import AssessmentCard from '../assessment-card';

const DURATION_URL = FhirExtensionUrls.questionnaireEstimatedDuration;

const IMAGE_URL = FhirExtensionUrls.questionnaireImage;

const FALLBACK_URL =
  'https://www.glasgowunisrc.org/pageassets/advice/health-and-wellbeing/AdobeStock_220793275-min.jpeg?thumbnail=true&height=465&width=620&resize_type=CropToFit';

const CATEGORY_CODING = {
  system: FhirSystems.assessmentDomain,
  code: 'mental-emotional-health'
};

function createQuestionnaire(
  overrides?: Partial<Questionnaire>
): Questionnaire {
  return {
    resourceType: 'Questionnaire',
    id: 'phq-9',
    title: 'PHQ-9',
    description: 'Patient Health Questionnaire for depression screening',
    status: 'active',
    ...overrides
  };
}

describe('AssessmentCard (featured variant)', () => {
  it('renders the title', () => {
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='featured'
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
  });

  it('does not render the description', () => {
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='featured'
        onClick={vi.fn()}
      />
    );
    expect(
      screen.queryByText(
        'Patient Health Questionnaire for depression screening'
      )
    ).not.toBeInTheDocument();
  });

  it('renders image from extension when present', () => {
    const q = createQuestionnaire({
      extension: [{ url: IMAGE_URL, valueUrl: 'https://example.com/photo.jpg' }]
    });
    render(
      <AssessmentCard questionnaire={q} variant='featured' onClick={vi.fn()} />
    );
    const img = screen.getByAltText('PHQ-9');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('renders fallback image when no extension is set', () => {
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='featured'
        onClick={vi.fn()}
      />
    );
    const img = screen.getByAltText('PHQ-9');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', FALLBACK_URL);
  });

  it('shows category label in overlay', () => {
    const q = createQuestionnaire({
      useContext: [
        {
          code: {
            system: FhirSystems.usageContext,
            code: 'focus'
          },
          valueCodeableConcept: {
            coding: [
              {
                ...CATEGORY_CODING,
                display: 'Mental & Emotional Health'
              }
            ]
          }
        }
      ]
    });
    render(
      <AssessmentCard questionnaire={q} variant='featured' onClick={vi.fn()} />
    );
    expect(screen.getByText('Mental & Emotional Health')).toBeInTheDocument();
  });

  it('shows duration in overlay', () => {
    const q = createQuestionnaire({
      extension: [{ url: DURATION_URL, valueDuration: { value: 15 } }]
    });
    render(
      <AssessmentCard questionnaire={q} variant='featured' onClick={vi.fn()} />
    );
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='featured'
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('AssessmentCard (compact variant)', () => {
  it('renders the title', () => {
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='compact'
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
  });

  it('does not show description', () => {
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='compact'
        onClick={vi.fn()}
      />
    );
    expect(
      screen.queryByText(
        'Patient Health Questionnaire for depression screening'
      )
    ).not.toBeInTheDocument();
  });

  it('has a more compact layout', () => {
    const { container } = render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='compact'
        onClick={vi.fn()}
      />
    );
    // compact cards use the "card" class
    expect(container.querySelector('.card')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='compact'
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('AssessmentCard (icon)', () => {
  it('renders icon from lucide code', () => {
    const q = createQuestionnaire({
      code: [{ system: FhirSystems.lucide, code: 'brain' }]
    });
    const { container } = render(
      <AssessmentCard questionnaire={q} variant='compact' onClick={vi.fn()} />
    );
    // Lucide icons render as SVG elements
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('falls back to category default icon when no lucide code', () => {
    const q = createQuestionnaire({
      useContext: [
        {
          code: {
            system: FhirSystems.usageContext,
            code: 'focus'
          },
          valueCodeableConcept: {
            coding: [CATEGORY_CODING]
          }
        }
      ]
    });
    const { container } = render(
      <AssessmentCard questionnaire={q} variant='compact' onClick={vi.fn()} />
    );
    // Should still render an SVG (Brain fallback for mental-emotional-health)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows default CalendarDays icon when no lucide code or category', () => {
    const q = createQuestionnaire();
    const { container } = render(
      <AssessmentCard questionnaire={q} variant='compact' onClick={vi.fn()} />
    );
    // Compact variant always shows a fallback icon
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('AssessmentCard (duration)', () => {
  it('shows duration when present', () => {
    const q = createQuestionnaire({
      extension: [{ url: DURATION_URL, valueDuration: { value: 10 } }]
    });
    render(
      <AssessmentCard questionnaire={q} variant='compact' onClick={vi.fn()} />
    );
    expect(screen.getByText('10 min')).toBeInTheDocument();
  });

  it('hides duration when absent', () => {
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='compact'
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
  });
});

describe('AssessmentCard (category chip)', () => {
  it('renders category label from useContext', () => {
    const q = createQuestionnaire({
      useContext: [
        {
          code: {
            system: FhirSystems.usageContext,
            code: 'focus'
          },
          valueCodeableConcept: {
            coding: [
              {
                ...CATEGORY_CODING,
                display: 'Mental & Emotional Health'
              }
            ]
          }
        }
      ]
    });
    render(
      <AssessmentCard questionnaire={q} variant='compact' onClick={vi.fn()} />
    );
    expect(screen.getByText('Mental & Emotional Health')).toBeInTheDocument();
  });

  it('falls back to code when no display text', () => {
    const q = createQuestionnaire({
      useContext: [
        {
          code: {
            system: FhirSystems.usageContext,
            code: 'focus'
          },
          valueCodeableConcept: {
            coding: [CATEGORY_CODING]
          }
        }
      ]
    });
    render(
      <AssessmentCard questionnaire={q} variant='compact' onClick={vi.fn()} />
    );
    // Falls back to the code value
    expect(screen.getByText(/mental.*emotional.*health/i)).toBeInTheDocument();
  });

  it('shows no chip when no category found', () => {
    render(
      <AssessmentCard
        questionnaire={createQuestionnaire()}
        variant='compact'
        onClick={vi.fn()}
      />
    );
    expect(
      screen.queryByText(
        /Physical|Mental|Social|Functional|Meaning|Health|Environmental/i
      )
    ).not.toBeInTheDocument();
  });
});
