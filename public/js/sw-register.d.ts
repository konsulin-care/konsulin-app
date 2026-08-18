/**
 * Type declarations for public/js/sw-register.js.
 *
 * Classic (non-module) script: intentionally has no exports, runs purely
 * as side effects on load via strategy='beforeInteractive'. This shim lets
 * TypeScript resolve the dynamic `import('../sw-register.js')` used by the
 * vitest suite while keeping the implementation export-free.
 */
declare const swRegister: void;
export default swRegister;
