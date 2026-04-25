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
                            sourceTag: 'scope:workspace-hxp-content-services-extension-shared-upload-feature-shell',
                            onlyDependOnLibsWithTags: [
                                'scope:adf-enterprise-adf-hx-content-services-services',
                                'scope:workspace-hxp-shared-services',
                                'scope:workspace-hxp-shared-upload-files-feature-shell',
                                'scope:shared-hxp-services',
                                'scope:workspace-hxp-content-services-extension-shared-util',
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
