/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CollectionViewer, DataSource, SelectionChange } from '@angular/cdk/collections';
import { BehaviorSubject, merge, of, Observable, Subject } from 'rxjs';
import { FlatTreeControl } from '@angular/cdk/tree';
import { finalize, map, catchError, takeUntil, delay, take } from 'rxjs/operators';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { inject, Injectable } from '@angular/core';
import { DocumentTreeNode } from './models/document-tree-node';
import { DocumentService } from '../document.service';
import { DEFAULT_ITEMS_PER_PAGE } from '../configs/document-tree.config';
import { DocumentFetchOptions, DocumentFetchResults, ToggleNodeOptions } from '../document.models';
import { isFolder } from '../configs/document.utils';

@Injectable()
export class DocumentTreeDatabaseService implements DataSource<DocumentTreeNode> {
    private _getLevel = (node: DocumentTreeNode) => node.level;
    private _isExpandable = (node: DocumentTreeNode) => node.isExpandable;

    private readonly _dataChange = new BehaviorSubject<DocumentTreeNode[]>([]);
    private readonly _treeControl = new FlatTreeControl<DocumentTreeNode>(this._getLevel, this._isExpandable);
    // Triggered when DataSource.disconnect is called. Do not replace with DestroyRef
    private readonly destroy$: Subject<void> = new Subject<void>();

    get treeControl() {
        return this._treeControl;
    }

    private readonly documentService = inject(DocumentService);

    setDocumentTreeRoot(document: Document) {
        this._treeControl.dataNodes = [this.toNode(document)];
    }

    connect(collectionViewer: CollectionViewer): Observable<DocumentTreeNode[]> {
        this._treeControl.expansionModel.changed.pipe(takeUntil(this.destroy$)).subscribe({
            next: (change: SelectionChange<DocumentTreeNode>) => {
                if (change.added || change.removed) {
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this._handleTreeControl(change);
                }
            },
        });
        return merge(collectionViewer.viewChange, this._dataChange).pipe(map(() => this._treeControl.dataNodes));
    }

    disconnect(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    openNodeAtIndex(index: number) {
        const node = this.treeControl.dataNodes[index];
        this._treeControl.expand(node);
        this.toggleNode(node, { expand: true });
    }

    findNodeByDocumentId(documentId: string | undefined): DocumentTreeNode | undefined {
        return this._treeControl.dataNodes.find((node: DocumentTreeNode) => node.document.sys_id === documentId);
    }

    openNodes(documents: (Document | undefined)[]) {
        const doc = documents.shift();
        const documentNode = this.findNodeByDocumentId(doc?.sys_id);

        if (documentNode) {
            if (!this._treeControl.isExpanded(documentNode) || documentNode.isLoading) {
                this._treeControl.expand(documentNode);
                if (documentNode.nodeLoaded) {
                    documentNode.nodeLoaded.pipe(takeUntil(this.destroy$)).subscribe({
                        next: () => {
                            if (documents.length > 0) {
                                // eslint-disable-next-line rxjs/no-nested-subscribe
                                this.openNodes(documents);
                            }
                        },
                    });
                }
            } else if (documents.length > 0) {
                this.openNodes(documents);
            }
        }
    }

    refreshNode(documentId: string | undefined) {
        const nodeToExpand = this.findNodeByDocumentId(documentId);
        if (nodeToExpand) {
            this.toggleNode(nodeToExpand, { isRefresh: true, expand: true });
        }
    }

    updateNode(updatedDocument: Document) {
        const nodeToUpdate = this.findNodeByDocumentId(updatedDocument.sys_id);

        if (!nodeToUpdate) {
            return;
        }

        nodeToUpdate.document = updatedDocument;
        this._dataChange.next(this._treeControl.dataNodes);
    }

    deleteNode(node: DocumentTreeNode) {
        const nodeIndex = this._treeControl.dataNodes.indexOf(node);
        if (nodeIndex < 0) {
            return;
        }

        let count = 1;
        for (let i = nodeIndex + 1; i < this._treeControl.dataNodes.length && this._treeControl.dataNodes[i].level > node.level; i++) {
            count++;
        }
        this._treeControl.dataNodes.splice(nodeIndex, count);
        this._dataChange.next(this._treeControl.dataNodes);
    }

    dataChanges(): Observable<DocumentTreeNode[]> {
        return this._dataChange.asObservable();
    }

    toggleNode(node: DocumentTreeNode, options: ToggleNodeOptions) {
        const { expand } = options;

        if (expand) {
            this.fetchAndUpdateNode(node, options);
        } else {
            this.collapseNode(node);
        }
    }

    private fetchAndUpdateNode(node: DocumentTreeNode, options: ToggleNodeOptions): void {
        const { limit = DEFAULT_ITEMS_PER_PAGE, offset = 0 } = options;

        if (options.isRefresh) {
            this.resetNodeLoading(node);
        }

        node.isLoading = true;

        const fetchOptions: DocumentFetchOptions = { limit, offset, sort: [] };

        this.getChildren(node.document, '', fetchOptions)
            .pipe(
                takeUntil(node.loadCancel$),
                finalize(() => (node.isLoading = false))
            )
            .subscribe({
                next: (children) => {
                    this.pruneRemainingSkeletons(node);
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this.handleNodeChildren(node, children, options);
                },
                error: (error) => {
                    console.error(error);
                    this.pruneRemainingSkeletons(node);
                    this._dataChange.next(this._treeControl.dataNodes);
                    if (node.nodeLoaded) {
                        node.nodeLoaded.next(false);
                    }
                },
            });
    }

    private handleNodeChildren(node: DocumentTreeNode, children: DocumentFetchResults, options: ToggleNodeOptions): void {
        const { limit = DEFAULT_ITEMS_PER_PAGE, offset = 0, isRefresh = false } = options;
        const index = this._treeControl.dataNodes.indexOf(node);

        if (!children.documents || index < 0) {
            return;
        }

        if (isRefresh) {
            this.clearChildren(node, index);
        }

        const insertIndex = this.getChildInsertIndex(node, index);

        // Find the index of the first non-skeleton node after the current insert index.
        const skeletonNodesEndIndex = this._treeControl.dataNodes.findIndex((item, i) => i >= insertIndex && !item.isSkeleton);
        const endIndex = skeletonNodesEndIndex >= 0 ? skeletonNodesEndIndex : this._treeControl.dataNodes.length;

        // Remove skeleton nodes from the current node's children.
        this._treeControl.dataNodes.splice(insertIndex, endIndex - insertIndex);

        // Create new tree nodes for each child document and insert them into the data array.
        const newNodes = children.documents.map((child) => new DocumentTreeNode(child, node.level + 1, this.isExpandable(child)));
        this._treeControl.dataNodes.splice(insertIndex, 0, ...newNodes);

        const totalCount = children.totalCount ?? children.documents.length;
        const nextOffset = offset + limit;
        const hasMorePages = nextOffset < totalCount;

        if (hasMorePages) {
            this.addSkeletonPlaceholders(node, insertIndex + newNodes.length, totalCount, offset, limit);
        }

        if (!hasMorePages) {
            this.pruneRemainingSkeletons(node);
        }

        this._dataChange.next(this._treeControl.dataNodes);
        node.nodeLoaded.next(true);
    }

    private pruneRemainingSkeletons(node: DocumentTreeNode): void {
        const parentIndex = this._treeControl.dataNodes.indexOf(node);
        if (parentIndex < 0) {
            return;
        }

        const isSkeletonChildToRemove = (item: DocumentTreeNode, i: number) =>
            i > parentIndex && item.level === node.level + 1 && item.isSkeleton && item.document?.sys_parentId === node.document.sys_id;

        this._treeControl.dataNodes = this._treeControl.dataNodes.filter((item, i) => !isSkeletonChildToRemove(item, i));
    }

    private addSkeletonPlaceholders(node: DocumentTreeNode, insertIndex: number, totalCount: number, offset: number, limit: number): void {
        const placeholdersCount = Math.min(DEFAULT_ITEMS_PER_PAGE, Math.max(0, totalCount - (offset + limit)));

        // Attach the parent sys_id so pruning (and any future logic) can explicitly match ownership.
        const parentId = node.document.sys_id;
        const placeholders = Array.from(
            { length: placeholdersCount },
            () =>
                ({
                    document: {
                        sys_primaryType: 'skeleton-type',
                        sys_parentId: parentId,
                    },
                    level: node.level + 1,
                    isExpandable: false,
                    isSkeleton: true,
                }) as DocumentTreeNode
        );

        this._treeControl.dataNodes.splice(insertIndex, 0, ...placeholders);

        // Automatically fetch the next batch of children after a short delay to avoid overloading requests.
        this.dataChanges()
            .pipe(take(1), delay(100), takeUntil(node.loadCancel$))
            .subscribe({
                // eslint-disable-next-line rxjs/no-nested-subscribe
                next: () => this.fetchAndUpdateNode(node, { limit, offset: offset + limit, expand: true }),
                error: (err) => console.error('Failed to fetch and update node:', err),
            });
    }

    private getChildInsertIndex(node: DocumentTreeNode, parentIndex: number): number {
        const lastChildIndex = this.findLastIndex(
            this._treeControl.dataNodes,
            // eslint-disable-next-line unicorn/no-array-method-this-argument
            (item, index) => index > parentIndex && item.level > node.level && !item.isSkeleton && item.document.sys_parentId === node.document.sys_id
        );

        return lastChildIndex >= 0 ? lastChildIndex + 1 : parentIndex + 1;
    }

    private collapseNode(node: DocumentTreeNode) {
        this.resetNodeLoading(node);

        this.clearChildren(node, this._treeControl.dataNodes.indexOf(node));
        this._dataChange.next(this._treeControl.dataNodes);
    }

    private resetNodeLoading(node: DocumentTreeNode): void {
        node.loadCancel$.next();
        node.loadCancel$.complete();
        node.loadCancel$ = new Subject<void>();
    }

    private findLastIndex<DocumentNode>(
        array: DocumentNode[],
        predicate: (value: DocumentNode, index: number, array: DocumentNode[]) => boolean
    ): number {
        for (let i = array.length - 1; i >= 0; i--) {
            if (predicate(array[i], i, array)) {
                return i;
            }
        }
        return -1;
    }

    private clearChildren(node: DocumentTreeNode, index: number) {
        let count = 0;
        for (let i = index + 1; i < this._treeControl.dataNodes.length && this._treeControl.dataNodes[i].level > node.level; i++) {
            count++;
        }
        this._treeControl.dataNodes.splice(index + 1, count);
    }

    private _handleTreeControl(change: SelectionChange<DocumentTreeNode>) {
        if (change.added) {
            for (const node of change.added) {
                this.toggleNode(node, { expand: true });
            }
        }

        if (change.removed) {
            for (const node of [...change.removed].reverse()) {
                this.toggleNode(node, { expand: false });
            }
        }
    }

    private toNode(document: Document): DocumentTreeNode {
        return new DocumentTreeNode(document, 0, true, false, false);
    }

    private isExpandable(node: Document): boolean {
        // In the future we should check and rely on the fact if the document contains any children, rather than if is a folder type
        return isFolder(node);
    }

    private getChildren(node: Document, repositoryId: string, options: DocumentFetchOptions): Observable<DocumentFetchResults> {
        return this.documentService.getFolderChildren(node.sys_id || '', repositoryId, options).pipe(
            catchError(() =>
                of({
                    documents: [],
                    limit: 0,
                    offset: 0,
                    totalCount: 0,
                })
            )
        );
    }
}
