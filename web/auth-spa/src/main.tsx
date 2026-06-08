import { createRoot } from 'react-dom/client';
import SuperTokens, { SuperTokensWrapper } from 'supertokens-auth-react';
import AuthApp from './AuthApp';
import { frontendConfig } from './frontendConfig';

SuperTokens.init(frontendConfig());

const rootEl = document.getElementById('supertokens-root');
if (rootEl) {
  createRoot(rootEl).render(
    <SuperTokensWrapper>
      <AuthApp />
    </SuperTokensWrapper>
  );
}
