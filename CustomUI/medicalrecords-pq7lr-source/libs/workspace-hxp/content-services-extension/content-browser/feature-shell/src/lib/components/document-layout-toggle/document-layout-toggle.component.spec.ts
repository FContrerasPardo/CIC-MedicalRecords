/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentLayoutToggleComponent } from './document-layout-toggle.component';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { of } from 'rxjs';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { DocumentModelService } from '@alfresco/adf-hx-content-services/services';
import { provideHttpClient } from '@angular/common/http';
import { NoopTranslateModule } from '@alfresco/adf-core';

describe('DocumentLayoutToggleComponent', () => {
    let component: DocumentLayoutToggleComponent;
    let fixture: ComponentFixture<DocumentLayoutToggleComponent>;
    const mockModel = { hasMixin: jest.fn() };
    const mockDocumentModelService = { getModel: jest.fn() };

    beforeEach(async () => {
        mockModel.hasMixin.mockReturnValue(false);
        mockDocumentModelService.getModel.mockReturnValue(of(mockModel));

        await TestBed.configureTestingModule({
            imports: [DocumentLayoutToggleComponent, NoopTranslateModule],
            providers: [
                provideHttpClient(),
                {
                    provide: FeaturesServiceToken,
                    useValue: {
                        isOn$: jest.fn().mockReturnValue(of(true)),
                    },
                },
                {
                    provide: DocumentModelService,
                    useValue: mockDocumentModelService,
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(DocumentLayoutToggleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('isToggleButtonVisible', () => {
        it('should display button when document type has both SysFolderish and SysFilish mixins', () => {
            const mockDocument = {
                sys_primaryType: 'CustomType',
            } as Document;

            mockModel.hasMixin.mockImplementation((type: string, mixin: string) => {
                if (type === 'CustomType' && (mixin === 'SysFolderish' || mixin === 'SysFilish')) {
                    return true;
                }
                return false;
            });

            fixture.componentRef.setInput('isDocumentView', true);
            fixture.componentRef.setInput('actionContext', {
                documents: [mockDocument],
            });
            fixture.detectChanges();
            const button = fixture.nativeElement.querySelector('.hxp-view-toggle-button');

            expect(button).toBeTruthy();
        });

        it('should display button when parentDocument type has both mixins through inheritance', () => {
            const mockDocument = {
                sys_primaryType: 'InheritedType',
            } as Document;

            mockModel.hasMixin.mockImplementation((type: string, mixin: string) => {
                if (type === 'InheritedType' && (mixin === 'SysFolderish' || mixin === 'SysFilish')) {
                    return true;
                }
                return false;
            });

            fixture.componentRef.setInput('actionContext', {
                documents: [],
                parentDocument: mockDocument,
            });

            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('.hxp-view-toggle-button');
            expect(button).toBeTruthy();
        });

        it('should not display button when document type has only SysFolderish mixin', () => {
            const mockDocument = {
                sys_primaryType: 'FolderType',
            } as Document;

            mockModel.hasMixin.mockImplementation((type: string, mixin: string) => {
                return type === 'FolderType' && mixin === 'SysFolderish';
            });

            fixture.componentRef.setInput('isDocumentView', true);
            fixture.componentRef.setInput('actionContext', {
                documents: [mockDocument],
            });

            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('.hxp-view-toggle-button');
            expect(button).toBeFalsy();
        });

        it('should not display button when document type has only SysFilish mixin', () => {
            const mockDocument = {
                sys_primaryType: 'FileType',
            } as Document;

            mockModel.hasMixin.mockImplementation((type: string, mixin: string) => {
                return type === 'FileType' && mixin === 'SysFilish';
            });

            fixture.componentRef.setInput('isDocumentView', true);
            fixture.componentRef.setInput('actionContext', {
                documents: [mockDocument],
            });

            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('.hxp-view-toggle-button');
            expect(button).toBeFalsy();
        });

        it('should not display button when document type has neither mixin', () => {
            const mockDocument = {
                sys_primaryType: 'BasicType',
            } as Document;

            mockModel.hasMixin.mockReturnValue(false);

            fixture.componentRef.setInput('isDocumentView', true);
            fixture.componentRef.setInput('actionContext', {
                documents: [mockDocument],
            });

            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('.hxp-view-toggle-button');
            expect(button).toBeFalsy();
        });

        it('should not display button when model is not loaded', () => {
            mockDocumentModelService.getModel.mockReturnValue(of(undefined));

            fixture = TestBed.createComponent(DocumentLayoutToggleComponent);
            component = fixture.componentInstance;

            const mockDocument = {
                sys_primaryType: 'CustomType',
            } as Document;

            fixture.componentRef.setInput('isDocumentView', true);
            fixture.componentRef.setInput('actionContext', {
                documents: [mockDocument],
            });

            fixture.detectChanges();

            const button = fixture.nativeElement.querySelector('.hxp-view-toggle-button');
            expect(button).toBeFalsy();
        });
    });

    describe('onToggleDocumentView', () => {
        it('should emit toggleDocumentView event when button is clicked', async () => {
            const mockDocument = {
                sys_primaryType: 'CustomType',
            } as Document;

            mockModel.hasMixin.mockReturnValue(true);

            fixture.componentRef.setInput('isDocumentView', true);
            fixture.componentRef.setInput('actionContext', {
                documents: [mockDocument],
            });

            fixture.detectChanges();
            await fixture.whenStable();

            const button = fixture.nativeElement.querySelector('.hxp-view-toggle-button');
            expect(button).toBeTruthy();

            jest.spyOn(component.toggleDocumentView, 'emit');

            button.click();

            expect(component.toggleDocumentView.emit).toHaveBeenCalledWith(true);
        });
    });
});
