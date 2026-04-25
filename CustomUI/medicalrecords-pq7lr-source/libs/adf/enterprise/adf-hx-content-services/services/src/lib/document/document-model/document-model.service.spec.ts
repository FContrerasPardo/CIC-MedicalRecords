/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { MockService, ngMocks } from 'ng-mocks';
import { ModelApi } from '@hylandsoftware/hxcs-js-client';
import { generateMockResponse, jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { DocumentModelService } from './document-model.service';
import { DocumentModel } from './document-model.model';
import { FieldType, MODEL_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { firstValueFrom } from 'rxjs';

describe('Document Model Service', () => {
    let modelApiSpy: jest.SpyInstance<Promise<any>>;
    let documentModelService: DocumentModelService;
    let mockModelApi: ModelApi;

    beforeEach(() => {
        ngMocks.autoSpy('jest');

        mockModelApi = MockService(ModelApi);
        modelApiSpy = jest.spyOn(mockModelApi, 'getModel').mockReturnValue(generateMockResponse({ data: jestMocks.modelApi }));

        TestBed.configureTestingModule({
            providers: [
                DocumentModelService,
                { provide: MODEL_API_TOKEN, useValue: mockModelApi }
            ]
        });

        documentModelService = TestBed.inject(DocumentModelService);
    });

    it('should get repository model', async () => {
        const model = await firstValueFrom(documentModelService.getModel());
        expect(model).toBeTruthy();
    });

    it('should return empty DocumentModel when getModel API call returns 400 status error', async () => {
        // Reset the service to test error case with fresh instance
        modelApiSpy.mockRestore();
        const error400 = { status: 400 };
        modelApiSpy = jest.spyOn(mockModelApi, 'getModel').mockRejectedValue(error400);

        const newDocumentModelService = TestBed.inject(DocumentModelService);

        const model = await firstValueFrom(newDocumentModelService.getModel());

        expect(model).toBeTruthy();
        expect(model).toBeInstanceOf(DocumentModel);
        // Verify that it's created with empty object (fallback behavior)
        expect(model.getFilishTypes()).toEqual([]);
        expect(model.getFolderishTypes()).toEqual([]);
    });

    it('should return empty DocumentModel when getModel API call returns 400 status in response', async () => {
        // Reset the service to test error case with fresh instance
        modelApiSpy.mockRestore();
        const error400Response = { response: { status: 400 } };
        modelApiSpy = jest.spyOn(mockModelApi, 'getModel').mockRejectedValue(error400Response);

        const newDocumentModelService = TestBed.inject(DocumentModelService);

        const model = await firstValueFrom(newDocumentModelService.getModel());

        expect(model).toBeTruthy();
        expect(model).toBeInstanceOf(DocumentModel);
        // Verify that it's created with empty object (fallback behavior)
        expect(model.getFilishTypes()).toEqual([]);
        expect(model.getFolderishTypes()).toEqual([]);
    });

    it('should re-throw non-400 errors from getModel API call', async () => {
        // Reset the service to test error case with fresh instance
        modelApiSpy.mockRestore();
        const error500 = new Error('Server Error');
        modelApiSpy = jest.spyOn(mockModelApi, 'getModel').mockRejectedValue(error500);

        const newDocumentModelService = TestBed.inject(DocumentModelService);

        await expect(firstValueFrom(newDocumentModelService.getModel())).rejects.toThrow('Server Error');
    });

    it('should retry API call when errored flag is set', async () => {
        // Reset the service to test error case with fresh instance
        modelApiSpy.mockRestore();
        const error400 = { status: 400 };
        modelApiSpy = jest.spyOn(mockModelApi, 'getModel')
            .mockRejectedValueOnce(error400)
            .mockReturnValue(generateMockResponse({ data: jestMocks.modelApi }));

        const newDocumentModelService = TestBed.inject(DocumentModelService);

        // First call should return empty model due to 400 error
        const model1 = await firstValueFrom(newDocumentModelService.getModel());
        expect(model1.getFilishTypes()).toEqual([]);

        // Second call should retry and succeed
        const model2 = await firstValueFrom(newDocumentModelService.getModel());
        expect(model2.getFilishTypes()).toEqual(['SysFile', 'SpecialFile', 'SuperSpecialFile']);
    });

    it('should get correct field type from document model', async () => {
        const model = await firstValueFrom(documentModelService.getModel());

        expect(model).toBeTruthy();

        expect(model.getFieldType('test_blob')).toEqual(FieldType.Blob);
        expect(model.getFieldType('test_multiblob')).toEqual(FieldType.BlobArray);

        expect(model.getFieldType('test_boolean')).toEqual(FieldType.Boolean);
        expect(model.getFieldType('test_multiboolean')).toEqual(FieldType.BooleanArray);

        expect(model.getFieldType('test_date')).toEqual(FieldType.Date);
        expect(model.getFieldType('test_multidate')).toEqual(FieldType.DateArray);

        expect(model.getFieldType('test_float')).toEqual(FieldType.Float);
        expect(model.getFieldType('test_multifloat')).toEqual(FieldType.FloatArray);

        expect(model.getFieldType('test_int')).toEqual(FieldType.Integer);
        expect(model.getFieldType('test_multiint')).toEqual(FieldType.IntegerArray);

        expect(model.getFieldType('test_string')).toEqual(FieldType.String);
        expect(model.getFieldType('test_multistring')).toEqual(FieldType.StringArray);

        expect(model.getFieldType('test_complex')).toEqual(FieldType.Complex);
    });

    it('should correctly identify field types as arrays', () => {
        const testModel = new DocumentModel(jestMocks.modelApi);

        expect(testModel.isFieldTypeArray(FieldType.FloatArray)).toBe(true);
        expect(testModel.isFieldTypeArray(FieldType.IntegerArray)).toBe(true);
        expect(testModel.isFieldTypeArray(FieldType.DateArray)).toBe(true);
        expect(testModel.isFieldTypeArray(FieldType.StringArray)).toBe(true);

        expect(testModel.isFieldTypeArray(FieldType.Blob)).toBe(false);
        expect(testModel.isFieldTypeArray(FieldType.Boolean)).toBe(false);
        expect(testModel.isFieldTypeArray(FieldType.Date)).toBe(false);
        expect(testModel.isFieldTypeArray(FieldType.Float)).toBe(false);
        expect(testModel.isFieldTypeArray(FieldType.Integer)).toBe(false);
        expect(testModel.isFieldTypeArray(FieldType.String)).toBe(false);
        expect(testModel.isFieldTypeArray(FieldType.Complex)).toBe(false);
    });

    it('should handle complex field details correctly', () => {
        const docModel = new DocumentModel(jestMocks.modelApi);

        // Inline subfields
        const complexInlineDetails = docModel.getComplexFieldDetails('test_complex');
        expect(complexInlineDetails).toEqual([
            { name: 'field1', type: FieldType.String },
            { name: 'field2', type: FieldType.Date },
        ]);

        // Referenced subfields
        const complexRefDetails = docModel.getComplexFieldDetails('test_complexRef');
        expect(complexRefDetails).toEqual([
            { name: 'refSubField1', type: FieldType.Float },
            { name: 'refSubField2', type: FieldType.Date },
        ]);

        // Non-existent field
        const nonExistentDetails = docModel.getComplexFieldDetails('nonExistentField');
        expect(nonExistentDetails).toEqual([]);
    });

    it('should return true for hasMixin if mixing is present', () => {
        const docModel = new DocumentModel(jestMocks.modelApi);
        expect(docModel.hasMixin('SysFile', 'SysFilish')).toBeTruthy();
    });

    it('should return false for hasMixin if mixing is not present', () => {
        const docModel = new DocumentModel(jestMocks.modelApi);
        expect(docModel.hasMixin('SysFile', 'SysFolderish')).toBeFalsy();
    });

    it('should get Filish categories', () => {
        const docModel = new DocumentModel(jestMocks.modelApi);
        expect(docModel.getFilishTypes()).toEqual(['SysFile', 'SpecialFile', 'SuperSpecialFile']);
    });

    it('should get Folderish categories', () => {
        const docModel = new DocumentModel(jestMocks.modelApi);
        expect(docModel.getFolderishTypes()).toEqual([
            'SuperSpecialFolder',
            'SysFolder',
            'SysOrderedFolder',
            'SysRenditionsContainer',
            'SysVocabulary',
        ]);
    });

    it('should return the correct model despite having more schemas with same prefix', async () => {
        const model = await firstValueFrom(documentModelService.getModel());

        expect(model).toBeTruthy();

        let field = model.getFieldType('duplicate_complex.field1');

        expect(field).toEqual(FieldType.String);

        field = model.getFieldType('duplicate_complex.field2');

        expect(field).toEqual(FieldType.Date);

        field = model.getFieldType('duplicate_simpleStrings');

        expect(field).toEqual(FieldType.String);
    });

    describe('inherits', () => {
        it('should return true when type directly extends parent', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits('SysFile', 'SysContent')).toBeTruthy();
            expect(docModel.inherits('SysFolder', 'SysContent')).toBeTruthy();
        });

        it('should return true when type extends parent through multiple levels', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits('SpecialFile', 'SysFile')).toBeTruthy();
            expect(docModel.inherits('SpecialFile', 'SysContent')).toBeTruthy();
            expect(docModel.inherits('SuperSpecialFile', 'SpecialFile')).toBeTruthy();
            expect(docModel.inherits('SuperSpecialFile', 'SysFile')).toBeTruthy();
            expect(docModel.inherits('SuperSpecialFile', 'SysContent')).toBeTruthy();
        });

        it('should return true when source and target types are equal', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits('SysFile', 'SysFile')).toBeTruthy();
            expect(docModel.inherits('SysContent', 'SysContent')).toBeTruthy();
        });

        it('should return false when type does not extend parent', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits('SysFile', 'SysFolder')).toBeFalsy();
            expect(docModel.inherits('SysFolder', 'SysFile')).toBeFalsy();
            expect(docModel.inherits('SpecialFile', 'SysFolder')).toBeFalsy();
        });

        it('should handle circular type references without infinite recursion', () => {
            const recursiveModel = {
                primaryTypes: {
                    TypeA: {
                        name: 'TypeA',
                        extends: 'TypeB',
                    },
                    TypeB: {
                        name: 'TypeB',
                        extends: 'TypeA',
                    },
                },
            };
            const docModel = new DocumentModel(recursiveModel as any);

            expect(docModel.inherits('TypeA', 'TypeC')).toBeFalsy();
            expect(docModel.inherits('TypeB', 'TypeC')).toBeFalsy();
        });

        it('should return false when sourceType is null', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits(null as any, 'SysContent')).toBeFalsy();
        });

        it('should return false when sourceType is undefined', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits(undefined as any, 'SysContent')).toBeFalsy();
        });

        it('should return false when sourceType is empty string', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits('', 'SysContent')).toBeFalsy();
        });

        it('should return false when model is null', () => {
            const docModel = new DocumentModel(null as any);

            expect(docModel.inherits('SysFile', 'SysContent')).toBeFalsy();
        });

        it('should return false when model has no primaryTypes', () => {
            const emptyModel = { primaryTypes: null };
            const docModel = new DocumentModel(emptyModel as any);

            expect(docModel.inherits('SysFile', 'SysContent')).toBeFalsy();
        });

        it('should return false when model has undefined primaryTypes', () => {
            const emptyModel = { primaryTypes: undefined };
            const docModel = new DocumentModel(emptyModel as any);

            expect(docModel.inherits('SysFile', 'SysContent')).toBeFalsy();
        });

        it('should return false when sourceType does not exist in the model', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits('NonExistentType', 'SysContent')).toBeFalsy();
        });

        it('should return false when both sourceType and targetType do not exist in the model', () => {
            const docModel = new DocumentModel(jestMocks.modelApi);

            expect(docModel.inherits('NonExistentSource', 'NonExistentTarget')).toBeFalsy();
        });
    });
});
