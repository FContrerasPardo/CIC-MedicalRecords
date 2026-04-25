/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { fakeAsync, flush, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DocumentComponent } from './document.component';
import { DocumentData } from '../../../directives/document-list.directive';
import { FeaturesDirective, provideMockFeatureFlags } from '@alfresco/adf-core/feature-flags';
import { ListItemComponent } from '../../list-item/list-item.component';
import { createMockDocument } from '../../../models/mocked/mocked-documents';
import { IdpConfigClass } from '../../../models/screen-models';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { PageContextMenuComponent } from '../page-context-menu/page-context-menu.component';
import { PageListComponent } from '../page-list/page-list.component';
import { FloorPercentPipe } from '../../../pipes/floor-percent.pipe';
import { MockBuilder, MockedComponentFixture, MockRender } from 'ng-mocks';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('DocumentComponent', () => {
    let host: any;
    let component: DocumentComponent;
    let fixture: MockedComponentFixture<DocumentComponent, any>;

    const defaultClass: IdpConfigClass = {
        id: 'class-1',
        name: 'Class 1',
        isSpecialClass: false,
        reviewThreshold: 0.8,
        classAssignmentThreshold: 0.5,
    };

    const toDocumentData = (doc: ReturnType<typeof createMockDocument>, overrides: Partial<DocumentData> = {}): DocumentData => ({
        ...doc,
        allPagesSelected: true,
        ...overrides,
    });

    beforeEach(() => {
        return MockBuilder(DocumentComponent)
            .keep(DocumentComponent)
            .keep(NoopAnimationsModule)
            .keep(CommonModule)
            .keep(FeaturesDirective)
            .keep(FloorPercentPipe)
            .keep(SatIconModule)
            .mock(PageContextMenuComponent)
            .mock(PageListComponent)
            .mock(MatIconTestingModule)
            .provide(
                provideMockFeatureFlags({
                    [WORKSPACE_IDP_HXP.CLASSIFICATION_SETTINGS]: true,
                    [WORKSPACE_IDP_HXP.CLASS_VERIFICATION_CUT_INSERT]: true,
                })
            );
    });

    beforeEach(() => {
        const params = {
            document: toDocumentData(
                createMockDocument('doc-1', 1, {
                    class: defaultClass,
                    classificationConfidence: 0.9,
                    isSelected: true,
                }),
                { name: 'Document 1' }
            ),
            documentIndex: 0,
            canCutPages: true,
            formatDocumentName: (doc: DocumentData) => `Formatted ${doc.name}`,
            isElementContained: () => true,
            onItemKeyDown: () => undefined,
            onItemMouseDown: () => undefined,
            onItemMouseUp: () => undefined,
            onDoubleClick: () => undefined,
            onPageCollapseRequest: () => undefined,
        };

        fixture = MockRender(DocumentComponent, params);
        host = fixture.componentInstance;
        component = fixture.point.componentInstance;
        component.isCutInsertFeatureOn = true;
    });

    it('should render formatted document name and page count', () => {
        const nameElement = fixture.debugElement.query(By.css('[data-automation-id="idp-document-name"]')).nativeElement as HTMLElement;
        const pageInfo = fixture.debugElement.query(By.css('.idp-right-align')).nativeElement as HTMLElement;

        expect(nameElement.textContent?.trim()).toBe('Formatted Document 1');
        expect(pageInfo.textContent?.trim()).toBe('1 page');
    });

    it('should show classification tag with formatted percentage', () => {
        host.document = toDocumentData(createMockDocument('doc', 1, { class: defaultClass, classificationConfidence: 0.8 }));
        fixture.detectChanges();

        const tag = fixture.debugElement.query(By.css('[data-automation-id="idp-classification-confidence-tag"]')).nativeElement as HTMLElement;
        expect(tag.textContent?.trim()).toBe('80%');
    });

    it('should hide classification tag when confidence is zero', () => {
        host.document = toDocumentData(
            createMockDocument('doc-zero', 1, {
                class: defaultClass,
                classificationConfidence: 0,
            })
        );
        fixture.detectChanges();

        const tag = fixture.debugElement.query(By.css('[data-automation-id="idp-classification-confidence-tag"]'));
        expect(tag).toBeNull();
    });

    it('should emit pagesCut when context menu emits event', fakeAsync(() => {
        fixture.detectChanges();

        const spy = jasmine.createSpy('pagesCut');
        component.pagesCut.subscribe(spy);

        const pageContextMenuInstance = fixture.debugElement.query(By.directive(PageContextMenuComponent))
            .componentInstance as PageContextMenuComponent;
        pageContextMenuInstance.pagesCut.emit();

        tick();

        expect(spy).toHaveBeenCalled();
    }));

    it('should emit documentMouseEnter on mouseenter', fakeAsync(() => {
        const spy = jasmine.createSpy('documentMouseEnter');
        component.documentMouseEnter.subscribe(spy);
        fixture.detectChanges();

        const item = fixture.debugElement.query(By.css('[data-automation-id="idp-list-item-document__0"]')).nativeElement as HTMLElement;
        item.dispatchEvent(new MouseEvent('mouseenter'));

        tick();

        expect(spy).toHaveBeenCalledWith(component.document);
    }));

    it('should focus list item when context menu closes', () => {
        fixture.detectChanges();

        const listItem = fixture.debugElement.query(By.directive(ListItemComponent)).componentInstance as ListItemComponent;
        const focusSpy = spyOn(listItem, 'focus');

        component.onPageContextMenuClosed();

        expect(focusSpy).toHaveBeenCalled();
    });

    it('should emit drag started/stopped events', fakeAsync(() => {
        const startSpy = jasmine.createSpy('dragStart');
        const stopSpy = jasmine.createSpy('dragStop');
        component.documentDragStarted.subscribe(startSpy);
        component.documentDragStopped.subscribe(stopSpy);

        component.onDragStarted();
        component.onDragStopped();

        flush();

        expect(startSpy).toHaveBeenCalled();
        expect(stopSpy).toHaveBeenCalled();
    }));

    it('should open context menu on contextmenu mouse event at specific coordinates', () => {
        host.canCutPages = true;

        const pageContextMenu = fixture.debugElement.query(By.directive(PageContextMenuComponent)).componentInstance as PageContextMenuComponent;
        const pageContextMenuOpenSpy = spyOn(pageContextMenu, 'openContextMenuAt');

        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 10 });
        spyOn(event, 'preventDefault');
        spyOn(event, 'stopPropagation');

        component.onContextMenu(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(pageContextMenuOpenSpy).toHaveBeenCalledOnceWith(100, 10);
    });

    it('should open context menu for document when document has exactly 1 page and is not expanded', () => {
        host.canCutPages = true;

        host.document = toDocumentData(
            createMockDocument('doc-single-page', 1, {
                class: defaultClass,
                classificationConfidence: 0.9,
                isSelected: true,
                isExpanded: false,
            }),
            { name: 'Single Page Document' }
        );

        fixture.detectChanges();

        const pageContextMenu = fixture.debugElement.query(By.directive(PageContextMenuComponent)).componentInstance as PageContextMenuComponent;
        const pageContextMenuOpenSpy = spyOn(pageContextMenu, 'openContextMenu');

        component.openContextMenu();

        expect(pageContextMenuOpenSpy).toHaveBeenCalled();
    });

    it('should open context menu for document when document has more than 1 page', () => {
        host.canCutPages = true;

        host.document = toDocumentData(
            createMockDocument('doc-multi-page', 2, {
                class: defaultClass,
                classificationConfidence: 0.9,
                isSelected: true,
                isExpanded: true,
            }),
            { name: 'Multi Page Document' }
        );

        fixture.detectChanges();

        const pageContextMenu = fixture.debugElement.query(By.directive(PageContextMenuComponent)).componentInstance as PageContextMenuComponent;
        const pageContextMenuOpenSpy = spyOn(pageContextMenu, 'openContextMenu');

        component.openContextMenu();

        expect(pageContextMenuOpenSpy).toHaveBeenCalled();
    });

    it('should open context menu for first page when document has exactly 1 page and is expanded', () => {
        host.canCutPages = true;

        host.document = toDocumentData(
            createMockDocument('doc-single-page', 1, {
                class: defaultClass,
                classificationConfidence: 0.9,
                isSelected: true,
                isExpanded: true,
            }),
            { name: 'Single Page Document' }
        );

        fixture.detectChanges();

        const pageListComponent = fixture.debugElement.query(By.directive(PageListComponent)).componentInstance as PageListComponent;
        expect(pageListComponent).toBeDefined();
        const pageListOpenSpy = spyOn(pageListComponent, 'openContextMenuForFirstPage');

        const pageContextMenu = fixture.debugElement.query(By.directive(PageContextMenuComponent)).componentInstance as PageContextMenuComponent;
        const pageContextMenuOpenSpy = spyOn(pageContextMenu, 'openContextMenu');

        component.openContextMenu();

        expect(pageListOpenSpy).toHaveBeenCalled();
        expect(pageContextMenuOpenSpy).not.toHaveBeenCalled();
    });

    it('should emit documentMouseEnter', fakeAsync(() => {
        const spy = jasmine.createSpy('documentMouseEnter');
        component.documentMouseEnter.subscribe(spy);

        component.onMouseEnter(component.document);

        tick();

        expect(spy).toHaveBeenCalledWith(component.document);
    }));

    it('should emit pagesCut through method call', fakeAsync(() => {
        const spy = jasmine.createSpy('pagesCut');
        component.pagesCut.subscribe(spy);

        component.onPagesCut();

        tick();

        expect(spy).toHaveBeenCalled();
    }));

    it('should compute classification colors for each threshold', () => {
        const highDoc = toDocumentData(createMockDocument('doc-high', 1, { class: defaultClass, classificationConfidence: 0.95 }));
        const mediumDoc = toDocumentData(createMockDocument('doc-medium', 1, { class: defaultClass, classificationConfidence: 0.65 }));
        const lowDoc = toDocumentData(createMockDocument('doc-low', 1, { class: defaultClass, classificationConfidence: 0.2 }));
        const missingDoc = toDocumentData(createMockDocument('doc-missing', 1, { classificationConfidence: 0.5 }), {
            class: undefined,
            classificationConfidence: undefined,
        });

        expect(component.getClassificationConfidenceTagColor(highDoc)).toBe('green');
        expect(component.getClassificationConfidenceTagColor(mediumDoc)).toBe('yellow');
        expect(component.getClassificationConfidenceTagColor(lowDoc)).toBe('red');
        expect(component.getClassificationConfidenceTagColor(missingDoc)).toBe('');
    });
});
