/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { HxpMetadataCacheService } from './hxp-metadata-cache.service';

describe('HxpMetadataCacheService', () => {
    let service: HxpMetadataCacheService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [HxpMetadataCacheService],
        });
        service = TestBed.inject(HxpMetadataCacheService);
    });

    describe('getCachedValue', () => {
        it('should cache new key values', () => {
            const property1 = { key: 'prop1', value: 'value1' };
            const result1 = service.getCachedValue(property1.key, property1.value);
            const property2 = { key: 'prop2', value: 'value2' };
            const result2 = service.getCachedValue(property2.key, property2.value);

            expect(result1).toBe('value1');
            expect(result2).toBe('value2');
        });

        it('should return the original value, unless the cache is updated', () => {
            const key = 'prop1';
            const fallbackValue = 'original';
            const result1 = service.getCachedValue(key, fallbackValue);
            const result2 = service.getCachedValue(key, 'new');

            expect(result1).toBe('original');
            expect(result2).toBe('original');

            service.updateCache({ prop1: 'updated' });
            const result3 = service.getCachedValue(key, 'newer');

            expect(result3).toBe('updated');
        });

        it('should throw error when caching an object', () => {
            const key = 'complexObjectKey';
            const complexValue = { title: 'A title', description: 'A description' };

            expect(() => service.getCachedValue(key, complexValue)).toThrow();
        });
    });

    describe('updateCache', () => {
        it('should update cache with simple values', () => {
            service.updateCache({ prop1: 'previously updated' });
            const result = service.getCachedValue('prop1');

            expect(result).toBe('previously updated');
        });

        it('should update cache with object values', () => {
            service.updateCache({ parent: { title: 'A title', description: 'A description' } });
            const result1 = service.getCachedValue('parent.title');
            const result2 = service.getCachedValue('parent.description');

            expect(result1).toBe('A title');
            expect(result2).toBe('A description');
        });

        it('should handle deeply nested objects', () => {
            service.updateCache({ a: { b: { c: 'deep' } } });
            const result = service.getCachedValue('a.b.c');

            expect(result).toBe('deep');
        });
    });

    describe('invalidateCache', () => {
        it('should clear all cached values', () => {
            service.updateCache({ customProperty: 'original value' });
            let result = service.getCachedValue('customProperty', 'fallback value');

            expect(result).toBe('original value');

            service.invalidateCache();
            result = service.getCachedValue('customProperty', 'fallback value');

            expect(result).toBe('fallback value');
        });
    });

    describe('getUpdatedValues', () => {
        it('should return only updated values', () => {
            service.getCachedValue('prop1', 'original-value-1');
            service.getCachedValue('prop2', 'original-value-2');
            service.getCachedValue('prop3', 'original-value-3');
            service.updateCache({ prop1: 'updated-value-1' });
            service.updateCache({ prop3: 'updated-value-3' });
            const updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({
                prop1: 'updated-value-1',
                prop3: 'updated-value-3',
            });
        });

        it('should compare Date objects correctly', () => {
            const originalDate = '2024-01-01T10:00:00Z';
            const sameDate = new Date('2024-01-01T10:00:00Z');
            const differentDate = new Date('2024-01-02T10:00:00Z');
            service.getCachedValue('dateProp', originalDate);

            // Update with the same date - should not be marked as updated
            service.updateCache({ dateProp: sameDate });
            let updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({});

            // Update with a different date - should be marked as updated
            service.updateCache({ dateProp: differentDate });
            updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({ dateProp: differentDate });
        });

        it('should compare numbers correctly', () => {
            const originalNumber = 5;
            const sameNumber = '5';
            const differentNumber = '10';

            service.getCachedValue('numberValue', originalNumber);

            // Update with the same number - should not be marked as updated
            service.updateCache({ numberValue: sameNumber });
            let updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({});

            // Update with a different number - should be marked as updated
            service.updateCache({ numberValue: differentNumber });
            updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({ numberValue: differentNumber });
        });

        it('should compare Objects correctly', () => {
            const originalObject = { a: 1, b: 2 };
            const sameObject = { a: 1, b: 2 };
            const differentObject = { a: 2, b: 3 };
            // Objects (complex properties) are stored as nested key-value pairs in the cache using dot notation.
            service.getCachedValue('objectValue.a', originalObject.a);
            service.getCachedValue('objectValue.b', originalObject.b);

            // Update with the same object - should not be marked as updated
            service.updateCache({ objectValue: sameObject });
            let updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({});

            // Update with a different object - should be marked as updated
            service.updateCache({ objectValue: differentObject });

            updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({ objectValue: differentObject });
        });

        it('should compare Arrays correctly', () => {
            const originalArray = [1, 2, 3];
            const sameArray = [1, 2, 3];
            const differentArray = [4, 5, 6];
            service.getCachedValue('arrayValue', originalArray);

            // Update with the same array - should not be marked as updated
            service.updateCache({ arrayValue: sameArray });
            let updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({});

            // Update with a different array - should be marked as updated
            service.updateCache({ arrayValue: differentArray });
            updatedValues = service.getUpdatedValues();

            expect(updatedValues).toEqual({ arrayValue: differentArray });
        });
    });

    describe('getUpdatedValuesForSchemas', () => {
        it('should return only updated values for the specified schema', () => {
            service.getCachedValue('common_property', 'original-value');
            service.getCachedValue('custom_field', 'custom-value');
            service.getCachedValue('another_field', 'another-value');

            service.updateCache({ common_property: 'updated-value' });

            const updatedValues = service.getUpdatedValuesForSchemas(['common_property', 'custom_field', 'another_field']);

            expect(updatedValues).toEqual({ common_property: 'updated-value' });
        });
    });

    describe('getAllCachedValues', () => {
        it('should return all cached values including both updated and non-updated', () => {
            service.getCachedValue('prop1', 'value1');
            service.getCachedValue('prop2', 'value2');
            service.updateCache({ prop3: 'value3' });

            const allValues = service.getAllCachedValues();

            expect(allValues).toEqual({
                prop1: 'value1',
                prop2: 'value2',
                prop3: 'value3',
            });
        });

        it('should return empty object when cache is empty', () => {
            const allValues = service.getAllCachedValues();

            expect(allValues).toEqual({});
        });

        it('should handle nested properties stored with dot notation', () => {
            service.updateCache({ parent: { child: 'nested value' } });

            const allValues = service.getAllCachedValues();

            expect(allValues['parent.child']).toBe('nested value');
        });

        it('should handle Date objects', () => {
            const testDate = new Date('2025-12-04');
            service.updateCache({ dateField: testDate });

            const allValues = service.getAllCachedValues();

            expect(allValues['dateField']).toEqual(testDate);
            expect(allValues['dateField'] instanceof Date).toBe(true);
        });

        it('should handle Array values', () => {
            const testArray = [1, 2, 3];
            service.updateCache({ arrayField: testArray });

            const allValues = service.getAllCachedValues();

            expect(allValues['arrayField']).toEqual(testArray);
            expect(Array.isArray(allValues['arrayField'])).toBe(true);
        });
    });
});
