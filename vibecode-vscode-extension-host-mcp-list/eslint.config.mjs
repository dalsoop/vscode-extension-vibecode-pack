import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '*.vsix']
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    // Webview client + ext-side panel use the outFile + sections + ambient-contracts
    // pattern which requires triple-slash references and namespaces.
    files: [
      'src/views/detail-panel/panel.ts',
      'src/views/detail-panel/client/**/*.ts'
    ],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  }
);
