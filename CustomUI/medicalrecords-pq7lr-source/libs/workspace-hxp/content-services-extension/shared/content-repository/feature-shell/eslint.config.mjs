import rootConfig from '../../../../../../eslint.config.mjs';

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
                            sourceTag: 'scope:workspace-hxp-content-services-extension-shared-content-repository-feature-shell',
                            onlyDependOnLibsWithTags: [
                                'scope:workspace-hxp-shared-services',
                                'scope:workspace-hxp-shared-upload-files-feature-shell',
                                'scope:workspace-hxp-content-services-extension-shared-content-repository-ui',
                                'scope:workspace-hxp-content-services-extension-shared-upload-feature-shell',
                                'scope:workspace-hxp-shared-services',
                                'scope:workspace-hxp-shared-testing',
                                'scope:shared-hxp-services',
                                'scope:adf-enterprise-adf-hx-content-services-api',
                                'scope:adf-enterprise-adf-hx-content-services-services',
                                'scope:adf-enterprise-adf-hx-content-services-ui',
                                'scope:adf-enterprise-adf-hx-content-services-features',
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
