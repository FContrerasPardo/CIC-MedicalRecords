import rootConfig from '../../../../eslint.config.mjs';

export default [
    ...rootConfig,
    {
        files: ['**/*.ts'],
        rules: {
            'unicorn/prefer-node-protocol': 'off',
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    allow: [],
                    depConstraints: [
                        {
                            sourceTag: 'scope:workspace-hxp-governance-services-extension-playwright',
                            onlyDependOnLibsWithTags: ['scope:workspace-hxp-shared-playwright', 'scope:shared-playwright'],
                        },
                    ],
                },
            ],
        },
    },
];
