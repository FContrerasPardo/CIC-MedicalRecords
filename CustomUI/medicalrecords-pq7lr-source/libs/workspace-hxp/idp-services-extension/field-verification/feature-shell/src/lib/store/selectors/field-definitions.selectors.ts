/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createSelector } from '@ngrx/store';
import { IdpFieldRedactionMode } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { screenFeatureSelector } from './field-verification-root.selectors';

export const selectTaskInputDataForFieldDefs = createSelector(screenFeatureSelector, (state) => state.taskInputData);

export const selectFieldDefinitionsForFieldDefs = createSelector(selectTaskInputDataForFieldDefs, (taskInputData) => {
    if (!taskInputData?.extractionConfiguration?.fieldDefinitionsByClass) {
        return [];
    }

    return taskInputData.extractionConfiguration.fieldDefinitionsByClass.flatMap((classDef) =>
        classDef.fieldDefinitions.map((field) => ({
            id: field.id,
            name: field.name,
            ignoreForAuto: field.ignoreForAuto ?? false,
            ignoreForReview: field.ignoreForReview ?? false,
            classId: classDef.documentClassId,
        }))
    );
});

export const selectFieldIgnoreForAutoMap = createSelector(selectFieldDefinitionsForFieldDefs, (fieldDefinitions) => {
    const map = new Map<string, boolean>();
    for (const field of fieldDefinitions) {
        map.set(field.id, !!field.ignoreForAuto);
    }
    return map;
});

export const selectFieldIgnoreForReviewMap = createSelector(selectFieldDefinitionsForFieldDefs, (fieldDefinitions) => {
    const map = new Map<string, boolean>();
    for (const field of fieldDefinitions) {
        map.set(field.id, !!field.ignoreForReview);
    }
    return map;
});

export const selectRedactedFieldIds = createSelector(selectTaskInputDataForFieldDefs, (taskInputData) => {
    const ids = new Set<string>();
    if (!taskInputData?.extractionConfiguration?.fieldDefinitionsByClass) {
        return ids;
    }
    for (const classDef of taskInputData.extractionConfiguration.fieldDefinitionsByClass) {
        for (const field of classDef.fieldDefinitions) {
            if (field.redactionMode !== IdpFieldRedactionMode.None) {
                ids.add(field.id);
            }
        }
    }
    return ids;
});

export const selectTableFieldDefinitions = (tableId: string) =>
    createSelector(selectTaskInputDataForFieldDefs, (taskInputData) => {
        if (!taskInputData?.extractionConfiguration?.fieldDefinitionsByClass) {
            return [];
        }

        // Find the table field across all document classes
        for (const classDef of taskInputData.extractionConfiguration.fieldDefinitionsByClass) {
            const tableField = classDef.fieldDefinitions.find((field) => field.id === tableId && field.dataType === 'Table');

            if (tableField?.columns) {
                // Return the column definitions with additional metadata
                return tableField.columns.map((column) => ({
                    name: column.name,
                    validation: column.validation,
                }));
            }
        }

        return [];
    });
