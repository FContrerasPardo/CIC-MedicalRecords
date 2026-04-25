/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export type LruEvictCallback<K, V> = (key: K, value: V) => void;

export class LruCache<K, V> {
    private readonly capacity: number;
    private readonly map: Map<K, V> = new Map<K, V>();
    private readonly onEvict?: LruEvictCallback<K, V>;

    constructor(capacity: number, onEvict?: LruEvictCallback<K, V>) {
        this.capacity = Math.max(1, capacity);
        this.onEvict = onEvict;
    }

    get size(): number {
        return this.map.size;
    }

    has(key: K): boolean {
        return this.map.has(key);
    }

    get(key: K): V | undefined {
        if (!this.map.has(key)) {
            return undefined;
        }
        const value = this.map.get(key) as V;
        // refresh recency
        this.map.delete(key);
        this.map.set(key, value);
        return value;
    }

    set(key: K, value: V): void {
        if (key === undefined || key === null || value === undefined || value === null) {
            return;
        }
        if (this.map.has(key)) {
            this.map.delete(key);
        }
        this.map.set(key, value);
        if (this.map.size > this.capacity) {
            this.evictLeastRecentlyUsed();
        }
    }

    delete(key: K): boolean {
        if (!this.map.has(key)) {
            return false;
        }
        const value = this.map.get(key) as V;
        const result = this.map.delete(key);
        if (result && this.onEvict) {
            try {
                this.onEvict(key, value);
            } catch {}
        }
        return result;
    }

    clear(): void {
        if (this.onEvict) {
            for (const [key, value] of this.map) {
                try {
                    this.onEvict(key, value);
                } catch {}
            }
        }
        this.map.clear();
    }

    keys(): IterableIterator<K> {
        return this.map.keys();
    }

    private evictLeastRecentlyUsed(): void {
        const iterator = this.map.keys();
        const lruKey = iterator.next().value as K | undefined;
        if (lruKey === undefined) {
            return;
        }
        const lruValue = this.map.get(lruKey) as V;
        this.map.delete(lruKey);
        if (this.onEvict) {
            try {
                this.onEvict(lruKey, lruValue);
            } catch {}
        }
    }
}
