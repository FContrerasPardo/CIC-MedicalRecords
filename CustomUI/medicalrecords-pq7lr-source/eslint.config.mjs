import hxpPlugin from 'eslint-plugin-hxp/index.mjs';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import nx from '@nx/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    ...nx.configs['flat/base'],
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            hxp: hxpPlugin,
            '@typescript-eslint': typescriptEslint
        },
        rules: {
            'hxp/restrict-changes-to-plugins': ['error', {
                mainBranch: 'main',
                pluginsPath: ['libs/plugins']
            }],
        },
    },
];
