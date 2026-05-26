const { FlatCompat } = require('@eslint/eslintrc')
const sonarjs = require('eslint-plugin-sonarjs')

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

module.exports = [
  ...compat.extends('next/core-web-vitals'),
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  {
    plugins: {
      sonarjs,
    },
    rules: {
      'react/no-unescaped-entities': 'off',
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  },
]
