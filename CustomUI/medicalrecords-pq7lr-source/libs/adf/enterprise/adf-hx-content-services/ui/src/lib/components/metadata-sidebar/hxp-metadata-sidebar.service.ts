/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CardViewItem } from '@alfresco/adf-core';
import { inject, Injectable } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { Observable, of } from 'rxjs';
import { DOCUMENT_PROPERTIES_SERVICE } from '@alfresco/adf-hx-content-services/services';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class MetadataSidebarService {
    private readonly EDITABLE_DEFAULT_PROPERTIES = ['sys_primaryType', 'sys_title', 'sysfile_blob.filename'];

    private readonly NON_EDITABLE_DEFAULT_PROPERTIES = [
        'sys_created',
        'sys_modified',
        'sys_creator',
        'sys_lastContributor',
        'sys_contributors',
        'sys_path',
        'sysfile_blob.length',
        'sysfile_blob.mimeType',
    ];

    private readonly documentPropertiesService = inject(DOCUMENT_PROPERTIES_SERVICE);

    getEditableSystemPropertiesFromDocument(document?: Document): Observable<CardViewItem[]> {
        if (!document) {
            return of([]);
        }

        return this.documentPropertiesService
            .getDefaultPropertiesFromDocument(document)
            .pipe(map((properties: CardViewItem[]) => this.filterAndSortProperties(properties, this.EDITABLE_DEFAULT_PROPERTIES)));
    }

    getNonEditableSystemPropertiesFromDocument(document?: Document): Observable<CardViewItem[]> {
        if (!document) {
            return of([]);
        }

        return this.documentPropertiesService
            .getDefaultPropertiesFromDocument(document)
            .pipe(map((properties: CardViewItem[]) => this.filterAndSortProperties(properties, this.NON_EDITABLE_DEFAULT_PROPERTIES)));
    }

    getCustomProperties(document?: Document): Observable<CardViewItem[]> {
        if (!document) {
            return of([]);
        }

        return this.documentPropertiesService.getPropertiesFromDocument(document, {
            exclude: {
                schemas: ['sysfile_blob', 'sys_', 'sysver_', 'sysgov_'],
            },
        });
    }

    private filterAndSortProperties(properties: CardViewItem[], keys: string[]): CardViewItem[] {
        return properties.filter((property: CardViewItem) => keys.includes(property.key)).sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
    }
}
