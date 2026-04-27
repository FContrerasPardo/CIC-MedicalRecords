import rootConfig from '../../../eslint.config.mjs';

export default [
    ...rootConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {
            '@angular-eslint/directive-selector': 'off',
            '@angular-eslint/component-selector': 'off',
        },
    },
];
