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
                            sourceTag: 'scope:idp-document-viewer',
                            onlyDependOnLibsWithTags: [],
                        },
                    ],
                },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'hyland',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'hyland',
                    style: 'kebab-case',
                },
            ],
        },
    },
];
