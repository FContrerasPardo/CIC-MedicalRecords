/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, EventEmitter, inject, Injector, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { SatCategoryTagComponent, SatStatusTagComponent } from '@hylandsoftware/satori-ui';
import { SatActionBarModule } from '@hylandsoftware/satori-preview/action-bar';
import { ScanningHeaderComponent } from '../scanning-header/scanning-header.component';
import {
    IdpViewerComponent,
    IdpViewerToolbarPosition,
    IdpViewerConfigOptions,
    IdpViewerUserLayoutOptions,
    IdpViewerDatasource,
    IdpViewerEvent,
} from '@hyland/idp-document-viewer';
import { ShortcutBrowserDialogComponent } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { MatDialog } from '@angular/material/dialog';
import Split from 'split.js';
import { findPageById, findPageByIndex, ScanningSession } from '../../services/scanning-session.service';
import { filter, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstOrDefault, lastOrDefault } from '../../util';

@Component({
    selector: 'hyland-idp-scanning-view',
    templateUrl: './scanning-view.component.html',
    styleUrls: ['./scanning-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ScanningHeaderComponent,
        TranslatePipe,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        IdpViewerComponent,
        SatCategoryTagComponent,
        SatStatusTagComponent,
        SatActionBarModule,
    ],
})
export class ScanningViewComponent {
    private readonly dialogService = inject(MatDialog);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    readonly scanSession = inject(ScanningSession);

    private readonly viewer = viewChild(IdpViewerComponent);
    readonly viewerEvent$ = new EventEmitter<IdpViewerEvent<object>>();

    readonly leftPanelWidth = 48;
    readonly rightPanelWidth = 100 - this.leftPanelWidth;
    private readonly splitLeft = viewChild<ElementRef<HTMLElement>>('splitLeft');
    private readonly splitRight = viewChild<ElementRef<HTMLElement>>('splitRight');

    readonly viewerConfiguration: Partial<IdpViewerConfigOptions> = {
        toolbarPosition: IdpViewerToolbarPosition.Right,
        defaultLayoutType: {
            type: IdpViewerUserLayoutOptions.SinglePage,
            availableActions: ['BestFit', 'FullScreen', 'PageNavigation', 'Zoom'],
        },
    };

    instanceSplitter?: Split.Instance;

    readonly viewerDatasource = computed<IdpViewerDatasource>(() => {
        const batch = this.scanSession.batch();
        return {
            documents: batch.documents.map((scanningDocument) => ({
                id: scanningDocument.id,
                name: scanningDocument.id,
                pages: scanningDocument.pages.map((page) => ({
                    id: page.id,
                    name: page.id,
                    isSelected: false,
                })),
            })),
            loadImageFn(pageId) {
                const page = findPageById(batch, pageId);
                if (!page) {
                    throw new Error(`Page with id ${pageId} not found`);
                }
                return {
                    blobUrl: page.url,
                    width: 600,
                    height: 800,
                };
            },
            loadThumbnailFn(pageId) {
                const page = findPageById(batch, pageId);
                if (!page) {
                    throw new Error(`Page with id ${pageId} not found`);
                }
                return page.url;
            },
        };
    });

    constructor() {
        effect((onCleanup) => {
            const leftElement = this.splitLeft()?.nativeElement;
            const rightElement = this.splitRight()?.nativeElement;
            if (!leftElement || !rightElement) {
                return;
            }

            const splitter = Split([leftElement, rightElement], {
                sizes: [this.leftPanelWidth, this.rightPanelWidth],
                direction: 'horizontal',
                gutterSize: 10,
                minSize: 150,
                gutter: (_, direction) => {
                    const gutter = document.createElement('div');
                    gutter.className = `gutter gutter-${direction}`;
                    gutter.dataset['automationId'] = 'idp-viewer-horizontal-splitter-bar';
                    return gutter;
                },
            });

            this.instanceSplitter = splitter;

            onCleanup(() => {
                splitter.destroy();
                if (this.instanceSplitter === splitter) {
                    this.instanceSplitter = undefined;
                }
            });
        });

        effect(() => {
            const activePageId = this.scanSession.activePageId();
            if (activePageId) {
                this.viewer()?.changePageById(activePageId);
            }
        });

        this.viewerEvent$.pipe(
            filter(isPageSelectedEvent),
            map((event) => event.data?.newValue?.pageNavInfo?.currentPageIndex),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((pageIndex) => {
            const page = pageIndex === undefined ? undefined : findPageByIndex(this.scanSession.batch(), pageIndex);
            if (page) {
                this.onViewerPageSelected(page.id);
            }
        });
    }

    private isStillSelectingRanges = false;

    onPageClick(pageId: string, event: MouseEvent) {
        const hasMultiSelectKey = event.ctrlKey || event.metaKey;
        if (event.shiftKey) {
            this.scanSession.selectedPageIds.update((selectedPageIds) => {
                const startPageId = (this.isStillSelectingRanges ? firstOrDefault(selectedPageIds) : lastOrDefault(selectedPageIds)) ?? pageId;
                this.isStillSelectingRanges = true;
                const existingSelection = hasMultiSelectKey ? selectedPageIds : new Set([startPageId]);

                if (startPageId === pageId) {
                    return existingSelection;
                }

                const newSelection = new Array<string>();

                let isInRange = false;
                let isRangeForward = true;
                const batch = this.scanSession.batch();
                for (const document of batch.documents) {
                    for (const page of document.pages) {
                        if (page.id === startPageId || page.id === pageId) {
                            if (isInRange) {
                                newSelection.push(page.id);
                                break;
                            }
                            isInRange = true;
                            isRangeForward = page.id === startPageId;
                        }

                        if (isInRange) {
                            newSelection.push(page.id);
                        }
                    }
                }

                if (!isRangeForward) {
                    newSelection.reverse();
                }

                return new Set([...existingSelection, ...newSelection]);
            });
        } else {
            if (hasMultiSelectKey) {
                this.scanSession.selectedPageIds.update((pageIds) => pageIds.size === 1 && pageIds.has(pageId) ? pageIds : addOrDelete(new Set(pageIds), pageId));
            } else {
                this.scanSession.selectedPageIds.set(new Set([pageId]));
            }
            this.isStillSelectingRanges = false;
        }
    }

    private onViewerPageSelected(pageId: string) {
        this.scanSession.selectedPageIds.update((selectedPageIds) => {
            this.isStillSelectingRanges = false;
            if (selectedPageIds.has(pageId)) {
                // move current page to the end to it becomes the active page
                const newSelectedPageIds = new Set(selectedPageIds);
                newSelectedPageIds.delete(pageId);
                newSelectedPageIds.add(pageId);
                return newSelectedPageIds;
            }
            return new Set([pageId]);
        });
    }

    onShortcutBrowserClick() {
        if (this.dialogService.openDialogs.length > 0) {
            return;
        }

        ShortcutBrowserDialogComponent.openDialog(this.dialogService, { injector: this.injector });
    }
}

function addOrDelete<T>(set: Set<T>, value: T) {
    if (!set.delete(value)) {
        set.add(value);
    }
    return set;
}

interface PageSelectedData {
    pageNavInfo: {
        currentPageIndex: number | undefined;
        totalPages: number;
    };
}
function isPageSelectedEvent(event: IdpViewerEvent<any>): event is IdpViewerEvent<PageSelectedData> {
    return event.type === 'PageSelected';
}
