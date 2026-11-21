import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { scanSource } from './raw-color-scan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '../../..');

/**
 * Repo-relative paths swept by the design-token migration. Each sweep task
 * appends its owned files here, sorted alphabetically.
 */
const SWEPT: string[] = [
  'src/app/assessments/assessment-card.tsx',
  'src/app/assessments/assessment-drawer.tsx',
  'src/app/assessments/assessments-list.tsx',
  'src/app/assessments/browse-instruments-section.tsx',
  'src/app/assessments/error.tsx',
  'src/app/assessments/featured-rail.tsx',
  'src/app/assessments/popular-assessments-section.tsx',
  'src/app/clinic/clinic-filter.tsx',
  'src/app/home-content.tsx',
  'src/app/layout.tsx',
  'src/app/practitioner-dashboard.tsx',
  'src/app/practitioner/admin-listing.tsx',
  'src/app/practitioner/appointment-summary.tsx',
  'src/app/practitioner/availability/page.tsx',
  'src/app/practitioner/booking-calendar.tsx',
  'src/app/practitioner/booking-form-section.tsx',
  'src/app/practitioner/page.tsx',
  'src/app/practitioner/patient-detail.tsx',
  'src/app/practitioner/practitioner-availability-editor.tsx',
  'src/app/practitioner/practitioner-filter.tsx',
  'src/app/practitioner/practitioner-working-location-card.tsx',
  'src/app/practitioner/service-form-drawer.tsx',
  'src/app/practitioner/services-tab.tsx',
  'src/app/practitioner/time-slots-section.tsx',
  'src/app/recommendation/page.tsx',
  'src/app/recommendation/recommendation-card.tsx',
  'src/app/result/result-view.tsx',
  'src/components/availability/availability-editor.tsx',
  'src/components/availability/day-selector-navigation.tsx',
  'src/components/availability/floating-save-button.tsx',
  'src/components/availability/organization-card.tsx',
  'src/components/availability/time-range-input.tsx',
  'src/components/clinic/clinic-practitioners-view.tsx',
  'src/components/general/action-card.tsx',
  'src/components/general/avatar.tsx',
  'src/components/general/card-stack-container.tsx',
  'src/components/general/fhir-forms-renderer.tsx',
  'src/components/general/home/guest-onboarding-section.tsx',
  'src/components/general/home/interview/complaint-search.tsx',
  'src/components/general/home/interview/emergency-banner.tsx',
  'src/components/general/home/interview/interview-accordion.tsx',
  'src/components/general/home/interview/interview-flow.tsx',
  'src/components/general/home/recommendation-card-stack.tsx',
  'src/components/general/home/recommendation-card.tsx',
  'src/components/general/input.tsx',
  'src/components/general/loading-section.tsx',
  'src/components/general/profile-completeness-modal.tsx',
  'src/components/icons/filter-icon.tsx',
  'src/components/icons/house-icon.tsx',
  'src/components/icons/literature-icon.tsx',
  'src/components/icons/loading-spinner-icon.tsx',
  'src/components/icons/note-icon.tsx',
  'src/components/icons/office-icon.tsx',
  'src/components/icons/user-icon.tsx',
  'src/components/practitioner/practitioner-card.tsx',
  'src/components/practitioner/service-card.tsx',
  'src/components/profile/collapsible.tsx',
  'src/components/profile/completeness-banner.tsx',
  'src/components/profile/dob-input.tsx',
  'src/components/profile/dropdown-profile.tsx',
  'src/components/profile/information-detail.tsx',
  'src/components/profile/medal-collection.tsx',
  'src/components/profile/photo-uploader.tsx',
  'src/components/profile/ProfileActions.tsx',
  'src/components/profile/tags.tsx',
  'src/components/register-practitioner-drawer/drawer-content.tsx',
  'src/components/role-avatar-popup-header.tsx',
  'src/components/role-switch-dropdown.tsx',
  'src/components/screening-drawer.tsx',
  'src/components/shared/combobox.tsx',
  'src/components/shared/date-picker-button.tsx',
  'src/components/shared/date-preset-filter.tsx',
  'src/components/shared/filter-drawer-trigger.tsx',
  'src/components/shared/journal-response-fields.tsx',
  'src/components/shared/journal-submit-button.tsx',
  'src/components/shared/location-form-fields.tsx',
  'src/components/shared/location-hours-editor.tsx',
  'src/components/shared/questionnaire-upload-drawer.tsx',
  'src/components/shared/questionnaire-uploader.tsx',
  'src/components/shared/record-card.tsx',
  'src/components/shared/schedule-page-shell.tsx',
  'src/components/stacked-circles.tsx',
  'src/components/ui/circular-progress.tsx',
  'src/components/ui/slider.tsx',
  'src/services/hooks/usePractitionerDashboard.ts',
  'src/utils/helper.tsx'
];

describe('raw colour guard', () => {
  it('flags every guarded colour and utility form', () => {
    const source = [
      'className="bg-[#13c2c2] text-[#2c2f35]"',
      'className="text-[10px] text-[11px]"',
      'className="bg-[var(--secondary)] text-[var(--soft-gray)]"',
      'className="text-[var(--muted)] bg-[var(--primary)] border-[var(--border)]"',
      'className="text-gray-500 bg-slate-100 border-gray-200"',
      'className="bg-white text-black"',
      'className="text-teal-500"',
      'className="text-secondary"',
      'className="text-red-500 bg-amber-100 border-green-500 text-blue-600"'
    ].join('\n');

    const findings = scanSource(source);
    const matches = findings.map(finding => finding.match);
    const patterns = findings.map(finding => finding.pattern);

    expect(matches).toContain('#13c2c2');
    expect(matches).toContain('text-[10px]');
    expect(matches).toContain('text-[11px]');
    expect(matches).toContain('var(--secondary)');
    expect(matches).toContain('var(--soft-gray)');
    expect(matches).toContain('var(--muted)');
    expect(matches).toContain('var(--primary)');
    expect(matches).toContain('var(--border)');
    expect(matches).toContain('text-gray-500');
    expect(matches).toContain('bg-slate-100');
    expect(matches).toContain('border-gray-200');
    expect(matches).toContain('bg-white');
    expect(matches).toContain('text-black');
    expect(matches).toContain('text-teal-500');
    expect(matches).toContain('text-secondary');
    expect(matches).toContain('text-red-500');
    expect(matches).toContain('bg-amber-100');
    expect(matches).toContain('border-green-500');
    expect(matches).toContain('text-blue-600');

    expect(patterns).toContain('six-digit-hex');
    expect(patterns).toContain('text-10-11px');
    expect(patterns).toContain('legacy-css-var');
    expect(patterns).toContain('neutral-utility');
    expect(patterns).toContain('bg-white');
    expect(patterns).toContain('text-black');
    expect(patterns).toContain('text-teal');
    expect(patterns).toContain('text-secondary');
    expect(patterns).toContain('status-utility');
  });

  it('ignores allowed tokens, allowed utilities and three-digit hex', () => {
    const source = [
      'className="bg-secondary"',
      'className="text-secondary-foreground"',
      'className="text-white"',
      'className="shadow-md"',
      'className="bg-[var(--color-turquoise-deep)]"',
      'className="bg-[#fff] text-[#000]"'
    ].join('\n');

    expect(scanSource(source)).toEqual([]);
  });

  it('sweeps every file in SWEPT and reports file, line and match', () => {
    const report: string[] = [];

    for (const relativePath of SWEPT) {
      const text = readFileSync(resolve(repoRoot, relativePath), 'utf8');
      for (const finding of scanSource(text)) {
        report.push(`${relativePath}:${finding.line}:${finding.match}`);
      }
    }

    expect(report, report.join('\n')).toEqual([]);
  });
});
