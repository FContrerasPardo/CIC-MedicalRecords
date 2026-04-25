/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { firstOrDefault, lastOrDefault } from './util';

describe(firstOrDefault.name, () => {
    it('should return first item from iterable', () => {
        expect(firstOrDefault(['first', 'second', 'third'])).toBe('first');
    });

    it('should return default when iterable is empty', () => {
        expect(firstOrDefault([], 'fallback')).toBe('fallback');
        expect(firstOrDefault([])).toBeUndefined();
    });
});

describe(lastOrDefault.name, () => {
    it('should return last item from iterable', () => {
        expect(lastOrDefault(['first', 'second', 'third'])).toBe('third');
    });

    it('should return default when iterable has no items', () => {
        expect(lastOrDefault([], 'fallback')).toBe('fallback');
        expect(lastOrDefault([])).toBeUndefined();
    });
});
