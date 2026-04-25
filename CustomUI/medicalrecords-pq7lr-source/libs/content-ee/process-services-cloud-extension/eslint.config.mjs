import rootConfig from '../../../eslint.config.mjs';

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
                            sourceTag: 'scope:content-ee-process-services-cloud-extension',
                            onlyDependOnLibsWithTags: [
                                'scope:shared-form-rules',
                                'scope:shared-identity',
                                'scope:shared-filters-smart',
                                'scope:shared-filters-services',
                                'scope:adf-enterprise-adf-hx-content-services-features',
                                'scope:shared-core',
                                'scope:studio-shared-feature-flag',
                            ],
                        },
                    ],
                },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'apa',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: ['apa', 'app'],
                    style: 'kebab-case',
                },
            ],
        },
    },
];
