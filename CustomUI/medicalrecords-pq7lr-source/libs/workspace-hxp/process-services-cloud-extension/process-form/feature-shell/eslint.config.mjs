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
                            sourceTag: 'scope:workspace-hxp-process-services-cloud-extension-process-form-feature-shell',
                            onlyDependOnLibsWithTags: [
                                'scope:workspace-hxp-feature-flag',
                                'scope:workspace-hxp-process-services-cloud-extension-process-form-data-access',
                                'scope:content-ee-process-services-cloud-extension',
                                'scope:workspace-hxp-shared-upload-files-feature-shell',
                                'scope:shared-hxp-form-widgets-feature-shell',
                                'scope:shared-hxp-services',
                                'scope:workspace-hxp-shared-testing',
                                'scope:adf-enterprise-adf-hx-content-services-api',
                                'scope:adf-enterprise-adf-hx-content-services-services',
                                'scope:adf-enterprise-adf-hx-content-services-ui',
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
