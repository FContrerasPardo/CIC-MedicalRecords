/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule, KeyValue } from '@angular/common';
import {
    afterNextRender,
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    Injector,
    Input,
    QueryList,
    ViewChild,
    ViewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuItem, MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ToolbarItem, ToolbarItemTypes, ToolbarSubItem } from '../../models/toolbar';
import { ToolbarPosition } from '../../models/config-options';
import { ViewerService } from '../../services/viewer.service';
import { ViewerToolbarService } from '../../services/viewer-toolbar.service';
import { distinctUntilChanged, filter, Observable, tap } from 'rxjs';
import { StateData } from '../../models/state-data';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { userLayoutOptionsFromString } from '../../models/layout';
import { EventTypes } from '../../models/events';
import { formatDate } from '../../utils/date-utils';
import { TemplateLetDirective } from '../../utils/template-let.directive';
import { IdpJoinPipe } from '../../utils/join-pipe';
import { FocusKeyManager } from '@angular/cdk/a11y';

@Component({
    imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, TranslatePipe, TemplateLetDirective, IdpJoinPipe],
    selector: 'hyland-idp-viewer-generic-control',
    templateUrl: './generic-control.component.html',
    styleUrls: ['./generic-control.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericControlComponent implements AfterViewInit {
    @Input() toolbarItem?: ToolbarItem;
    @ViewChildren(MatMenuItem) menuItems!: QueryList<MatMenuItem>;
    @ViewChild('toolbarButton', { static: false, read: ElementRef }) toolbarButton?: ElementRef<HTMLButtonElement>;

    toolbarPosition = ToolbarPosition;
    toolbarTypes = ToolbarItemTypes;

    readonly currentViewerState$: Observable<StateData>;
    private readonly destroyRef: DestroyRef = inject(DestroyRef);
    private readonly viewerService: ViewerService = inject(ViewerService);
    private readonly viewerToolbarService: ViewerToolbarService = inject(ViewerToolbarService);
    private readonly injector: Injector = inject(Injector);
    currentViewerState?: StateData;
    private keyManager?: FocusKeyManager<MatMenuItem>;

    toolbarSubitemOrderFn = (a: KeyValue<string, ToolbarSubItem>, b: KeyValue<string, ToolbarSubItem>): number => {
        return a.value.order - b.value.order;
    };

    constructor() {
        this.currentViewerState$ = this.viewerService.viewerState$.pipe(
            distinctUntilChanged(),
            tap((state) => {
                this.currentViewerState = state;
            }),
            takeUntilDestroyed(this.destroyRef)
        );
    }

    ngAfterViewInit() {
        if (this.menuItems) {
            this.menuItems.changes.subscribe(() => {
                this.initKeyManager();
            });
        }

        this.viewerToolbarService.focusToolbarItem$
            .pipe(
                filter((itemType) => itemType === this.toolbarItem?.type),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                afterNextRender(
                    () => {
                        this.toolbarButton?.nativeElement?.focus();
                    },
                    { injector: this.injector }
                );
            });
    }

    private initKeyManager() {
        if (this.menuItems && this.menuItems.length > 0) {
            this.keyManager = new FocusKeyManager<MatMenuItem>(this.menuItems).withVerticalOrientation().withWrap();
        }
    }

    onMenuOpened() {
        this.initKeyManager();
        if (this.keyManager) {
            this.keyManager.setFirstItemActive();
        }
    }

    onMenuClosed() {
        this.keyManager = undefined;
    }

    onMenuKeydown(event: KeyboardEvent) {
        if (this.keyManager) {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                event.stopPropagation();
            }
            switch (event.key) {
                case 'ArrowDown': {
                    this.keyManager.setNextItemActive();
                    break;
                }
                case 'ArrowUp': {
                    this.keyManager.setPreviousItemActive();
                    break;
                }
                case 'Home': {
                    this.keyManager.setFirstItemActive();
                    break;
                }
                case 'End': {
                    this.keyManager.setLastItemActive();
                    break;
                }
                default: {
                    this.keyManager.onKeydown(event);
                    break;
                }
            }
        }
    }

    onMenuItemClick(item?: ToolbarItem, subitem?: ToolbarSubItem) {
        if (item?.subItems) {
            for (const sub of Object.values(item.subItems)) {
                sub.selected = sub.id === subitem?.id;
            }
        }

        if (item?.type === ToolbarItemTypes.LayoutChange) {
            const layoutType = subitem ? userLayoutOptionsFromString(subitem.id) : undefined;
            if (!layoutType) {
                return;
            }
            this.viewerService.changeUserSelectedLayout(layoutType);
        }
    }

    onToolbarAction(item?: ToolbarItem) {
        switch (item?.type) {
            case ToolbarItemTypes.BestFit: {
                this.viewerService.changeViewerState({ bestFit: !this.currentViewerState?.bestFit }, item.eventType);
                break;
            }
            case ToolbarItemTypes.FullScreen: {
                this.onFullScreenChange();
                break;
            }
            case ToolbarItemTypes.Rotate: {
                this.onRotateChange(item);
                break;
            }
            case ToolbarItemTypes.RedactionToggle: {
                const newShowRedaction = !this.currentViewerState?.showRedaction;
                this.viewerService.changeViewerState({ showRedaction: newShowRedaction }, item.eventType);
                break;
            }
            case ToolbarItemTypes.RedactionDrawMode: {
                const newRedactionDrawMode = !this.currentViewerState?.redactionDrawMode;
                this.viewerService.changeViewerState({ redactionDrawMode: newRedactionDrawMode }, item.eventType);
                break;
            }
            default: {
                if (item?.eventType) {
                    this.viewerService.emitViewerEvent({ type: item?.eventType, timestamp: formatDate(Date.now()) });
                }
            }
        }
        if (item?.canStaySelected && item?.type !== ToolbarItemTypes.RedactionToggle && item?.type !== ToolbarItemTypes.RedactionDrawMode) {
            this.viewerService.changeToolbarItemSelectionState(item.type, item.eventType);
        }
    }

    private onFullScreenChange() {
        const newFullScreen = !this.currentViewerState?.fullscreen;
        this.viewerService.changeViewerState({ fullscreen: newFullScreen }, newFullScreen ? EventTypes.FullScreenEnter : EventTypes.FullScreenExit);
    }

    private onRotateChange(item: ToolbarItem) {
        this.viewerService.changeViewerState({ rotationStep: item.config?.step || 90 }, item.eventType);
    }
}
