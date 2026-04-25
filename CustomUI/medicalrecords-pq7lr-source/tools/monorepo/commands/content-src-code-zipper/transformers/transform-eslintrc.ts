/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileTransformer } from './file-transformer.interface';

export const transformEslintConfig: FileTransformer = () => {
    const customUIEslint = `import hxpPlugin from 'eslint-plugin-hxp/index.mjs';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import nx from '@nx/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    ...nx.configs['flat/base'],
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            hxp: hxpPlugin,
            '@typescript-eslint': typescriptEslint
        },
        rules: {
            'hxp/restrict-changes-to-plugins': ['error', {
                mainBranch: 'main',
                pluginsPath: ['libs/plugins']
            }],
        },
    },
];
`;

    return customUIEslint;
};
