/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Document } from '@hylandsoftware/hxcs-js-client';
import { DocumentModel, DocumentModelService } from '@alfresco/adf-hx-content-services/services';
import { of } from 'rxjs';
import { IsViewableAsFilePipe } from './is-viewable-as-file.pipe';
import { Component, runInInjectionContext } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsyncPipe } from '@angular/common';

@Component({
    template: '',
    imports: [IsViewableAsFilePipe, AsyncPipe],
})
class TestHostComponent {}

describe('IsViewableAsFilePipe', () => {
    let pipe: IsViewableAsFilePipe;
    const mockDocumentModelService = { getModel: jest.fn() };
    let mockDocumentModel: DocumentModel;
    let fixture: ComponentFixture<TestHostComponent>;

    const fileDocument: Document = {
        sys_id: 'file-1',
        sys_primaryType: 'SysFile',
    } as Document;

    const folderDocument: Document = {
        sys_id: 'folder-1',
        sys_primaryType: 'SysFolder',
    } as Document;

    beforeEach(() => {
        const mockModel = {
            primaryTypes: {
                SysFile: {
                    name: 'SysFile',
                    extends: 'SysContent',
                },
                SysFolder: {
                    name: 'SysFolder',
                    extends: 'SysContent',
                    mixins: ['SysFilish', 'SysFolderish'], // SysFolder has both mixins
                },
                SysContent: {
                    name: 'SysContent',
                },
                CustomFile: {
                    name: 'CustomFile',
                    extends: 'SysFile',
                },
                CustomFolder: {
                    name: 'CustomFolder',
                    extends: 'SysFolder',
                    mixins: ['SysFilish', 'SysFolderish'],
                },
                CustomContentWithBothMixins: {
                    name: 'CustomContentWithBothMixins',
                    extends: 'SysContent',
                    mixins: ['SysFilish', 'SysFolderish'],
                },
                CustomContentWithFilishOnly: {
                    name: 'CustomContentWithFilishOnly',
                    extends: 'SysContent',
                    mixins: ['SysFilish'],
                },
                CustomContentWithFolderishOnly: {
                    name: 'CustomContentWithFolderishOnly',
                    extends: 'SysContent',
                    mixins: ['SysFolderish'],
                },
                CustomContentWithNoMixins: {
                    name: 'CustomContentWithNoMixins',
                    extends: 'SysContent',
                },
            },
        };

        mockDocumentModel = new DocumentModel(mockModel as any);
        mockDocumentModelService.getModel.mockReturnValue(of(mockDocumentModel));

        const tempFixture = TestBed.configureTestingModule({
            imports: [TestHostComponent],
            providers: [{ provide: DocumentModelService, useValue: mockDocumentModelService }],
        }).createComponent(TestHostComponent);

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [TestHostComponent],
            providers: [
                IsViewableAsFilePipe,
                { provide: AsyncPipe, useValue: new AsyncPipe(tempFixture.componentRef.changeDetectorRef) },
                { provide: DocumentModelService, useValue: mockDocumentModelService },
            ],
        });

        fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();
        const injector = fixture.debugElement.injector;
        pipe = runInInjectionContext(injector, () => new IsViewableAsFilePipe());
        tempFixture.destroy();
    });

    it('should be viewable as file for file documents that extend SysFile', () => {
        const result = pipe.transform(fileDocument);
        expect(result).toBeTruthy();
    });

    it('should not be viewable as file for folder documents that extend SysFolder', () => {
        const result = pipe.transform(folderDocument);
        expect(result).toBeFalsy();
    });

    it('should be viewable as file for documents extending SysContent with both mixins', () => {
        const docWithBothMixinsAndBlob: Document = {
            sys_id: 'test-id',
            sys_primaryType: 'CustomContentWithBothMixins',
            sys_mixinTypes: ['SysFilish', 'SysFolderish'],
            sysfile_blob: { mimeType: 'application/pdf', size: 1000 },
        } as Document;

        const result = pipe.transform(docWithBothMixinsAndBlob);

        expect(result).toBeTruthy();
    });

    it('should be viewable as file for documents extending SysContent with SysFilish mixin only', () => {
        const docWithFilishOnly: Document = {
            sys_id: 'test-id',
            sys_primaryType: 'FilishOnly',
        } as Document;

        const result = pipe.transform(docWithFilishOnly);

        expect(result).toBeTruthy();
    });

    it('should not be viewable as file for documents extending SysContent with SysFolderish mixin only', () => {
        const docWithFolderishOnly: Document = {
            sys_id: 'test-id',
            sys_primaryType: 'CustomContentWithFolderishOnly',
        } as Document;

        const result = pipe.transform(docWithFolderishOnly);

        expect(result).toBeFalsy();
    });

    it('should default to viewable as file for documents extending SysContent with no mixins', () => {
        const docWithNoMixins: Document = {
            sys_id: 'test-id',
            sys_primaryType: 'NoMixins',
        } as Document;

        const result = pipe.transform(docWithNoMixins);

        expect(result).toBeTruthy();
    });

    it('should return false when document is null', () => {
        const result = pipe.transform(null as any);

        expect(result).toBeFalsy();
    });

    it('should return false when document is undefined', () => {
        const result = pipe.transform(undefined as any);

        expect(result).toBeFalsy();
    });

    it('should return false when document has no sys_primaryType property', () => {
        const docWithoutPrimaryType: Document = {
            sys_id: 'test-id',
        } as Document;

        const result = pipe.transform(docWithoutPrimaryType);

        expect(result).toBeFalsy();
    });

    it('should return false when document has null sys_primaryType', () => {
        const docWithNullPrimaryType: Document = {
            sys_id: 'test-id',
            sys_primaryType: null as any,
        } as Document;

        const result = pipe.transform(docWithNullPrimaryType);

        expect(result).toBeFalsy();
    });

    it('should return false when document has undefined sys_primaryType', () => {
        const docWithUndefinedPrimaryType: Document = {
            sys_id: 'test-id',
            sys_primaryType: undefined as any,
        } as Document;

        const result = pipe.transform(docWithUndefinedPrimaryType);

        expect(result).toBeFalsy();
    });

    it('should return false when document has empty string sys_primaryType', () => {
        const docWithEmptyPrimaryType: Document = {
            sys_id: 'test-id',
            sys_primaryType: '',
        } as Document;

        const result = pipe.transform(docWithEmptyPrimaryType);

        expect(result).toBeFalsy();
    });

    it('should return false when model is null', () => {
        mockDocumentModelService.getModel.mockReturnValue(of(null as any));
        // Recreate pipe to get new model$ observable with updated mock
        const injector = fixture.debugElement.injector;
        const testPipe = runInInjectionContext(injector, () => new IsViewableAsFilePipe());

        const result = testPipe.transform(fileDocument);

        expect(result).toBeFalsy();
    });

    it('should return false when model is undefined', () => {
        mockDocumentModelService.getModel.mockReturnValue(of(undefined as any));
        // Recreate pipe to get new model$ observable with updated mock
        const injector = fixture.debugElement.injector;
        const testPipe = runInInjectionContext(injector, () => new IsViewableAsFilePipe());

        const result = testPipe.transform(fileDocument);

        expect(result).toBeFalsy();
    });
});
