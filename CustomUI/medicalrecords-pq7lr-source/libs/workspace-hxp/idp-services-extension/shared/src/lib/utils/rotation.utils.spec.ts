/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { isValidBatchRotation, normalizeRotation } from './rotation.utils';

describe('normalizeRotation', () => {
    it('should return values in [0, 360) unchanged', () => {
        expect(normalizeRotation(0)).toBe(0);
        expect(normalizeRotation(90)).toBe(90);
        expect(normalizeRotation(180)).toBe(180);
        expect(normalizeRotation(270)).toBe(270);
    });

    it('should normalize negative values to [0, 360)', () => {
        expect(normalizeRotation(-90)).toBe(270);
        expect(normalizeRotation(-180)).toBe(180);
        expect(normalizeRotation(-270)).toBe(90);
        expect(normalizeRotation(-360)).toBe(0);
    });

    it('should wrap values >= 360', () => {
        expect(normalizeRotation(360)).toBe(0);
        expect(normalizeRotation(450)).toBe(90);
        expect(normalizeRotation(720)).toBe(0);
    });
});

describe('isValidBatchRotation', () => {
    it('should return true for valid rotations: 0, 90, 180, 270, 360', () => {
        expect(isValidBatchRotation(0)).toBe(true);
        expect(isValidBatchRotation(90)).toBe(true);
        expect(isValidBatchRotation(180)).toBe(true);
        expect(isValidBatchRotation(270)).toBe(true);
        expect(isValidBatchRotation(360)).toBe(true);
    });

    it('should return true when value is a multiple of 90', () => {
        expect(isValidBatchRotation(720)).toBe(true);
        expect(isValidBatchRotation(450)).toBe(true);
        expect(isValidBatchRotation(540)).toBe(true);
        expect(isValidBatchRotation(630)).toBe(true);
    });

    it('should return false for invalid rotations (not multiples of 90)', () => {
        expect(isValidBatchRotation(45)).toBe(false);
        expect(isValidBatchRotation(135)).toBe(false);
    });

    it('should handle negative values by normalizing', () => {
        expect(isValidBatchRotation(-90)).toBe(true);
        expect(isValidBatchRotation(-180)).toBe(true);
        expect(isValidBatchRotation(-270)).toBe(true);
    });
});
