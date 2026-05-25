import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '*.vsix', 'coverage/**']
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/core/**/*.ts', 'src/view/viewModes/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'vscode', message: 'core/ and viewModes/ must not import vscode at runtime' }]
      }]
    }
  }
);
