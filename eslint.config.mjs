import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json',
            },
        },
        rules: {
            '@typescript-eslint/no-namespace': 'off', // Allow namespaces
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    args: 'none', // Allow unused function parameters (required by API callbacks)
                },
            ],
            'prefer-const': 'warn', // Using let instead of const for variables never reassigned
            'no-prototype-builtins': 'warn', // Access Object.prototype method 'hasOwnProperty'
            'no-empty': 'warn', // Empty block statement
            'no-debugger': 'warn', // Unexpected 'debugger' statement
        },
    },
    {
        ignores: ['node_modules/**'],
    },
];
