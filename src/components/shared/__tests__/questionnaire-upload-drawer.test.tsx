import { renderWithQuery } from '@/__tests__/react-test-utils';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLocale } = vi.hoisted(() => ({
  mockLocale: { current: 'en' }
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn((namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'common.questionnaire_upload.research_title': 'Upload Questionnaire',
        'common.questionnaire_upload.assessment_title': 'Add Assessment',
        'common.questionnaire_upload.upload_label': 'Upload Questionnaire',
        'common.questionnaire_upload.submit': 'Submit',
        'common.questionnaire_upload.image_url': 'Image URL (optional)',
        'common.questionnaire_upload.estimated_duration':
          'Estimated Duration (minutes)',
        'common.questionnaire_upload.fee': 'Fee',
        'common.questionnaire_upload.category': 'Category',
        'common.questionnaire_upload.select_category': 'Select category',
        'toast.questionnaire_uploaded': 'Questionnaire uploaded successfully',
        'toast.assessment_added': 'Assessment added successfully'
      },
      id: {
        'common.questionnaire_upload.research_title': 'Unggah Kuesioner',
        'common.questionnaire_upload.assessment_title': 'Tambah Asesmen',
        'common.questionnaire_upload.upload_label': 'Unggah Kuesioner',
        'common.questionnaire_upload.submit': 'Kirim',
        'common.questionnaire_upload.image_url': 'URL Gambar (opsional)',
        'common.questionnaire_upload.estimated_duration':
          'Perkiraan Durasi (menit)',
        'common.questionnaire_upload.fee': 'Biaya',
        'common.questionnaire_upload.category': 'Kategori',
        'common.questionnaire_upload.select_category': 'Pilih kategori',
        'toast.questionnaire_uploaded': 'Kuesioner berhasil diunggah',
        'toast.assessment_added': 'Asesmen berhasil ditambahkan'
      }
    };
    return translations[mockLocale.current]?.[`${namespace}.${key}`] ?? key;
  })
}));

import QuestionnaireUploadDrawer from '../questionnaire-upload-drawer';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'test-user-id',
        fullname: 'Test User',
        email: 'test@example.com',
        phoneNumber: '+1234567890'
      }
    }
  })
}));

vi.mock('@/services/api', () => ({
  getAPI: () =>
    Promise.resolve({
      get: vi.fn().mockResolvedValue({ data: { name: 'Test Org' } }),
      post: vi.fn().mockResolvedValue({ data: { id: 'new-q-id' } })
    })
}));

describe('QuestionnaireUploadDrawer', () => {
  beforeEach(() => {
    mockLocale.current = 'en';
  });

  it('renders upload field and duration input', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    // Drawer title and label both contain 'Upload Questionnaire', use getAllByText
    expect(
      screen.getAllByText(/upload questionnaire/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/estimated duration/i)).toBeInTheDocument();
  });

  it('shows fee field when showFee is true', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        showFee
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.getByLabelText(/fee/i)).toBeInTheDocument();
  });

  it('hides fee field when showFee is false', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        showFee={false}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.queryByLabelText(/fee/i)).not.toBeInTheDocument();
  });

  it('shows image field when showImage is true', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        showImage
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.getByLabelText(/image url/i)).toBeInTheDocument();
  });

  it('hides image field when showImage is false', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        showImage={false}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.queryByLabelText(/image url/i)).not.toBeInTheDocument();
  });

  it('renders category selector', () => {
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('renders the localized labels under id', () => {
    mockLocale.current = 'id';
    renderWithQuery(
      <QuestionnaireUploadDrawer
        open
        showFee
        showImage
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        resolvePublisher={vi.fn().mockResolvedValue('Test Publisher')}
      />
    );

    expect(
      screen.getAllByText(/unggah kuesioner/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/perkiraan durasi/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/biaya/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/url gambar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kategori/i)).toBeInTheDocument();
    expect(screen.getByText('Pilih kategori')).toBeInTheDocument();
    expect(screen.getByText('Kirim')).toBeInTheDocument();
  });
});
