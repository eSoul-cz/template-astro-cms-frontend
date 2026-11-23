// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Flat config: ESLint recommended + typescript-eslint + eslint-plugin-astro + eslint-plugin-vue (the Vue islands).
// Formatting is Prettier's job (`pnpm format`).
export default defineConfig(
    globalIgnores(['.astro/', 'dist/', 'node_modules/', 'playwright-report/', 'test-results/']),
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...astro.configs.recommended,
    // Essential rules only: the stylistic Vue rules (indentation, attribute layout) belong to Prettier.
    ...vue.configs['flat/essential'],
    {
        files: ['**/*.vue'],
        languageOptions: { parserOptions: { parser: tseslint.parser } },
    },
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
    {
        // Node scripts (build verification, e2e server, config files).
        files: ['**/*.mjs', 'e2e/**', 'scripts/**', 'eslint.config.js', 'playwright.config.ts'],
        languageOptions: { globals: globals.node },
    },
);
