/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { documentFieldReducer } from './document-field.reducer';
import { documentFieldAdapter, initialDocumentFieldState } from '../states/document-field.state';
import { systemActions, userActions } from '../actions/field-verification.actions';
import { IdpFieldDataType, IdpLoadState, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpValidationStatus } from '../../models/screen-models';
import { selectAllTableFieldsMap } from '../selectors/document-field.selectors';
import { selectDocumentTables } from '../selectors/document-table.selectors';

describe('documentFieldReducer', () => {
    it('should handle documentLoad action', () => {
        const fields = [
            {
                order: 1,
                id: '1',
                name: 'field1',
                dataType: IdpFieldDataType.Text,
                format: '',
                confidence: 0.8,
                value: 'val1',
                verificationStatus: IdpVerificationStatus.ManualValid,
                validationStatus: IdpValidationStatus.Valid,
            },
            {
                order: 2,
                id: '2',
                name: 'field2',
                dataType: IdpFieldDataType.Text,
                format: '',
                confidence: 0.9,
                value: 'val2',
                verificationStatus: IdpVerificationStatus.AutoInvalid,
                validationStatus: IdpValidationStatus.Valid,
            },
        ];

        const tables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Column 1', 'Column 2'],
                rows: [
                    ['Row 1 Column 1', 'Row 1 Column 2'],
                    ['Row 2 Column 1', 'Row 2 Column 2'],
                ],
            },
        ];

        const docEntity = {
            id: 'doc1',
            name: 'Document 1',
            class: { id: 'classA', name: 'Class A' },
            selectedPageIds: ['page1'],
            loadState: IdpLoadState.Loaded,
            pages: [
                { id: 'page1', name: 'Page 1', fileReference: 'file1', contentFileReferenceIndex: 0, sourcePageIndex: 0 },
                { id: 'page2', name: 'Page 2', fileReference: 'file2', contentFileReferenceIndex: 1, sourcePageIndex: 1 },
            ],
        };
        const action = systemActions.documentLoad({ documentState: docEntity, fields, tables });
        const state = documentFieldReducer(initialDocumentFieldState, action);

        expect(state.selectedFieldId).toBeUndefined();
        expect(state.loadState).toBe(IdpLoadState.Loaded);
        expect(state.entities['1']).toEqual(fields[0]);
        expect(state.entities['2']).toEqual(fields[1]);
        expect(state.headerFieldIds).toEqual(['1', '2']);
    });

    it('should exclude table cells from headerFieldIds on documentLoad', () => {
        const fields = [
            {
                order: 0,
                id: 'header1',
                name: 'Header Field',
                dataType: IdpFieldDataType.Text,
                format: '',
                confidence: 0.8,
                value: 'val',
                verificationStatus: IdpVerificationStatus.ManualValid,
                validationStatus: IdpValidationStatus.Valid,
            },
            {
                order: 1,
                id: 'tableField',
                name: 'Table',
                dataType: IdpFieldDataType.Table,
                format: '',
                confidence: 0,
                value: '',
                verificationStatus: IdpVerificationStatus.AutoValid,
                validationStatus: IdpValidationStatus.Valid,
            },
            {
                order: 2,
                id: 'cell1',
                name: 'Cell',
                dataType: IdpFieldDataType.Text,
                format: '',
                confidence: 0.9,
                value: 'cellVal',
                verificationStatus: IdpVerificationStatus.AutoValid,
                validationStatus: IdpValidationStatus.Valid,
                tableId: 'tableField',
            },
        ];

        const action = systemActions.documentLoad({
            documentState: {
                id: 'doc1',
                name: 'Doc',
                class: { id: 'c1', name: 'C1' },
                selectedPageIds: ['p1'],
                loadState: IdpLoadState.Loaded,
                pages: [{ id: 'p1', name: 'P1', fileReference: 'f1', contentFileReferenceIndex: 0, sourcePageIndex: 0 }],
            },
            fields,
            tables: [],
        });
        const state = documentFieldReducer(initialDocumentFieldState, action);

        expect(state.headerFieldIds).toEqual(['header1', 'tableField']);
        expect(state.headerFieldIds).not.toContain('cell1');
    });

    it('should handle fieldSelect action', () => {
        const initialState = {
            ...initialDocumentFieldState,
            selectedFieldId: '1',
            needsKeyboardFocus: false,
        };
        const action = userActions.fieldSelect({ fieldId: '2', needsKeyboardFocus: true });
        const state = documentFieldReducer(initialState, action);

        expect(state.selectedFieldId).toBe('2');
        expect(state.needsKeyboardFocus).toBe(true);
    });

    it('should handle applyFieldValueUpdate action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'oldValue',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );
        const boundingBox = { top: 0, left: 0, width: 100, height: 100, pageId: '2' };
        const action = systemActions.applyFieldValueUpdate({
            fieldId: '1',
            value: 'newValue',
            boundingBox,
            confidence: 0.8,
            validationStatus: IdpValidationStatus.Valid,
        });
        const state = documentFieldReducer(initialState, action);

        const updatedField = {
            order: 1,
            id: '1',
            name: 'field1',
            value: 'newValue',
            dataType: IdpFieldDataType.Text,
            format: '',
            confidence: 0.8,
            boundingBox,
            verificationStatus: IdpVerificationStatus.ManualValid,
            validationStatus: IdpValidationStatus.Valid,
        };

        expect(state.entities['1']).toEqual(updatedField);
    });

    it('should handle fieldValidationUpdate action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'value1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'value2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.fieldValidationUpdate({
            fieldId: '1',
            validationStatus: IdpValidationStatus.Invalid,
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.validationStatus).toBe(IdpValidationStatus.Invalid);
        expect(state.entities['2']?.validationStatus).toBe(IdpValidationStatus.Valid);
    });

    it('should handle bulkFieldValidationUpdate action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'old1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'old2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
                {
                    order: 3,
                    id: '3',
                    name: 'field3',
                    value: 'old3',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.7,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.bulkFieldValidationUpdate({
            updates: [
                { fieldId: '1', value: 'new1' },
                { fieldId: '2', validationStatus: IdpValidationStatus.Invalid },
            ],
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.value).toBe('new1');
        expect(state.entities['1']?.validationStatus).toBe(IdpValidationStatus.Valid);
        expect(state.entities['2']?.validationStatus).toBe(IdpValidationStatus.Invalid);
        expect(state.entities['2']?.value).toBe('old2');
        expect(state.entities['3']?.value).toBe('old3');
        expect(state.entities['3']?.validationStatus).toBe(IdpValidationStatus.Valid);
    });

    it('should apply both value and validationStatus when bulkFieldValidationUpdate provides both for the same field', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'old1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.bulkFieldValidationUpdate({
            updates: [{ fieldId: '1', value: 'new1', validationStatus: IdpValidationStatus.Invalid }],
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.value).toBe('new1');
        expect(state.entities['1']?.validationStatus).toBe(IdpValidationStatus.Invalid);
    });

    it('should handle fieldValidityBatchUpdate action for multiple fields', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'val1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    isFormFieldValid: true,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'val2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    isFormFieldValid: true,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.fieldValidityBatchUpdate({
            updates: [
                { fieldId: '1', isFormFieldValid: false, formFieldIndex: 0 },
                { fieldId: '2', isFormFieldValid: true, formFieldIndex: 1 },
            ],
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.isFormFieldValid).toBe(false);
        expect(state.entities['1']?.order).toBe(0);
        expect(state.entities['2']?.isFormFieldValid).toBe(true);
        expect(state.entities['2']?.order).toBe(1);
    });

    it('should return the existing state when fieldValidityBatchUpdate has no effective changes', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 0,
                    id: '1',
                    name: 'field1',
                    value: 'val1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    isFormFieldValid: true,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.fieldValidityBatchUpdate({
            updates: [{ fieldId: '1', isFormFieldValid: true, formFieldIndex: 0 }],
        });
        const state = documentFieldReducer(initialState, action);

        expect(state).toBe(initialState);
    });

    it('should return the existing state when applyFieldValueUpdate has no effective changes', () => {
        const boundingBox = { top: 0, left: 0, width: 100, height: 100, pageId: '2' };
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'sameValue',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    boundingBox,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.applyFieldValueUpdate({
            fieldId: '1',
            value: 'sameValue',
            boundingBox,
            confidence: 0.8,
            validationStatus: IdpValidationStatus.Valid,
        });
        const state = documentFieldReducer(initialState, action);

        expect(state).toBe(initialState);
    });

    it('should handle fieldValidityUpdate action and update an individual field', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 0,
                    id: '1',
                    name: 'field1',
                    value: 'val1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    isFormFieldValid: true,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.fieldValidityUpdate({
            fieldId: '1',
            isFormFieldValid: false,
            formFieldIndex: 3,
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.isFormFieldValid).toBe(false);
        expect(state.entities['1']?.order).toBe(3);
    });

    it('should return the existing state when fieldValidityUpdate has no effective changes', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 2,
                    id: '1',
                    name: 'field1',
                    value: 'val1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    isFormFieldValid: true,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.fieldValidityUpdate({
            fieldId: '1',
            isFormFieldValid: true,
            formFieldIndex: 2,
        });
        const state = documentFieldReducer(initialState, action);

        expect(state).toBe(initialState);
    });

    it('should return the existing state when fieldValidationUpdate has no effective changes', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'val1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = systemActions.fieldValidationUpdate({
            fieldId: '1',
            validationStatus: IdpValidationStatus.Valid,
            value: 'val1',
        });
        const state = documentFieldReducer(initialState, action);

        expect(state).toBe(initialState);
    });

    it('should handle movedToNextField action', () => {
        const initialState = {
            ...initialDocumentFieldState,
            selectedFieldId: '1',
            needsKeyboardFocus: false,
        };
        const action = systemActions.movedToNextField({ id: '2' });
        const state = documentFieldReducer(initialState, action);

        expect(state.selectedFieldId).toBe('2');
        expect(state.needsKeyboardFocus).toBe(true);
    });

    it('should handle verifyField action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'someValue',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );
        const action = userActions.verifyField({ fieldId: '1' });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
    });

    it('should handle addTableRowFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'value1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const newFields = [
            {
                order: 2,
                id: '2',
                name: 'field2',
                value: 'value2',
                dataType: IdpFieldDataType.Text,
                format: '',
                confidence: 0.9,
                verificationStatus: IdpVerificationStatus.AutoInvalid,
                validationStatus: IdpValidationStatus.Valid,
            },
            {
                order: 3,
                id: '3',
                name: 'field3',
                value: 'value3',
                dataType: IdpFieldDataType.Text,
                format: '',
                confidence: 0.95,
                verificationStatus: IdpVerificationStatus.ManualValid,
                validationStatus: IdpValidationStatus.Valid,
            },
        ];

        const action = userActions.addTableRowFields({
            fields: newFields,
            tableId: '',
            rowIndex: 0,
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.ids).toEqual(['1', '2', '3']);
        expect(state.entities['2']).toEqual(newFields[0]);
        expect(state.entities['3']).toEqual(newFields[1]);
    });

    it('should handle clearTableRowFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'oldValue1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                    boundingBox: { top: 1, left: 2, width: 3, height: 4, pageId: 'page-1' },
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'oldValue2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                    boundingBox: { top: 5, left: 6, width: 7, height: 8, pageId: 'page-2' },
                },
            ],
            initialDocumentFieldState
        );
        const fieldsToClear = [
            { id: '1', value: '', confidence: 0.8, boundingBox: undefined, validationStatus: IdpValidationStatus.Invalid },
            { id: '2', value: '', confidence: 0.9, boundingBox: undefined, validationStatus: IdpValidationStatus.Valid },
        ];
        // Type assertion to allow partial field objects, since only id and value are needed for this action
        const action = userActions.clearTableRowFields({ fields: fieldsToClear as any, tableId: '', rowIndex: 0 });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.value).toBe('');
        expect(state.entities['2']?.value).toBe('');
        expect(state.entities['1']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
        expect(state.entities['2']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
        expect(state.entities['1']?.validationStatus).toBe(IdpValidationStatus.Invalid);
        expect(state.entities['2']?.validationStatus).toBe(IdpValidationStatus.Valid);
        expect(state.entities['1']?.confidence).toBe(0.8);
        expect(state.entities['2']?.confidence).toBe(0.9);
        expect(state.entities['1']?.boundingBox).toBeUndefined();
        expect(state.entities['2']?.boundingBox).toBeUndefined();
    });

    it('should handle updateTableRowFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'oldValue1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                    boundingBox: { top: 1, left: 2, width: 3, height: 4, pageId: 'page-1' },
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'oldValue2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );
        const updatedFields = [
            {
                id: '1',
                value: 'newValue1',
                verificationStatus: IdpVerificationStatus.ManualValid,
                validationStatus: IdpValidationStatus.Invalid,
                confidence: 0.95,
                boundingBox: { top: 1, left: 2, width: 3, height: 4, pageId: 'p1' },
            },
            {
                id: '2',
                value: 'newValue2',
                verificationStatus: IdpVerificationStatus.ManualValid,
                validationStatus: IdpValidationStatus.Valid,
                confidence: 0.99,
                boundingBox: { top: 5, left: 6, width: 7, height: 8, pageId: 'p2' },
            },
        ];
        const action = userActions.updateTableRowFields({ fields: updatedFields as any, tableId: '', rowIndex: 0 });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.value).toBe('newValue1');
        expect(state.entities['1']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
        expect(state.entities['1']?.validationStatus).toBe(IdpValidationStatus.Invalid);
        expect(state.entities['1']?.confidence).toBe(0.95);
        expect(state.entities['1']?.boundingBox).toEqual({ top: 1, left: 2, width: 3, height: 4, pageId: 'p1' });

        expect(state.entities['2']?.value).toBe('newValue2');
        expect(state.entities['2']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
        expect(state.entities['2']?.validationStatus).toBe(IdpValidationStatus.Valid);
        expect(state.entities['2']?.confidence).toBe(0.99);
        expect(state.entities['2']?.boundingBox).toEqual({ top: 5, left: 6, width: 7, height: 8, pageId: 'p2' });
    });

    it('should handle clearTableColumnFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'oldValue1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'oldValue2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                    boundingBox: { top: 5, left: 6, width: 7, height: 8, pageId: 'page-2' },
                },
            ],
            initialDocumentFieldState
        );
        const fieldsToClear = [
            {
                id: '1',
                value: '',
                confidence: 0.8,
                boundingBox: undefined,
                verificationStatus: IdpVerificationStatus.AutoInvalid,
                validationStatus: IdpValidationStatus.Invalid,
            },
            {
                id: '2',
                value: '',
                confidence: 0.9,
                boundingBox: undefined,
                verificationStatus: IdpVerificationStatus.AutoInvalid,
                validationStatus: IdpValidationStatus.Valid,
            },
        ];
        const action = userActions.clearTableColumnFields({ fields: fieldsToClear as any, tableId: '', columnIndex: 0 });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.value).toBe('');
        expect(state.entities['2']?.value).toBe('');
        expect(state.entities['1']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
        expect(state.entities['2']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
        expect(state.entities['1']?.validationStatus).toBe(IdpValidationStatus.Invalid);
        expect(state.entities['2']?.validationStatus).toBe(IdpValidationStatus.Valid);
        expect(state.entities['1']?.confidence).toBe(0.8);
        expect(state.entities['2']?.confidence).toBe(0.9);
        expect(state.entities['1']?.boundingBox).toBeUndefined();
        expect(state.entities['2']?.boundingBox).toBeUndefined();
    });

    it('should expose cleared column values through selectDocumentTables after a batched column clear', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 0,
                    id: '1',
                    name: 'Col1',
                    value: 'row1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                    tableId: 'table1',
                },
                {
                    order: 1,
                    id: '2',
                    name: 'Col1',
                    value: 'row2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                    tableId: 'table1',
                },
            ],
            initialDocumentFieldState
        );

        const action = userActions.clearTableColumnFields({
            tableId: 'table1',
            columnIndex: 0,
            fields: [
                { id: '1', value: '', confidence: 0.8, boundingBox: undefined, validationStatus: IdpValidationStatus.Invalid },
                { id: '2', value: '', confidence: 0.9, boundingBox: undefined, validationStatus: IdpValidationStatus.Valid },
            ] as any,
        });

        const tables = [
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Col1'],
                rows: [['1'], ['2']],
                validationStatus: IdpValidationStatus.Valid,
                validatorName: 'validator',
                isDirty: true,
            },
        ];
        const state = documentFieldReducer(initialState, action);
        const tableFieldMap = selectAllTableFieldsMap.projector(IdpLoadState.Loaded, tables, state.entities);
        const documentTables = selectDocumentTables.projector(tables, tableFieldMap);

        expect(documentTables[0].rows[0].rowCells[0]).toEqual(
            expect.objectContaining({
                id: '1',
                value: '',
                validationStatus: IdpValidationStatus.Invalid,
                verificationStatus: IdpVerificationStatus.ManualValid,
            })
        );
        expect(documentTables[0].rows[1].rowCells[0]).toEqual(
            expect.objectContaining({
                id: '2',
                value: '',
                validationStatus: IdpValidationStatus.Valid,
                verificationStatus: IdpVerificationStatus.ManualValid,
            })
        );
    });

    it('should handle updateTableColumnFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'oldValue1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'oldValue2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );
        const updatedFields = [
            {
                id: '1',
                value: 'newValue1',
                verificationStatus: IdpVerificationStatus.ManualValid,
                validationStatus: IdpValidationStatus.Valid,
                confidence: 0.95,
                boundingBox: { top: 1, left: 2, width: 3, height: 4, pageId: 'p1' },
            },
            {
                id: '2',
                value: 'newValue2',
                verificationStatus: IdpVerificationStatus.ManualValid,
                validationStatus: IdpValidationStatus.Invalid,
                confidence: 0.99,
                boundingBox: { top: 5, left: 6, width: 7, height: 8, pageId: 'p2' },
            },
        ];
        const action = userActions.updateTableColumnFields({ fields: updatedFields as any, tableId: '', columnIndex: 0 });
        const state = documentFieldReducer(initialState, action);

        expect(state.entities['1']?.value).toBe('newValue1');
        expect(state.entities['1']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
        expect(state.entities['1']?.validationStatus).toBe(IdpValidationStatus.Valid);
        expect(state.entities['1']?.confidence).toBe(0.95);
        expect(state.entities['1']?.boundingBox).toEqual({ top: 1, left: 2, width: 3, height: 4, pageId: 'p1' });

        expect(state.entities['2']?.value).toBe('newValue2');
        expect(state.entities['2']?.verificationStatus).toBe(IdpVerificationStatus.ManualValid);
        expect(state.entities['2']?.validationStatus).toBe(IdpValidationStatus.Invalid);
        expect(state.entities['2']?.confidence).toBe(0.99);
        expect(state.entities['2']?.boundingBox).toEqual({ top: 5, left: 6, width: 7, height: 8, pageId: 'p2' });
    });

    it('should handle insertTableRowFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'value1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const newFields = [
            {
                order: 2,
                id: '2',
                name: 'field2',
                value: 'value2',
                dataType: IdpFieldDataType.Text,
                format: '',
                confidence: 0.9,
                verificationStatus: IdpVerificationStatus.AutoInvalid,
                validationStatus: IdpValidationStatus.Valid,
            },
        ];

        const action = userActions.insertTableRowFields({
            fields: newFields,
            tableId: '',
            rowIndex: 1,
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.ids).toEqual(['1', '2']);
        expect(state.entities['2']).toEqual(newFields[0]);
    });

    it('should handle deleteTableRowFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'value1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'value2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = userActions.deleteTableRowFields({
            fieldIds: ['2'],
            tableId: '',
            rowIndex: 1,
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.ids).toEqual(['1']);
        expect(state.entities['2']).toBeUndefined();
    });

    it('should handle deleteTableFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'value1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
                {
                    order: 2,
                    id: '2',
                    name: 'field2',
                    value: 'value2',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.9,
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const action = userActions.deleteTableFields({
            fieldIds: ['1'],
            tableId: '',
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.ids).toEqual(['2']);
        expect(state.entities['1']).toBeUndefined();
    });

    it('should handle restoreTableFields action', () => {
        const initialState = documentFieldAdapter.setAll(
            [
                {
                    order: 1,
                    id: '1',
                    name: 'field1',
                    value: 'value1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    confidence: 0.8,
                    verificationStatus: IdpVerificationStatus.ManualValid,
                    validationStatus: IdpValidationStatus.Valid,
                },
            ],
            initialDocumentFieldState
        );

        const restoredFields = [
            {
                order: 2,
                id: '2',
                name: 'field2',
                value: 'value2',
                dataType: IdpFieldDataType.Text,
                format: '',
                confidence: 0.9,
                verificationStatus: IdpVerificationStatus.AutoInvalid,
                validationStatus: IdpValidationStatus.Valid,
            },
        ];

        const action = userActions.restoreTableFields({
            fields: restoredFields,
            tableId: '',
            tableData: { id: 'table1', name: 'Table 1', columnHeaderNames: ['Column 1', 'Column 2'] } as any,
        });
        const state = documentFieldReducer(initialState, action);

        expect(state.ids).toEqual(['1', '2']);
        expect(state.entities['2']).toEqual(restoredFields[0]);
    });

    describe('reducer → selector integration for batch table validation', () => {
        it('should produce Invalid table validation when updateTableColumnFields leaves an invalid cell', () => {
            const initialState = documentFieldAdapter.setAll(
                [
                    {
                        order: 0,
                        id: 'cell1',
                        name: 'Col1',
                        value: 'original',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0.8,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        validationStatus: IdpValidationStatus.Valid,
                        tableId: 'table1',
                    },
                    {
                        order: 1,
                        id: 'cell2',
                        name: 'Col1',
                        value: 'original2',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0.9,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        validationStatus: IdpValidationStatus.Valid,
                        tableId: 'table1',
                    },
                ],
                initialDocumentFieldState
            );

            const action = userActions.updateTableColumnFields({
                tableId: 'table1',
                columnIndex: 0,
                fields: [
                    { id: 'cell1', value: 'updated', confidence: 0.95, boundingBox: undefined, validationStatus: IdpValidationStatus.Valid },
                    { id: 'cell2', value: '', confidence: 0.9, boundingBox: undefined, validationStatus: IdpValidationStatus.Invalid },
                ] as any,
            });

            const tables = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Col1'],
                    rows: [['cell1'], ['cell2']],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'validator',
                    isDirty: true,
                },
            ];
            const state = documentFieldReducer(initialState, action);
            const tableFieldMap = selectAllTableFieldsMap.projector(IdpLoadState.Loaded, tables, state.entities);
            const documentTables = selectDocumentTables.projector(tables, tableFieldMap);

            const hasInvalidCell = documentTables[0].rows.some((row) =>
                row.rowCells.some((cell) => cell.validationStatus === IdpValidationStatus.Invalid)
            );
            expect(hasInvalidCell).toBe(true);

            expect(documentTables[0].rows[0].rowCells[0]).toEqual(
                expect.objectContaining({ id: 'cell1', value: 'updated', validationStatus: IdpValidationStatus.Valid })
            );
            expect(documentTables[0].rows[1].rowCells[0]).toEqual(
                expect.objectContaining({ id: 'cell2', value: '', validationStatus: IdpValidationStatus.Invalid })
            );
        });

        it('should produce all-Valid table cells when updateTableColumnFields restores valid values', () => {
            const initialState = documentFieldAdapter.setAll(
                [
                    {
                        order: 0,
                        id: 'cell1',
                        name: 'Col1',
                        value: '',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0.8,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        validationStatus: IdpValidationStatus.Invalid,
                        tableId: 'table1',
                    },
                    {
                        order: 1,
                        id: 'cell2',
                        name: 'Col1',
                        value: '',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0.9,
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                        validationStatus: IdpValidationStatus.Invalid,
                        tableId: 'table1',
                    },
                ],
                initialDocumentFieldState
            );

            const action = userActions.updateTableColumnFields({
                tableId: 'table1',
                columnIndex: 0,
                fields: [
                    { id: 'cell1', value: 'restored', confidence: 0.8, boundingBox: undefined, validationStatus: IdpValidationStatus.Valid },
                    { id: 'cell2', value: 'restored', confidence: 0.9, boundingBox: undefined, validationStatus: IdpValidationStatus.Valid },
                ] as any,
            });

            const tables = [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Col1'],
                    rows: [['cell1'], ['cell2']],
                    validationStatus: IdpValidationStatus.Invalid,
                    validatorName: 'validator',
                    isDirty: true,
                },
            ];
            const state = documentFieldReducer(initialState, action);
            const tableFieldMap = selectAllTableFieldsMap.projector(IdpLoadState.Loaded, tables, state.entities);
            const documentTables = selectDocumentTables.projector(tables, tableFieldMap);

            const allCellsValid = documentTables[0].rows.every((row) =>
                row.rowCells.every((cell) => cell.validationStatus === IdpValidationStatus.Valid)
            );
            expect(allCellsValid).toBe(true);

            expect(documentTables[0].rows[0].rowCells[0]).toEqual(
                expect.objectContaining({ id: 'cell1', value: 'restored', validationStatus: IdpValidationStatus.Valid })
            );
            expect(documentTables[0].rows[1].rowCells[0]).toEqual(
                expect.objectContaining({ id: 'cell2', value: 'restored', validationStatus: IdpValidationStatus.Valid })
            );
        });
    });
});
