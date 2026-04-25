/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { REJECTED_CLASS_ID } from '../../models/screen-models';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { IdpDocumentClassService } from '../../services/document-class/idp-document-class.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { A11yModule } from '@angular/cdk/a11y';
import { ChangeClassListDialogData } from './change-class.dialog.extension';
import { TranslatePipe } from '@ngx-translate/core';
import { FilterableSelectionListComponent, FilterableSelectionListItem, IdentifierData } from '@hxp/workspace-hxp/idp-services-extension/shared';

@Component({
    templateUrl: './change-class.dialog.html',
    styleUrls: ['./change-class.dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        A11yModule,
        CommonModule,
        MatButtonModule,
        MatDialogModule,
        MatDividerModule,
        MatIconModule,
        TranslatePipe,
        FilterableSelectionListComponent,
    ],
})
export class ChangeClassListDialogComponent {
    private readonly documentClassService = inject(IdpDocumentClassService);
    private readonly dialogRef = inject(MatDialogRef<ChangeClassListDialogComponent>);
    private readonly dialogData: ChangeClassListDialogData = inject(MAT_DIALOG_DATA);

    items$!: Observable<FilterableSelectionListItem<IdentifierData>[]>;
    activeItemSubject$ = new BehaviorSubject<IdentifierData | undefined>(undefined);
    activeItem$: Observable<IdentifierData | undefined> = this.activeItemSubject$.asObservable();

    private readonly ignoredClassIds = [REJECTED_CLASS_ID];
    readonly contextSelectedClassId: string | undefined;

    constructor() {
        this.contextSelectedClassId = this.dialogData.currentClassId;

        this.items$ = this.documentClassService.allClasses$.pipe(
            takeUntilDestroyed(),
            map((items) => {
                return items
                    .filter((item) => !this.ignoredClassIds.includes(item.id))
                    .filter((item) => !item.ignoreForReview)
                    .map((item) => ({ item, id: item.id, name: item.name }));
            })
        );
    }

    onActiveItemChanged(item: IdentifierData | undefined): void {
        this.activeItemSubject$.next(item);
    }

    handleKeyEnter(event: Event, selectedItem?: IdentifierData): void {
        if (selectedItem) {
            this.dialogRef.close(selectedItem);
        }
        event.preventDefault();
    }
}
