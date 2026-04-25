/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'recordDispositionLabel',
})
export class RecordDispositionLabelPipe implements PipeTransform {
    transform(disposition: string | null | undefined): string {
        if (!disposition) {
            return 'Purge';
        }

        try {
            const parsed = JSON.parse(disposition);
            return parsed.action || 'Purge';
        } catch {
            return 'Purge';
        }
    }
}
