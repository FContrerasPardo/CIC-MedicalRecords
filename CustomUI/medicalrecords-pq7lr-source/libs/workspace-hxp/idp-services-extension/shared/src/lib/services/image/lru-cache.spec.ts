/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { LruCache } from './lru-cache';

describe('LruCache', () => {
    it('stores and retrieves values; updates recency on get', () => {
        const cache = new LruCache<string, number>(2);
        cache.set('a', 1);
        cache.set('b', 2);

        expect(cache.get('a')).toBe(1);
        cache.set('c', 3); // should evict 'b' (LRU) since 'a' was touched

        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('a')).toBe(1);
        expect(cache.get('c')).toBe(3);
    });

    it('evicts least-recently-used on capacity overflow', () => {
        const evicted: Array<[string, number]> = [];
        const cache = new LruCache<string, number>(2, (k, v) => evicted.push([k, v]));

        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3); // evicts 'a'

        expect(evicted).toEqual([['a', 1]]);
        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('b')).toBe(2);
        expect(cache.get('c')).toBe(3);
    });

    it('delete triggers onEvict with correct key/value', () => {
        const evicted: Array<[string, number]> = [];
        const cache = new LruCache<string, number>(3, (k, v) => evicted.push([k, v]));

        cache.set('x', 10);
        cache.set('y', 20);
        cache.set('z', 30);

        const deleted = cache.delete('y');
        expect(deleted).toBe(true);
        expect(evicted).toEqual([['y', 20]]);
        expect(cache.get('y')).toBeUndefined();
    });

    it('clear triggers onEvict for all entries and empties cache', () => {
        const evicted: Array<[string, number]> = [];
        const cache = new LruCache<string, number>(3, (k, v) => evicted.push([k, v]));

        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        cache.clear();

        expect(evicted.sort()).toEqual(
            [
                ['a', 1],
                ['b', 2],
                ['c', 3],
            ].sort()
        );
        expect(cache.size).toBe(0);
        expect(cache.get('a')).toBeUndefined();
    });

    it('has and size reflect current contents', () => {
        const cache = new LruCache<string, number>(2);
        expect(cache.size).toBe(0);
        expect(cache.has('a')).toBe(false);

        cache.set('a', 1);
        expect(cache.size).toBe(1);
        expect(cache.has('a')).toBe(true);

        cache.set('b', 2);
        expect(cache.size).toBe(2);

        cache.set('c', 3); // evict one
        expect(cache.size).toBe(2);
    });
});
