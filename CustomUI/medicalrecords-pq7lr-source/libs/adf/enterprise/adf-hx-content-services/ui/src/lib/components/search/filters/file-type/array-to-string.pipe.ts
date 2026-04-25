/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'arrayToString',
})
export class ArrayToStringPipe implements PipeTransform {
    transform(value: string[] = [], prefix: string = '.', separator: string = ','): string {
        if (!Array.isArray(value) || value.length === 0) {
            return '';
        }
        return value.map((val) => `${prefix}${val}`).join(`${separator} `);
    }
}
