import rootConfig from '../../../../../eslint.config.mjs';

export default [
    ...rootConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            'prefer-spread': ['off'],
            'prefer-rest-params': ['off'],
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    allow: ['@alfresco-dbp/shared-testing/**', '@features'],
                    depConstraints: [
                        {
                            sourceTag: 'scope:workspace-hxp-shared-upload-files-feature-shell',
                            onlyDependOnLibsWithTags: [
                                'scope:adf-enterprise-adf-hx-content-services-api',
                                'scope:adf-enterprise-adf-hx-content-services-icons',
                                'scope:shared-hxp-services',
                                'scope:workspace-hxp-shared-testing',
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
