'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import CompletenessBanner from '@/components/profile/completeness-banner';
import InformationDetail from '@/components/profile/information-detail';
import ProfileActions from '@/components/profile/ProfileActions';
import { settingMenus } from '@/constants/profile';
import { useAuth } from '@/context/auth/authContext';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import type { RoleProfile } from '@/services/role-profiles';
import type { Address, Patient, Practitioner } from 'fhir/r4';
import { useState } from 'react';
import AddressEditDrawer from './address-edit-drawer';
import ContactEditDrawer from './contact-edit-drawer';
import ExtensionCard from './extension-card';
import { useProfileData, type ProfileSection } from './hooks/useProfileData';
import { useProfilePhotoSave } from './hooks/useProfilePhotoSave';
import { resolveRoles } from './multi-role-sync';
import NameEditDrawer from './name-edit-drawer';
import PersonalInfoEditDrawer from './personal-info-edit-drawer';
import ProfileIdentity from './profile-identity';

type ProfileResource = Patient | Practitioner;
type DrawerId = 'name' | 'personal-info' | 'contact' | 'address';

/** Map a display section to its edit drawer. */
const SECTION_DRAWER: Record<string, DrawerId> = {
  'personal-info': 'personal-info',
  contact: 'contact',
  address: 'address'
};

/**
 * Read the raw BCP-47 language code. Patient wraps the language in
 * `PatientCommunication.language`; Practitioner stores the CodeableConcept
 * directly.
 */
function readLanguageCode(
  profile: ProfileResource | undefined
): string | undefined {
  if (!profile) return undefined;
  if (profile.resourceType === 'Practitioner') {
    return profile.communication?.[0]?.coding?.[0]?.code;
  }
  return profile.communication?.[0]?.language?.coding?.[0]?.code;
}

/** Raw section values feeding the edit drawers. */
function readRawValues(profile: ProfileResource | undefined) {
  return {
    gender: profile?.gender ?? '',
    birthDate: profile?.birthDate ?? '',
    languageCode: readLanguageCode(profile),
    email: profile?.telecom?.find(item => item.system === 'email')?.value ?? '',
    phone: profile?.telecom?.find(item => item.system === 'phone')?.value ?? '',
    address: profile?.address?.[0]
  };
}

/** Section cards with a pencil per editable section. */
function SectionCards({
  sections,
  onEdit
}: Readonly<{
  sections: ProfileSection[];
  onEdit: (drawerId: DrawerId) => void;
}>) {
  return (
    <>
      {sections.map(section => {
        const drawerId = SECTION_DRAWER[section.id];
        return (
          <InformationDetail
            key={section.id}
            title={section.title}
            rows={section.rows}
            onEdit={drawerId ? () => onEdit(drawerId) : undefined}
          />
        );
      })}
    </>
  );
}

/** All section edit drawers, each opening from the active drawer id. */
function ProfileDrawers({
  activeDrawer,
  onClose,
  fhirId,
  resourceType,
  identity,
  gender,
  birthDate,
  languageCode,
  supportsLanguage,
  email,
  phone,
  isEmailBased,
  address
}: Readonly<{
  activeDrawer: DrawerId | null;
  onClose: () => void;
  fhirId: string;
  resourceType: 'Patient' | 'Practitioner';
  identity: ReturnType<typeof useProfileData>['identity'];
  gender: string;
  birthDate: string;
  languageCode?: string;
  supportsLanguage: boolean;
  email: string;
  phone: string;
  isEmailBased: boolean;
  address: Address | undefined;
}>) {
  return (
    <>
      <NameEditDrawer
        open={activeDrawer === 'name'}
        onClose={onClose}
        fhirId={fhirId}
        resourceType={resourceType}
        given={identity.given}
        family={identity.family}
      />
      <PersonalInfoEditDrawer
        open={activeDrawer === 'personal-info'}
        onClose={onClose}
        fhirId={fhirId}
        resourceType={resourceType}
        gender={gender}
        birthDate={birthDate}
        languageCode={languageCode}
        supportsLanguage={supportsLanguage}
      />
      <ContactEditDrawer
        open={activeDrawer === 'contact'}
        onClose={onClose}
        fhirId={fhirId}
        resourceType={resourceType}
        email={email}
        phone={phone}
        isEmailBased={isEmailBased}
      />
      <AddressEditDrawer
        open={activeDrawer === 'address'}
        onClose={onClose}
        fhirId={fhirId}
        resourceType={resourceType}
        line={address?.line ?? []}
        district={address?.district ?? ''}
        city={address?.city ?? ''}
        province={address?.state ?? ''}
        postalCode={address?.postalCode ?? ''}
      />
    </>
  );
}

/**
 * Unified profile page shared by every registered role: identity hero,
 * section cards, per-role extension cards and account actions. Each section
 * edits in place via a bottom-sheet drawer. The data comes from the auth
 * profile cache; shared cards read the active role's resource while the
 * extension cards render every owned role's non-overlapping fields.
 */
export default function ProfileDisplay() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const fhirId = authState.userInfo?.fhirId ?? '';
  const roleName = authState.userInfo?.role_name ?? '';
  const userId = authState.userInfo?.userId ?? '';
  const roles = resolveRoles(authState.userInfo);
  const isEmailBased = Boolean(authState.userInfo?.email);

  const { profileData, roleProfiles, identity, sections, resourceType } =
    useProfileData(userId, roles, roleName);
  const { showBanner } = useProfileCompleteness(profileData);
  const { isUploading, handleFileSelected } = useProfilePhotoSave({
    fhirId,
    resourceType,
    profile: profileData,
    fallbackName: identity.displayName,
    fallbackEmail: authState.userInfo?.email,
    fallbackPhone: authState.userInfo?.phoneNumber
  });
  const [activeDrawer, setActiveDrawer] = useState<DrawerId | null>(null);
  const closeDrawer = () => setActiveDrawer(null);

  const raw = readRawValues(profileData);
  const loading = isAuthLoading;

  return (
    <>
      <PageHeader />
      {!loading && <CompletenessBanner show={showBanner} />}
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        {loading ? (
          <div className='flex min-h-screen min-w-full items-center justify-center'>
            <LoadingSpinnerIcon
              width={56}
              height={56}
              className='w-full animate-spin'
            />
          </div>
        ) : (
          <div className='flex min-h-screen flex-col gap-3 p-4'>
            <ProfileIdentity
              roleName={roleName}
              identity={identity}
              isUploading={isUploading}
              onFileSelected={file => {
                void handleFileSelected(file);
              }}
              onEditName={() => setActiveDrawer('name')}
            />
            <SectionCards sections={sections} onEdit={setActiveDrawer} />
            {Object.values(roleProfiles)
              .filter((profile): profile is RoleProfile =>
                Boolean(profile?.resource)
              )
              .map(profile => (
                <ExtensionCard
                  key={profile.resource.id}
                  profile={profile.resource}
                />
              ))}
            <ProfileActions menus={settingMenus} />
          </div>
        )}
      </div>

      <ProfileDrawers
        activeDrawer={activeDrawer}
        onClose={closeDrawer}
        fhirId={fhirId}
        resourceType={resourceType}
        identity={identity}
        gender={raw.gender}
        birthDate={raw.birthDate}
        languageCode={raw.languageCode}
        supportsLanguage={true}
        email={raw.email}
        phone={raw.phone}
        isEmailBased={isEmailBased}
        address={raw.address}
      />
    </>
  );
}
