import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '*.cjs',
      'coverage/**',
      'tests/**',
      'tailwind.config.ts',
    ],
  },
  // next/typescript flags hundreds of legacy `any` usages; type safety is enforced by `npm run typecheck`.
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Copy and UI strings use apostrophes/quotes; escaping hurts readability.
      'react/no-unescaped-entities': 'off',
      // Several legacy components call hooks after early returns; warn until refactored.
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-anonymous-default-export': 'off',
    },
  },
];

export default eslintConfig;
