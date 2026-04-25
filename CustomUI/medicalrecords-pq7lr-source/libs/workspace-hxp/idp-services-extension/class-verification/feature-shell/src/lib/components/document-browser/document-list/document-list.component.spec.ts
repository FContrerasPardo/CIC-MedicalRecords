/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentListComponent } from './document-list.component';
import { mockIdpDocuments } from '../../../models/mocked/mocked-documents';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { By } from '@angular/platform-browser';
import { DocumentData } from '../../../directives/document-list.directive';
import { provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('DocumentListComponent', () => {
    let component: DocumentListComponent;
    let fixture: ComponentFixture<DocumentListComponent>;

    beforeEach(() => {
        const mockedDocuments = mockIdpDocuments();
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, DocumentListComponent, MatIconTestingModule],
            providers: [
                provideMockFeatureFlags({
                    [WORKSPACE_IDP_HXP.CLASSIFICATION_SETTINGS]: true,
                    [WORKSPACE_IDP_HXP.CLASS_VERIFICATION_CUT_INSERT]: true,
                }),
            ],
        });

        fixture = TestBed.createComponent(DocumentListComponent);
        component = fixture.componentInstance;

        component.documents = [
            { ...mockedDocuments[0], allPagesSelected: true },
            { ...mockedDocuments[1], allPagesSelected: false },
            { ...mockedDocuments[2], allPagesSelected: true },
        ];

        component.documentUniquenessFn = (_index, doc) => doc.id;
        component.formatDocumentName = (doc) => doc.id;
        component.isElementContained = () => true;
        component.onItemKeyDown = () => {};
        component.onContainerKeyDown = () => {};
        component.onItemMouseDown = () => {};
        component.onItemMouseUp = () => {};
        component.onDoubleClick = () => {};
        component.onMouseEnter = () => {};
        component.onDragStarted = () => {};
        component.onDragStopped = () => {};
        component.onPageCollapseRequest = () => {};
    });

    it('should call onContainerKeyDown', () => {
        component.formatDocumentName = (doc) => doc.id;
        const onContainerKeyDownSpy = jasmine.createSpy('onContainerKeyDown');
        component.onContainerKeyDown = onContainerKeyDownSpy;
        fixture.detectChanges();
        const element = fixture.debugElement.nativeElement.querySelector('.idp-document-list') as HTMLElement;

        const ev = new KeyboardEvent('keydown', { key: 'enter' });
        element.dispatchEvent(ev);
        fixture.detectChanges();

        expect(onContainerKeyDownSpy).toHaveBeenCalledWith(component.documents, ev);
    });

    it('should render documents correctly', () => {
        component.formatDocumentName = (doc) => doc.id;
        fixture.detectChanges();

        const elements = fixture.debugElement.queryAll(By.css('.idp-list-item-document'));

        fixture.detectChanges();

        expect(elements.length).toBe(component.documents.length);
    });

    it('should call onItemKeyDown', () => {
        component.formatDocumentName = (doc) => doc.id;
        const onItemKeyDownSpy = jasmine.createSpy('onItemKeyDown');
        component.onItemKeyDown = onItemKeyDownSpy;
        fixture.detectChanges();

        const element = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-document__0"]') as HTMLElement;

        const ev = new KeyboardEvent('keydown', { key: 'enter' });
        element.dispatchEvent(ev);
        fixture.detectChanges();

        expect(onItemKeyDownSpy).toHaveBeenCalledWith(component.documents[0], ev);
    });

    it('should call onMouseEnter', () => {
        component.formatDocumentName = (doc) => doc.id;
        const onMouseEnterSpy = jasmine.createSpy('onMouseEnter');
        component.onMouseEnter = onMouseEnterSpy;

        fixture.detectChanges();

        const element = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-document__0"]') as HTMLElement;

        const ev = new MouseEvent('mouseenter');
        element.dispatchEvent(ev);
        fixture.detectChanges();

        expect(onMouseEnterSpy).toHaveBeenCalledWith(component.documents[0]);
    });

    it('should call onItemMouseDown to select document', () => {
        component.formatDocumentName = (doc) => doc.id;
        const onItemMouseDownSpy = jasmine.createSpy('onItemMouseDown');
        component.onItemMouseDown = onItemMouseDownSpy;

        fixture.detectChanges();

        const element = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-document__0"]') as HTMLElement;

        const ev = new MouseEvent('mousedown');
        element.dispatchEvent(ev);
        fixture.detectChanges();

        expect(onItemMouseDownSpy).toHaveBeenCalledWith(component.documents[0], ev, 'select');
    });

    it('should call onItemMouseUp', () => {
        component.formatDocumentName = (doc) => doc.id;
        const onItemMouseUpSpy = jasmine.createSpy('onItemMouseUp');
        component.onItemMouseUp = onItemMouseUpSpy;

        fixture.detectChanges();

        const element = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-document__0"]') as HTMLElement;

        const ev = new MouseEvent('mouseup');
        element.dispatchEvent(ev);
        fixture.detectChanges();

        expect(onItemMouseUpSpy).toHaveBeenCalledWith(component.documents[0], ev);
    });

    it('should call onDoubleClick', () => {
        component.formatDocumentName = (doc) => doc.id;
        const onDoubleClickSpy = jasmine.createSpy('onDoubleClick');
        component.onDoubleClick = onDoubleClickSpy;

        fixture.detectChanges();

        const element = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-document__0"]') as HTMLElement;

        const ev = new MouseEvent('dblclick');
        element.dispatchEvent(ev);
        fixture.detectChanges();

        expect(onDoubleClickSpy).toHaveBeenCalledWith(component.documents[0]);
    });

    it('should display correct document name', () => {
        const formatDocumentNameSpy = jasmine.createSpy('formatDocumentName').and.callFake((doc: DocumentData) => doc.name + doc.id);
        component.formatDocumentName = formatDocumentNameSpy;

        fixture.detectChanges();

        const parentElement = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-document__0"]') as HTMLElement;
        const element = parentElement.querySelector('.idp-display-name');

        expect(element?.textContent?.trim()).toBe(component.documents[0].name + component.documents[0].id);
        expect(formatDocumentNameSpy).toHaveBeenCalledTimes(component.documents.length);
    });

    it('should display confidence tag with correct value', () => {
        component.documents = [
            {
                ...mockIdpDocuments()[2],
                classificationConfidence: 0.9,
                allPagesSelected: true,
            },
        ];
        const formatDocumentNameSpy = jasmine.createSpy('formatDocumentName').and.callFake((doc: DocumentData) => doc.name + doc.id);
        component.formatDocumentName = formatDocumentNameSpy;

        fixture.detectChanges();
        const parentElement = fixture.debugElement.nativeElement.querySelector('[data-automation-id="idp-list-item-document__0"]') as HTMLElement;
        const confidenceTag = parentElement.querySelector('.idp-classification-confidence-tag');

        expect(confidenceTag?.innerHTML.trim()).toBe('90%');
    });

    it('should call onItemMouseDown to toggle a document', () => {
        component.formatDocumentName = (doc) => doc.id;
        const onItemMouseDownSpy = jasmine.createSpy('onItemMouseDown');
        component.onItemMouseDown = onItemMouseDownSpy;

        fixture.detectChanges();

        const element = fixture.debugElement.nativeElement.querySelector(
            '[data-automation-id="idp-list-item-document__0"] .idp-list-item-toggle-button'
        ) as HTMLElement;

        const ev = new MouseEvent('mousedown');
        element.dispatchEvent(ev);
        fixture.detectChanges();

        expect(onItemMouseDownSpy).toHaveBeenCalledWith(component.documents[0], ev, 'toggle');
    });

    it('should populate child document list items after view init', () => {
        fixture.detectChanges();

        expect(component.items.length).toBe(component.documents.length);
    });

    it('should refresh list items when child documents change', () => {
        fixture.detectChanges();
        expect(component.items.length).toBe(component.documents.length);

        const updatedChildren = component.childDocumentComponents.toArray().slice(0, 1);
        component.childDocumentComponents.reset(updatedChildren);
        component.childDocumentComponents.notifyOnChanges();

        expect(component.items.length).toBe(1);
    });

    it('should emit pagesCut when onPagesCut is invoked', () => {
        const componentPagesCutSpy = jasmine.createSpy('pagesCut');
        component.pagesCut.subscribe(componentPagesCutSpy);

        component.onPagesCut();

        expect(componentPagesCutSpy).toHaveBeenCalled();
    });

    it('should open context menu for matching document', () => {
        fixture.detectChanges();
        const firstChild = component.childDocumentComponents.first;
        spyOn(firstChild, 'openContextMenu');

        component.openContextMenuForDocument(firstChild.document.id);

        expect(firstChild.openContextMenu).toHaveBeenCalled();
    });

    it('should do nothing when context menu target document is missing', () => {
        fixture.detectChanges();
        const firstChild = component.childDocumentComponents.first;
        const firstChildOpenContextMenuSpy = spyOn(firstChild, 'openContextMenu');

        component.openContextMenuForDocument('missing-document-id');

        expect(firstChildOpenContextMenuSpy).not.toHaveBeenCalled();
    });
});
