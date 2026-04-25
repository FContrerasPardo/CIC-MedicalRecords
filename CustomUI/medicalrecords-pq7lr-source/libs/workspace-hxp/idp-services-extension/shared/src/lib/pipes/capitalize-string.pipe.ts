/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'hylandIdpTransformPascalCaseString',
})
export class TransformPascalCaseStringPipe implements PipeTransform {
    transform(value: string): string {
        const capWords = value
            .split('_')
            .filter(Boolean)
            .map((element) => this.capitalizeFirstLetter(element));
        return capWords.join(' ').trim();
    }

    private capitalizeFirstLetter(value: string): string {
        if (!value) {
            return value;
        }
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
}
