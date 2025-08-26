const { defineConfig } = require("eslint-define-config");

module.exports = defineConfig({
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  plugins: {
    "@typescript-eslint": require("@typescript-eslint/eslint-plugin")
  },
  languageOptions: {
    parser: require.resolve("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module"
    }
  },
  rules: {
    "react/no-unescaped-entities": "off"
  }
});
