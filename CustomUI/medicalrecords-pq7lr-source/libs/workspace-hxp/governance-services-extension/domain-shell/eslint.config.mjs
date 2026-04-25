import rootConfig from '../../../../eslint.config.mjs';

export default [
    ...rootConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    allow: ['@alfresco-dbp/shared-testing/**', '@features'],
                    depConstraints: [
                        {
                            sourceTag: 'scope:workspace-hxp-governance-services-extension-domain-shell',
                            onlyDependOnLibsWithTags: [
                                'scope:workspace-hxp-shared-services',
                                'scope:workspace-hxp-shared-testing',
                                'scope:adf-enterprise-adf-hx-content-services-features',
                                'scope:adf-enterprise-adf-hx-content-services-ui',
                                'scope:adf-enterprise-adf-hx-content-services-services',
                            ],
                        },
                    ],
                },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'hxp',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'hxp',
                    style: 'kebab-case',
                },
            ],
        },
    },
];
