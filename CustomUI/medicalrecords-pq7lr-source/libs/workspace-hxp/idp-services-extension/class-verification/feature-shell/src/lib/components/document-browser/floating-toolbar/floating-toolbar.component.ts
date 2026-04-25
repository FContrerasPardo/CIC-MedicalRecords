/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IdpDocumentActionToolBarItems, IdpDocumentToolbarService, MessageTemplate } from '../../../services/document/idp-document-toolbar.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IdpShortcutService } from '@hxp/workspace-hxp/idp-services-extension/shared';

type IdpDocumentActionToolBarItemsData = IdpDocumentActionToolBarItems & { tooltip: string };

@Component({
    selector: 'hyland-idp-floating-toolbar',
    templateUrl: './floating-toolbar.component.html',
    styleUrls: ['./floating-toolbar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
})
export class FloatingToolbarComponent {
    readonly toolbarActionItems$: Observable<IdpDocumentActionToolBarItemsData[]>;
    readonly toolbarMessageTemplate$: Observable<MessageTemplate>;
    isCollapsed = false;

    private readonly documentToolbarService = inject(IdpDocumentToolbarService);
    private readonly shortcutService = inject(IdpShortcutService);
    private readonly translateService = inject(TranslateService);

    constructor() {
        this.toolbarActionItems$ = this.documentToolbarService.documentToolBarItems$.pipe(
            takeUntilDestroyed(),
            map((items) =>
                items
                    .filter((item) => item.displayOn === 'footer' && (!item.disabled || item.showWhenDisabled))
                    .map((item) => ({
                        ...item,
                        tooltip:
                            item.disabled && item.showWhenDisabled && item.showWhenDisabledTooltip
                                ? this.translateService.instant(item.showWhenDisabledTooltip.key, item.showWhenDisabledTooltip.args)
                                : this.translateService.instant(item.label) +
                                  (item.shortcutAction ? ` (${this.shortcutService.getShortcutTooltipForAction(item.shortcutAction)})` : ''),
                    }))
            )
        );

        this.toolbarMessageTemplate$ = this.documentToolbarService.toolbarMessageTemplate$.pipe(takeUntilDestroyed());
    }

    onCollapse() {
        this.isCollapsed = !this.isCollapsed;
    }

    onActionClicked(action: IdpDocumentActionToolBarItemsData) {
        if (!action.disabled) {
            action.onClick$.next();
        }
    }
}
