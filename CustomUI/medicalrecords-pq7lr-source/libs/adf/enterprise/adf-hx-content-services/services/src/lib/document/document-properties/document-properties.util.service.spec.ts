/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { DecimalNumberPipe, LocalizedDatePipe, FileSizePipe, CardViewItem, CardViewSelectItemOption, NoopTranslateModule } from '@alfresco/adf-core';
import { AsyncPipe } from '@angular/common';
import { PropertyUtilService } from './document-properties.util.service';
import { FieldType } from '@alfresco/adf-hx-content-services/api';
import { MockProvider } from 'ng-mocks';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { firstValueFrom, of, throwError } from 'rxjs';
import { DocumentModel } from '../document-model/document-model.model';
import { UserResolverPipe } from '../../pipes/user-resolver.pipe';
import { DocumentService } from '../document.service';

describe('PropertyUtilService', () => {
    let service: PropertyUtilService;
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [
                PropertyUtilService,
                MockProvider(DecimalNumberPipe),
                MockProvider(UserResolverPipe),
                MockProvider(AsyncPipe),
                MockProvider(LocalizedDatePipe),
                MockProvider(FileSizePipe),
                {
                    provide: DocumentService,
                    useValue: {
                        getDocumentById: jasmine.createSpy().and.returnValue(of(jestMocks.fileDocument)),
                    },
                },
            ],
        });

        service = TestBed.inject(PropertyUtilService);
    });

    it('should create CardViewItem for Boolean type', () => {
        const property = 'sysver_isCheckedIn';
        const document: Document = jestMocks.fileDocument;
        const model: any = {
            getFieldType: (prop: string) => {
                if (prop === property) {
                    return FieldType.Boolean;
                }
                return undefined;
            },
            isMultivaluedType: () => false,
            getFieldConstraints: () => undefined,
        };

        const cardItem = service.createCardItemUtil(property, model, document);

        expect(cardItem).toBeDefined();
        expect(cardItem).toHaveLength(1);
        expect((cardItem[0] as CardViewItem).key).toBe(property);
    });

    it('should return property type from a model', () => {
        const model: any = {
            getFieldType: jasmine.createSpy('getFieldType').and.returnValue(FieldType.String),
            getFieldConstraints: () => undefined,
        };
        const property = 'sys_title';

        const result = service.propertyType(model, property);

        expect(result).toBe(FieldType.String);
        expect(model.getFieldType).toHaveBeenCalledWith(property);
    });

    describe('availableDocumentCategories', () => {
        it('should return empty array when model is undefined', async () => {
            const results = await firstValueFrom<CardViewSelectItemOption<string>[]>(
                (service as any).availableDocumentCategories(undefined, jestMocks.fileDocument)
            );
            expect(results).toEqual([]);
        });

        it('should return filish subTypes without API call for a file document', async () => {
            const mockSubTypes = ['type1', 'type2'];
            const mockModel: Partial<DocumentModel> = {
                getFilishTypes: jasmine.createSpy().and.returnValue(mockSubTypes),
                getFolderishTypes: jasmine.createSpy().and.returnValue([]),
            };
            const getDocumentByIdSpy = TestBed.inject(DocumentService).getDocumentById as jasmine.Spy;

            const results = await firstValueFrom<CardViewSelectItemOption<string>[]>(
                (service as any).availableDocumentCategories(mockModel as DocumentModel, jestMocks.fileDocument)
            );

            expect(mockModel.getFilishTypes).toHaveBeenCalled();
            expect(getDocumentByIdSpy).not.toHaveBeenCalled();
            expect(results).toEqual([
                { label: 'type1', key: 'type1' },
                { label: 'type2', key: 'type2' },
            ]);
        });

        it('should return folderish subTypes without API call for a folder document', async () => {
            const mockSubTypes = ['folderType1', 'folderType2'];
            const mockModel: Partial<DocumentModel> = {
                getFilishTypes: jasmine.createSpy().and.returnValue([]),
                getFolderishTypes: jasmine.createSpy().and.returnValue(mockSubTypes),
            };
            const getDocumentByIdSpy = TestBed.inject(DocumentService).getDocumentById as jasmine.Spy;

            const results = await firstValueFrom<CardViewSelectItemOption<string>[]>(
                (service as any).availableDocumentCategories(mockModel as DocumentModel, jestMocks.folderDocument)
            );

            expect(mockModel.getFolderishTypes).toHaveBeenCalled();
            expect(getDocumentByIdSpy).not.toHaveBeenCalled();
            expect(results).toEqual([
                { label: 'folderType1', key: 'folderType1' },
                { label: 'folderType2', key: 'folderType2' },
            ]);
        });

        it('should fall back to API call and return parent sys_primaryType when subTypes is empty', async () => {
            const parentDocument = { ...jestMocks.folderDocument, sys_primaryType: 'sysFolder' };
            const getDocumentByIdSpy = TestBed.inject(DocumentService).getDocumentById as jasmine.Spy;
            getDocumentByIdSpy.and.returnValue(of(parentDocument));

            const mockModel: Partial<DocumentModel> = {
                getFilishTypes: jasmine.createSpy().and.returnValue([]),
                getFolderishTypes: jasmine.createSpy().and.returnValue([]),
            };

            const results = await firstValueFrom<CardViewSelectItemOption<string>[]>(
                (service as any).availableDocumentCategories(mockModel as DocumentModel, jestMocks.fileDocument)
            );

            expect(getDocumentByIdSpy).toHaveBeenCalled();
            expect(results).toEqual([{ label: 'sysFolder', key: 'sysFolder' }]);
        });

        it('should fall back to ROOT_DOCUMENT when parent fetch returns 403', async () => {
            const getDocumentByIdSpy = TestBed.inject(DocumentService).getDocumentById as jasmine.Spy;
            getDocumentByIdSpy.and.returnValue(throwError(() => ({ response: { status: 403 } })));

            const mockModel: Partial<DocumentModel> = {
                getFilishTypes: jasmine.createSpy().and.returnValue([]),
                getFolderishTypes: jasmine.createSpy().and.returnValue([]),
            };

            const results = await firstValueFrom<CardViewSelectItemOption<string>[]>(
                (service as any).availableDocumentCategories(mockModel as DocumentModel, jestMocks.fileDocument)
            );

            expect(getDocumentByIdSpy).toHaveBeenCalled();
            expect(results.length).toBe(1);
            expect(results[0].key).toBeDefined();
        });
    });
});
