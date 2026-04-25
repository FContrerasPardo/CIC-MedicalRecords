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
                            sourceTag: 'scope:workspace-hxp-idp-services-extension-class-verification-feature-shell',
                            onlyDependOnLibsWithTags: [
                                'scope:workspace-hxp-feature-flag',
                                'scope:idp-document-viewer',
                                'scope:workspace-hxp-idp-services-extension-shared',
                                'scope:workspace-hxp-shared-upload-files-feature-shell',
                                'scope:adf-enterprise-adf-hx-content-services-api',
                                'scope:adf-enterprise-adf-hx-content-services-services',
                                'scope:shared-hxp-services',
                            ],
                        },
                    ],
                },
            ],
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'hylandIdp',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'hyland-idp',
                    style: 'kebab-case',
                },
            ],
        },
    },
];
