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
  { ignores: ['web/static/js/*.min.js'] },

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
      'jsdoc/require-jsdoc': ['warn', {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false
        }
      }],
      'unicorn/prefer-at': 'warn'
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
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'unicorn/catch-error-name': 'off',
      'unicorn/prefer-logical-operator-over-ternary': 'off',
      'unicorn/no-array-sort': 'off',
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
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
      'promise/no-nesting': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unnecessary-template-expression': 'off',
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/no-dead-store': 'off',
      'sonarjs/deprecation': 'off',
      'sonarjs/prefer-regexp-exec': 'off',
      'sonarjs/no-useless-catch': 'off',
      'sonarjs/no-identical-expressions': 'off',
      'sonarjs/function-return-type': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/slow-regex': 'off',
      'sonarjs/no-clear-text-protocols': 'off',
      'consistent-return': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-unsafe-regex': 'off',
      'security/detect-function-call-injection': 'off',
      'import/no-named-as-default': 'off',
      'jsdoc/require-jsdoc': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  // --- auth-spa overrides ---
  {
    files: ['web/auth-spa/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@next/next/no-img-element': 'off'
    }
  }
]
