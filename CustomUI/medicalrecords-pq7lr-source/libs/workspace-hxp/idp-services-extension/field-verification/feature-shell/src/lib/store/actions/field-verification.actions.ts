/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IdpTaskActions, TaskAssignmentContext, TaskClaimPermissions, TaskContext } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { DocumentEntity } from '../states/document.state';
import { DocumentFieldEntity } from '../states/document-field.state';
import { DocumentTableEntity } from '../states/document-table.state';
import { IdpBoundingBox, IdpField, IdpTable, IdpTaskData, IdpValidationStatus } from '../../models/screen-models';
import { ValidationTableRecord } from '../../models/validation-models';

export interface IdpPagesMetadata {
    pageId: string;
    documentId: string;
    rotation?: number;
    viewerRotation?: number;
    hasMachineTextLayer?: boolean;
}

export const userActions = createActionGroup({
    source: 'Idp Field Verification - User',
    events: {
        // field actions
        fieldSelect: props<{ fieldId: string; needsKeyboardFocus?: boolean }>(),
        fieldValueUpdate: props<{
            fieldId: string;
            value: string;
            boundingBox?: IdpBoundingBox;
            confidence: number;
            validationStatus: IdpValidationStatus;
        }>(),
        verifyField: props<{ fieldId: string }>(),

        // table actions
        addTableRow: props<{ tableId: string; rowIndex: number }>(),
        addTableRowFields: props<{ tableId: string; rowIndex: number; fields: DocumentFieldEntity[] }>(),
        insertTableRow: props<{ tableId: string; rowIndex: number; rowCells: IdpField[] }>(),
        insertTableRowFields: props<{ tableId: string; rowIndex: number; fields: DocumentFieldEntity[] }>(),
        clearTableRow: props<{ tableId: string; rowIndex: number }>(),
        clearTableRowFields: props<{ tableId: string; rowIndex: number; fields: DocumentFieldEntity[] }>(),
        updateTableRow: props<{ tableId: string; rowIndex: number; rowCells: IdpField[] }>(),
        updateTableRowFields: props<{ tableId: string; rowIndex: number; fields: DocumentFieldEntity[] }>(),
        clearTableColumn: props<{ tableId: string; columnIndex: number }>(),
        clearTableColumnFields: props<{ tableId: string; columnIndex: number; fields: DocumentFieldEntity[] }>(),
        updateTableColumn: props<{ tableId: string; columnIndex: number; columnCells: IdpField[] }>(),
        updateTableColumnFields: props<{ tableId: string; columnIndex: number; fields: DocumentFieldEntity[] }>(),
        deleteTableRow: props<{ tableId: string; rowIndex: number }>(),
        deleteTableRowFields: props<{ tableId: string; rowIndex: number; fieldIds: string[] }>(),
        deleteTable: props<{ tableId: string }>(),
        deleteTableFields: props<{ tableId: string; fieldIds: string[] }>(),
        restoreTable: props<{ tableId: string; tableData: IdpTable; tableFields: IdpField[] }>(), // New action
        restoreTableFields: props<{ tableId: string; tableData: DocumentTableEntity; fields: DocumentFieldEntity[] }>(), // New action

        // document actions
        pageSelect: props<{ pageId: string }>(),
        rejectReasonUpdate: props<{ rejectReasonId?: string; rejectNote?: string; doCompleteTask: boolean }>(),
        updatePagesRotation: props<{ pages: IdpPagesMetadata[]; taskDataSynced?: boolean }>(),
        selectNextField: emptyProps(),

        // task actions
        taskSave: emptyProps(),
        taskComplete: emptyProps(),
        taskCompleteWithValidationCheck: props<{ openNextTask?: boolean }>(),
        taskCancel: emptyProps(),

        taskUnclaim: emptyProps(),
        taskUnclaimSuccess: props<{ taskAssignmentContext: TaskAssignmentContext }>(),
        taskUnclaimError: props<{ error: Error | string }>(),
    },
});

export const systemActions = createActionGroup({
    source: 'Idp Field Verification - System',
    events: {
        // screen actions
        taskInitialize: props<{ taskContext: TaskContext; taskClaimPermissions: TaskClaimPermissions }>(),
        taskInitializeSuccess: props<{ taskAssignmentContext: TaskAssignmentContext }>(),
        taskInitializeError: props<{ error: Error | string }>(),
        screenLoad: emptyProps(),
        screenLoadSuccess: props<{ taskData: IdpTaskData }>(),
        screenLoadError: props<{ error: Error | string }>(),
        screenStateReset: emptyProps(),

        // document actions
        documentLoad: props<{ documentState: DocumentEntity; fields: DocumentFieldEntity[]; tables: DocumentTableEntity[] }>(),
        documentLoadError: props<{ error: Error | string }>(),
        movedToNextField: props<{ id: string | undefined }>(),

        // field actions
        applyFieldValueUpdate: props<{
            fieldId: string;
            value: string;
            boundingBox?: IdpBoundingBox;
            confidence: number;
            validationStatus: IdpValidationStatus;
        }>(),
        fieldValidityUpdate: props<{ fieldId: string; isFormFieldValid: boolean; formFieldIndex?: number }>(),
        fieldValidityBatchUpdate: props<{ updates: Array<{ fieldId: string; isFormFieldValid: boolean; formFieldIndex?: number }> }>(),
        fieldValidationUpdate: props<{ fieldId: string; validationStatus?: IdpValidationStatus; value?: string }>(),
        bulkFieldValidationUpdate: props<{ updates: Array<{ fieldId: string; validationStatus?: IdpValidationStatus; value?: string }> }>(),

        // validation actions
        runValidationProcessIfConfigured: props<{ triggeringFieldId: string }>(),
        runValidationProcess: props<{
            triggeringFieldName: string;
            validationProcessName: string;
            validationProcessId: string;
            validatorName: string;
        }>(),
        validationProcessComplete: emptyProps(),

        // table actions
        switchedTable: props<{ tableId: string | undefined }>(),
        updateTableDirtyFlag: props<{ tableId: string; isDirty: boolean }>(),
        runValidationProcessIfTableIsDirty: props<{ tableId: string }>(),
        tableValidationUpdate: props<{ tableId: string; validationStatus?: IdpValidationStatus; records?: ValidationTableRecord[] }>(),

        // task actions
        taskActionSuccess: props<{ action: IdpTaskActions; openNextTask?: boolean }>(),
        taskActionError: props<{ error: Error | string; action?: IdpTaskActions }>(),
        taskPrepareUpdate: props<{ taskAction: IdpTaskActions; openNextTask?: boolean }>(),
        taskPrepareUpdateSuccess: props<{ taskAction: IdpTaskActions; taskData: IdpTaskData; openNextTask?: boolean }>(),
        taskPrepareUpdateError: props<{ taskAction: IdpTaskActions; error: Error | string }>(),
        taskCompletionAwaitingValidation: emptyProps(),

        updateDocumentRotation: props<{ taskAction: IdpTaskActions; taskData: IdpTaskData; openNextTask?: boolean }>(),

        // notification actions
        notificationShow: props<{ severity: 'info' | 'success' | 'error' | 'warn'; message: string; messageArgs?: Record<string, any> }>(),

        // task claim
        taskClaim: emptyProps(),
        taskClaimSuccess: props<{ taskAssignmentContext: TaskAssignmentContext }>(),
        taskClaimError: props<{ error: Error | string }>(),
    },
});
