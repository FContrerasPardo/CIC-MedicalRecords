/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    selectDocumentFields,
    selectActiveField,
    selectFieldById,
    selectAllFields,
    selectAllTableFieldsMap,
    selectRedactedFields,
} from './document-field.selectors';

import { IdpFieldDataType, IdpLoadState, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpValidationStatus } from '../../models/screen-models';
import { fieldVerificationStateName } from '../states/root.state';

describe('DocumentField Selectors', () => {
    const headerFieldIds = ['1', '2', '3', '4', '5'];

    const finalDocFieldState = {
        loadState: IdpLoadState.Loaded,
        selectedFieldId: '1',
        needsKeyboardFocus: true,
        headerFieldIds,
        ids: ['1', '2', '3', '4', '5'],
        entities: {
            '1': {
                order: 1,
                id: '1',
                name: 'Field 1',
                dataType: IdpFieldDataType.Text,
                format: '',
                verificationStatus: IdpVerificationStatus.AutoInvalid,
                validationStatus: IdpValidationStatus.Valid,
                isFormFieldValid: true,
                confidence: 0.8,
                value: 'Value 1',
            },
            '2': {
                order: 2,
                id: '2',
                name: 'Field 2',
                dataType: IdpFieldDataType.Text,
                format: '',
                verificationStatus: IdpVerificationStatus.AutoValid,
                validationStatus: IdpValidationStatus.Valid,
                isFormFieldValid: true,
                confidence: 0.8,
                value: undefined,
            },
            '3': {
                order: 3,
                id: '3',
                name: 'Field 3',
                dataType: IdpFieldDataType.Text,
                format: '',
                verificationStatus: IdpVerificationStatus.ManualInvalid,
                validationStatus: IdpValidationStatus.Valid,
                isFormFieldValid: true,
                confidence: 0.8,
                value: 'Value 3',
            },
            '4': {
                order: 4,
                id: '4',
                name: 'Field 4',
                dataType: IdpFieldDataType.Text,
                format: '',
                verificationStatus: IdpVerificationStatus.AutoValid,
                validationStatus: IdpValidationStatus.Valid,
                isFormFieldValid: true,
                confidence: 0.8,
                value: 'Value 4',
            },
            '5': {
                order: 5,
                id: '5',
                name: 'Field 5',
                dataType: IdpFieldDataType.Text,
                format: '',
                verificationStatus: IdpVerificationStatus.ManualValid,
                validationStatus: IdpValidationStatus.Valid,
                isFormFieldValid: false,
                confidence: 0.8,
                value: 'Value 5',
            },
        },
    };

    it('should select all document fields', () => {
        const result = selectDocumentFields.projector(
            finalDocFieldState.loadState,
            finalDocFieldState.headerFieldIds,
            finalDocFieldState.entities,
            new Map()
        );
        expect(result).toEqual([
            jasmine.objectContaining({ id: '1' }),
            jasmine.objectContaining({ id: '2' }),
            jasmine.objectContaining({ id: '3' }),
            jasmine.objectContaining({ id: '4' }),
            jasmine.objectContaining({ id: '5' }),
        ]);
    });

    it('should select fields with issues', () => {
        const result = selectAllFields.projector(finalDocFieldState.loadState, finalDocFieldState.headerFieldIds, finalDocFieldState.entities);
        expect(result).toEqual([
            jasmine.objectContaining({ id: '1', hasIssue: true }),
            jasmine.objectContaining({ id: '2', hasIssue: false }),
            jasmine.objectContaining({ id: '3', hasIssue: true }),
            jasmine.objectContaining({ id: '4', hasIssue: false }),
            jasmine.objectContaining({ id: '5', hasIssue: true }),
        ]);
    });

    it('should keep the stable field collection free of transient selection metadata', () => {
        const result = selectAllFields.projector(finalDocFieldState.loadState, finalDocFieldState.headerFieldIds, finalDocFieldState.entities);

        result.forEach((field) => {
            expect(field).not.toHaveProperty('isSelected');
            expect(field).not.toHaveProperty('needsKeyboardFocus');
        });
    });

    it('should keep the stable field collection memoized when only selection state changes', () => {
        const fieldsState = { ...finalDocFieldState };

        const rootState = {
            [fieldVerificationStateName]: {
                fields: fieldsState,
            },
        } as any;

        const selectionOnlyChangeState = {
            [fieldVerificationStateName]: {
                fields: {
                    ...fieldsState,
                    selectedFieldId: '3',
                    needsKeyboardFocus: false,
                },
            },
        } as any;

        const firstResult = selectAllFields(rootState);
        const secondResult = selectAllFields(selectionOnlyChangeState);

        expect(secondResult).toBe(firstResult);
    });

    it('should exclude fields marked ignoreForReview from document fields', () => {
        const ignoreMap = new Map<string, boolean>([['1', true]]);
        const result = selectDocumentFields.projector(
            finalDocFieldState.loadState,
            finalDocFieldState.headerFieldIds,
            finalDocFieldState.entities,
            ignoreMap
        );
        expect(result).toEqual([
            jasmine.objectContaining({ id: '2' }),
            jasmine.objectContaining({ id: '3' }),
            jasmine.objectContaining({ id: '4' }),
            jasmine.objectContaining({ id: '5' }),
        ]);
    });

    it('should select the active field', () => {
        const result = (selectActiveField.projector as any)(
            finalDocFieldState.loadState,
            finalDocFieldState.entities,
            finalDocFieldState.selectedFieldId,
            finalDocFieldState.needsKeyboardFocus
        );
        expect(result).toBeDefined();
        expect(result?.id).toBe('1');
        expect(result?.isSelected).toBe(true);
        expect(result?.needsKeyboardFocus).toBe(true);
    });

    it('should return empty array when state is not initialized', () => {
        const result = selectDocumentFields.projector(IdpLoadState.NotInitialized, [], {}, new Map());
        expect(result.length).toBe(0);
    });

    it('should select a field by ID', () => {
        const fieldId = '3';
        const result = (selectFieldById(fieldId).projector as any)(
            finalDocFieldState.loadState,
            finalDocFieldState.entities,
            finalDocFieldState.selectedFieldId,
            finalDocFieldState.needsKeyboardFocus
        );
        expect(result).toBeDefined();
        expect(result?.id).toBe(fieldId);
        expect(result?.name).toBe('Field 3');
    });

    it('should return undefined if field ID does not exist', () => {
        const fieldId = 'non-existent-id';
        const result = (selectFieldById(fieldId).projector as any)(
            finalDocFieldState.loadState,
            finalDocFieldState.entities,
            finalDocFieldState.selectedFieldId,
            finalDocFieldState.needsKeyboardFocus
        );
        expect(result).toBeUndefined();
    });

    it('should return header fields in their live order after form sync updates entity order', () => {
        const reorderedEntities = {
            '1': { ...finalDocFieldState.entities['1'], order: 2 },
            '2': { ...finalDocFieldState.entities['2'], order: 0 },
            '3': { ...finalDocFieldState.entities['3'], order: 1 },
        };

        const result = selectAllFields.projector(IdpLoadState.Loaded, ['1', '2', '3'], reorderedEntities);

        expect(result.map((f) => f.id)).toEqual(['2', '3', '1']);
    });

    it('should fall back to entity order when loaded state does not provide headerFieldIds', () => {
        const result = selectAllFields.projector(IdpLoadState.Loaded, undefined as any, finalDocFieldState.entities);

        expect(result.length).toBe(5);
        expect(result.map((f) => f.id)).toEqual(['1', '2', '3', '4', '5']);
    });

    it('should mark field as having issue when validationStatus is Invalid', () => {
        const modifiedEntities = {
            ...finalDocFieldState.entities,
            '2': {
                ...finalDocFieldState.entities['2'],
                verificationStatus: IdpVerificationStatus.AutoValid,
                isFormFieldValid: true,
                validationStatus: IdpValidationStatus.Invalid,
            },
        };

        const result = selectAllFields.projector(IdpLoadState.Loaded, headerFieldIds, modifiedEntities);
        const field2 = result.find((f) => f.id === '2');
        expect(field2?.hasIssue).toBe(true);
    });

    it('should not mark field as having issue when all validation statuses are Valid', () => {
        const modifiedEntities = {
            ...finalDocFieldState.entities,
            '2': {
                ...finalDocFieldState.entities['2'],
                verificationStatus: IdpVerificationStatus.AutoValid,
                isFormFieldValid: true,
                validationStatus: IdpValidationStatus.Valid,
            },
        };

        const result = selectAllFields.projector(IdpLoadState.Loaded, headerFieldIds, modifiedEntities);
        const field2 = result.find((f) => f.id === '2');
        expect(field2?.hasIssue).toBe(false);
    });

    it('should return undefined from selectFieldById when the document is not initialized', () => {
        const result = (selectFieldById('1').projector as any)(
            IdpLoadState.NotInitialized,
            finalDocFieldState.entities,
            finalDocFieldState.selectedFieldId,
            finalDocFieldState.needsKeyboardFocus
        );
        expect(result).toBeUndefined();
    });

    it('should return undefined from selectActiveField when the selected entity does not exist', () => {
        const result = (selectActiveField.projector as any)(
            finalDocFieldState.loadState,
            {},
            finalDocFieldState.selectedFieldId,
            finalDocFieldState.needsKeyboardFocus
        );
        expect(result).toBeUndefined();
    });

    it('should return an empty map from selectAllTableFieldsMap when the tables are not initialized', () => {
        const result = selectAllTableFieldsMap.projector(IdpLoadState.NotInitialized, [], {});
        expect(result).toEqual({});
    });

    describe('selectRedactedFields', () => {
        const fieldWithBoundingBox = (id: string) =>
            ({
                id,
                name: `Field ${id}`,
                dataType: IdpFieldDataType.Text,
                format: '',
                verificationStatus: IdpVerificationStatus.AutoValid,
                validationStatus: IdpValidationStatus.Valid,
                isFormFieldValid: true,
                confidence: 0.9,
                value: 'val',
                boundingBox: { pageId: 'p1', left: 0, top: 0, width: 10, height: 10 },
            }) as any;

        const fieldWithoutBoundingBox = (id: string) => ({
            ...fieldWithBoundingBox(id),
            boundingBox: undefined,
        });

        it('should return only fields whose id is in redactedFieldIds and that have a boundingBox', () => {
            const fields = [fieldWithBoundingBox('f1'), fieldWithBoundingBox('f2'), fieldWithoutBoundingBox('f3'), fieldWithBoundingBox('f4')];
            const redactedFieldIds = new Set(['f1', 'f3', 'f4']);

            const result = selectRedactedFields.projector(fields, redactedFieldIds);

            expect(result).toEqual([jasmine.objectContaining({ id: 'f1' }), jasmine.objectContaining({ id: 'f4' })]);
        });
    });
});
