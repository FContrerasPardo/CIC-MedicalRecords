/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'idpJoin',
})
export class IdpJoinPipe implements PipeTransform {
    transform(values: any[], joinChar: string = ' '): string {
        if (!Array.isArray(values)) {
            throw new TypeError('IdpJoinPipe: Input is not an array.');
        }
        return values.filter(Boolean).join(joinChar);
    }
}
