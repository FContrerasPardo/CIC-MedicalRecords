import rootConfig from '../../../../../eslint.config.mjs';

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
                            sourceTag: 'scope:workspace-hxp-content-services-search-feature-shell',
                            onlyDependOnLibsWithTags: [
                                'scope:adf-enterprise-adf-hx-content-services-api',
                                'scope:adf-enterprise-adf-hx-content-services-services',
                                'scope:adf-enterprise-adf-hx-content-services-ui',
                                'scope:adf-enterprise-adf-hx-content-services-icons',
                                'scope:adf-enterprise-adf-hx-content-services-features',
                                'scope:adf-enterprise-adf-hx-content-services-icons',
                                'scope:workspace-hxp-content-services-extension-shared-util',
                                'scope:workspace-hxp-shared-testing',
                                'scope:workspace-hxp-shared-services',
                                'scope:workspace-hxp-shared-workspace-document-tree',
                                'scope:workspace-hxp-content-services-extension-shared-content-repository-feature-shell',
                                'scope:workspace-hxp-content-services-extension-shared-content-repository-ui',
                                'scope:shared-identity',
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
