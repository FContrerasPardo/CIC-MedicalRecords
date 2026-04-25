/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpFieldDataType, IdpLoadState, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { selectTableById, selectTableSummaryById, selectDocumentTables, selectActiveTable, selectActiveTableSummary } from './document-table.selectors';
import { IdpValidationStatus } from '../../models/screen-models';

describe('Document Table Selectors', () => {
    const mockState = {
        documentTable: {
            ids: ['table1', 'table2'],
            entities: {
                table1: {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Field 1'],
                    rows: [['field1']],
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'Validator 1',
                    isDirty: false,
                },
                table2: {
                    id: 'table2',
                    name: 'Table 2',
                    columnHeaderNames: [],
                    rows: [],
                    validationStatus: IdpValidationStatus.Invalid,
                    validatorName: 'Validator 2',
                    isDirty: true,
                },
            },
            loadState: IdpLoadState.Loaded,
        },
        documentField: {
            activeTableWithFields: [
                {
                    id: 'table1',
                    name: 'Field 1',
                    dataType: IdpFieldDataType.Table,
                    format: '',
                    verificationStatus: IdpVerificationStatus.AutoValid,
                    confidence: 1,
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'Validator 1',
                },
                {
                    id: 'field1',
                    name: 'Field 1',
                    dataType: IdpFieldDataType.Text,
                    format: '',
                    hasIssue: false,
                    verificationStatus: IdpVerificationStatus.AutoValid,
                    confidence: 1,
                    isSelected: true,
                    tableId: 'table1',
                    validationStatus: IdpValidationStatus.Valid,
                    validatorName: 'Validator 1',
                },
            ],
            tableFieldsMap: {
                table1: [
                    {
                        id: 'field1',
                        name: 'Field 1',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        hasIssue: false,
                        verificationStatus: IdpVerificationStatus.AutoValid,
                        confidence: 1,
                        isSelected: false,
                        tableId: 'table1',
                        validationStatus: IdpValidationStatus.Valid,
                        validatorName: 'Validator 1',
                    },
                ],
            },
        },
    };

    it('should select table by ID', () => {
        const tableId = 'table1';
        const result = selectTableById(tableId).projector(
            [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Field 1'],
                    rows: [['field1']],
                    validationStatus: 'Valid',
                    validatorName: 'Validator 1',
                    isDirty: false,
                },
                {
                    id: 'table2',
                    name: 'Table 2',
                    columnHeaderNames: [],
                    rows: [],
                    validationStatus: 'Invalid',
                    validatorName: 'Validator 2',
                    isDirty: true,
                },
            ],
            mockState.documentField.tableFieldsMap
        );

        expect(result).toEqual({
            id: 'table1',
            name: 'Table 1',
            columnHeaderNames: ['Field 1'],
            rows: [
                {
                    rowCells: [mockState.documentField.tableFieldsMap.table1[0]],
                },
            ],
            validationStatus: 'Valid',
            validatorName: 'Validator 1',
            isDirty: false,
        });
    });

    it('should select the active table', () => {
        const result = selectActiveTable.projector(
            [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Field 1'],
                    rows: [['field1']],
                    validationStatus: 'Valid',
                    validatorName: 'Validator 1',
                    isDirty: false,
                },
                {
                    id: 'table2',
                    name: 'Table 2',
                    columnHeaderNames: [],
                    rows: [],
                    validationStatus: 'Invalid',
                    validatorName: 'Validator 2',
                    isDirty: true,
                },
            ],
            mockState.documentField.activeTableWithFields
        );
        expect(result).toEqual({
            id: 'table1',
            name: 'Table 1',
            columnHeaderNames: ['Field 1'],
            rows: [
                {
                    rowCells: [jasmine.objectContaining({ id: 'field1', isSelected: true })],
                },
            ],
            validationStatus: 'Valid',
            validatorName: 'Validator 1',
            isDirty: false,
        });
    });

    it('should select active table summary from a selected table field', () => {
        const result = selectActiveTableSummary.projector(
            {
                table1: {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Field 1'],
                    rows: [['field1']],
                    validationStatus: 'Valid',
                    validatorName: 'Validator 1',
                    isDirty: false,
                },
            },
            {
                id: 'table1',
                name: 'Table 1',
                dataType: IdpFieldDataType.Table,
                format: '',
                verificationStatus: IdpVerificationStatus.AutoValid,
                confidence: 1,
                validationStatus: IdpValidationStatus.Valid,
            }
        );

        expect(result).toEqual({
            id: 'table1',
            name: 'Table 1',
            rowCount: 1,
        });
    });

    it('should select active table summary from a selected table cell', () => {
        const result = selectActiveTableSummary.projector(
            {
                table1: {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Field 1'],
                    rows: [['field1']],
                    validationStatus: 'Valid',
                    validatorName: 'Validator 1',
                    isDirty: false,
                },
            },
            {
                id: 'field1',
                name: 'Field 1',
                dataType: IdpFieldDataType.Text,
                format: '',
                verificationStatus: IdpVerificationStatus.AutoValid,
                confidence: 1,
                tableId: 'table1',
                validationStatus: IdpValidationStatus.Valid,
            }
        );

        expect(result).toEqual({
            id: 'table1',
            name: 'Table 1',
            rowCount: 1,
        });
    });

    it('should select document tables', () => {
        const result = selectDocumentTables.projector(
            [
                {
                    id: 'table1',
                    name: 'Table 1',
                    columnHeaderNames: ['Field 1'],
                    rows: [['field1']],
                    validationStatus: 'Valid',
                    validatorName: 'Validator 1',
                    isDirty: false,
                },
                {
                    id: 'table2',
                    name: 'Table 2',
                    columnHeaderNames: [],
                    rows: [],
                    validationStatus: 'Invalid',
                    validatorName: 'Validator 2',
                    isDirty: true,
                },
            ],
            mockState.documentField.tableFieldsMap
        );
        expect(result).toEqual([
            {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Field 1'],
                rows: [
                    {
                        rowCells: [mockState.documentField.tableFieldsMap.table1[0]],
                    },
                ],
                validationStatus: 'Valid',
                validatorName: 'Validator 1',
                isDirty: false,
            },
            {
                id: 'table2',
                name: 'Table 2',
                columnHeaderNames: [],
                rows: [],
                validationStatus: 'Invalid',
                validatorName: 'Validator 2',
                isDirty: true,
            },
        ]);
    });

    it('should select table summary by ID', () => {
        const result = selectTableSummaryById('table1').projector({
            table1: {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Field 1'],
                rows: [['field1']],
                validationStatus: 'Valid',
                validatorName: 'Validator 1',
                isDirty: false,
            },
            table2: {
                id: 'table2',
                name: 'Table 2',
                columnHeaderNames: [],
                rows: [],
                validationStatus: 'Invalid',
                validatorName: 'Validator 2',
                isDirty: true,
            },
        });

        expect(result).toEqual({
            id: 'table1',
            name: 'Table 1',
            rowCount: 1,
        });
    });

    it('should return undefined table summary when table ID does not exist', () => {
        const result = selectTableSummaryById('missing-table').projector({
            table1: {
                id: 'table1',
                name: 'Table 1',
                columnHeaderNames: ['Field 1'],
                rows: [['field1']],
                validationStatus: 'Valid',
                validatorName: 'Validator 1',
                isDirty: false,
            },
        });

        expect(result).toBeUndefined();
    });
});
