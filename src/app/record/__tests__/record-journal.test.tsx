/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() }))
}));

vi.mock('@/services/api/record', () => ({
  useGetSingleRecord: vi.fn()
}));

vi.mock('react-markdown', () => ({
  default: ({
    children,
    components
  }: {
    children: string;
    components?: unknown;
  }) => {
    // When no custom components are passed, simulate paragraph rendering
    const hasCustomComponents = components !== undefined;
    if (hasCustomComponents) {
      return <div data-testid='markdown'>{children}</div>;
    }
    // Default rendering: split by \n\n into <p> elements
    const paragraphs = children.split('\n\n').filter(Boolean);
    return (
      <div data-testid='markdown'>
        {paragraphs.map((p: string) => (
          <p key={p} data-testid={`paragraph-${p}`}>
            {p}
          </p>
        ))}
      </div>
    );
  }
}));

import { useGetSingleRecord } from '@/services/api/record';
import RecordJournal from '../record-journal';

describe('RecordJournal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when data is loading', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: undefined,
      isLoading: true
    } as any);

    const { container } = render(<RecordJournal journalId='journal-1' />);
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });

  it('renders loading skeleton when data is null', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: undefined,
      isLoading: false
    } as any);

    const { container } = render(<RecordJournal journalId='journal-1' />);
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });

  it('renders journal title in bold black text', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        valueString: 'My Journal Entry',
        effectiveDateTime: '2025-06-15T10:00:00Z',
        meta: { lastUpdated: '2025-06-16T10:00:00Z' },
        note: [{ text: 'Journal content here' }]
      },
      isLoading: false
    } as any);

    render(<RecordJournal journalId='journal-1' />);

    const title = screen.getByText('My Journal Entry');
    expect(title).toBeInTheDocument();
    expect(title.className).toContain('font-bold');
    expect(title.className).toContain('text-[#2c2f35]');
  });

  it('renders created date in small gray text', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        valueString: 'Title',
        effectiveDateTime: '2025-06-15T10:00:00Z',
        meta: { lastUpdated: '2025-06-16T10:00:00Z' },
        note: [{ text: 'Content' }]
      },
      isLoading: false
    } as any);

    render(<RecordJournal journalId='journal-1' />);

    const created = screen.getByText(/^Created:/);
    expect(created).toBeInTheDocument();
    expect(created.className).toContain('text-xs');
    expect(created.className).toContain('text-gray-500');
  });

  it('renders updated date in small gray text', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        valueString: 'Title',
        effectiveDateTime: '2025-06-15T10:00:00Z',
        meta: { lastUpdated: '2025-06-16T10:00:00Z' },
        note: [{ text: 'Content' }]
      },
      isLoading: false
    } as any);

    render(<RecordJournal journalId='journal-1' />);

    const updated = screen.getByText(/^Updated:/);
    expect(updated).toBeInTheDocument();
    expect(updated.className).toContain('text-xs');
    expect(updated.className).toContain('text-gray-500');
  });

  it('renders content via ReactMarkdown', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        valueString: 'Title',
        effectiveDateTime: '2025-06-15T10:00:00Z',
        meta: { lastUpdated: '2025-06-16T10:00:00Z' },
        note: [{ text: 'Paragraph one.' }, { text: 'Paragraph two.' }]
      },
      isLoading: false
    } as any);

    render(<RecordJournal journalId='journal-1' />);

    const markdown = screen.getByTestId('markdown');
    expect(markdown).toBeInTheDocument();
    expect(markdown.textContent).toContain('Paragraph one.');
    expect(markdown.textContent).toContain('Paragraph two.');
  });

  it('joins note texts with double newline', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        valueString: 'Title',
        effectiveDateTime: '2025-06-15T10:00:00Z',
        meta: { lastUpdated: '2025-06-16T10:00:00Z' },
        note: [{ text: 'First para' }, { text: 'Second para' }]
      },
      isLoading: false
    } as any);

    render(<RecordJournal journalId='journal-1' />);

    const markdown = screen.getByTestId('markdown');
    // Each note entry becomes its own <p> element
    const paragraphs = markdown.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe('First para');
    expect(paragraphs[1].textContent).toBe('Second para');
  });

  it('does not render created date when effectiveDateTime is missing', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        valueString: 'Title',
        meta: { lastUpdated: '2025-06-16T10:00:00Z' },
        note: [{ text: 'Content' }]
      },
      isLoading: false
    } as any);

    render(<RecordJournal journalId='journal-1' />);

    expect(screen.queryByText(/^Created:/)).not.toBeInTheDocument();
  });

  it('does not render updated date when lastUpdated is missing', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        valueString: 'Title',
        effectiveDateTime: '2025-06-15T10:00:00Z',
        note: [{ text: 'Content' }]
      },
      isLoading: false
    } as any);

    render(<RecordJournal journalId='journal-1' />);

    expect(screen.queryByText(/^Updated:/)).not.toBeInTheDocument();
  });

  it('renders container with rounded-xl border p-4', () => {
    vi.mocked(useGetSingleRecord).mockReturnValue({
      data: {
        resourceType: 'Observation',
        id: 'journal-1',
        valueString: 'Title',
        effectiveDateTime: '2025-06-15T10:00:00Z',
        meta: { lastUpdated: '2025-06-16T10:00:00Z' },
        note: [{ text: 'Content' }]
      },
      isLoading: false
    } as any);

    const { container } = render(<RecordJournal journalId='journal-1' />);

    const journalContainer = container.firstChild as HTMLElement;
    expect(journalContainer.className).toContain('rounded-xl');
    expect(journalContainer.className).toContain('border');
    expect(journalContainer.className).toContain('p-4');
  });
});
