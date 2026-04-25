/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DocumentLocationSearchFilterData } from './document-location-search-filter.data';
import { SearchFilterService, SearchService } from '@alfresco/adf-hx-content-services/services';

@Injectable()
export class DocumentLocationSearchFilterService implements SearchFilterService {
    private readonly searchService = inject(SearchService);

    public searchDocuments(searchTerm: string): Observable<Document[] | undefined> {
        return this.searchService
            .getDocumentsByQuery(this.buildSearchQuery(searchTerm), {
                pagination: {
                    maxItems: 100,
                    skipCount: 0,
                },
                sort: [],
            })
            .pipe(map((result) => result.documents));
    }

    public toHXQL(data: DocumentLocationSearchFilterData): string {
        return data?.values?.length > 0 ? `(${data.values.map((document) => `sys_path STARTSWITH '${document.value}'`).join(' OR ')})` : '';
    }

    private buildSearchQuery(searchTerm: string): string {
        const sanitizedSearchTerm = this.searchService.sanitizeQuery(searchTerm);
        return `SELECT * FROM SysContent WHERE sys_isFolderish = true AND sys_fulltext = '${sanitizedSearchTerm}*'`;
    }
}
