import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.vsix',
      'icons/**',
      'resources/**',
      'tests/setup.cjs',
      'tests/_mocks/**'
    ]
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
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none'
      }],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-duplicate-imports': 'error'
    }
  },
  {
    files: [
      'src/views/**/panel.ts',
      'src/views/**/client/**/*.ts',
      'src/webview/**/*.ts',
      'src/preview/client/**/*.ts',
      'src/settings/client/**/*.ts'
    ],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
);
