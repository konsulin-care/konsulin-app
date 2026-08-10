'use client';

import LoadingSpinnerIcon from '@/components/icons/loading-spinner-icon';
import type { Questionnaire } from 'fhir/r4';
import { type ChangeEvent, useRef, useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
  readonly value: Questionnaire | null;
  readonly onChange: (q: Questionnaire | null) => void;
};

const SNIPPET_LINE_COUNT = 10;

/** Take the first N lines of raw text for the snippet preview. */
function firstLines(text: string, count: number): string {
  return text.split('\n').slice(0, count).join('\n');
}

/**
 * Parse uploaded text as a FHIR R4 Questionnaire resource.
 *
 * @param text - Raw file contents
 * @returns The parsed Questionnaire resource
 * @throws When the JSON is invalid or resourceType is not Questionnaire
 */
function parseQuestionnaire(text: string): Questionnaire {
  const parsed: unknown = JSON.parse(text);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as { resourceType?: string }).resourceType !== 'Questionnaire'
  ) {
    throw new Error('File is not a FHIR R4 Questionnaire');
  }
  return parsed as Questionnaire;
}

/**
 * Upload field for a FHIR R4 Questionnaire JSON file.
 *
 * Mirrors the LocationImageUploader aesthetic (dashed box, muted colors).
 * Reads the file client-side, validates it parses as a Questionnaire, and
 * shows the first 10 lines as a monospace snippet. No server upload.
 */
export default function QuestionnaireUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const [snippet, setSnippet] = useState<string | null>(null);

  /** Read the selected file, validate, and surface the parsed resource. */
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReading(true);
    try {
      const text = await file.text();
      const parsed = parseQuestionnaire(text);
      setSnippet(firstLines(text, SNIPPET_LINE_COUNT));
      onChange(parsed);
    } catch {
      toast.error(
        'Invalid questionnaire file. Upload a valid FHIR R4 Questionnaire JSON.'
      );
    } finally {
      setIsReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (value) {
    return (
      <button
        type='button'
        onClick={() => inputRef.current?.click()}
        className='border-muted-foreground bg-muted text-muted-foreground hover:border-primary flex h-32 w-full cursor-pointer items-stretch overflow-hidden rounded-lg border-2 border-dashed'
      >
        <pre
          data-testid='questionnaire-snippet'
          className='text-muted-foreground m-0 w-full overflow-auto p-3 font-mono text-[10px] leading-4 whitespace-pre-wrap'
        >
          {snippet}
        </pre>
        <input
          ref={inputRef}
          type='file'
          accept='.json,application/json'
          className='hidden'
          onChange={e => {
            // skipcq: JS-0098 - fire-and-forget file parse
            void handleFile(e);
          }}
        />
      </button>
    );
  }

  return (
    <div className='space-y-2'>
      <button
        type='button'
        onClick={() => inputRef.current?.click()}
        disabled={isReading}
        className='border-muted-foreground bg-muted text-muted-foreground hover:border-primary flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-sm'
      >
        {isReading ? (
          <LoadingSpinnerIcon width={24} height={24} />
        ) : (
          <span>Upload questionnaire JSON</span>
        )}
      </button>
      <input
        ref={inputRef}
        type='file'
        accept='.json,application/json'
        className='hidden'
        onChange={e => {
          // skipcq: JS-0098 - fire-and-forget file parse
          void handleFile(e);
        }}
      />
    </div>
  );
}
