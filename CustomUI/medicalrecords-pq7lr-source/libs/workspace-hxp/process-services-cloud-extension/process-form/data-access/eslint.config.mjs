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
                            sourceTag: 'scope:workspace-hxp-process-services-cloud-extension-process-form-data-access',
                            onlyDependOnLibsWithTags: [
                                'scope:workspace-hxp-shared-testing',
                                'scope:shared-hxp-services',
                                'scope:adf-enterprise-adf-hx-content-services-services',
                                'scope:adf-enterprise-adf-hx-content-services-api',
                                'scope:workspace-hxp-feature-flag',
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
