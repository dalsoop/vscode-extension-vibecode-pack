// Flat config (ESLint v9+)
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '*.vsix', 'icons/**', 'resources/**', 'tests/setup.cjs', 'tests/_mocks/**']
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    rules: {
      // TS — relax noisy rules; project still in iteration
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none'
      }],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',

      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-duplicate-imports': 'error'
    }
  }
];
