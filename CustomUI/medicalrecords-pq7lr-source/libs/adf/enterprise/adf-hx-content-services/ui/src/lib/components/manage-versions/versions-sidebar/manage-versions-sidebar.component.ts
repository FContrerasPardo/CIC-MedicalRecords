/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Document } from '@hylandsoftware/hxcs-js-client';
import { InfoDrawerContentDirective, InfoDrawerLayoutComponent } from '@alfresco/adf-core';
import {
    DocumentRouterService,
    DocumentVersionsService,
    UserResolverPipe,
    VersionableDocument,
    ContextActionConfiguration,
} from '@alfresco/adf-hx-content-services/services';
import { VersionContextMenuActionsService } from './version-context-menu.service';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    ViewEncapsulation,
    ContentChild,
    TemplateRef,
    ViewChild,
    OnInit,
    inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { finalize, map, merge, switchMap, take } from 'rxjs';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { PanelSkeletonLoaderComponent } from '../../skeleton-loader/panel-skeleton-loader/panel-skeleton-loader.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'hxp-manage-versions-sidebar',
    encapsulation: ViewEncapsulation.None,
    imports: [
        NgTemplateOutlet,
        TranslatePipe,
        UserResolverPipe,
        DatePipe,
        InfoDrawerLayoutComponent,
        InfoDrawerContentDirective,
        MatButtonModule,
        MatIconModule,
        PanelSkeletonLoaderComponent,
        MatMenuModule,
        MatTooltipModule,
    ],
    templateUrl: './manage-versions-sidebar.component.html',
    styleUrls: ['./manage-versions-sidebar.component.scss'],
})
export class ManageVersionsSidebarComponent implements OnInit, OnChanges {
    /**
     * The document to display the versions for
     * @type {Document}
     */
    @Input() document?: Document;
    /**
     * Emits an event when the sidebar is closed
     */
    @Output() closeVersionsSidebar = new EventEmitter<void>();

    documentVersions: VersionableDocument[] = [];
    isLoading = false;
    protected workingCopy: VersionableDocument | undefined = undefined;
    protected selectedDocument: VersionableDocument | undefined = undefined;

    @ContentChild('contextActionMenu', { static: false })
    protected contextActionMenuTemplateRef: TemplateRef<any> | null = null;

    @ViewChild('trigger', { static: false })
    protected menuTrigger?: MatMenuTrigger;

    @ViewChild('hiddenTrigger', { static: false })
    protected hiddenTrigger!: MatMenuTrigger;

    protected contextMenuPosition = { x: '0px', y: '0px' };
    protected contextActions: ContextActionConfiguration[] = [];

    private readonly documentRouterService = inject(DocumentRouterService);
    private readonly documentVersionsService = inject(DocumentVersionsService);
    private readonly versionContextMenuActionsService = inject(VersionContextMenuActionsService);

    ngOnInit() {
        merge(this.documentVersionsService.versionDeleted$, this.documentVersionsService.versionUpdated$).subscribe(() => {
            // eslint-disable-next-line rxjs/no-nested-subscribe
            this.loadVersions();
        });
    }

    ngOnChanges() {
        if (this.document) {
            this.selectedDocument = this.document;
            this.loadVersions();
        }
    }

    redirectToVersion(document: Document): void {
        if (document) {
            this.selectedDocument = document;
            this.documentRouterService.navigateTo(document);
        }
    }

    protected onClose(): void {
        this.closeVersionsSidebar.emit();
    }

    protected onContextMenu(event: MouseEvent, version: VersionableDocument): void {
        event.preventDefault();
        event.stopPropagation();

        this.contextMenuPosition = { x: `${event.clientX}px`, y: `${event.clientY}px` };

        const targetHtmlElement = event.target as HTMLElement;

        if (targetHtmlElement.tagName !== 'BUTTON' && targetHtmlElement.tagName !== 'MAT-ICON') {
            const node = targetHtmlElement.closest('.hxp-version-item');
            const trigger = node?.querySelector('.hxp-menu-trigger');

            this.contextActions = this.getContextActions(version);
            if (this.contextActions.some((action) => action.model.visible)) {
                trigger?.dispatchEvent(new MouseEvent('click'));
            }
        } else {
            this.contextActions = this.getContextActions(version);
            if (this.contextActions.some((action) => action.model.visible)) {
                this.hiddenTrigger?.openMenu();
            }
        }
    }

    private getContextActions(version: VersionableDocument) {
        return this.versionContextMenuActionsService.getVersionContextActions(version, this.workingCopy);
    }

    private loadVersions() {
        if (!this.selectedDocument) {
            return;
        }
        this.isLoading = true;
        this.documentVersionsService
            .getCurrentDocument(this.selectedDocument)
            .pipe(
                take(1),
                switchMap((currentDoc) => {
                    this.workingCopy = currentDoc;
                    return this.documentVersionsService
                        .getVersions(currentDoc)
                        .pipe(map((versions: VersionableDocument[]) => [currentDoc, ...versions]));
                }),
                finalize(() => (this.isLoading = false))
            )
            .subscribe({
                next: (mergedVersions: VersionableDocument[]) => {
                    this.documentVersions = mergedVersions;
                },
                error: (err) => {
                    console.error(err);
                },
            });
    }
}
