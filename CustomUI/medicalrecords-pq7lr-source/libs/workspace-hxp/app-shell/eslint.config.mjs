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
                            sourceTag: 'scope:workspace-hxp-app-shell',
                            onlyDependOnLibsWithTags: [
                                'scope:workspace-hxp-feature-flag',
                                'scope:workspace-hxp-content-services-extension-domain-shell',
                                'scope:workspace-hxp-process-services-cloud-extension-process-form-feature-shell',
                                'scope:adf-enterprise-adf-hx-content-services-api',
                                'scope:adf-enterprise-adf-hx-content-services-services',
                                'scope:shared-identity',
                                'scope:shared-hxp-ui',
                                'scope:workspace-hxp-idp-services-extension-domain-shell',
                                'scope:workspace-hxp-idp-services-extension-class-verification-feature-shell',
                                'scope:workspace-hxp-governance-services-extension-domain-shell',
                                'scope:shared-hxp-navigation-application-chrome',
                                'scope:adf-enterprise-adf-hx-content-services-features',
                                'scope:shared-hxp-navigation-header',
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
