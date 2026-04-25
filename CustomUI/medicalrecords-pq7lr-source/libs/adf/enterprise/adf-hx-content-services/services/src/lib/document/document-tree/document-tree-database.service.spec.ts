/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DocumentTreeDatabaseService } from './document-tree-database.service';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take } from 'rxjs/operators';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { DocumentTreeNode } from './models/document-tree-node';
import { DocumentService } from '../document.service';
import { isFolder } from '../configs/document.utils';
import { DocumentFetchOptions, DocumentFetchResults } from '../document.models';
import { DEFAULT_ITEMS_PER_PAGE } from '../configs/document-tree.config';

describe('DocumentTreeDatabaseService', () => {
    let service: DocumentTreeDatabaseService;
    const documentService = {
        getFolderChildren: jest.fn().mockReturnValue(
            of({
                limit: 0,
                offset: 0,
                totalCount: 1,
                documents: jestMocks.nestedDocumentAncestors,
            })
        ),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [DocumentTreeDatabaseService, { provide: DocumentService, useValue: documentService }],
        });
        service = TestBed.inject(DocumentTreeDatabaseService);
    });

    it('should set a Document as DocumentTree Root data', () => {
        service.setDocumentTreeRoot(jestMocks.folderDocument);
        const result = service.treeControl.dataNodes;

        expect(result.length).toBe(1);
        expect(result[0].document).toBe(jestMocks.folderDocument);
        expect(result[0].level).toBe(0);
        expect(isFolder(result[0].document)).toBe(true);
    });

    it('should find a node by providing a Document id', () => {
        service.setDocumentTreeRoot(jestMocks.folderDocument);
        expect(service.findNodeByDocumentId(jestMocks.folderDocument.sys_id)?.document).toBe(jestMocks.folderDocument);
    });

    it('should open a node by providing an index', () => {
        service.setDocumentTreeRoot(jestMocks.folderDocument);
        const node: DocumentTreeNode = service.findNodeByDocumentId(jestMocks.folderDocument.sys_id) as DocumentTreeNode;
        service.toggleNode(node, { expand: false });

        expect(service.treeControl.isExpanded(node)).toBe(false);

        service.openNodeAtIndex(0);

        expect(service.treeControl.isExpanded(node)).toBe(true);
    });

    it('should delete a node', async () => {
        service.setDocumentTreeRoot(jestMocks.folderDocument);
        const node: DocumentTreeNode = service.findNodeByDocumentId(jestMocks.folderDocument.sys_id) as DocumentTreeNode;
        service.deleteNode(node);
        const result = await firstValueFrom(service.dataChanges());

        expect(result.length).toBe(0);
    });

    it('should update a node', async () => {
        service.setDocumentTreeRoot(jestMocks.folderDocument);
        const updatedDocument: Document = { ...jestMocks.folderDocument, sys_title: 'Updated Title' };
        service.updateNode(updatedDocument);
        const result = await firstValueFrom(service.dataChanges());

        expect(result.length).toBe(1);
        expect(result[0].document.sys_title).toBe('Updated Title');
    });

    it('should get children', async () => {
        const parentNode: Document = ROOT_DOCUMENT;
        const children: Document[] = jestMocks.nestedDocumentAncestors;

        const mockFetchOptions: DocumentFetchOptions = {
            limit: DEFAULT_ITEMS_PER_PAGE,
            offset: 0,
            sort: [],
        };

        const result: DocumentFetchResults = await firstValueFrom((service as any).getChildren(parentNode, '', mockFetchOptions));

        expect(result.documents).toEqual(children);
    });

    it('should determine if node is expandable', () => {
        const folderNode: Document = jestMocks.folderDocument;
        const documentNode: Document = jestMocks.fileDocument;

        expect((service as any).isExpandable(folderNode)).toBe(true);
        expect((service as any).isExpandable(documentNode)).toBe(false);
    });

    it('should auto-fetch additional documents when more are available based on totalCount', async () => {
        const parentNode: Document = jestMocks.folderDocument;
        const initialChildren: Document[] = jestMocks.nestedDocumentAncestors;
        const additionalChildren: Document[] = jestMocks.nestedDocumentAncestors2;

        documentService.getFolderChildren.mockReturnValueOnce(
            of({
                limit: DEFAULT_ITEMS_PER_PAGE,
                offset: 0,
                totalCount: 4,
                documents: initialChildren,
            })
        );

        documentService.getFolderChildren.mockReturnValueOnce(
            of({
                limit: DEFAULT_ITEMS_PER_PAGE,
                offset: initialChildren.length,
                totalCount: 4,
                documents: additionalChildren,
            })
        );

        service.setDocumentTreeRoot(parentNode);
        const node: DocumentTreeNode = service.findNodeByDocumentId(parentNode.sys_id) as DocumentTreeNode;

        service.toggleNode(node, { expand: true, limit: 2, offset: 0 });

        const initialResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
        const initialChildNodes = initialResult.filter((n) => n.level === node.level + 1);

        expect(initialChildNodes.length).toBe(4);
        expect(initialChildNodes.filter((n) => n.isSkeleton).length).toBe(2);

        service.toggleNode(node, { expand: true, limit: 2, offset: 2 });

        const finalResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
        const finalChildNodes = finalResult.filter((n) => n.level === node.level + 1);

        expect(finalChildNodes.filter((n) => n.isSkeleton).length).toBe(0);
        expect(finalChildNodes.length).toBe(4);
        expect(finalChildNodes.map((n) => n.document)).toEqual([...initialChildren, ...additionalChildren]);
    });

    it('should insert children at the correct index based on sys_parentId', async () => {
        const parentNode: Document = { ...jestMocks.folderDocument, sys_id: 'parent-1', sys_parentId: 'root' };
        const childNode1: Document = { ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: 'parent-1' };
        const childNode2: Document = { ...jestMocks.fileDocument, sys_id: 'child-2', sys_parentId: 'parent-1' };

        const anotherParentNode: Document = { ...jestMocks.folderDocument, sys_id: 'parent-2', sys_parentId: 'root' };
        const anotherChildNode: Document = { ...jestMocks.fileDocument, sys_id: 'child-3', sys_parentId: 'parent-2' };

        documentService.getFolderChildren.mockReturnValue(
            of({
                limit: 0,
                offset: 0,
                totalCount: 2,
                documents: [childNode1, childNode2],
            })
        );

        service.setDocumentTreeRoot(ROOT_DOCUMENT);

        const parentTreeNode = new DocumentTreeNode(parentNode, 1, true);
        const anotherParentTreeNode = new DocumentTreeNode(anotherParentNode, 1, true);
        service.treeControl.dataNodes.push(parentTreeNode, anotherParentTreeNode);
        service['_dataChange'].next(service.treeControl.dataNodes);

        service.toggleNode(parentTreeNode, { expand: true });

        const initialResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
        const childNodes = initialResult.filter((n) => n.document.sys_parentId === parentNode.sys_id);

        expect(childNodes.length).toBe(2);
        expect(childNodes.map((n) => n.document)).toEqual([childNode1, childNode2]);

        documentService.getFolderChildren.mockReturnValue(
            of({
                limit: 0,
                offset: 0,
                totalCount: 1,
                documents: [anotherChildNode],
            })
        );

        service.toggleNode(anotherParentTreeNode, { expand: true });

        const finalResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
        const anotherChildNodes = finalResult.filter((n) => n.document.sys_parentId === anotherParentNode.sys_id);

        expect(anotherChildNodes.length).toBe(1);
        expect(anotherChildNodes[0].document).toEqual(anotherChildNode);
    });

    describe('Skeleton loader', () => {
        it('should add a maximum of 20 skeleton nodes under a parent node', async () => {
            const parentNode: Document = jestMocks.folderDocument;
            const children: Document[] = [
                { ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: parentNode.sys_id },
                { ...jestMocks.fileDocument, sys_id: 'child-2', sys_parentId: parentNode.sys_id },
            ];

            // Mock response with high totalCount to trigger skeleton creation
            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 0,
                    totalCount: 100, // Much higher than loaded documents to ensure skeletons are added
                    documents: children,
                })
            );

            service.setDocumentTreeRoot(parentNode);
            const node: DocumentTreeNode = service.findNodeByDocumentId(parentNode.sys_id) as DocumentTreeNode;

            service.toggleNode(node, { expand: true, limit: 2, offset: 0 });

            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const childNodes = result.filter((n) => n.level === node.level + 1);
            const skeletonNodes = childNodes.filter((n) => n.isSkeleton);
            const realNodes = childNodes.filter((n) => !n.isSkeleton);

            // Verify we have exactly 2 real nodes and maximum 20 skeleton nodes
            expect(realNodes.length).toBe(2);
            expect(skeletonNodes.length).toBe(20); // Maximum skeleton placeholders
            expect(childNodes.length).toBe(22); // 2 real + 20 skeleton
        });
    });

    describe('Skeleton loader pruning', () => {
        it('should remove skeleton children for specific parent while preserving other parent skeletons', async () => {
            const parent1: Document = { ...jestMocks.folderDocument, sys_id: 'parent-1' };
            const parent2: Document = { ...jestMocks.folderDocument, sys_id: 'parent-2' };

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 1,
                    offset: 0,
                    totalCount: 2,
                    documents: [parent1],
                })
            );

            service.setDocumentTreeRoot(ROOT_DOCUMENT);
            const rootNode = service.findNodeByDocumentId(ROOT_DOCUMENT.sys_id) as DocumentTreeNode;

            service.toggleNode(rootNode, { expand: true, limit: 1, offset: 0 });
            const initialResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const parent2Node = new DocumentTreeNode(parent2, 1, true);
            const skeleton2 = new DocumentTreeNode(
                { sys_primaryType: 'skeleton-type', sys_parentId: 'parent-2' } as Document,
                2,
                false,
                false,
                true,
                true
            );

            service.treeControl.dataNodes.push(parent2Node, skeleton2);
            service.treeControl.dataNodes = [...service.treeControl.dataNodes, parent2Node, skeleton2];

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 1,
                    offset: 0,
                    totalCount: 1,
                    documents: [{ ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: 'parent-1' }],
                })
            );

            const parent1Node = initialResult.find((n) => n.document.sys_id === 'parent-1') as DocumentTreeNode;
            service.toggleNode(parent1Node, { expand: true, limit: 1, offset: 0 });

            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const parent1Children = result.filter((n) => n.level === parent1Node.level + 1 && n.document.sys_parentId === 'parent-1');

            // Verify parent1's skeletons are removed and replaced with real child
            expect(parent1Children.length).toBe(1);
            expect(parent1Children.every((n) => !n.isSkeleton)).toBe(true);
            expect(parent1Children[0].document.sys_id).toBe('child-1');

            // Verify parent2's skeletons remain untouched
            expect(result.find((node) => node.isSkeleton && node.document.sys_parentId === 'parent-2')).toBeDefined();
        });

        it('should not remove non-skeleton nodes', async () => {
            const parentNode: Document = { ...jestMocks.folderDocument, sys_id: 'parent-1' };
            const children: Document[] = [
                { ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: 'parent-1' },
                { ...jestMocks.fileDocument, sys_id: 'child-2', sys_parentId: 'parent-1' },
            ];

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 0,
                    totalCount: 2,
                    documents: children,
                })
            );

            service.setDocumentTreeRoot(parentNode);
            const node: DocumentTreeNode = service.findNodeByDocumentId(parentNode.sys_id) as DocumentTreeNode;

            service.toggleNode(node, { expand: true, limit: 2, offset: 0 });

            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const childNodes = result.filter((n) => n.level === node.level + 1);

            expect(childNodes.length).toBe(2);
            expect(childNodes.every((n) => !n.isSkeleton)).toBe(true);
            expect(childNodes.find((childNode) => childNode.document.sys_id === 'child-1')).toBeDefined();
            expect(childNodes.find((childNode) => childNode.document.sys_id === 'child-2')).toBeDefined();
        });

        it('should only prune skeletons at the correct level', async () => {
            const grandparentNode: Document = { ...jestMocks.folderDocument, sys_id: 'grandparent-1' };
            const parentNode: Document = { ...jestMocks.folderDocument, sys_id: 'parent-1', sys_parentId: 'grandparent-1' };

            // Create a simpler scenario without automatic fetching - just test level isolation
            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 0,
                    totalCount: 2, // Exact match to avoid automatic fetching
                    documents: [parentNode, { ...jestMocks.folderDocument, sys_id: 'parent-2', sys_parentId: 'grandparent-1' }],
                })
            );

            service.setDocumentTreeRoot(grandparentNode);
            const grandparentTreeNode = service.findNodeByDocumentId(grandparentNode.sys_id) as DocumentTreeNode;

            service.toggleNode(grandparentTreeNode, { expand: true, limit: 2, offset: 0 });

            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            // Should have grandparent + 2 children at level 1
            const level1Nodes = result.filter((n) => n.level === 1);

            expect(level1Nodes.length).toBe(2); // parent-1 + parent-2
            expect(level1Nodes.every((n) => !n.isSkeleton)).toBe(true); // All real nodes

            // Add some skeleton nodes at level 2 manually for parent-1
            const skeleton1 = new DocumentTreeNode(
                { sys_primaryType: 'skeleton-type', sys_parentId: 'parent-1' } as Document,
                2,
                false,
                false,
                true,
                true
            );
            const skeleton2 = new DocumentTreeNode(
                { sys_primaryType: 'skeleton-type', sys_parentId: 'parent-1' } as Document,
                2,
                false,
                false,
                true,
                true
            );

            // Add skeletons to the tree
            service.treeControl.dataNodes.push(skeleton1, skeleton2);
            service.treeControl.dataNodes = [...service.treeControl.dataNodes, skeleton1, skeleton2];

            // Now expand parent-1 - this should prune only level 2 skeletons for parent-1
            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 1,
                    offset: 0,
                    totalCount: 1, // Exact match to avoid automatic fetching
                    documents: [{ ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: 'parent-1' }],
                })
            );

            const parent1TreeNode = result.find((n) => n.document.sys_id === 'parent-1') as DocumentTreeNode;
            service.toggleNode(parent1TreeNode, { expand: true, limit: 1, offset: 0 });

            const finalResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
            // Verify level isolation: only level 2 skeletons for parent-1 should be pruned
            const finalLevel1Nodes = finalResult.filter((n) => n.level === 1);
            const level2ChildNodes = finalResult.filter((n) => n.level === 2 && !n.isSkeleton);
            const level2SkeletonNodes = finalResult.filter((n) => n.level === 2 && n.isSkeleton);

            expect(finalLevel1Nodes.length).toBe(2); // parent-1 + parent-2 (unchanged)
            expect(finalLevel1Nodes.every((n) => !n.isSkeleton)).toBe(true); // No skeletons at level 1
            expect(level2ChildNodes.length).toBe(1); // child-1 (real node)
            expect(level2SkeletonNodes.length).toBe(0); // skeletons should be pruned
            expect(level2ChildNodes[0].document.sys_id).toBe('child-1');
        });

        it('should prune skeletons when reaching or exceeding totalCount', async () => {
            const parentNode: Document = jestMocks.folderDocument;
            const children: Document[] = [
                { ...jestMocks.fileDocument, sys_id: 'child-1' },
                { ...jestMocks.fileDocument, sys_id: 'child-2' },
            ];

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 0,
                    totalCount: 2,
                    documents: children,
                })
            );

            service.setDocumentTreeRoot(parentNode);
            const node: DocumentTreeNode = service.findNodeByDocumentId(parentNode.sys_id) as DocumentTreeNode;

            const skeletonNode = new DocumentTreeNode(
                { sys_primaryType: 'skeleton-type', sys_parentId: parentNode.sys_id } as Document,
                1,
                false,
                false,
                true,
                true
            );
            const currentData = service.treeControl.dataNodes;
            service.treeControl.dataNodes = [...currentData, skeletonNode];

            service.toggleNode(node, { expand: true, limit: 2, offset: 0 });

            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const childNodes = result.filter((n) => n.level === node.level + 1);

            expect(childNodes.length).toBe(2);
            expect(childNodes.every((n) => !n.isSkeleton)).toBe(true);
        });

        it('should prune skeletons on error', async () => {
            const parentNode: Document = jestMocks.folderDocument;

            documentService.getFolderChildren.mockReturnValueOnce(throwError(() => new Error('Network error')));

            service.setDocumentTreeRoot(parentNode);
            const node: DocumentTreeNode = service.findNodeByDocumentId(parentNode.sys_id) as DocumentTreeNode;

            const skeletonNode = new DocumentTreeNode(
                { sys_primaryType: 'skeleton-type', sys_parentId: parentNode.sys_id } as Document,
                1,
                false,
                false,
                true,
                true
            );
            const currentData = service.treeControl.dataNodes;
            service.treeControl.dataNodes = [...currentData, skeletonNode];

            service.toggleNode(node, { expand: true });
            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const skeletonNodes = result.filter((n) => n.isSkeleton && n.document.sys_parentId === parentNode.sys_id);

            expect(skeletonNodes.length).toBe(0);
        });

        it('should prune skeletons when ROOT_DOCUMENT has no children', async () => {
            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 0,
                    offset: 0,
                    totalCount: 0,
                    documents: [],
                })
            );

            service.setDocumentTreeRoot(ROOT_DOCUMENT);
            const node: DocumentTreeNode = service.findNodeByDocumentId(ROOT_DOCUMENT.sys_id) as DocumentTreeNode;

            // Add skeleton nodes
            const skeletonNode = new DocumentTreeNode(
                { sys_primaryType: 'skeleton-type', sys_parentId: ROOT_DOCUMENT.sys_id } as Document,
                1,
                false,
                false,
                true,
                true
            );
            const currentData = service.treeControl.dataNodes;
            service.treeControl.dataNodes = [...currentData, skeletonNode];

            service.toggleNode(node, { expand: true });

            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const skeletonNodes = result.filter((n) => n.isSkeleton && n.document.sys_parentId === ROOT_DOCUMENT.sys_id);

            expect(skeletonNodes.length).toBe(0);
        });

        it('should prune skeletons when ROOT_DOCUMENT returns empty documents and offset has reached totalCount', async () => {
            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 5,
                    offset: 5,
                    totalCount: 5,
                    documents: [],
                })
            );

            service.setDocumentTreeRoot(ROOT_DOCUMENT);
            const node: DocumentTreeNode = service.findNodeByDocumentId(ROOT_DOCUMENT.sys_id) as DocumentTreeNode;

            const skeletonNode = new DocumentTreeNode(
                { sys_primaryType: 'skeleton-type', sys_parentId: ROOT_DOCUMENT.sys_id } as Document,
                1,
                false,
                false,
                true,
                true
            );
            service.treeControl.dataNodes = [...service.treeControl.dataNodes, skeletonNode];

            service.toggleNode(node, { expand: true });

            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const skeletonNodes = result.filter((n) => n.isSkeleton && n.document.sys_parentId === ROOT_DOCUMENT.sys_id);

            expect(skeletonNodes.length).toBe(0);
        });

        it('should prune stale skeleton nodes before inserting new children when fetching additional pages', async () => {
            const existingChild: Document = { ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: ROOT_DOCUMENT.sys_id };
            const newChild: Document = { ...jestMocks.fileDocument, sys_id: 'child-2', sys_parentId: ROOT_DOCUMENT.sys_id };

            service.setDocumentTreeRoot(ROOT_DOCUMENT);
            const node = service.findNodeByDocumentId(ROOT_DOCUMENT.sys_id) as DocumentTreeNode;

            const staleSkeletonNode = new DocumentTreeNode(
                { sys_primaryType: 'skeleton-type', sys_parentId: ROOT_DOCUMENT.sys_id } as Document,
                1,
                false,
                false,
                true,
                true
            );
            const existingChildNode = new DocumentTreeNode(existingChild, 1, false);
            service.treeControl.dataNodes = [node, staleSkeletonNode, existingChildNode];

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 1,
                    offset: 1,
                    totalCount: 3,
                    documents: [newChild],
                })
            );

            service.toggleNode(node, { expand: true, limit: 1, offset: 1 });

            const result = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const childNodes = result.filter((n) => n.level === 1 && n.document.sys_parentId === ROOT_DOCUMENT.sys_id);

            expect(childNodes.filter((n) => !n.isSkeleton).length).toBe(2);
            expect(childNodes.filter((n) => n.isSkeleton).length).toBe(1);
            expect(childNodes.filter((n) => !n.isSkeleton).map((n) => n.document.sys_id)).toEqual(['child-1', 'child-2']);
        });

        it('should continue paginating after an empty intermediate page', async () => {
            const firstPageChildren: Document[] = [
                { ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: ROOT_DOCUMENT.sys_id },
                { ...jestMocks.fileDocument, sys_id: 'child-2', sys_parentId: ROOT_DOCUMENT.sys_id },
            ];
            const lastPageChild: Document = { ...jestMocks.fileDocument, sys_id: 'child-3', sys_parentId: ROOT_DOCUMENT.sys_id };

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 0,
                    totalCount: 5,
                    documents: firstPageChildren,
                })
            );

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 2,
                    totalCount: 5,
                    documents: [],
                })
            );

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 4,
                    totalCount: 5,
                    documents: [lastPageChild],
                })
            );

            service.setDocumentTreeRoot(ROOT_DOCUMENT);
            const node = service.findNodeByDocumentId(ROOT_DOCUMENT.sys_id) as DocumentTreeNode;

            service.toggleNode(node, { expand: true, limit: 2, offset: 0 });
            await firstValueFrom(service.dataChanges().pipe(take(1)));

            service.toggleNode(node, { expand: true, limit: 2, offset: 2 });
            const intermediateResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const intermediateChildNodes = intermediateResult.filter((n) => n.level === 1 && n.document.sys_parentId === ROOT_DOCUMENT.sys_id);

            expect(intermediateChildNodes.filter((n) => !n.isSkeleton).map((n) => n.document.sys_id)).toEqual(['child-1', 'child-2']);
            expect(intermediateChildNodes.filter((n) => n.isSkeleton).length).toBe(1);

            service.toggleNode(node, { expand: true, limit: 2, offset: 4 });
            const finalResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const finalChildNodes = finalResult.filter((n) => n.level === 1 && n.document.sys_parentId === ROOT_DOCUMENT.sys_id);

            expect(finalChildNodes.filter((n) => !n.isSkeleton).map((n) => n.document.sys_id)).toEqual(['child-1', 'child-2', 'child-3']);
            expect(finalChildNodes.filter((n) => n.isSkeleton).length).toBe(0);
        });

        it('should continue paginating after a short intermediate page', async () => {
            const firstPageChildren: Document[] = [
                { ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: ROOT_DOCUMENT.sys_id },
                { ...jestMocks.fileDocument, sys_id: 'child-2', sys_parentId: ROOT_DOCUMENT.sys_id },
            ];
            const shortPageChild: Document = { ...jestMocks.fileDocument, sys_id: 'child-3', sys_parentId: ROOT_DOCUMENT.sys_id };
            const lastPageChild: Document = { ...jestMocks.fileDocument, sys_id: 'child-4', sys_parentId: ROOT_DOCUMENT.sys_id };

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 0,
                    totalCount: 5,
                    documents: firstPageChildren,
                })
            );

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 2,
                    totalCount: 5,
                    documents: [shortPageChild],
                })
            );

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 4,
                    totalCount: 5,
                    documents: [lastPageChild],
                })
            );

            service.setDocumentTreeRoot(ROOT_DOCUMENT);
            const node = service.findNodeByDocumentId(ROOT_DOCUMENT.sys_id) as DocumentTreeNode;

            service.toggleNode(node, { expand: true, limit: 2, offset: 0 });
            await firstValueFrom(service.dataChanges().pipe(take(1)));

            service.toggleNode(node, { expand: true, limit: 2, offset: 2 });
            const intermediateResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const intermediateChildNodes = intermediateResult.filter((n) => n.level === 1 && n.document.sys_parentId === ROOT_DOCUMENT.sys_id);

            expect(intermediateChildNodes.filter((n) => !n.isSkeleton).map((n) => n.document.sys_id)).toEqual(['child-1', 'child-2', 'child-3']);
            expect(intermediateChildNodes.filter((n) => n.isSkeleton).length).toBe(1);

            service.toggleNode(node, { expand: true, limit: 2, offset: 4 });
            const finalResult = await firstValueFrom(service.dataChanges().pipe(take(1)));
            const finalChildNodes = finalResult.filter((n) => n.level === 1 && n.document.sys_parentId === ROOT_DOCUMENT.sys_id);

            expect(finalChildNodes.filter((n) => !n.isSkeleton).map((n) => n.document.sys_id)).toEqual(['child-1', 'child-2', 'child-3', 'child-4']);
            expect(finalChildNodes.filter((n) => n.isSkeleton).length).toBe(0);
        });

        it('should cancel a stale pagination chain when the same node is refreshed again', fakeAsync(() => {
            const firstPageChildren: Document[] = [
                { ...jestMocks.fileDocument, sys_id: 'child-1', sys_parentId: ROOT_DOCUMENT.sys_id },
                { ...jestMocks.fileDocument, sys_id: 'child-2', sys_parentId: ROOT_DOCUMENT.sys_id },
            ];
            const finalPageChild: Document = { ...jestMocks.fileDocument, sys_id: 'child-3', sys_parentId: ROOT_DOCUMENT.sys_id };

            documentService.getFolderChildren.mockReset();

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 0,
                    totalCount: 3,
                    documents: firstPageChildren,
                })
            );

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 0,
                    totalCount: 3,
                    documents: firstPageChildren,
                })
            );

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 2,
                    totalCount: 3,
                    documents: [finalPageChild],
                })
            );

            documentService.getFolderChildren.mockReturnValueOnce(
                of({
                    limit: 2,
                    offset: 2,
                    totalCount: 3,
                    documents: [{ ...finalPageChild, sys_id: 'child-3-duplicate' }],
                })
            );

            service.setDocumentTreeRoot(ROOT_DOCUMENT);
            const node = service.findNodeByDocumentId(ROOT_DOCUMENT.sys_id) as DocumentTreeNode;

            service.toggleNode(node, { expand: true, isRefresh: true, limit: 2, offset: 0 });
            service.toggleNode(node, { expand: true, isRefresh: true, limit: 2, offset: 0 });

            tick(100);

            const childNodes = service.treeControl.dataNodes.filter((treeNode) => treeNode.level === 1 && treeNode.document.sys_parentId === ROOT_DOCUMENT.sys_id);

            expect(documentService.getFolderChildren).toHaveBeenCalledTimes(3);
            expect(childNodes.filter((treeNode) => !treeNode.isSkeleton).map((treeNode) => treeNode.document.sys_id)).toEqual([
                'child-1',
                'child-2',
                'child-3',
            ]);
            expect(childNodes.filter((treeNode) => treeNode.isSkeleton)).toHaveLength(0);
        }));
    });
});
