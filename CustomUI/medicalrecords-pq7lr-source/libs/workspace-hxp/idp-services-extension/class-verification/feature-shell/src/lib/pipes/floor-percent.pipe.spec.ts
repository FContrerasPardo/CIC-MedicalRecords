/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FloorPercentPipe } from './floor-percent.pipe';

describe('FloorPercentPipe', () => {
    const pipe = new FloorPercentPipe();

    it('should return 45% for 0.4567 with 0 fraction digits', () => {
        expect(pipe.transform(0.4567)).toBe('45%');
    });

    it('should return 45.6% for 0.4567 with 1 fraction digit', () => {
        expect(pipe.transform(0.4567, 1)).toBe('45.6%');
    });

    it('should return 45.67% for 0.4567 with 2 fraction digits', () => {
        expect(pipe.transform(0.4567, 2)).toBe('45.67%');
    });

    it('should return 99% for 0.999 with 0 fraction digits (should floor, not round)', () => {
        expect(pipe.transform(0.999)).toBe('99%');
    });

    it('should return 99.90% for 0.999 with 2 fraction digits', () => {
        expect(pipe.transform(0.999, 2)).toBe('99.90%');
    });

    it('should default to 0% if value is null', () => {
        expect(pipe.transform(null)).toBe('0%');
    });

    it('should default to 0% if value is undefined', () => {
        expect(pipe.transform(undefined)).toBe('0%');
    });

    it('should handle 1 as 100%', () => {
        expect(pipe.transform(1)).toBe('100%');
    });

    it('should handle 0 as 0%', () => {
        expect(pipe.transform(0)).toBe('0%');
    });
});
