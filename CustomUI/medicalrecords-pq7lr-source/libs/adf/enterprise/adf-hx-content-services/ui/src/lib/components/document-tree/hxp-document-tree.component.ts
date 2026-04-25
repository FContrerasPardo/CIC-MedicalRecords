/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    AfterContentChecked,
    ChangeDetectorRef,
    Component,
    ContentChild,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { from, of } from 'rxjs';
import { catchError, filter, finalize, switchMap } from 'rxjs/operators';
import {
    ContextActionConfiguration,
    ContextMenuActionsService,
    DEFAULT_ITEMS_PER_PAGE,
    DocumentService,
    DocumentTreeDatabaseService,
    DocumentTreeNode,
    HXP_DOCUMENT_INFO_ACTION_SERVICE,
    HXP_DOCUMENT_SINGLE_ITEM_DOWNLOAD_ACTION_SERVICE,
    isFolder,
    isRoot,
} from '@alfresco/adf-hx-content-services/services';
import { TranslatePipe } from '@ngx-translate/core';
import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTreeModule } from '@angular/material/tree';
import { FolderIconComponent } from '@alfresco/adf-hx-content-services/icons';
import { NgIf, NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TreeSkeletonLoaderComponent } from '../skeleton-loader/tree-skeleton-loader/tree-skeleton-loader.component';
import { SingleItemDownloadButtonActionService } from '../actions/single-item-download-button/single-item-download-button-action.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreadcrumbLabelPipe } from '../../pipes/breadcrumb-label.pipe';

/**
 * Component that displays a tree of documents.
 *
 * To use the `HxpDocumentTreeComponent`, you need first to import the component in your module
 *
 * ```ts
 * import { HxpDocumentTreeComponent } from '@alfresco/adf-hx-content-services/ui';
 * @NgModule({
 *    imports: [
 *       HxpDocumentTreeComponent,
 *      ...
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Then use it in your Angular template as shown in the example below:
 *
 * @example
 * <hxp-document-tree></hxp-document-tree>
 *
 */
@Component({
    selector: 'hxp-document-tree',
    templateUrl: './hxp-document-tree.component.html',
    styleUrls: ['./hxp-document-tree.component.scss'],
    providers: [
        /*  We're hiding info action since it's based on a selection mechanism that's
        non-existing in the document tree
        */
        {
            provide: HXP_DOCUMENT_INFO_ACTION_SERVICE,
            useValue: {
                isAvailable: () => false,
                execute: () => {},
            },
        },
        {
            provide: HXP_DOCUMENT_SINGLE_ITEM_DOWNLOAD_ACTION_SERVICE,
            useClass: SingleItemDownloadButtonActionService,
        },
        ContextMenuActionsService,
        DocumentTreeDatabaseService,
    ],
    imports: [
        NgIf,
        NgTemplateOutlet,
        FolderIconComponent,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        MatTreeModule,
        TranslatePipe,
        MatSnackBarModule,
        TreeSkeletonLoaderComponent,
        BreadcrumbLabelPipe,
    ],
})
export class HxpDocumentTreeComponent implements OnChanges, OnInit, AfterContentChecked {
    private destroyRef = inject(DestroyRef);
    private readonly documentService = inject(DocumentService);
    private readonly contextMenuActionsService = inject(ContextMenuActionsService);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);
    public readonly dataSource = inject(DocumentTreeDatabaseService);

    /**
     * The root document of the tree.
     */
    @Input()
    rootDocument = ROOT_DOCUMENT;

    /**
     * The list of selected documents in the tree.
     */
    @Input()
    documents: Document[] = [];

    /**
     * If true, the tree allows multiple document selection.
     */
    @Input()
    multiSelection = false;

    /**
     * Emits the document that has been selected or unselected.
     */
    @Output()
    selectedDocument = new EventEmitter<Document>();

    @ContentChild('contextActionMenu', { static: false })
    protected contextActionMenuTemplateRef: TemplateRef<any> | null = null;

    @ViewChild('trigger', { static: false }) protected menuTrigger?: MatMenuTrigger;
    @ViewChild('hiddenTrigger', { static: false }) protected hiddenTrigger!: MatMenuTrigger;

    protected readonly DEFAULT_ITEMS_PER_PAGE = DEFAULT_ITEMS_PER_PAGE;

    protected selection = new SelectionModel<Document>(true, [], true, (doc1, doc2) => doc1?.sys_id === doc2?.sys_id);
    protected treeControl = this.dataSource.treeControl;
    protected contextMenuPosition = { x: '0px', y: '0px' };
    protected contextActions: ContextActionConfiguration[] = [];
    protected isInitialTreeLoad = false;
    protected contextMenuOpenedDocument: Document | null = null;

    ngOnInit(): void {
        this.loadInitialData();
        this.destroyRef.onDestroy(() => {
            this.dataSource.disconnect();
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['documents'] && this.documents) {
            this.selection.clear();

            for (const doc of this.documents) {
                this.selection.toggle(doc);
            }
            this.loadSelectedDocumentsAncestors(this.documents);
        }
    }

    ngAfterContentChecked() {
        this.changeDetectorRef.detectChanges();
    }

    protected onContextMenu(event: MouseEvent, document: Document) {
        if (this.multiSelection || !this.contextActionMenuTemplateRef) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.contextMenuPosition.x = event.clientX + 'px';
        this.contextMenuPosition.y = event.clientY + 'px';
        const targetHtmlElement = event.target as HTMLElement;

        if (targetHtmlElement.tagName !== 'BUTTON' && targetHtmlElement.tagName !== 'MAT-ICON') {
            const node = targetHtmlElement.closest('mat-tree-node');
            const trigger = node?.querySelector('.hxp-menu-trigger');

            this.contextActions = this.getContextActions(document);
            if (this.contextActions.some((action) => action.model?.visible)) {
                this.contextMenuOpenedDocument = document;
                trigger?.dispatchEvent(new MouseEvent('click'));
            }
        }
    }

    protected openContextMenu(_: Event, document: Document) {
        if (this.contextActionMenuTemplateRef && !this.multiSelection) {
            this.contextActions = this.getContextActions(document);
            this.contextMenuOpenedDocument = document;
        }
    }

    protected onContextMenuClosed() {
        this.contextMenuOpenedDocument = null;
    }

    protected hasVisibleActions(document: Document): boolean {
        const contextActions = this.getContextActions(document);

        return contextActions.some((action) => action.model?.visible);
    }

    protected hasChild = (_: number, _nodeData: DocumentTreeNode) => _nodeData.isExpandable;

    protected onDocumentSelected(document: Document, e?: MouseEvent): void {
        if (this.multiSelection && isRoot(document)) {
            return;
        }
        // To prevent selecting the same document multiple times
        if (!this.multiSelection && this.documents?.length === 1 && this.documents[0]?.sys_id === document.sys_id) {
            return;
        }
        if (!this.multiSelection) {
            this.selection.clear();
        }
        this.selection.toggle(document);
        this.documents = [...this.selection.selected];

        this.selectedDocument.emit(document);
        if (e?.target) {
            this.scrollTreeNodeIntoView(e);
        }
    }

    protected isDocumentExpandable(document: Document): boolean {
        return isRoot(document) || isFolder(document);
    }

    protected onNodeExpand(event: MouseEvent) {
        this.scrollTreeNodeIntoView(event);
        event.preventDefault();
        event.stopPropagation();
    }

    private loadInitialData() {
        this.isInitialTreeLoad = true;
        this.dataSource
            .dataChanges()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => {
                    this.isInitialTreeLoad = false;
                })
            )
            .subscribe({
                next: () => {
                    if (this.dataSource.treeControl.dataNodes?.length > 0) {
                        this.isInitialTreeLoad = false;
                        this.changeDetectorRef.detectChanges();
                    }
                },
                error: (err) => {
                    console.error(err);
                },
            });

        this.dataSource.setDocumentTreeRoot(this.rootDocument);
        this.dataSource.openNodeAtIndex(0);
    }

    private getContextActions(document: Document) {
        return this.contextMenuActionsService.getContextActions(document, this.documents[0]);
    }

    private openNodes(documents: (Document | undefined)[]) {
        if (!this.multiSelection && Array.isArray(documents) && documents.length > 0) {
            this.dataSource.openNodes(documents);
        }
    }

    private scrollTreeNodeIntoView(e: MouseEvent) {
        const el = e.target as HTMLElement;
        const treeNode = el.closest('mat-tree-node');
        if (treeNode) {
            treeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
        }
    }

    private loadSelectedDocumentsAncestors(documents: Document[] = []) {
        if (documents.length === 0) {
            return;
        }
        from(documents)
            .pipe(
                filter((doc) => !!doc),
                switchMap((doc) => this.documentService.getAncestors(doc?.sys_id || '').pipe(catchError(() => of([{ ...ROOT_DOCUMENT }]))))
            )
            .subscribe({
                next: (docs: Document[]) => this.openNodes(docs),
            });
    }
}
