const { FlatCompat } = require('@eslint/eslintrc')
const sonarjs = require('eslint-plugin-sonarjs')
const jsdoc = require('eslint-plugin-jsdoc')
const unicorn = require('eslint-plugin-unicorn').default
const tsParser = require('@typescript-eslint/parser')

const compat = new FlatCompat({
  baseDirectory: __dirname
})

module.exports = [
  {
    ignores: ['web/static/js/*.min.js']
  },
  ...compat.extends('next/core-web-vitals'),
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  {
    plugins: {
      sonarjs,
      jsdoc,
      unicorn
    },
    rules: {
      'react/no-unescaped-entities': 'off',
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
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-base-to-string': 'error'
    }
  },
  {
    files: ['web/auth-spa/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@next/next/no-img-element': 'off'
    }
  }
]
