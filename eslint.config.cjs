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
      '@typescript-eslint/no-base-to-string': 'error'
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
