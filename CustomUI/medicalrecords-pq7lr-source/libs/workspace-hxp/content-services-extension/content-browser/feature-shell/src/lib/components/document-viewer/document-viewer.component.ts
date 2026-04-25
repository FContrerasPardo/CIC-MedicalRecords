/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { computed, Component, inject, Input, OnChanges, ViewEncapsulation, HostListener, output, signal } from '@angular/core';
import { Document } from '@hylandsoftware/hxcs-js-client';
import {
    DocumentService,
    ActionContext,
    HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE,
    RouterExtService,
    DocumentMoreMenuItemsFactoryService,
    PERMISSIONS_MANAGEMENT_COMPONENT_TYPE,
    DocumentRouterService,
    ContextActionConfiguration,
    hasPermission,
    DocumentPermissions,
    isVersion,
    SidebarService,
} from '@alfresco/adf-hx-content-services/services';
import { filter } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import {
    ContentDeleteButtonComponent,
    ContentPropertiesViewerButtonComponent,
    ContentShareButtonComponent,
    DocumentMoreActionComponent,
    HxpBreadcrumbComponent,
    HxpMetadataSidebarComponent,
    HxpUiDocumentViewerComponent,
    ManageVersionsSidebarComponent,
    PermissionsButtonActionService,
    PermissionsManagementPanelComponent,
    SingleItemDownloadButtonComponent,
    VersionDeleteButtonComponent,
} from '@alfresco/adf-hx-content-services/ui';
import { DocumentVersionSelectorComponent } from '../document-version-selector/document-version-selector.component';
import { MatMenuModule } from '@angular/material/menu';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DocumentLayoutToggleComponent } from '../document-layout-toggle/document-layout-toggle.component';
import { MatDividerModule } from '@angular/material/divider';

@Component({
    selector: 'hxp-document-viewer',
    templateUrl: './document-viewer.component.html',
    styleUrls: ['./document-viewer.component.scss'],
    providers: [
        {
            provide: PERMISSIONS_MANAGEMENT_COMPONENT_TYPE,
            useValue: 'panel',
        },
        {
            provide: HXP_DOCUMENT_PERMISSIONS_ACTION_SERVICE,
            useClass: PermissionsButtonActionService,
        },
    ],
    encapsulation: ViewEncapsulation.None,
    imports: [
        HxpUiDocumentViewerComponent,
        AsyncPipe,
        MatToolbarModule,
        MatButtonModule,
        MatTooltipModule,
        MatIconModule,
        MatMenuModule,
        HxpBreadcrumbComponent,
        HxpMetadataSidebarComponent,
        ContentPropertiesViewerButtonComponent,
        ContentDeleteButtonComponent,
        SingleItemDownloadButtonComponent,
        ContentShareButtonComponent,
        DocumentMoreActionComponent,
        TranslatePipe,
        PermissionsManagementPanelComponent,
        DocumentVersionSelectorComponent,
        ManageVersionsSidebarComponent,
        VersionDeleteButtonComponent,
        DocumentLayoutToggleComponent,
        MatDividerModule,
    ],
})
export class DocumentViewerComponent implements OnChanges {
    private readonly menuItemsFactoryService = inject(DocumentMoreMenuItemsFactoryService);
    private readonly routerExtService = inject(RouterExtService);
    private readonly documentService = inject(DocumentService);
    private readonly documentRouterService = inject(DocumentRouterService);
    protected readonly sidebarService = inject(SidebarService);

    @Input() document!: Document;

    toggleDocumentView = output<boolean>();

    // Track current view state for toggle
    isDocumentView = true;

    moreMenu$ = this.menuItemsFactoryService.getMoreMenuItems();
    hasMoreMenu = signal(false);
    actionContext: ActionContext = { documents: [] };

    protected rightSidebarVisibility = computed(() => !!this.sidebarService.panel());

    protected editablePropertiesSidebar = false;
    protected fullScreen = false;

    private readonly refererURL = this.routerExtService.getPreviousUrl();

    constructor() {
        this.documentService.documentUpdated$
            .pipe(
                filter(({ document }) => !!document && document.sys_id === this.document?.sys_id),
                takeUntilDestroyed()
            )
            .subscribe(({ document }) => {
                this.document = document;
                this.editablePropertiesSidebar = hasPermission(document, DocumentPermissions.READ_WRITE);
                this.updateActionContext();
            });

        this.documentService.documentRestored$.pipe(takeUntilDestroyed()).subscribe({
            next: (restoredDocument) => {
                if (!isVersion(this.document)) {
                    this.document = restoredDocument;
                    this.updateActionContext();
                }
            },
        });
    }

    ngOnChanges(): void {
        this.editablePropertiesSidebar = this.document ? hasPermission(this.document, DocumentPermissions.READ_WRITE) : false;
        this.updateActionContext();
    }

    @HostListener('document:fullscreenchange')
    onFullScreenChange() {
        if (!document.fullscreenElement) {
            this.fullScreen = false;
        }
    }

    enterFullScreen() {
        if (!this.fullScreen) {
            this.fullScreen = true;
        }
    }

    onClose(): void {
        this.routerExtService.redirectToReferer(this.refererURL, this.documentRouterService.urlForParent(this.document));
    }

    closeRightSidebarPanel(): void {
        this.sidebarService.closePanel();
    }

    onToggleDocumentView(isDocumentView: boolean = false): void {
        this.isDocumentView = isDocumentView;
        this.toggleDocumentView.emit(isDocumentView);
    }

    protected onMenuItemClick(menuItem: ContextActionConfiguration) {
        if (menuItem?.model?.visible) {
            menuItem.subject.next(menuItem);
        }
    }

    private updateActionContext(): void {
        this.actionContext = {
            documents: this.document ? [this.document] : [],
            refererURL: this.refererURL,
            shouldRedirect: true,
        };
    }
}
