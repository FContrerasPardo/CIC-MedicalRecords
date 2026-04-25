/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Document, DocumentApi, NamedQuery, QueryApi, VersionApi } from '@hylandsoftware/hxcs-js-client';
import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { DocumentCreateProperties, DocumentFetchOptions, DocumentFetchResults, DocumentUpdateInfo, IDocumentService } from './document.models';
import { DEFAULT_REPOSITORY_ID, DOCUMENT_API_TOKEN, QUERY_API_TOKEN, ROOT_DOCUMENT, VERSION_API_TOKEN } from '@alfresco/adf-hx-content-services/api';
import { SingleItemCopyService } from '../single-item-copy/single-item-copy.service';
import { CopyStatus } from '../single-item-copy/models/copy-status.enum';
import { SingleItemMoveService } from '../single-item-move/single-item-move.service';
import { MoveStatus } from '../single-item-move/models/move-status.enum';
import { CopyResponse } from '../single-item-copy/models/copy-response.interface';
import { SharedDocumentService } from './document-token/document-token.service';
import { CreateDocumentVersionService } from './document-version/document-version.service';
import { RestoreDocumentVersionService } from './document-version/restore-version.service';
import { MoveResponse } from '../single-item-move/models/move-response.interface';

@Injectable()
export class DocumentService extends SharedDocumentService implements IDocumentService {
    private folderishSort = 'sys_isFolderish desc';
    private defaultSort = [this.folderishSort, 'sys_title asc'];

    private documentCreatedSubject: Subject<Document> = new Subject();
    private documentDeletedSubject: Subject<string> = new Subject();
    private documentSelectionClearSubject: Subject<void> = new Subject();
    private documentLoadedSubject: BehaviorSubject<Document | undefined> = new BehaviorSubject<Document | undefined>(undefined);
    private documentCopiedSubject: Subject<Document | undefined> = new Subject();
    private documentMovedSubject: Subject<Document | undefined> = new Subject();
    private documentRestoredSubject: Subject<Document> = new Subject();
    private documentRequestReloadSubject: Subject<void> = new Subject<void>();

    private documentUpdatedSubject: BehaviorSubject<DocumentUpdateInfo> = new BehaviorSubject<DocumentUpdateInfo>({
        updatedProperties: new Map(),
    });

    private repositoryId: string = DEFAULT_REPOSITORY_ID;

    protected readonly documentApi = inject<DocumentApi>(DOCUMENT_API_TOKEN);
    protected readonly queryApi = inject<QueryApi>(QUERY_API_TOKEN);
    protected readonly versionApi = inject<VersionApi>(VERSION_API_TOKEN);
    protected readonly copyService = inject(SingleItemCopyService);
    protected readonly moveService = inject(SingleItemMoveService);
    protected readonly createDocumentVersionService = inject(CreateDocumentVersionService);
    protected readonly restoreDocumentVersionService = inject(RestoreDocumentVersionService);

    documentCreated$ = this.documentCreatedSubject.asObservable();
    documentDeleted$ = this.documentDeletedSubject.asObservable();
    documentLoaded$ = this.documentLoadedSubject.asObservable();
    documentCopied$ = this.documentCopiedSubject.asObservable();
    documentMoved$ = this.documentMovedSubject.asObservable();
    clearDocumentSelection$ = this.documentSelectionClearSubject.asObservable();
    documentRequestReload$ = this.documentRequestReloadSubject.asObservable();
    documentUpdated$ = this.documentUpdatedSubject.asObservable();
    documentRestored$ = this.documentRestoredSubject.asObservable();

    setCurrentRepository(repositoryId: string): void {
        this.repositoryId = repositoryId;
    }

    getDocumentById(documentId: string, repositoryId: string = this.repositoryId): Observable<Document> {
        return from(this.documentApi.getDocumentById(documentId, repositoryId)).pipe(map((res) => res.data));
    }

    getDocumentByPath(path: string, repositoryId: string = this.repositoryId): Observable<Document> {
        return from(this.documentApi.getDocumentByPath(path, repositoryId)).pipe(map((res) => res.data));
    }

    getAncestors(documentId: string, repositoryId: string = this.repositoryId): Observable<Document[]> {
        return from(this.documentApi.getDocumentAncestors(documentId, repositoryId)).pipe(
            map((res) => (res.data && Array.isArray(res.data.ancestors) ? res.data.ancestors : [])),
            map((ancestors) => [{ ...ROOT_DOCUMENT }, ...ancestors])
        );
    }

    getAllChildren(parentId: string, options?: DocumentFetchOptions, repositoryId: string = this.repositoryId): Observable<DocumentFetchResults> {
        return this.getChildrenByNamedQuery('advanced_document_content', parentId, options, repositoryId);
    }

    getFolderChildren(parentId: string, repositoryId: string = this.repositoryId, options?: DocumentFetchOptions): Observable<DocumentFetchResults> {
        return this.getChildrenByNamedQuery('tree_children', parentId, options, repositoryId);
    }

    createDocument(properties: DocumentCreateProperties, repositoryId: string = this.repositoryId): Observable<Document> {
        const getSource = () => {
            if (properties.sys_parentId) {
                return this.documentApi.createDocumentUnderParentById(properties.sys_parentId, repositoryId, properties);
            }
            if (properties.sys_parentPath) {
                return this.documentApi.createDocumentUnderParentByPath(properties.sys_parentPath, repositoryId, properties);
            }
            return this.documentApi.createDocumentUnderParentById(ROOT_DOCUMENT.sys_id, repositoryId, properties);
        };

        return from(getSource()).pipe(
            map((res) => res.data),
            tap((data) => this.documentCreatedSubject.next(data))
        );
    }

    deleteDocument(documentId: string, repositoryId: string = this.repositoryId): Observable<string> {
        return from(this.documentApi.deleteDocumentById(documentId, repositoryId)).pipe(
            tap(() => this.documentDeletedSubject.next(documentId)),
            map(() => documentId)
        );
    }

    updateDocument(documentId: string, updatedProperties: { [key: string]: any }, repositoryId: string = this.repositoryId): Observable<Document> {
        return from(this.documentApi.updateDocumentById(documentId, repositoryId, updatedProperties, undefined)).pipe(
            map((res) => res.data),
            tap((data) => {
                this.documentUpdatedSubject.next({
                    document: data,
                    updatedProperties: new Map(Object.entries(updatedProperties)),
                });
            })
        );
    }

    copyDocument(documentId: string, name: string, targetParentId: string): Observable<CopyResponse> {
        return this.copyService.copy(documentId, name, targetParentId).pipe(
            tap((response) => {
                if (response.status === CopyStatus.SUCCESS) {
                    this.documentCopiedSubject.next(response.document);
                }
            })
        );
    }

    moveDocument(documentId: string, targetParentId: string): Observable<MoveResponse> {
        return this.moveService.move(documentId, targetParentId).pipe(
            tap((response) => {
                if (response.status === MoveStatus.SUCCESS) {
                    this.documentMovedSubject.next(response.document);
                }
            })
        );
    }

    createDocumentVersion(documentId: string, minor: boolean = false, repositoryId: string = this.repositoryId): Observable<Document> {
        return this.createDocumentVersionService.checkin(documentId, minor, repositoryId).pipe(
            filter((documentVersion) => !!documentVersion),
            switchMap(() => this.getDocumentById(documentId, repositoryId)),
            tap((document) => {
                this.documentUpdatedSubject.next({
                    document,
                    updatedProperties: new Map(Object.entries({ sysver_isCheckedIn: document['sysver_isCheckedIn'] })),
                });
            })
        );
    }

    restoreVersion(documentId: string, repositoryId: string = this.repositoryId): Observable<Document> {
        return this.restoreDocumentVersionService.restore(documentId, repositoryId).pipe(
            tap((document) => {
                this.documentRestoredSubject.next(document);
            })
        );
    }

    notifyDocumentLoaded(document: Document): void {
        this.documentLoadedSubject.next(document);
    }

    notifyDocumentCreated(document: Document): void {
        this.documentCreatedSubject.next(document);
    }

    clearSelectionDocumentList(): void {
        this.documentSelectionClearSubject.next();
    }

    requestReload(): void {
        this.documentRequestReloadSubject.next();
    }

    private getChildrenByNamedQuery(
        queryName: string,
        parentId: string,
        options?: DocumentFetchOptions,
        repositoryId: string = this.repositoryId
    ): Observable<DocumentFetchResults> {
        const query: NamedQuery = {
            queryName,
            parameters: {
                parentId,
            },
            sort: this.getSortOption(options),
            limit: options?.limit || 10000,
            offset: options?.offset || 0,
            repositoryId,
        };
        return from(this.queryApi.getDocumentsByNamedQuery(query)).pipe(
            map(({ data }) => {
                return {
                    documents: data.documents || [],
                    limit: data.limit || 0,
                    offset: data.offset || 0,
                    totalCount: data.totalCount || 0,
                };
            })
        );
    }

    private getSortOption(options: DocumentFetchOptions = { sort: [], limit: 0, offset: 0 }) {
        const { sort } = options;
        return sort.length > 0 ? sort : this.defaultSort;
    }
}
