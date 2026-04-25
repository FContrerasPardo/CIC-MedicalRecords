/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/** Normalizes rotation to the range [0, 360). Handles negative values. */
export function normalizeRotation(rotation: number): number {
    return (rotation + 360) % 360;
}

/** Valid batch rotation values: 0 or any multiple of 90 (0, 90, 180, 270, 360, etc.). */
export function isValidBatchRotation(value: number): boolean {
    const normalized = ((value % 360) + 360) % 360;
    return normalized % 90 === 0;
}
