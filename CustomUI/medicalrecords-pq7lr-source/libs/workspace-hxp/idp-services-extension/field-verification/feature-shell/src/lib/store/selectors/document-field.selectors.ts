/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createSelector } from '@ngrx/store';
import { DocumentFieldEntity, documentFieldAdapter } from '../states/document-field.state';
import { documentTableAdapter } from '../states/document-table.state';
import { documentFieldFeatureSelector, documentTableFeatureSelector } from './field-verification-root.selectors';
import { IdpField, IdpValidationStatus } from '../../models/screen-models';
import { IdpLoadState, IdpVerificationStatus, IdpFieldDataType } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { selectFieldIgnoreForReviewMap, selectRedactedFieldIds } from './field-definitions.selectors';

function mapFieldToViewModel(field: IdpField): IdpField {
    return {
        id: field.id,
        name: field.name,
        dataType: field.dataType,
        format: field.format,
        get hasIssue() {
            return (
                this.isFormFieldValid === false ||
                this.verificationStatus === IdpVerificationStatus.AutoInvalid ||
                this.verificationStatus === IdpVerificationStatus.ManualInvalid ||
                this.validationStatus === IdpValidationStatus.Invalid
            );
        },
        isFormFieldValid: field.isFormFieldValid,
        verificationStatus: field.verificationStatus,
        validationStatus: field.validationStatus,
        validatorName: field.validatorName,
        confidence: field.confidence,
        value: field.value,
        boundingBox: field.boundingBox,
        tableId: field.tableId,
    } satisfies IdpField;
}

function withSelectionState(field: IdpField | undefined, selectedFieldId?: string, needsKeyboardFocus?: boolean): IdpField | undefined {
    if (!field || field.id !== selectedFieldId) {
        return field;
    }

    return {
        ...field,
        isSelected: true,
        needsKeyboardFocus,
    };
}

const adapterSelectors = documentFieldAdapter.getSelectors(documentFieldFeatureSelector);
const selectAdapterEntities = adapterSelectors.selectEntities;

const selectDocumentFieldLoadState = createSelector(documentFieldFeatureSelector, (state) => state.loadState);
const selectHeaderFieldIds = createSelector(documentFieldFeatureSelector, (state) => state.headerFieldIds);

function getOrderedHeaderFieldEntities(
    headerFieldIds: string[] | undefined,
    entities: ReturnType<typeof adapterSelectors.selectEntities>
): DocumentFieldEntity[] {
    const resolvedHeaderFieldIds =
        headerFieldIds && headerFieldIds.length > 0
            ? headerFieldIds
            : Object.values(entities)
                  .filter((entity): entity is DocumentFieldEntity => !!entity && !entity.tableId)
                  .map((entity) => entity.id);

    const orderedFields = resolvedHeaderFieldIds.map((id) => entities[id]).filter((entity): entity is DocumentFieldEntity => !!entity);

    orderedFields.sort((left, right) => left.order - right.order);
    return orderedFields;
}

export const selectAllFields = createSelector(
    selectDocumentFieldLoadState,
    selectHeaderFieldIds,
    selectAdapterEntities,
    (loadState, headerFieldIds, entities) => {
        if (loadState === IdpLoadState.NotInitialized) {
            return [];
        }
        return getOrderedHeaderFieldEntities(headerFieldIds, entities).map((field) => mapFieldToViewModel(field));
    }
);

export const selectSelectedFieldId = createSelector(documentFieldFeatureSelector, (state) => state.selectedFieldId);

export const selectNeedsKeyboardFocus = createSelector(documentFieldFeatureSelector, (state) => state.needsKeyboardFocus);

export const selectAllFieldsMap = createSelector(selectAllFields, (fields) => {
    const fieldMap: Record<string, IdpField> = {};

    for (const field of fields) {
        fieldMap[field.id] = field;
    }

    return fieldMap;
});

export const selectRedactedFields = createSelector(selectAllFields, selectRedactedFieldIds, (fields, redactedFieldIds) =>
    fields.filter((field) => redactedFieldIds.has(field.id) && !!field.boundingBox)
);

export const selectDocumentFields = createSelector(
    selectDocumentFieldLoadState,
    selectHeaderFieldIds,
    selectAdapterEntities,
    selectFieldIgnoreForReviewMap,
    (loadState, headerFieldIds, entities, ignoreForReviewMap) => {
        if (loadState === IdpLoadState.NotInitialized) {
            return [];
        }
        return getOrderedHeaderFieldEntities(headerFieldIds, entities)
            .filter((field) => !ignoreForReviewMap.get(field.id))
            .map((field) => mapFieldToViewModel(field));
    }
);

export const selectFieldsWithIssue = createSelector(selectDocumentFields, (fields) => fields.filter((field) => field.hasIssue));

function findTableField(allFieldsMap: Record<string, IdpField>, field: IdpField) {
    if (field.dataType === IdpFieldDataType.Table) {
        return field;
    }
    return field.tableId ? allFieldsMap[field.tableId] : undefined;
}

export const selectFieldById = (fieldId: string) =>
    createSelector(
        selectDocumentFieldLoadState,
        selectAdapterEntities,
        selectSelectedFieldId,
        selectNeedsKeyboardFocus,
        (loadState, entities, selectedFieldId, needsKeyboardFocus) => {
            if (loadState === IdpLoadState.NotInitialized) {
                return undefined;
            }
            const entity = entities[fieldId];
            if (!entity) {
                return undefined;
            }
            return withSelectionState(mapFieldToViewModel(entity), selectedFieldId, needsKeyboardFocus);
        }
    );

export const selectActiveField = createSelector(
    selectDocumentFieldLoadState,
    selectAdapterEntities,
    selectSelectedFieldId,
    selectNeedsKeyboardFocus,
    (loadState, entities, selectedFieldId, needsKeyboardFocus) => {
        if (loadState === IdpLoadState.NotInitialized || !selectedFieldId) {
            return undefined;
        }
        const entity = entities[selectedFieldId];
        if (!entity) {
            return undefined;
        }
        return withSelectionState(mapFieldToViewModel(entity), selectedFieldId, needsKeyboardFocus);
    }
);

export const selectTableFieldsByTableId = (tableId: string) =>
    createSelector(selectAllTableFieldsMap, (tableFieldMap) => {
        return tableFieldMap[tableId] || [];
    });

const selectTableAdapterAll = documentTableAdapter.getSelectors(documentTableFeatureSelector).selectAll;
const selectTableLoadState = createSelector(documentTableFeatureSelector, (state) => state.loadState);

export const selectAllTableFieldsMap = createSelector(
    selectTableLoadState,
    selectTableAdapterAll,
    selectAdapterEntities,
    (tableLoadState, tables, fieldEntities) => {
        const tableFieldMap: Record<string, IdpField[]> = {};
        if (tableLoadState === IdpLoadState.NotInitialized) {
            return tableFieldMap;
        }
        for (const table of tables) {
            const cells: IdpField[] = [];
            for (const row of table.rows) {
                for (const cellId of row) {
                    const entity = fieldEntities[cellId];
                    if (entity) {
                        cells.push(mapFieldToViewModel(entity));
                    }
                }
            }
            tableFieldMap[table.id] = cells;
        }
        return tableFieldMap;
    }
);

export const activeTableWithFields = createSelector(
    selectActiveField,
    selectAllFieldsMap,
    selectAllTableFieldsMap,
    (activeField, allFieldsMap, tableFieldMap) => {
        if (!activeField) {
            return undefined;
        }

        const tableField = findTableField(allFieldsMap, activeField);
        if (!tableField) {
            return undefined;
        }

        const selectedCellId = activeField.dataType === IdpFieldDataType.Table ? undefined : activeField.id;
        const tableFields = (tableFieldMap[tableField.id] || []).map((field) =>
            field.id === selectedCellId
                ? {
                      ...field,
                      isSelected: true,
                      needsKeyboardFocus: activeField.needsKeyboardFocus,
                  }
                : field
        );

        return [tableField, ...tableFields];
    }
);
