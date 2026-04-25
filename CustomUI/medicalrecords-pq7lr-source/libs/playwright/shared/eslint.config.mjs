import rootConfig from '../../../eslint.config.mjs';

export default [
    ...rootConfig,
    {
        files: ['**/*.ts'],
        rules: {
            'unicorn/prefer-node-protocol': 'off',
        },
    },
];
