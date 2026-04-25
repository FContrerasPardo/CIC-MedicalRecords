/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectorRef, Component, DestroyRef, inject, OnChanges, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { of, merge } from 'rxjs';
import { catchError, map, switchMap, finalize, debounceTime, filter } from 'rxjs/operators';
import { DEFAULT_REPOSITORY_ID, ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { MatPaginatorModule, PageEvent, MatPaginatorIntl } from '@angular/material/paginator';
import {
    DocumentService,
    HxpNotificationService,
    hasPermission,
    ActionContext,
    DocumentPermissions,
    DocumentRouterService,
    ContextActionConfiguration,
    PermissionLevelPipe,
    DateTimeFormatPipe,
    UserResolverPipe,
    SidebarService,
} from '@alfresco/adf-hx-content-services/services';
import { PaginationOptions, PageSizeStorageService } from '@hxp/workspace-hxp/content-services-extension/shared/util';
import {
    ContentTypeIconComponent,
    HxpBreadcrumbComponent,
    HxpMetadataSidebarComponent,
    ManageVersionsSidebarComponent,
} from '@alfresco/adf-hx-content-services/ui';
import { ContentRepositoryComponent } from '@hxp/workspace-hxp/content-services-extension/shared/content-repository/feature-shell';
import { AsyncPipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HxPCreateDocumentButtonComponent } from '../document-create/create-document-button/create-document-button.component';
import { DataColumnComponent, DataColumnListComponent, FileSizePipe } from '@alfresco/adf-core';
import { DocumentViewerComponent } from '../document-viewer/document-viewer.component';
import { UploadSnackbarComponent } from '../document-create/upload/upload-snackbar/snackbar/upload-snackbar.component';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { IsFolderishDocumentPipe } from './is-folderish-document.pipe';
import { IsViewableAsFilePipe } from './is-viewable-as-file.pipe';
import { DocumentLayoutToggleComponent } from '../document-layout-toggle/document-layout-toggle.component';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { ADF_HX_CONTENT_SERVICES_INTERNAL } from '@alfresco/adf-hx-content-services/features';

@Component({
    selector: 'hxp-content-browser',
    templateUrl: './hxp-content-browser.component.html',
    styleUrls: ['./hxp-content-browser.component.scss'],
    imports: [
        NgTemplateOutlet,
        AsyncPipe,
        TranslatePipe,
        PermissionLevelPipe,
        IsFolderishDocumentPipe,
        IsViewableAsFilePipe,
        HxpBreadcrumbComponent,
        HxPCreateDocumentButtonComponent,
        ContentRepositoryComponent,
        DataColumnComponent,
        DataColumnListComponent,
        ContentTypeIconComponent,
        FileSizePipe,
        DateTimeFormatPipe,
        UserResolverPipe,
        MatPaginatorModule,
        MatIconModule,
        MatMenuModule,
        DocumentViewerComponent,
        HxpMetadataSidebarComponent,
        UploadSnackbarComponent,
        ManageVersionsSidebarComponent,
        DocumentLayoutToggleComponent,
    ],
    providers: [
        MatPaginatorIntl,
        DecimalPipe
    ]
})
export class ContentBrowserComponent implements OnInit, OnChanges {
    private route = inject(ActivatedRoute);
    public documents: Document[] = [];
    public actionContext: ActionContext = { documents: [] };
    selectedFolderId$ = this.route.url.pipe(map((urlSegments = []) => (urlSegments.length > 0 ? urlSegments[0].path : '')));

    protected isLoading = false;
    protected selection: Document[] = [];
    protected document!: Document;
    protected isCreateDisabled: true | undefined = true;
    protected paginatorConfig = {
        offset: 0,
        totalCount: 0,
        pageSizeOptions: PaginationOptions,
    };
    protected pageSize: number;
    protected repositoryId: string = DEFAULT_REPOSITORY_ID;
    protected editablePropertiesSidebar = false;
    protected readonly sidebarService = inject(SidebarService);

    protected readonly featuresService = inject(FeaturesServiceToken);
    protected readonly isDocumentLayoutFeatureFlagOn = toSignal(
        this.featuresService.isOn$(ADF_HX_CONTENT_SERVICES_INTERNAL.CIC_WORKSPACE_DOCUMENT_LAYOUT_TOGGLE)
    );
    protected isViewerToggled = false;
    protected showFileViewer = true;

    private readonly destroyRef = inject(DestroyRef);
    private readonly decimalPipe: DecimalPipe = inject(DecimalPipe);
    private readonly translateService = inject(TranslateService);
    private readonly documentService = inject(DocumentService);
    private readonly documentRouterService = inject(DocumentRouterService);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);
    private readonly hxpNotificationService = inject(HxpNotificationService);
    private readonly pageSizeStorageService = inject(PageSizeStorageService);
    private activeSortingOptions: Array<string> = [];
    private readonly searchResults100KEnabled$ = this.featuresService.isOn$(ADF_HX_CONTENT_SERVICES_INTERNAL.SEARCH_RESULTS_100K);
    private searchResults100KEnabled = false;
    private paginatorIntl = inject(MatPaginatorIntl);
    private get locale(): string {
        return this.translateService.getCurrentLang() || this.translateService.getFallbackLang() || 'en';
    }

    constructor() {
        this.subscribeToDocumentUpdates();

        this.searchResults100KEnabled$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((enabled) => {
            this.searchResults100KEnabled = enabled;
            this.paginatorIntl.changes.next();
        });

        this.paginatorIntl.getRangeLabel = this.createPaginationRangeLabel;
        this.translateService.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.paginatorIntl.getRangeLabel = this.createPaginationRangeLabel;
            this.paginatorIntl.changes.next();
        });
    }

    ngOnInit() {
        this.pageSize = this.pageSizeStorageService.getSize();

        this.route.params
            .pipe(
                switchMap((params) => {
                    this.isLoading = true;
                    this.repositoryId = params['repositoryId'] || DEFAULT_REPOSITORY_ID;
                    const docId = params['id'] || ROOT_DOCUMENT.sys_id;
                    this.documentService.setCurrentRepository(this.repositoryId);
                    return this.documentService.getDocumentById(docId, this.repositoryId).pipe(
                        catchError((error) => {
                            if (error.response.status === 403 && docId === ROOT_DOCUMENT.sys_id) {
                                return of(ROOT_DOCUMENT);
                            }
                            throw error;
                        })
                    );
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (doc) => {
                    this.document = doc;
                    this.showFileViewer = true;
                    this.isViewerToggled = false;
                    this.resetPaginatorConfig();
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this.fetchChildren();
                    this.checkCreatePermission();
                    this.documentService.notifyDocumentLoaded(this.document);
                    this.changeDetectorRef.detectChanges();
                },
                error: ({ response }) => {
                    this.isLoading = false;
                    this.hxpNotificationService.showError(
                        [401, 403].includes(response.status)
                            ? 'CONTENT_BROWSER.DOCUMENT.LOAD_ERROR.' + response.status
                            : 'CONTENT_BROWSER.DOCUMENT.LOAD_ERROR.DEFAULT'
                    );
                },
            });

        merge(this.documentService.documentCreated$, this.documentService.documentDeleted$, this.documentService.documentRequestReload$)
            .pipe(debounceTime(1000), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.documentService.clearSelectionDocumentList();
                // eslint-disable-next-line rxjs/no-nested-subscribe
                this.fetchChildren();
            });
    }

    ngOnChanges(): void {
        this.checkCreatePermission();
        this.resetPaginatorConfig();
    }

    handleCloseSidebarPanel(): void {
        this.sidebarService.closePanel();
    }

    fetchChildren(sortOptions: string[] = []) {
        this.isLoading = true;
        this.documentService
            .getAllChildren(this.document.sys_id, {
                limit: this.pageSize,
                offset: this.paginatorConfig.offset,
                sort: sortOptions,
            })
            .pipe(
                catchError(() =>
                    of({
                        documents: [],
                        limit: 0,
                        offset: 0,
                        totalCount: 0,
                    })
                ),
                takeUntilDestroyed(this.destroyRef),
                finalize(() => (this.isLoading = false))
            )
            .subscribe({
                next: (result) => {
                    this.documents = result.documents;
                    this.paginatorConfig.totalCount = result.totalCount;
                    this.actionContext = {
                        ...this.actionContext,
                        parentDocument: this.document,
                        documents: this.selection,
                    };
                },
                error: (error) => {
                    console.error(error);
                },
            });
    }

    handlePageEvent(page: PageEvent) {
        this.pageSize = page.pageSize;
        this.pageSizeStorageService.setSize(page.pageSize);
        this.paginatorConfig.offset = page.pageIndex * page.pageSize;
        this.fetchChildren(this.activeSortingOptions);
        this.documentService.clearSelectionDocumentList();
    }

    protected onToggleDocumentView(isDocumentView?: boolean) {
        this.showFileViewer = !isDocumentView;
        this.isViewerToggled = true;
        if (!this.showFileViewer) {
            this.fetchChildren();
        }
    }

    protected handleRowClicked(document: Document) {
        this.documentRouterService.navigateTo(document);
    }

    protected handleSortingClicked(options: string[]) {
        this.activeSortingOptions = options;
        this.fetchChildren(this.activeSortingOptions);
    }

    protected handleCurrentSelection(documents: Document[]) {
        this.selection = documents;
        this.editablePropertiesSidebar = this.selection.length > 0 ? hasPermission(this.selection[0], DocumentPermissions.READ_WRITE) : false;
        this.actionContext = {
            ...this.actionContext,
            parentDocument: this.document,
            documents: this.selection,
        };
    }

    protected onMenuItemClick(menuItem: ContextActionConfiguration) {
        if (menuItem?.model?.visible) {
            menuItem.subject.next(menuItem);
        }
    }

    private resetPaginatorConfig() {
        this.paginatorConfig.offset = 0;
    }

    private checkCreatePermission() {
        if (this.document) {
            // if the user can upload a document, the disabled property of the upload component needs to be undefined instead of true
            this.isCreateDisabled = hasPermission(this.document, DocumentPermissions.CREATE_CHILD) ? undefined : true;
        }
    }

    private subscribeToDocumentUpdates(): void {
        this.documentService.documentUpdated$
            .pipe(
                filter(({ document }) => !!document && document?.sys_parentId === this.document?.sys_id),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    // eslint-disable-next-line rxjs/no-nested-subscribe
                    this.fetchChildren();
                },
                error: (error) => console.error(error),
            });
    }

    private createPaginationRangeLabel = (): string => {

        const startIndex = this.paginatorConfig.offset;
        const endIndex = Math.min(startIndex + this.pageSize, this.paginatorConfig.totalCount);

        // New format with localization and truncation support
        if (this.searchResults100KEnabled) {
            const localizedStartIndex = this.decimalPipe.transform(startIndex + 1, '1.0-0', this.locale);
            const localizedEndIndex = this.decimalPipe.transform(endIndex, '1.0-0', this.locale);
            const localizedTotalItems = this.decimalPipe.transform(this.paginatorConfig.totalCount, '1.0-0', this.locale);

            return this.translateService.instant('PAGINATION.PAGE_NUMBER', {
                startIndex: localizedStartIndex,
                endIndex: localizedEndIndex,
                totalPages: localizedTotalItems,
            });
        }

        // Fallback to previous format
        return this.translateService.instant('PAGINATION.PAGE_NUMBER', {
            startIndex: startIndex + 1,
            endIndex: endIndex,
            totalPages: this.paginatorConfig.totalCount,
        });
    };
}
