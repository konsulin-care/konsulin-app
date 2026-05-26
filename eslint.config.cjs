const { defineConfig } = require('eslint-define-config')
const sonarjs = require('eslint-plugin-sonarjs')

module.exports = defineConfig({
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: {
    '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    sonarjs
  },
  languageOptions: {
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  },
  rules: {
    'react/no-unescaped-entities': 'off',
    'sonarjs/cognitive-complexity': ['error', 15],
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }]
  }
})
