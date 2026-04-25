/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Pipe, PipeTransform } from '@angular/core';
import { STATUS_LABEL_MAP } from '../search/filters/status/status-options.data';

const STATUS_LABEL_MAP_LOWER = Object.fromEntries(Object.entries(STATUS_LABEL_MAP).map(([key, value]) => [key.toLowerCase(), value]));

@Pipe({
    name: 'recordStatusLabel',
})
export class RecordStatusLabelPipe implements PipeTransform {
    transform(status: string): string {
        return status ? STATUS_LABEL_MAP_LOWER[status.toLowerCase()] || '' : '';
    }
}
