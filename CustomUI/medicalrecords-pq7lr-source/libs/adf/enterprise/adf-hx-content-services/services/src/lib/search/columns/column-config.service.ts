/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdentityUserModel, StorageService, TranslationService } from '@alfresco/adf-core';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ColumnConfig } from '../models/column-config-data.interface';
import { ColumnDataService } from './column-data.service';
import { DocumentModelService } from '../../document/document-model/document-model.service';
import { DEFAULT_COLUMNS } from '../configs/default-columns';

@Injectable({
    providedIn: 'root',
})
export class ColumnConfigService {
    private readonly storageService = inject(StorageService);
    private readonly documentModeService = inject(DocumentModelService);
    private readonly columnDataService = inject(ColumnDataService);
    protected readonly translationService = inject(TranslationService);

    private columnConfigsSubject = new BehaviorSubject<ColumnConfig[]>(this.getDefaultColumns());
    public columnConfigs$ = this.columnConfigsSubject.asObservable();

    getDefaultColumns(): ColumnConfig[] {
        return DEFAULT_COLUMNS;
    }

    getSelectedColumnsForCurrentUser(userInfo: IdentityUserModel): ColumnConfig[] {
        const storedColumns = this.storageService.getItem(`${userInfo.email}_selectedColumns`);
        return storedColumns ? JSON.parse(storedColumns) : this.getDefaultColumns();
    }

    setCurrentSelectedColumnsForCurrentUser(userInfo: IdentityUserModel, columns: ColumnConfig[]): void {
        this.storageService.setItem(`${userInfo.email}_selectedColumns`, JSON.stringify(columns));
        this.columnConfigsSubject.next([...columns]);
    }

    getCustomColumns(): Observable<ColumnConfig[]> {
        return this.documentModeService.getModel().pipe(
            map((model) => {
                const customColumns: ColumnConfig[] = [];
                const customSchemaFields = this.columnDataService.getCustomSchemaFields(model);
                for (const field of customSchemaFields) {
                    customColumns.push({
                        key: field.name,
                        title: field.title.replaceAll(/\w\S*/g, function (txt) {
                            return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
                        }),
                        sortable: true,
                        removable: true,
                        type: field.type,
                    });
                }
                return customColumns;
            })
        );
    }
}
