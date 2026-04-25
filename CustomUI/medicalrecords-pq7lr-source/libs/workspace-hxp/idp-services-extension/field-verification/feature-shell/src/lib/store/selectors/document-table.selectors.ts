/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpFieldDataType, IdpLoadState, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { createSelector } from '@ngrx/store';
import { documentTableAdapter, DocumentTableEntity } from '../states/document-table.state';
import { documentTableFeatureSelector } from './field-verification-root.selectors';
import { activeTableWithFields, selectActiveField, selectAllTableFieldsMap } from './document-field.selectors';
import { IdpField, IdpTable, IdpTableSummary, IdpValidationStatus } from '../../models/screen-models';

const EMPTY_TABLES: DocumentTableEntity[] = [];
const EMPTY_TABLE_ENTITIES: { [tableId: string]: DocumentTableEntity | undefined } = {};

const selectAllTables = createSelector(
    documentTableFeatureSelector,
    documentTableAdapter.getSelectors(documentTableFeatureSelector).selectAll,
    (state, tables) => {
        if (state.loadState === IdpLoadState.NotInitialized) {
            return EMPTY_TABLES;
        }
        return tables;
    }
);

const selectTableEntities = createSelector(
    documentTableFeatureSelector,
    documentTableAdapter.getSelectors(documentTableFeatureSelector).selectEntities,
    (state, tableEntities) => {
        if (state.loadState === IdpLoadState.NotInitialized) {
            return EMPTY_TABLE_ENTITIES;
        }
        return tableEntities;
    }
);

export const selectTableById = (tableId: string) =>
    createSelector(selectAllTables, selectAllTableFieldsMap, (tables, tableFieldsMap) => {
        return getTableById(tableId, tables, tableFieldsMap[tableId] || []);
    });

export const selectTableSummaryById = (tableId: string) =>
    createSelector(selectTableEntities, (tableEntities): IdpTableSummary | undefined => {
        const entity = tableEntities[tableId];
        if (!entity) {
            return undefined;
        }
        return { id: entity.id, name: entity.name, rowCount: entity.rows.length };
    });

export const selectActiveTable = createSelector(selectAllTables, activeTableWithFields, (allTables, tableWithFields) => {
    if (!tableWithFields?.length) {
        return undefined;
    }
    const tableId = tableWithFields[0].id || '';
    return getTableById(tableId, allTables, tableWithFields.slice(1));
});

export const selectActiveTableSummary = createSelector(selectTableEntities, selectActiveField, (tableEntities, activeField): IdpTableSummary | undefined => {
    const tableId = activeField?.dataType === IdpFieldDataType.Table ? activeField.id : activeField?.tableId;
    if (!tableId) {
        return undefined;
    }

    const entity = tableEntities[tableId];
    if (!entity) {
        return undefined;
    }

    return {
        id: entity.id,
        name: entity.name,
        rowCount: entity.rows.length,
    };
});

export const selectDocumentTables = createSelector(selectAllTables, selectAllTableFieldsMap, (tableEntities, tableFields) => {
    const tables: IdpTable[] = [];
    for (const tableEntity of tableEntities) {
        const tableModel = getTableById(tableEntity.id, tableEntities, tableFields[tableEntity.id] || []);
        if (tableModel) {
            tables.push(tableModel);
        }
    }

    return tables;
});

function getTableById(tableId: string, tables: DocumentTableEntity[], tableFields: IdpField[]): IdpTable | undefined {
    const tableEntity = tables.find((table) => table.id === tableId);
    if (!tableEntity) {
        return undefined;
    }

    const tableFieldMap = new Map(tableFields.map((field) => [field.id, field]));

    const tableModel: IdpTable = {
        id: tableEntity.id,
        name: tableEntity.name,
        columnHeaderNames: tableEntity.columnHeaderNames,
        rows: tableEntity.rows.map((row) => {
            const rowCells: IdpField[] = row.map((cellId) => {
                return (
                    tableFieldMap.get(cellId) || {
                        id: cellId,
                        name: '',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        hasIssue: true,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        validationStatus: IdpValidationStatus.Invalid,
                        confidence: 0,
                        isSelected: false,
                        tableId: tableId,
                    }
                );
            });
            return { rowCells };
        }),
        validationStatus: tableEntity.validationStatus,
        validatorName: tableEntity.validatorName,
        isDirty: tableEntity.isDirty,
    };

    return tableModel;
}
