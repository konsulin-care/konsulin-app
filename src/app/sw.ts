import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Bypass cache for /proxy/* FHIR API calls — always hit the network.
const customRuntimeCaching = [
  {
    matcher: ({
      url: { pathname },
      sameOrigin
    }: {
      url: { pathname: string };
      sameOrigin: boolean;
    }) => sameOrigin && pathname.startsWith('/proxy/'),
    handler: new NetworkOnly()
  },
  ...defaultCache
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customRuntimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/~offline', // the page that'll display if user goes offline
        matcher({ request }) {
          return request.destination === 'document';
        }
      }
    ]
  }
});

serwist.addEventListeners();
