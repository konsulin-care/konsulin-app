/* eslint-disable @typescript-eslint/no-require-imports */
const { FlatCompat } = require('@eslint/eslintrc')
const sonarjs = require('eslint-plugin-sonarjs')
const jsdoc = require('eslint-plugin-jsdoc')
const unicorn = require('eslint-plugin-unicorn').default
const tsParser = require('@typescript-eslint/parser')
const importPlugin = require('eslint-plugin-import')
const securityPlugin = require('eslint-plugin-security')
const promisePlugin = require('eslint-plugin-promise')
const reactHooks = require('eslint-plugin-react-hooks')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

const compat = new FlatCompat({
  baseDirectory: __dirname
})

/** Rules from strict-type-checked + stylistic-type-checked configs */
const tsStrictRules = tsPlugin.configs['strict-type-checked'].rules
const tsStylisticRules = tsPlugin.configs['stylistic-type-checked'].rules

module.exports = [
  { ignores: ['web/static/js/*.min.js', '**/.next/**'] },

  // --- Base: Next.js (loads import, react, jsx-a11y plugins internally) ---
  ...compat.extends('next/core-web-vitals'),

  // --- TS base recommended (non-type-aware, no project required) ---
  ...compat.extends('plugin:@typescript-eslint/recommended'),

  // --- React hooks recommended ---
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules
  },

  // --- SonarJS recommended (160+ rules) ---
  {
    plugins: { sonarjs },
    rules: sonarjs.configs.recommended.rules
  },

  // --- Unicorn recommended (178 rules) ---
  {
    plugins: { unicorn },
    rules: unicorn.configs['flat/recommended'].rules,
    languageOptions: unicorn.configs['flat/recommended'].languageOptions
  },

  // --- Security recommended ---
  securityPlugin.configs.recommended,

  // --- Promise recommended ---
  promisePlugin.configs['flat/recommended'],

  // --- Import: recommended rules + TypeScript settings (plugin loaded by Next.js) ---
  {
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      ...importPlugin.flatConfigs.typescript.rules
    },
    settings: importPlugin.flatConfigs.typescript.settings
  },

  // --- Override rules for all files ---
  {
    plugins: { sonarjs, jsdoc, unicorn },
    rules: {
      // Prettier-compatible unicorn overrides
      'unicorn/no-null': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/consistent-function-scoping': 'off',

      // SonarJS noise reduction
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',

      // Next.js overrides
      'react/no-unescaped-entities': 'off',

      // Maintain existing custom rules
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'default-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-nested-ternary': 'error',
      'object-shorthand': ['error', 'always'],
      'no-implicit-coercion': 'error',
      'consistent-return': 'error',
      'no-negated-condition': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-max-depth': ['error', { max: 4 }],
      'react/no-array-index-key': 'error',
      'react/self-closing-comp': 'error',
      'sonarjs/no-nested-functions': 'error',
      'jsdoc/require-jsdoc': 'off',
      'unicorn/prefer-at': 'error'
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    }
  },

  // --- TypeScript-aware rules (strict + stylistic) for TS files only ---
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      ...tsStrictRules,
      ...tsStylisticRules,
      // ── Always-on (error): real bugs that external tools flag too ──
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-floating-promises': 'error', // Codacy: Promise Rejection
      '@typescript-eslint/no-misused-promises': 'error', // DeepSource: async-as-handler
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Requires strictNullChecks in tsconfig, which is off
      '@typescript-eslint/no-unnecessary-type-conversion': 'error',
      '@typescript-eslint/no-unused-vars': 'error', // DeepScan: unused variable
      'consistent-return': 'error',
      'promise/catch-or-return': 'error', // Codacy: Promise Rejection
      'promise/no-nesting': 'error', // SonarQube: nested callbacks
      'sonarjs/no-unused-vars': 'error', // DeepScan: unused variable
      'max-depth': ['error', { max: 4 }], // DeepScan: excessive nesting
      'max-params': ['error', { max: 5 }], // SonarQube S107: too many params
      'security/detect-unsafe-regex': 'error', // DeepSource: regex-dos

      // ── Progressive (warn → error as debt is paid) ──
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      complexity: ['error', 15],
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-deprecated': 'error',
      'unicorn/no-array-sort': 'error',
      'promise/always-return': 'error',
      'sonarjs/slow-regex': 'error',
      'sonarjs/function-return-type': 'error',
      'sonarjs/no-dead-store': 'error',
      'sonarjs/deprecation': 'off', // duplicates @typescript-eslint/no-deprecated (set to error above)

      // ── Hard-off: FHIR domain patterns (not fixable without breaking FHIR) ──
      '@typescript-eslint/no-non-null-assertion': 'off',
      // FHIR bundles: item.resource!.practitioner!.reference!
      '@typescript-eslint/restrict-template-expressions': 'off',
      // Phone numbers, FHIR IDs, dates in templates — all legitimate numbers
      'security/detect-object-injection': 'off',
      // Every form handler triggers this; data is from controlled inputs
      'sonarjs/no-clear-text-protocols': 'off',
      // FHIR canonical URLs: https://loinc.org, https://snomed.info — not fixable

      // ── Hard-off: stylistic noise (no bug-safety value) ──
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/no-unnecessary-template-expression': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      // Note: consistent-return is set to 'error' above as Tier 1
      'import/no-named-as-default': 'off',
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false
        }
      }],

      // ── Unicorn: noise reduction (stylistic, not bug-catching) ──
      'unicorn/no-null': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/prefer-logical-operator-over-ternary': 'off',
      'unicorn/prefer-split-limit': 'off',
      'unicorn/prefer-string-raw': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/no-lonely-if': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/no-console-spaces': 'off',
      'unicorn/prefer-number-properties': 'off',
      'unicorn/prefer-regexp-test': 'off',
      'unicorn/prefer-code-point': 'off',
      'unicorn/consistent-compound-words': 'off',

      // ── SonarJS: noise reduction (duplicates or false positives) ──
      // Leakage from plugin defaults — tracked here for graduation
      'security/detect-non-literal-regexp': 'error',
      'import/no-named-as-default-member': 'error',

      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-useless-catch': 'off',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/prefer-regexp-exec': 'off'

      // ── Security: false positives for this codebase ──

    }
  },

  // --- auth-spa overrides ---
  {
    files: ['web/auth-spa/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@next/next/no-img-element': 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/prefer-query-selector': 'off',
      'unicorn/no-document-cookie': 'off'
    }
  }
]
