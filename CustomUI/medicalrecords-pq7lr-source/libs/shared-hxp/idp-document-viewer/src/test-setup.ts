/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import 'jest-canvas-mock';

// Polyfill crypto.randomUUID for Jest/Node environments that don't support it
if (typeof globalThis.crypto?.randomUUID !== 'function') {
    if (!globalThis.crypto) {
        (globalThis as unknown as { crypto: object }).crypto = {};
    }
    let counter = 0;
    (globalThis.crypto as { randomUUID?: () => string }).randomUUID = () =>
        `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;
}
