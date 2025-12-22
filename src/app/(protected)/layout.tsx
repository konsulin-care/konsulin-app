import type { ReactNode } from 'react';

/**
 * Protected layout
 *
 * IMPORTANT:
 * - Authentication is handled by SuperTokens + middleware
 * - This layout must NOT verify sessions or JWTs
 * - Business rules (profile completeness) are enforced in middleware
 */
export default function ProtectedLayout({
  children
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
