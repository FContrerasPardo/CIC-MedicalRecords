/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import requireMaterialButtonImport from './rules/require-material-button-import.mjs';
import noTrivialComponentTest from './rules/no-trivial-component-test.mjs';

export default {
    'require-material-button-import': requireMaterialButtonImport,
    'no-trivial-component-test': noTrivialComponentTest,
};
