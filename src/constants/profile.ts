export const DRAWER_STATE = {
  NONE: 'none',
  DOB: 'dob',
  SUCCESS: 'success'
};

/** Full-profile cache freshness window for the profile page. */
export const PROFILE_CACHE_STALE_MS = 5 * 60 * 1000;

export const subtitle_success_updated =
  'Your profile is updated, looking sharp!';

export const medalLists = [
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  },
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  },
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  },
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  },
  {
    title: 'Survivor',
    description:
      'completing mindfulness exercises and boosting your mental wellness journey.',
    iconUrl: '/icons/survivor.svg'
  }
];

export const settingMenus = [
  { name: 'Delete Account', link: '/remove-account', icon: 'trash2' },
  { name: 'Log out', link: '/logout', icon: 'logout' }
] as const;

export const genderList = [
  {
    name: 'Male',
    code: 'male'
  },

  {
    name: 'Female',
    code: 'female'
  }
];

export const languageOptions = [
  { code: 'id', label: 'Indonesian' },
  { code: 'en', label: 'English' }
] as const;
