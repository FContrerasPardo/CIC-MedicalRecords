/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'unescape',
})
export class UnescapePipe implements PipeTransform {
    transform(value: string): string {
        const doc = new DOMParser().parseFromString(value, 'text/html');
        return doc.documentElement.textContent || '';
    }
}
