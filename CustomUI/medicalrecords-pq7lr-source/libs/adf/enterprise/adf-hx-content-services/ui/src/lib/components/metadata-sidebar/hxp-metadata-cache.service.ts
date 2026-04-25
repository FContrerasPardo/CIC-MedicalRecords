/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';

export interface KeyValuePairs {
    [key: string]: any;
}

interface CachedItem {
    value: any;
    updated: boolean;
    originalValue: any;
}

@Injectable()
export class HxpMetadataCacheService {
    private readonly globalCache = new Map<string, CachedItem>();

    /**
     * Retrieves a cached value by its key if it has been updated.
     * If the value exists in the cache, it returns the value.
     * If the key does not exist in the cache, it returns the provided fallback value (if any) and stores it in the cache.
     * @param key The key to look up in the cache.
     * @param fallbackValue The value to return and store if the key is not found.
     * @returns The cached value or the fallback value.
     */
    getCachedValue<T>(key: string, fallbackValue?: T): T | undefined {
        let value: T | undefined = fallbackValue;
        if (this.globalCache.has(key)) {
            const cachedItem = this.globalCache.get(key);
            value = cachedItem?.updated ? cachedItem.value : cachedItem?.originalValue ?? fallbackValue;
        } else if (fallbackValue !== undefined) {
            if (this.isComplexValue(fallbackValue)) {
                throw new Error('Caching of complex objects is only supported using dot notation keys. Eg: "schema.propertyName"');
            }
            this.globalCache.set(key, { value: fallbackValue, updated: false, originalValue: fallbackValue });
        }
        return value;
    }

    getAllCachedValues(): KeyValuePairs {
        const allValues: KeyValuePairs = {};
        for (const [fieldName, cachedItem] of this.globalCache.entries()) {
            allValues[fieldName] = cachedItem.value;
        }
        return allValues;
    }

    updateCache(keyValuePairs: KeyValuePairs): void {
        this.updateGlobalCache(keyValuePairs);
    }

    invalidateCache(): void {
        this.globalCache.clear();
    }

    getUpdatedValues(): KeyValuePairs {
        const cachedValues: KeyValuePairs = {};
        for (const [fieldName, cachedItem] of this.globalCache.entries()) {
            const keys = fieldName.split('.');
            if (cachedItem.updated && !this.isSameValue(cachedItem)) {
                this.setValueToObject(cachedValues, keys, cachedItem.value);
            }
        }

        return cachedValues;
    }

    getUpdatedValuesForSchemas(schema: string[]): KeyValuePairs {
        const cachedValues: KeyValuePairs = {};
        for (const [fieldName, cachedItem] of this.globalCache.entries()) {
            const keys = fieldName.split('.');
            if (cachedItem.updated && schema.includes(keys[0]) && !this.isSameValue(cachedItem)) {
                this.setValueToObject(cachedValues, keys, cachedItem.value);
            }
        }

        return cachedValues;
    }

    private setValueToObject(obj: KeyValuePairs, keys: string[], value: any): void {
        const key = keys.shift();
        if (key) {
            if (keys.length > 0) {
                if (!obj[key]) {
                    obj[key] = {};
                }
                this.setValueToObject(obj[key], keys, value);
            } else {
                obj[key] = value;
            }
        }
    }

    private updateGlobalCache(obj: KeyValuePairs, parentKey?: string): void {
        const keys = Object.keys(obj);
        for (const key of keys) {
            if (this.isComplexValue(obj[key])) {
                this.updateGlobalCache(obj[key], parentKey ? `${parentKey}.${key}` : key);
            } else {
                const fullKey = parentKey ? `${parentKey}.${key}` : key;
                const existingEntry = this.globalCache.get(fullKey);
                this.globalCache.set(fullKey, { value: obj[key], updated: true, originalValue: existingEntry?.originalValue });
            }
        }
    }

    private isComplexValue(value: any): boolean {
        return typeof value === 'object' && value !== null && !(value instanceof Date) && !Array.isArray(value);
    }

    /**
     * Verify that CachedItem originalValue and value properties represent the same value.
     * @param originalValue It is initialised with a value coming from the backend,
     * which might be a number, a string, a string representing a Date in ISO format or an Array.
     * Objects (complex properties) are stored as nested key-value pairs in the cache using dot notation.
     * @param value The value coming from the UI might be a string, a Date object or an Array.
     * @returns true if both values are the same, false otherwise.
     */
    private isSameValue({ originalValue, value }: Pick<CachedItem, 'originalValue' | 'value'>): boolean {
        if (originalValue === value) {
            return true;
        }

        if (Number.isFinite(+originalValue)) {
            return originalValue === Number(value);
        }

        if (value instanceof Date) {
            return this.isSameDate(originalValue, value);
        }

        if (Array.isArray(originalValue) && value !== null) {
            return this.isSameArray(originalValue, value);
        }

        return false;
    }

    private isSameDate(originalValue: any, value: any): boolean {
        try {
            if (!(originalValue instanceof Date)) {
                originalValue = new Date(originalValue);
            }
            return originalValue.getTime() === value.getTime();
        } catch {
            return false;
        }
    }

    private isSameArray(originalValue: any, value: any): boolean {
        if (originalValue.length !== value.length) {
            return false;
        }
        return originalValue.every((item: any, index: number) => this.isSameValue({ originalValue: item, value: value[index] }));
    }
}
