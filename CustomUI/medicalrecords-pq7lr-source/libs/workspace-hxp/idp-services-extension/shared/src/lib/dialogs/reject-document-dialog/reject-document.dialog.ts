/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, SecurityContext } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { IdpContextTaskBaseService } from '../../services/context-task/context-task-base.service';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import {
    FilterableSelectionListComponent,
    FilterableSelectionListItem,
} from '../../components/filterable-selection-list/filterable-selection-list.component';
import { RejectReason } from '../../models/contracts/task-input';
import { A11yModule } from '@angular/cdk/a11y';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextFieldModule } from '@angular/cdk/text-field';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

export class RejectDocumentDialogData {
    constructor(public rejectReasonId: string, public rejectNote?: string) {}
}
@Component({
    templateUrl: './reject-document.dialog.html',
    styleUrls: ['./reject-document.dialog.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        A11yModule,
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatDialogModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        ReactiveFormsModule,
        TextFieldModule,
        TranslatePipe,
        FilterableSelectionListComponent,
    ],
})
export class RejectDocumentDialogComponent {
    private readonly contextService = inject(IdpContextTaskBaseService);
    private readonly dialogRef = inject(MatDialogRef<RejectDocumentDialogComponent>);
    private readonly formBuilder = inject(FormBuilder);
    private readonly sanitizer = inject(DomSanitizer);
    public readonly data?: RejectDocumentDialogData = inject(MAT_DIALOG_DATA);

    items$!: Observable<FilterableSelectionListItem<RejectReason>[]>;
    activeItemSubject$ = new BehaviorSubject<RejectReason | undefined>(undefined);
    activeItem$: Observable<RejectReason | undefined> = this.activeItemSubject$.asObservable();
    rejectNoteMaxLength = 250;
    isRejected = !!this.data && !!this.data.rejectReasonId;
    selectedRejectReasonId?: string;

    rejectForm: FormGroup;

    constructor() {
        this.items$ = this.contextService.rejectReasons$.pipe(
            takeUntilDestroyed(),
            map((items) => items.map((item) => ({ item, id: item.id, name: item.value })))
        );

        this.rejectForm = this.formBuilder.group({
            rejectNote: [undefined],
        });

        if (this.data) {
            this.selectedRejectReasonId = this.data.rejectReasonId;
            if (this.data.rejectNote) {
                this.rejectNote = this.data.rejectNote;
            }
        }
    }

    get rejectNote(): string {
        return this.rejectForm.controls['rejectNote'].value;
    }

    private set rejectNote(value: string) {
        this.rejectForm.setValue({ rejectNote: value });
    }

    get sanitizedRejectNote(): string | undefined {
        return this.rejectNote ? this.sanitizer.sanitize(SecurityContext.HTML, this.rejectNote) ?? undefined : undefined;
    }

    onActiveItemChanged(item: RejectReason | undefined): void {
        this.activeItemSubject$.next(item);
    }

    handleKeyEnter(event: Event, selectedItem?: RejectReason): void {
        if (selectedItem) {
            this.dialogRef.close({ rejectReason: selectedItem, rejectNote: this.sanitizedRejectNote });
        }
        event.preventDefault();
    }
}
