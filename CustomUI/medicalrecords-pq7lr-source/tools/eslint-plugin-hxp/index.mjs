/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { allowOnlyPluginChange } from './extensions/index.mjs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

// import.meta.url - ES Module path to current file
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../..');

// Default configuration example shown in error messages
const defaultConfigExample = JSON.stringify([
    'error',
    { mainBranch: 'main', pluginsPath: ['libs/plugins'] }
]);

export default{
    meta: {
        name: 'eslint-plugin-hxp',
        version: '1.0.0',
    },
    rules: {
        'restrict-changes-to-plugins': allowOnlyPluginChange(defaultConfigExample, repoRoot),
    },
};
