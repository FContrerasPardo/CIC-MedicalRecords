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
                            sourceTag: 'category:shared-hxp',
                            notDependOnLibsWithTags: ['category:studio-shared', 'category:admin-shared'],
                        },
                        {
                            sourceTag: 'scope:shared-hxp-services',
                            onlyDependOnLibsWithTags: ['scope:adf-enterprise-adf-hx-content-services-services'],
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
                    prefix: ['hxp', 'app'],
                    style: 'kebab-case',
                },
            ],
        },
    },
];
