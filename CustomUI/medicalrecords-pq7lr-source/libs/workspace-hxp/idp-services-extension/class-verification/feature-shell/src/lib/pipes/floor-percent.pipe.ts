/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'floorPercent',
})
export class FloorPercentPipe implements PipeTransform {
    transform(value: number | null | undefined, fractionDigits: number = 0): string {
        const normalizedValue = value ?? 0;
        const factor = Math.pow(10, fractionDigits);
        const floored = Math.floor(normalizedValue * 100 * factor) / factor;
        return floored.toFixed(fractionDigits) + '%';
    }
}
