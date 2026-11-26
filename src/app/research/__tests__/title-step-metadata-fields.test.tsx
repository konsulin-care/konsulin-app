import type { StudyMetadataFormValues } from '@/app/research/study-metadata-schema';
import { TitleStepMetadataFields } from '@/app/research/title-step-metadata-fields';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, useWatch } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const GROUP_NAME = 'Klinik Sehat Jiwa';

/** Renders the metadata fields with a live view of the form values. */
function Harness() {
  const { register, control } = useForm<StudyMetadataFormValues>({
    defaultValues: {
      researchQuestion: '',
      ethicsStatus: 'applying',
      sharesFindings: false
    }
  });
  const values = useWatch({ control });

  return (
    <>
      <TitleStepMetadataFields
        groupName={GROUP_NAME}
        register={register}
        control={control}
        errors={{}}
      />
      <output data-testid='form-values'>{JSON.stringify(values)}</output>
    </>
  );
}

/** Reads the live form values rendered by the harness. */
function formValues(): StudyMetadataFormValues {
  const text = screen.getByTestId('form-values').textContent ?? '{}';
  return JSON.parse(text) as StudyMetadataFormValues;
}

describe('TitleStepMetadataFields', () => {
  it('shows the organization name as a read-only research group', () => {
    render(<Harness />);

    const group = screen.getByLabelText('Research group');
    expect(group).toHaveValue(GROUP_NAME);
    expect(group).toHaveAttribute('readonly');
  });

  it('shows the approval reference only when ethics status is approved', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByLabelText('Approval reference (optional)')).toBeNull();

    await user.click(
      screen.getByRole('radio', { name: 'Approved by an ethics committee' })
    );

    const reference = screen.getByLabelText('Approval reference (optional)');
    await user.type(reference, 'EC-42');
    expect(formValues().ethicsReference).toBe('EC-42');

    await user.click(screen.getByRole('radio', { name: 'Exempt from review' }));
    expect(screen.queryByLabelText('Approval reference (optional)')).toBeNull();
  });

  it('updates the form values for who can join and the findings checkbox', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(
      screen.getByLabelText(
        'Who can join (optional). For example: adults aged 18 and over'
      ),
      'Adults 18+'
    );
    expect(formValues().whoCanJoin).toBe('Adults 18+');

    const findings = screen.getByRole('checkbox', {
      name: 'I will share the findings with participants in everyday language'
    });
    await user.click(findings);
    expect(formValues().sharesFindings).toBe(true);
  });
});
