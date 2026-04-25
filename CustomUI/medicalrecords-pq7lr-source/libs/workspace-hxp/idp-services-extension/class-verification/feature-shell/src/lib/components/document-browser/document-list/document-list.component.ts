/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Subject } from 'rxjs';
import {
    Component,
    Output,
    ChangeDetectionStrategy,
    Input,
    QueryList,
    ViewChildren,
    AfterViewInit,
    DestroyRef,
    inject,
    EventEmitter,
} from '@angular/core';
import { DragPlaceholderMetadata } from '../../../services/document/idp-drag-drop.service';
import { ListItemComponent } from '../../list-item/list-item.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { DocumentData } from '../../../directives/document-list.directive';
import { DocumentComponent } from '../document/document.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IdpDocument } from '../../../models/screen-models';

@Component({
    selector: 'hyland-idp-document-list',
    templateUrl: './document-list.component.html',
    styleUrls: ['./document-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatListModule, CommonModule, DragDropModule, MatCardModule, DocumentComponent],
})
export class DocumentListComponent implements AfterViewInit {
    @Input() documents: DocumentData[] = [];
    @Input() selectedDocumentsCount = 0;
    @Input() placeholder?: DragPlaceholderMetadata;
    @Input() draggingDocuments: IdpDocument[] = [];
    @Input() dropListId = '';

    @Input() documentUniquenessFn!: (index: number, doc: DocumentData) => any;
    @Input() formatDocumentName!: (doc: DocumentData) => string;
    @Input() isElementContained!: (el: HTMLElement) => boolean;

    @Input() onItemKeyDown!: (doc: DocumentData, e: KeyboardEvent) => void;
    @Input() onContainerKeyDown!: (docs: DocumentData[], e: KeyboardEvent) => void;
    @Input() onItemMouseDown!: (doc: DocumentData, e: MouseEvent, mode: string) => void;
    @Input() onItemMouseUp!: (doc: DocumentData, e: MouseEvent) => void;
    @Input() onDoubleClick!: (doc: DocumentData) => void;
    @Input() onMouseEnter!: (doc: DocumentData) => void;
    @Input() onDragStarted!: () => void;
    @Input() onDragStopped!: () => void;
    @Input() onPageCollapseRequest!: (doc: DocumentData) => void;

    @Input() canCutPages!: boolean;

    @Output() collapseContainer = new Subject();
    @Output() pagesCut = new EventEmitter();

    @ViewChildren(DocumentComponent) childDocumentComponents!: QueryList<DocumentComponent>;

    childDocumentListItems = new QueryList<ListItemComponent>();

    private readonly destroyRef = inject(DestroyRef);

    get items(): QueryList<ListItemComponent> {
        return this.childDocumentListItems;
    }

    ngAfterViewInit(): void {
        this.refreshDocumentListItems();
        this.childDocumentComponents.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.refreshDocumentListItems();
        });
    }

    private refreshDocumentListItems(): void {
        const items: ListItemComponent[] = this.childDocumentComponents
            .map((child) => child.documentListItem)
            .filter((li): li is ListItemComponent => !!li);

        this.childDocumentListItems.reset(items);
        this.childDocumentListItems.notifyOnChanges();
    }

    onPagesCut() {
        this.pagesCut.emit();
    }

    openContextMenuForDocument(documentId: string) {
        const documentComponent = this.childDocumentComponents.find((component) => component.document.id === documentId);
        if (documentComponent) {
            documentComponent.openContextMenu();
        }
    }
}
