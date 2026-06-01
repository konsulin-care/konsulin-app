import { createRoot } from 'react-dom/client';
import SuperTokens from 'supertokens-auth-react';
import AuthApp from './AuthApp';
import { frontendConfig } from './frontendConfig';

SuperTokens.init(frontendConfig());

const rootEl = document.getElementById('supertokens-root');
if (rootEl) {
  createRoot(rootEl).render(<AuthApp />);
}
