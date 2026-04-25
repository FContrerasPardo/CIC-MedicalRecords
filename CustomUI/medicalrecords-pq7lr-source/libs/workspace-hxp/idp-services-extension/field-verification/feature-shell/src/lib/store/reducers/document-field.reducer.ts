/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createReducer, on } from '@ngrx/store';
import { documentFieldAdapter, initialDocumentFieldState } from '../states/document-field.state';
import { systemActions, userActions } from '../actions/field-verification.actions';
import { IdpLoadState, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';

export const documentFieldReducer = createReducer(
    initialDocumentFieldState,

    on(systemActions.documentLoad, (state, { fields }) => {
        return {
            ...documentFieldAdapter.setAll(fields, state),
            loadState: IdpLoadState.Loaded,
            headerFieldIds: fields.filter((f) => !f.tableId).map((f) => f.id),
        };
    }),

    on(userActions.fieldSelect, (state, { fieldId, needsKeyboardFocus }) => {
        return {
            ...state,
            selectedFieldId: fieldId,
            needsKeyboardFocus,
        };
    }),

    on(systemActions.applyFieldValueUpdate, (state, { fieldId, value, boundingBox, confidence, validationStatus }) => {
        const field = state.entities[fieldId];
        const resolvedBox = boundingBox ?? (value === field?.value ? field?.boundingBox : undefined);
        if (
            field &&
            field.value === value &&
            field.boundingBox === resolvedBox &&
            field.confidence === confidence &&
            field.validationStatus === validationStatus &&
            field.verificationStatus === IdpVerificationStatus.ManualValid
        ) {
            return state;
        }
        return documentFieldAdapter.updateOne(
            {
                id: fieldId,
                changes: {
                    value,
                    boundingBox: resolvedBox,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    confidence,
                    validationStatus,
                },
            },
            state
        );
    }),

    on(systemActions.fieldValidityUpdate, (state, { fieldId, isFormFieldValid, formFieldIndex }) => {
        const field = state.entities[fieldId];
        if (field && field.isFormFieldValid === isFormFieldValid && (formFieldIndex === undefined || field.order === formFieldIndex)) {
            return state;
        }
        return documentFieldAdapter.updateOne(
            {
                id: fieldId,
                changes: {
                    isFormFieldValid: isFormFieldValid,
                    ...(formFieldIndex === undefined ? {} : { order: formFieldIndex }),
                },
            },
            state
        );
    }),

    on(systemActions.fieldValidityBatchUpdate, (state, { updates }) => {
        const effectiveUpdates = updates.filter(({ fieldId, isFormFieldValid, formFieldIndex }) => {
            const field = state.entities[fieldId];
            return !field || field.isFormFieldValid !== isFormFieldValid || (formFieldIndex !== undefined && field.order !== formFieldIndex);
        });
        if (effectiveUpdates.length === 0) {
            return state;
        }
        return documentFieldAdapter.updateMany(
            effectiveUpdates.map(({ fieldId, isFormFieldValid, formFieldIndex }) => ({
                id: fieldId,
                changes: {
                    isFormFieldValid,
                    ...(formFieldIndex === undefined ? {} : { order: formFieldIndex }),
                },
            })),
            state
        );
    }),

    on(systemActions.fieldValidationUpdate, (state, { fieldId, validationStatus, value }) => {
        const field = state.entities[fieldId];
        if (
            field &&
            (validationStatus === undefined || field.validationStatus === validationStatus) &&
            (value === undefined || field.value === value)
        ) {
            return state;
        }
        return documentFieldAdapter.updateOne(
            {
                id: fieldId,
                changes: {
                    ...(validationStatus !== undefined && { validationStatus }),
                    ...(value !== undefined && { value }),
                },
            },
            state
        );
    }),

    on(systemActions.bulkFieldValidationUpdate, (state, { updates }) => {
        return documentFieldAdapter.updateMany(
            updates.map(({ fieldId, validationStatus, value }) => ({
                id: fieldId,
                changes: {
                    ...(validationStatus !== undefined && { validationStatus }),
                    ...(value !== undefined && { value }),
                },
            })),
            state
        );
    }),

    on(systemActions.movedToNextField, (state, { id }) => {
        return {
            ...state,
            selectedFieldId: id,
            needsKeyboardFocus: true,
        };
    }),

    on(userActions.verifyField, (state, { fieldId }) => {
        return documentFieldAdapter.updateOne(
            {
                id: fieldId,
                changes: {
                    verificationStatus: IdpVerificationStatus.ManualValid,
                },
            },
            state
        );
    }),

    on(userActions.addTableRowFields, (state, { fields }) => {
        return documentFieldAdapter.addMany(fields, state);
    }),

    on(userActions.clearTableRowFields, (state, { fields }) => {
        return documentFieldAdapter.updateMany(
            fields.map((field) => ({
                id: field.id,
                changes: {
                    value: field.value,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: field.validationStatus,
                    confidence: field.confidence,
                    boundingBox: field.boundingBox,
                },
            })),
            state
        );
    }),

    on(userActions.updateTableRowFields, (state, { fields }) => {
        return documentFieldAdapter.updateMany(
            fields.map((field) => ({
                id: field.id,
                changes: {
                    value: field.value,
                    verificationStatus: field.verificationStatus,
                    validationStatus: field.validationStatus,
                    confidence: field.confidence,
                    boundingBox: field.boundingBox,
                },
            })),
            state
        );
    }),

    on(userActions.clearTableColumnFields, (state, { fields }) => {
        return documentFieldAdapter.updateMany(
            fields.map((field) => ({
                id: field.id,
                changes: {
                    value: field.value,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: field.validationStatus,
                    confidence: field.confidence,
                    boundingBox: field.boundingBox,
                },
            })),
            state
        );
    }),

    on(userActions.updateTableColumnFields, (state, { fields }) => {
        return documentFieldAdapter.updateMany(
            fields.map((field) => ({
                id: field.id,
                changes: {
                    value: field.value,
                    verificationStatus: field.verificationStatus,
                    validationStatus: field.validationStatus,
                    confidence: field.confidence,
                    boundingBox: field.boundingBox,
                },
            })),
            state
        );
    }),

    on(userActions.insertTableRowFields, (state, { fields }) => {
        return documentFieldAdapter.addMany(fields, state);
    }),

    on(userActions.deleteTableRowFields, (state, { tableId, fieldIds }) => {
        const selectedFieldIsDeleted = state.selectedFieldId && (fieldIds as string[]).includes(state.selectedFieldId);
        return {
            ...documentFieldAdapter.removeMany(fieldIds, state),
            selectedFieldId: selectedFieldIsDeleted ? tableId : state.selectedFieldId,
            needsKeyboardFocus: selectedFieldIsDeleted ? false : state.needsKeyboardFocus,
        };
    }),

    on(userActions.deleteTableFields, (state, { fieldIds }) => {
        return documentFieldAdapter.removeMany(fieldIds, state);
    }),

    on(userActions.restoreTableFields, (state, { fields }) => {
        return documentFieldAdapter.addMany(fields, state);
    })
);
