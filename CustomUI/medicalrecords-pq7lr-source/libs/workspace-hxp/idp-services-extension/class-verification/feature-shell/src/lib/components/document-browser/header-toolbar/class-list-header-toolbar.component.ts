/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, inject, ViewChild, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatSlideToggle, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { IdpDocumentActionToolBarItems, IdpDocumentToolbarService } from '../../../services/document/idp-document-toolbar.service';
import { IdpDocumentService } from '../../../services/document/idp-document.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IdpScreenViewFilter, IdpScreenViewSortOption } from '../../../models/common-models';
import { IdpShortcutService, IdpShortcutAction } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { IdpDocumentAction } from '../../../models/screen-models';

type IdpDocumentActionToolBarItemsData = IdpDocumentActionToolBarItems & { tooltip: string };

@Component({
    selector: 'hyland-idp-class-list-header-toolbar',
    templateUrl: './class-list-header-toolbar.component.html',
    styleUrls: ['./class-list-header-toolbar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatRippleModule,
        MatSlideToggleModule,
        MatTooltipModule,
        TranslatePipe,
    ],
    encapsulation: ViewEncapsulation.None,
})
export class ClassListHeaderToolbarComponent {
    @ViewChild('issueFilter') issueFilter?: MatSlideToggle;

    readonly toolbarActionItems$: Observable<IdpDocumentActionToolBarItemsData[]>;
    readonly sortOptions = [
        {
            value: IdpScreenViewSortOption.Original,
            label: 'IDP_CLASS_VERIFICATION.CLASS_LIST_HEADER.SORT_SELECTOR.ORIGINAL_ORDER_LABEL',
        },
        {
            value: IdpScreenViewSortOption.Classes,
            label: 'IDP_CLASS_VERIFICATION.CLASS_LIST_HEADER.SORT_SELECTOR.CLASSES_ORDER_LABEL',
        },
    ];

    isIssuesOnlyView = false;
    issuesOnlyFilterTooltip: string;
    selectedSortOption: IdpScreenViewSortOption = IdpScreenViewSortOption.Original;

    private readonly documentToolbarService = inject(IdpDocumentToolbarService);
    private readonly documentService = inject(IdpDocumentService);
    private readonly shortcutService = inject(IdpShortcutService);
    private readonly translateService = inject(TranslateService);

    constructor() {
        this.toolbarActionItems$ = this.documentToolbarService.documentToolBarItems$.pipe(
            takeUntilDestroyed(),
            map((items) =>
                items.map((item) => ({
                    ...item,
                    tooltip:
                        this.translateService.instant(item.label) +
                        (item.shortcutAction ? ` (${this.shortcutService.getShortcutTooltipForAction(item.shortcutAction)})` : ''),
                }))
            )
        );

        this.documentService.documentViewFilter$.pipe(takeUntilDestroyed()).subscribe((filter) => {
            this.isIssuesOnlyView = filter === IdpScreenViewFilter.OnlyIssues;
            this.issueFilter?.focus();
        });

        const issuesOnlyShortcut = this.shortcutService.getShortcutTooltipForAction(IdpShortcutAction.IssueOnlyFilter);
        this.issuesOnlyFilterTooltip =
            this.translateService.instant('IDP_CLASS_VERIFICATION.CLASS_LIST_HEADER.SHOW_ISSUES_TOOLTIP') +
            ' ' +
            (issuesOnlyShortcut ? `(${issuesOnlyShortcut})` : '');
    }

    onIssuesFilterChange(issueOnly: boolean) {
        this.documentService.setDocumentViewFilter(issueOnly ? IdpScreenViewFilter.OnlyIssues : IdpScreenViewFilter.All);
    }

    onSortChanged(event: MatSelectChange) {
        this.selectedSortOption = event.value as IdpScreenViewSortOption;
        this.documentService.setDocumentSortOption(this.selectedSortOption);
    }

    showToolbarActionItem(item: IdpDocumentActionToolBarItemsData): boolean {
        return item.displayOn === 'header' && item.renderType === 'dynamic';
    }

    getToolbarActionButtonDataAutomationId(item: IdpDocumentActionToolBarItemsData): string | null {
        switch (item.action) {
            case IdpDocumentAction.Undo: {
                return 'idp-undo-button';
            }
            case IdpDocumentAction.Redo: {
                return 'idp-redo-button';
            }
            default: {
                return null;
            }
        }
    }
}
