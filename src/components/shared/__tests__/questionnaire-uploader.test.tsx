import QuestionnaireUploader from '@/components/shared/questionnaire-uploader';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Questionnaire } from 'fhir/r4';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockToast } = vi.hoisted(() => ({
  mockToast: { error: vi.fn(), success: vi.fn() }
}));

vi.mock('react-toastify', () => ({ toast: mockToast }));

/** Build a JSON file whose pretty-printed body spans the given lines. */
function buildFile(lines = 5): File {
  const item = Array.from({ length: lines }, (_, i) => ({
    linkId: `q${i + 1}`,
    text: `Question ${i + 1}`
  }));
  const questionnaire = {
    resourceType: 'Questionnaire',
    id: 'demo',
    title: 'Demo Survey',
    item
  };
  return new File(
    [JSON.stringify(questionnaire, null, 2)],
    'questionnaire.json',
    { type: 'application/json' }
  );
}

function selectFile(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not found');
  fireEvent.change(input, { target: { files: [file] } });
}

/** Controlled harness that feeds the parsed value back into the component. */
function StatefulHarness() {
  const [value, setValue] = useState<Questionnaire | null>(null);
  return <QuestionnaireUploader value={value} onChange={setValue} />;
}

describe('QuestionnaireUploader', () => {
  afterEach(() => {
    mockToast.error.mockClear();
  });

  it('renders a dashed upload box matching the location uploader aesthetic', () => {
    render(<QuestionnaireUploader value={null} onChange={vi.fn()} />);

    const btn = screen.getByRole('button', { name: /upload questionnaire/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('w-full');
    expect(btn.className).toContain('h-32');
    expect(btn.className).toContain('border-dashed');
  });

  it('parses a valid questionnaire file, reports it, and shows a snippet', async () => {
    const { container } = render(<StatefulHarness />);

    selectFile(container, buildFile(12));

    const snippet = await screen.findByTestId('questionnaire-snippet');
    const lines = snippet.textContent?.split('\n') ?? [];
    expect(lines).toHaveLength(10);
    expect(snippet.textContent).toContain('resourceType');
    expect(snippet.textContent).toContain('Questionnaire');
  });

  it('keeps the empty state and shows an error toast for invalid JSON', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <QuestionnaireUploader value={null} onChange={onChange} />
    );

    const invalidFile = new File(['not json'], 'broken.json', {
      type: 'application/json'
    });
    selectFile(container, invalidFile);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /upload questionnaire/i })
    ).toBeInTheDocument();
  });

  it('rejects valid JSON that is not a Questionnaire resource', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <QuestionnaireUploader value={null} onChange={onChange} />
    );

    const patientFile = new File(
      [JSON.stringify({ resourceType: 'Patient', id: 'p1' }, null, 2)],
      'patient.json',
      { type: 'application/json' }
    );
    selectFile(container, patientFile);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());

    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /upload questionnaire/i })
    ).toBeInTheDocument();
  });
});
