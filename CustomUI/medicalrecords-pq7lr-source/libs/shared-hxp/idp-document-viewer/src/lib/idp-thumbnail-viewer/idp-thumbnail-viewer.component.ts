/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    afterNextRender,
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    Injector,
    QueryList,
    ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    combineLatest,
    distinctUntilChanged,
    filter,
    map,
    Observable,
    startWith,
    Subject,
    timer,
    BehaviorSubject,
    isObservable,
    from,
    of,
    take,
    withLatestFrom,
} from 'rxjs';
import { FocusKeyManager } from '@angular/cdk/a11y';
import { ToolbarPosition } from '../models/config-options';
import { ViewerService } from '../services/viewer.service';
import { ToolbarConfig } from '../models/toolbar-config';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IdpThumbnailViewerListItemComponent } from '../idp-thumbnail-viewer-list-item/idp-thumbnail-viewer-list-item.component';
import { MatButtonModule } from '@angular/material/button';
import { StateData } from '../models/state-data';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatDividerModule } from '@angular/material/divider';
import { ViewerShortcutAction, ViewerShortcutService } from '../services/viewer-shortcut.service';
import { ViewerToolbarService } from '../services/viewer-toolbar.service';
import { IdpViewerSkeletonLoaderComponent } from '../idp-viewer-skeleton-loader/idp-viewer-skeleton-loader.component';
import { TranslatePipe } from '@ngx-translate/core';

export interface ThumbnailViewerData {
    pageId: string;
    documentId: string;
    pageNumber: number;
    documentName: string;
    selected: boolean;
    image$: Observable<string>;
}

@Component({
    selector: 'hyland-idp-thumbnail-viewer',
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        IdpThumbnailViewerListItemComponent,
        IdpViewerSkeletonLoaderComponent,
        ScrollingModule,
        MatDividerModule,
        TranslatePipe,
    ],
    templateUrl: './idp-thumbnail-viewer.component.html',
    styleUrls: ['./idp-thumbnail-viewer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdpThumbnailViewerComponent implements AfterViewInit {
    @ViewChildren(IdpThumbnailViewerListItemComponent) items!: QueryList<IdpThumbnailViewerListItemComponent>;

    private readonly unsubscribe$ = new Subject<void>();
    readonly associatedViewerToolbarItem = ToolbarConfig.ThumbnailViewer;
    private keyManager?: FocusKeyManager<IdpThumbnailViewerListItemComponent>;
    private readonly viewerService = inject(ViewerService);
    private readonly viewerToolbarService = inject(ViewerToolbarService);
    private readonly shortcutService = inject(ViewerShortcutService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly injector = inject(Injector);

    toolbarPosition = ToolbarPosition;

    readonly currentViewerState$: Observable<StateData>;
    readonly isLeftRightPosition$: Observable<boolean>;
    readonly pageItems$ = new BehaviorSubject<ThumbnailViewerData[]>([]);
    readonly isExpanded$: Observable<boolean>;
    readonly pageUniquenessFn = (i: number, image: ThumbnailViewerData) => image.pageNumber;

    constructor() {
        this.currentViewerState$ = this.viewerService.viewerState$.pipe(takeUntilDestroyed(this.destroyRef));

        combineLatest([
            this.viewerService.datasource$,
            this.viewerService.viewerState$.pipe(
                map((s) => {
                    return s.pageNavInfo.currentPageIndex;
                }),
                distinctUntilChanged()
            ),
        ])
            .pipe(
                map(([datasource, selectedPageIndex]) => {
                    const pageImages: ThumbnailViewerData[] = [];
                    for (const doc of datasource.documents) {
                        for (const [index, page] of doc.pages.entries()) {
                            const result = datasource.loadThumbnailFn(page.id);
                            const thumbnailImage$ = isObservable(result) ? result : (result instanceof Promise ? from(result) : of(result));
                            pageImages.push({
                                pageId: page.id,
                                documentId: doc.id,
                                pageNumber: index + 1,
                                documentName: doc.name,
                                selected: selectedPageIndex === index,
                                image$: thumbnailImage$,
                            });
                        }
                    }
                    return pageImages;
                })
            )
            .subscribe(this.pageItems$);

        this.isExpanded$ = this.viewerService.viewerState$.pipe(
            map((state) => state.selectedToolbarItems.includes(this.associatedViewerToolbarItem.type)),
            distinctUntilChanged(),
            startWith(false)
        );

        combineLatest([
            this.isExpanded$,
            this.viewerService.viewerState$.pipe(
                map((s) => s.pageNavInfo.currentPageIndex),
                distinctUntilChanged()
            ),
        ])
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter(([isExpanded]) => isExpanded)
            )
            .subscribe(() => {
                // eslint-disable-next-line rxjs/no-nested-subscribe
                afterNextRender(() => this.scrollToSelectedPage(), { injector: this.injector });
            });

        this.viewerService.viewerKeyboardEvent$
            .pipe(takeUntilDestroyed(this.destroyRef), withLatestFrom(this.pageItems$, this.viewerService.viewerState$))
            .subscribe(([event, pageItems, state]) => {
                if (!state.selectedToolbarItems.includes(ToolbarConfig.ThumbnailViewer.type)) {
                    return;
                }
                const selectedPage = pageItems.find((page) => page.selected);
                // eslint-disable-next-line rxjs/no-nested-subscribe
                this.handleShortcutAction(selectedPage, event, pageItems.length);
            });

        this.isLeftRightPosition$ = this.currentViewerState$.pipe(
            map((state) => state.currentToolbarPosition),
            map((position) => ([ToolbarPosition.Right, ToolbarPosition.Left] as ToolbarPosition[]).includes(position))
        );

        this.destroyRef.onDestroy(() => {
            this.unsubscribe$.next();
            this.unsubscribe$.complete();
            this.keyManager = undefined;
        });
    }

    ngAfterViewInit() {
        if (this.items) {
            this.keyManager = new FocusKeyManager<IdpThumbnailViewerListItemComponent>(this.items).withHomeAndEnd(true);
            this.keyManager.setFirstItemActive();
        }
    }

    onClick(pageItem: ThumbnailViewerData) {
        this.viewerService.changePageSelection({ pageIndex: pageItem.pageNumber - 1 });
        timer(100).subscribe(() => this.keyManager?.setActiveItem(pageItem.pageNumber - 1));
    }

    closePanel(restoreFocus = false) {
        this.viewerService.viewerState$.pipe(take(1)).subscribe((state) => {
            if (state.selectedToolbarItems.includes(ToolbarConfig.ThumbnailViewer.type)) {
                this.viewerService.changeToolbarItemSelectionState(ToolbarConfig.ThumbnailViewer.type, ToolbarConfig.ThumbnailViewer.eventType);
                if (restoreFocus) {
                    afterNextRender(
                        () => {
                            this.viewerToolbarService.requestFocusOnToolbarItem(ToolbarConfig.ThumbnailViewer.type);
                        },
                        { injector: this.injector }
                    );
                }
            }
        });
    }

    public scrollToSelectedPage() {
        this.pageItems$.pipe(take(1)).subscribe((pageItems) => {
            const selectedPageIndex = pageItems.findIndex((page) => page.selected);
            if (selectedPageIndex >= 0 && this.keyManager) {
                this.keyManager.setActiveItem(selectedPageIndex);
            } else {
                this.keyManager?.setFirstItemActive();
            }
        });
    }

    private handleShortcutAction(pageItem: ThumbnailViewerData | undefined, event: KeyboardEvent, totalPages: number) {
        if (!pageItem) {
            return;
        }

        if (event.key === 'Escape') {
            this.closePanel(true);
            return;
        }

        const shortcut = this.shortcutService.getShortcutForEvent(event);
        if (!shortcut) {
            return;
        }

        if (this.keyManager && shortcut.category === 'viewer_navigation' && event.key !== 'Enter') {
            let pageIndex = 0;
            switch (shortcut.action) {
                case ViewerShortcutAction.NavigateFirstPage: {
                    break;
                }
                case ViewerShortcutAction.NavigateLastPage: {
                    pageIndex = totalPages - 1;
                    break;
                }
                case ViewerShortcutAction.NavigateLeft:
                case ViewerShortcutAction.NavigateUp: {
                    pageIndex = Math.max(pageItem.pageNumber - 2, 0);
                    break;
                }
                case ViewerShortcutAction.NavigateRight:
                case ViewerShortcutAction.NavigateDown: {
                    pageIndex = Math.min(pageItem.pageNumber, totalPages - 1);
                    break;
                }
            }
            this.viewerService.changePageSelection({ pageIndex });
            this.keyManager.setActiveItem(pageIndex);
        }
    }
}
