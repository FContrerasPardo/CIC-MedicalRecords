import rootConfig from '../eslint.config.mjs';

export default [
    ...rootConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            'no-console': 'off',
            'unicorn/no-process-exit': 'off',
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    allow: ['@alfresco-dbp/shared-testing/**', '@features'],
                    depConstraints: [
                        {
                            sourceTag: 'scope:tooling',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                    ],
                },
            ],
            'unicorn/prefer-module': 'warn',
            'unicorn/prefer-node-protocol': 'warn',
            'unicorn/import-style': 'warn',
        },
    },
];
