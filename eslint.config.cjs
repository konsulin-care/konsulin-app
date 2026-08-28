/* eslint-disable @typescript-eslint/no-require-imports */
const sonarjs = require('eslint-plugin-sonarjs')
const jsdoc = require('eslint-plugin-jsdoc')
const unicorn = require('eslint-plugin-unicorn').default
const tsParser = require('@typescript-eslint/parser')
const importPlugin = require('eslint-plugin-import')
const securityPlugin = require('eslint-plugin-security')
const promisePlugin = require('eslint-plugin-promise')
const reactHooks = require('eslint-plugin-react-hooks')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

/** Rules from strict-type-checked + stylistic-type-checked configs */
const tsStrictRules = tsPlugin.configs['strict-type-checked'].rules
const tsStylisticRules = tsPlugin.configs['stylistic-type-checked'].rules

module.exports = [
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    }
  },
  {
    ignores: [
      '**/.next/**',
      '**/__tests__/**'
    ]
  },

  // --- Base: Next.js core-web-vitals (declares react, react-hooks, import, jsx-a11y, @next/next plugins) ---
  // Augment with react and jsx-a11y rules that rely on these plugins being in scope.
  {
    ...require('eslint-config-next/core-web-vitals')[0],
    rules: {
      ...require('eslint-config-next/core-web-vitals')[0].rules,
      // React overrides (needs react plugin from above)
      'react/no-unescaped-entities': 'off',
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-max-depth': ['error', { max: 4 }],
      'react/no-array-index-key': 'error',
      'react/self-closing-comp': 'error',
      // Next.js overrides
      '@next/next/no-img-element': 'off'
    }
  },
  // Spread remaining core-web-vitals configs (TS, ignores, @next/next rules)
  ...require('eslint-config-next/core-web-vitals').slice(1),

  // --- TS base recommended ---
  ...require('typescript-eslint').configs.recommended,

  // --- React hooks recommended ---
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Disable new rules from react-hooks v5+ that flag pre-existing patterns
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/globals': 'off'
    }
  },

  // --- SonarJS recommended ---
  {
    plugins: { sonarjs },
    rules: sonarjs.configs.recommended.rules
  },

  // --- Unicorn recommended ---
  {
    plugins: { unicorn },
    rules: unicorn.configs['flat/recommended'].rules,
    languageOptions: unicorn.configs['flat/recommended'].languageOptions
  },

  // --- Security recommended ---
  securityPlugin.configs.recommended,

  // --- Promise recommended ---
  promisePlugin.configs['flat/recommended'],

  // --- Import: recommended rules + TypeScript settings ---
  {
    plugins: { import: importPlugin },
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

  // --- FHIR canonical URLs ---
  {
    files: ['src/utils/fhir/extensions.ts'],
    rules: {
      'unicorn/prefer-https': 'off'
    }
  },

  // --- public/js classic scripts ---
  {
    files: ['public/js/**/*.js'],
    rules: {
      'promise/catch-or-return': 'off',
      'promise/always-return': 'off',
      'unicorn/prefer-top-level-await': 'off'
    }
  },

  // --- TypeScript-aware rules for TS files only ---
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
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-useless-default-assignment': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'consistent-return': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-nesting': 'error',
      'sonarjs/no-unused-vars': 'error',
      'max-depth': ['error', { max: 4 }],
      'max-params': ['error', { max: 5 }],
      'security/detect-unsafe-regex': 'error',
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
      'sonarjs/deprecation': 'off',

      // --- Hard-off: FHIR domain patterns ---
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'security/detect-object-injection': 'off',
      'sonarjs/no-clear-text-protocols': 'off',

      // --- Hard-off: stylistic noise ---
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/no-unnecessary-template-expression': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      'import/no-named-as-default': 'off',
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: true
        }
      }],

      // --- Unicorn: noise reduction ---
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

      // --- SonarJS: noise reduction ---
      'security/detect-non-literal-regexp': 'error',
      'import/no-named-as-default-member': 'error',
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-hardcoded-passwords': 'off',
      'sonarjs/no-useless-catch': 'off',
      'sonarjs/no-identical-expressions': 'error',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/prefer-regexp-exec': 'off'
    }
  },

  // --- PWA status live-regions ---
  {
    files: ['src/components/pwa/**/*.tsx'],
    rules: {
      'jsx-a11y/prefer-tag-over-role': 'error'
    }
  },

  // --- Test & third-party UI: no JSDoc required ---
  {
    files: [
      'src/components/ui/**/*.ts',
      'src/components/ui/**/*.tsx',
      'src/**/__tests__/**/*.ts',
      'src/**/__tests__/**/*.tsx'
    ],
    rules: {
      'jsdoc/require-jsdoc': 'off'
    }
  }
]
