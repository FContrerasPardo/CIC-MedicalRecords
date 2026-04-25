import rootConfig from '../../../../../eslint.config.mjs';

export default [
    ...rootConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    allow: ['@alfresco-dbp/shared-testing/**', '@features', '@alfresco/adf-core', '@alfresco/adf-core/**', '@alfresco/adf-extensions', '@alfresco/js-api'],
                    depConstraints: [
                        {
                            sourceTag: 'scope:adf-enterprise-adf-hx-content-services-ui',
                            onlyDependOnLibsWithTags: [
                                'scope:adf-enterprise-adf-hx-content-services-icons',
                                'scope:adf-enterprise-adf-hx-content-services-services',
                                'scope:workspace-hxp-shared-testing',
                                'scope:adf-enterprise-adf-hx-content-services-api',
                                'scope:adf-enterprise-adf-hx-content-services-features',
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
