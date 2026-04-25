/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { StorageService } from '@alfresco/adf-core';
import { PaginationDefault, SavedPaginationKey } from '../config/pagination.config';

@Injectable({
    providedIn: 'root',
})
export class PageSizeStorageService {
    private readonly storageService = inject(StorageService);

    public setSize(size: number): void {
        this.storageService.setItem(SavedPaginationKey, size.toString());
    }

    public getSize(): number {
        const size = Number.parseInt(this.storageService.getItem(SavedPaginationKey) || `${PaginationDefault}`, 10);
        return Number.isNaN(size) ? PaginationDefault : size;
    }
}
