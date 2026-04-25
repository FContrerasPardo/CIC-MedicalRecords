/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { SearchFilterService } from '@alfresco/adf-hx-content-services/services';
import { FileTypeSearchFilterData } from './file-type-search-filter.data';

@Injectable()
export class FileTypeSearchFilterService implements SearchFilterService {
    public toHXQL(data: FileTypeSearchFilterData): string {
        if (!data?.values?.length) {
            return '';
        }

        const mimeTypes = data.values.flatMap((fileType) => fileType.value);
        return `sysfile_blob/mimeType IN (${mimeTypes.map((type) => `'${type}'`).join(', ')})`;
    }
}
