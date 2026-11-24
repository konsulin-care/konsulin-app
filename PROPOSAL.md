---
title: In-Place Guest Save
description: Let a guest save the report with an emailed code, without leaving the page
status: draft
date: 2026-11-24
---

# Context

PR 1 of the report revamp makes the 24-hour window true. Saving still sends the guest to `/auth`, and today's API sends magic links only. A link opened in another browser has no `anon_session` cookie, so the claim finds nothing. This plan keeps the guest on the page and verifies the email with a 6-digit code.

# Check the API repo first

Run these checks in `../backend`. Stop if any one fails.

1. `PLAN-PASSWORDLESS-CODE-LOGIN.md` is merged and deployed to the target environment
2. `FlowType` in `internal/app/services/core/auth/auth_supertoken_impl.go` is `USER_INPUT_CODE` or `USER_INPUT_CODE_AND_MAGIC_LINK`. Today it is `MAGIC_LINK`
3. `buildEmailDeliveryConfig` sends `UserInputCode`. Today it fails when `UrlWithLinkCode` is nil and passes only `URL` and `Email` to the webhook
4. The webhook input and the email template carry and show the code
5. The code lifetime and maximum attempts are known; the sheet copy states the lifetime
6. Code create, resend and consume are rate limited per IP and per email
7. `EmailExistsGET` stays nil, and create-code answers the same way for new and known emails
8. `buildPasswordlessConsumeCodeOverride` gives new users Patient and keeps `anon_session`
9. `PATCH /api/v1/auth/anonymous/claim` succeeds in the same browser right after consuming a code
10. Bruno specs in `docs/api/auth/` cover create, resend, consume and the incorrect, expired and restart responses
    Smoke test: `POST /auth/signinup/code` returns `flowType` other than `MAGIC_LINK`, and the email shows a 6-digit code.

# Implementation

- [ ] Tests first: the hook's state changes, the sheet's steps, the FAB opening the sheet, and `onHandleEvent` not pushing `/auth` while a claim is pending
- [ ] Hook `@/src/hooks/usePasswordlessCode.ts`, with states email, sending, code, verifying, link-sent and done. On INCORRECT_USER_INPUT_CODE_ERROR show the attempts left. On EXPIRED_USER_INPUT_CODE_ERROR offer resend through `resendCode`. On RESTART_FLOW_ERROR call `clearLoginAttemptInfo` and go back to the email step. On SIGN_IN_UP_NOT_ALLOWED or a general error show a generic message that never reveals whether the email exists
- [ ] Sheet `@/src/components/assessment/save-report-sheet.tsx`: `AppDrawer`, an email field, `@/src/components/ui/input-otp.tsx` with 6 slots, and resend with a cooldown. Closing it calls `clearLoginAttemptInfo`
- [ ] FAB `@/src/components/assessment/claim-report-fab.tsx` calls `saveIntent` and opens the sheet, on both /report and /result. Encode `redirectToPath` in the fallback link
- [ ] Magic-link fallback: if `createCode` returns `flowType: 'MAGIC_LINK'`, show "check your email" and keep today's flow
- [ ] Redirect: in `@/src/config/frontendConfig.ts`, skip `router.push('/auth')` when `hasPendingAssessmentClaimIntent()` is true
- [ ] Messages `report.save_sheet.*` in `@/src/messages/{id,en}/common.json`; update `@/docs/agents/report-fab-states.md`
- [ ] Quality gate: `npm run typecheck`, `npx vitest run`, `npx eslint --max-warnings 0 src/`, `npm run build`

# Flow

1. Tap "Simpan Laporan": `saveIntent('assessmentResult', { path, qrId })`
2. Enter email: `createCode({ email })`
3. Enter code: `consumeCode({ userInputCode })`
4. On success, `onHandleEvent` sets `location.href = '/'`, the intent handler claims the report, and the user returns to `path`

# Risks

| Risk                                               | Mitigation                       |
| -------------------------------------------------- | -------------------------------- |
| The `/auth` prebuilt UI changes with the flow type | run UAT on `/auth` login as well |
| The redirect fires before the sheet closes         | accepted; the claim runs on `/`  |
| Code entry is used to probe emails                 | API rate limits; generic errors  |

# UAT

1. Guest taps "Simpan Laporan", enters an email and the code, and lands on the report under the new account
2. A wrong code shows the attempts left; an expired code offers resend
3. Reloading the page mid-flow and starting again works
4. With the API on link-only, the sheet says to check email and the old flow works
5. `/auth` login still works for an existing user

# Out of Scope

- Codes by phone or WhatsApp
- Redesigning `/auth`
