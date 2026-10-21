import { useProfileSectionSave } from '@/app/profile/hooks/useProfileSectionSave';
import { vi, type Mock } from 'vitest';

/**
 * Wires the useProfileSectionSave mock to a synchronous saveSection mock.
 * Clears all mocks first for isolation, then makes saveSection invoke
 * onSuccess immediately so tests can assert on merged params directly.
 *
 * @param saveSection - Caller-owned saveSection mock, kept for assertions.
 */
export function mockSectionSave(saveSection: Mock): void {
  vi.clearAllMocks();
  saveSection.mockImplementation((params: { onSuccess?: () => void }) => {
    params.onSuccess?.();
  });
  vi.mocked(useProfileSectionSave).mockReturnValue({
    isSaving: false,
    saveSection
  });
}
