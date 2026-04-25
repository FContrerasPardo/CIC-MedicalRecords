/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/* eslint-disable @cspell/spellchecker */

export default {
    plugins: ['rxjs'],
    rules: {
        'rxjs/no-async-subscribe': 'error',
        'rxjs/no-create': 'error',
        'rxjs/no-ignored-notifier': 'error',
        'rxjs/no-ignored-replay-buffer': 'error',
        'rxjs/no-ignored-takewhile-value': 'error',
        'rxjs/no-implicit-any-catch': 'error',
        'rxjs/no-index': 'error',
        'rxjs/no-internal': 'error',
        'rxjs/no-nested-subscribe': 'error',
        'rxjs/no-redundant-notify': 'error',
        'rxjs/no-sharereplay': ['error', { allowConfig: true }],
        'rxjs/no-subject-unsubscribe': 'error',
        'rxjs/no-unbound-methods': 'error',
        'rxjs/no-unsafe-subject-next': 'error',
        'rxjs/no-unsafe-takeuntil': 'error',
    },
};
