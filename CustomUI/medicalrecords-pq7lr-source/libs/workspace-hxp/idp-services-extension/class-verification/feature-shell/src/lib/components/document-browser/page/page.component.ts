/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, ViewChild, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListItemComponent } from '../../list-item/list-item.component';
import { IdpDocumentPage } from '../../../models/screen-models';
import { MatIconModule } from '@angular/material/icon';
import { DragPlaceholderMetadata } from '../../../services/document/idp-drag-drop.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatBadgeModule } from '@angular/material/badge';
import { PageContextMenuComponent } from '../page-context-menu/page-context-menu.component';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { IFeaturesService, FeaturesServiceToken, FeaturesDirective } from '@alfresco/adf-core/feature-flags';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface PageMouseEvent {
    page: IdpDocumentPage;
    event: MouseEvent;
}

export interface PageKeyboardEvent {
    page: IdpDocumentPage;
    event: KeyboardEvent;
}

export interface PagesInsertEvent {
    documentId: string;
    pageId: string;
}

@Component({
    selector: 'hyland-idp-page',
    templateUrl: './page.component.html',
    styleUrls: ['./page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'idp-list-item-page-host' },
    imports: [CommonModule, FeaturesDirective, DragDropModule, MatBadgeModule, MatIconModule, ListItemComponent, PageContextMenuComponent],
})
export class PageComponent {
    @Input() page!: IdpDocumentPage;
    @Input() pageIndex!: number;
    @Input() isIssue = false;
    @Input() canCutPages = false;
    @Input() canInsertPages = false;

    @Output() pageMouseDown = new EventEmitter<PageMouseEvent>();
    @Output() pageMouseUp = new EventEmitter<PageMouseEvent>();
    @Output() pageKeyDown = new EventEmitter<PageKeyboardEvent>();
    @Output() pageMouseDoubleClick = new EventEmitter();
    @Output() pagesCut = new EventEmitter();
    @Output() pagesInsertedAbove = new EventEmitter<PagesInsertEvent>();
    @Output() pagesInsertedBelow = new EventEmitter<PagesInsertEvent>();

    // drag&drop
    @Input() dragPlaceholderMetadata?: DragPlaceholderMetadata;
    @Input() draggingPages: IdpDocumentPage[] = [];
    @Output() pageMouseEnter = new EventEmitter<IdpDocumentPage>();
    @Output() pageDragStarted = new EventEmitter();
    @Output() pageDragStopped = new EventEmitter();

    @ViewChild(ListItemComponent) pageListItem!: ListItemComponent;

    @ViewChild('pageContextMenu')
    readonly pageContextMenu?: PageContextMenuComponent;

    idpCutInsertFeature = WORKSPACE_IDP_HXP.CLASS_VERIFICATION_CUT_INSERT;
    isCutInsertFeatureOn = false;

    frozenCanInsertPages = false;

    private readonly featureService = inject<IFeaturesService>(FeaturesServiceToken);

    constructor() {
        this.featureService
            .isOn$(this.idpCutInsertFeature)
            .pipe(takeUntilDestroyed())
            .subscribe((isCutInsertFeatureOn) => (this.isCutInsertFeatureOn = isCutInsertFeatureOn));
    }

    onContextMenu(event: MouseEvent): void {
        if (!this.isCutInsertFeatureOn) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.pageContextMenu?.openContextMenuAt(event.clientX, event.clientY);
    }

    openContextMenu(): void {
        if (!this.isCutInsertFeatureOn) {
            return;
        }

        this.pageContextMenu?.openContextMenu();
    }

    onPageContextMenuOpened(): void {
        this.frozenCanInsertPages = this.canInsertPages;
    }

    onPageContextMenuClosed(): void {
        this.pageListItem.focus();
    }

    onItemMouseEnter() {
        this.pageMouseEnter.emit(this.page);
    }

    onItemMouseDown(event: MouseEvent) {
        this.pageMouseDown.emit({ page: this.page, event });
    }

    onItemMouseUp(event: MouseEvent) {
        this.pageMouseUp.emit({ page: this.page, event });
    }

    onItemKeyDown(event: KeyboardEvent): void {
        this.pageKeyDown.emit({ page: this.page, event });
    }

    onDoubleClick(): void {
        this.pageMouseDoubleClick.emit();
    }

    onDragStarted() {
        this.pageDragStarted.emit();
    }

    onDragStopped() {
        this.pageDragStopped.emit();
    }

    onPagesCut() {
        this.pagesCut.emit();
    }

    onPagesInsertAbove() {
        this.pagesInsertedAbove.emit({ documentId: this.page.documentId, pageId: this.page.id });
    }

    onPagesInsertBelow() {
        this.pagesInsertedBelow.emit({ documentId: this.page.documentId, pageId: this.page.id });
    }
}
