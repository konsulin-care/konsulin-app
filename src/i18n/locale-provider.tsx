'use client';

import type { Locale } from '@/lib/locale';
import { useLocale } from '@/lib/locale';
import { NextIntlClientProvider } from 'next-intl';
import { useEffect, type ReactNode } from 'react';

import enAdmin from '@/messages/en/admin.json';
import enAssessment from '@/messages/en/assessment.json';
import enAuth from '@/messages/en/auth.json';
import enCommon from '@/messages/en/common.json';
import enHome from '@/messages/en/home.json';
import enInterview from '@/messages/en/interview.json';
import enPageHeader from '@/messages/en/page-header.json';
import enProfile from '@/messages/en/profile.json';
import enResearch from '@/messages/en/research.json';
import enToast from '@/messages/en/toast.json';
import idAdmin from '@/messages/id/admin.json';
import idAssessment from '@/messages/id/assessment.json';
import idAuth from '@/messages/id/auth.json';
import idCommon from '@/messages/id/common.json';
import idHome from '@/messages/id/home.json';
import idInterview from '@/messages/id/interview.json';
import idPageHeader from '@/messages/id/page-header.json';
import idProfile from '@/messages/id/profile.json';
import idResearch from '@/messages/id/research.json';
import idToast from '@/messages/id/toast.json';

/** All namespace messages for a single locale, keyed by namespace. */
type MessageBundle = Record<string, Record<string, unknown>>;

/** Statically imported message bundles per locale. */
const MESSAGES: Record<Locale, MessageBundle> = {
  en: {
    admin: enAdmin,
    assessment: enAssessment,
    auth: enAuth,
    common: enCommon,
    home: enHome,
    interview: enInterview,
    'page-header': enPageHeader,
    profile: enProfile,
    research: enResearch,
    toast: enToast
  },
  id: {
    admin: idAdmin,
    assessment: idAssessment,
    auth: idAuth,
    common: idCommon,
    home: idHome,
    interview: idInterview,
    'page-header': idPageHeader,
    profile: idProfile,
    research: idResearch,
    toast: idToast
  }
};

/**
 * Client-side intl provider. Reads the locale from the NEXT_LOCALE cookie
 * (default 'id'), feeds the matching message bundle to
 * NextIntlClientProvider, and keeps document.documentElement.lang in sync.
 *
 * @param props.children - Tree to provide translations to.
 * @returns Provider wrapping children with locale-aware intl context.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
