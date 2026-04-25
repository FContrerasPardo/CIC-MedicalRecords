/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable, TemplateRef, inject } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmDialogData, DialogData, MultipleChoiceDialogData } from '../interfaces/dialog.interface';
import { InfoDialogComponent } from '../components/info-dialog/info-dialog.component';
import { MultipleChoiceDialogComponent, MultipleChoiceDialogReturnType } from '../components/multiple-choice-dialog/multiple-choice-dialog.component';
import { ComponentType } from '@angular/cdk/portal';
import { ScrollStrategyOptions } from '@angular/cdk/overlay';

export const DEFAULT_DIALOG_WIDTH_NUMBER = 464;
export const DEFAULT_DIALOG_WIDTH = `${DEFAULT_DIALOG_WIDTH_NUMBER}px`;

@Injectable({
    providedIn: 'root',
})
export class DialogService {
    private dialog = inject(MatDialog);
    private readonly scrollStrategyOptions = inject(ScrollStrategyOptions);


    private subscribeKeydownStop(dialogRef: MatDialogRef<any>): void {
        if (dialogRef && dialogRef instanceof MatDialogRef) {
            dialogRef
                .keydownEvents()
                .pipe(takeUntil(dialogRef.afterClosed()))
                .subscribe((event: KeyboardEvent) => event.stopPropagation());
        }
    }

    openDialog<T>(dialog: ComponentType<T> | TemplateRef<T>, options = {}): MatDialogRef<T> {
        const dialogRef = this.dialog.open(dialog, {
            minWidth: DEFAULT_DIALOG_WIDTH,
            autoFocus: true,
            restoreFocus: true,
            scrollStrategy: this.scrollStrategyOptions.noop(),
            ...options,
        });

        this.subscribeKeydownStop(dialogRef);

        return dialogRef;
    }

    closeAll(): void {
        this.dialog.closeAll();
    }

    info(dialogData?: DialogData, options = {}): Observable<any> {
        return this.openObservableDialog(InfoDialogComponent, { disableClose: true, ...options }, dialogData);
    }

    confirm(dialogData?: ConfirmDialogData, options = {}): Observable<boolean> {
        return this.openObservableDialog(ConfirmationDialogComponent, { disableClose: true, ...options }, dialogData);
    }

    private openObservableDialog(dialog: ComponentType<unknown>, options: Partial<MatDialogConfig> = {}, data: DialogData = {}): Observable<any> {
        const dialogSubject = new Subject<any>();

        const dialogRef = this.dialog.open(dialog, {
            width: DEFAULT_DIALOG_WIDTH,
            autoFocus: true,
            restoreFocus: true,
            scrollStrategy: this.scrollStrategyOptions.noop(),
            ...options,
            data: {
                ...data,
                subject: dialogSubject,
            },
        });

        this.subscribeKeydownStop(dialogRef);

        return dialogSubject.asObservable();
    }

    openMultipleChoiceDialog<T>(dialogData: MultipleChoiceDialogData<T>): Observable<MultipleChoiceDialogReturnType<T>> {
        const subjectMultipleChoice = new Subject<MultipleChoiceDialogReturnType<T>>();

        const dialogRef = this.dialog.open(MultipleChoiceDialogComponent, {
            width: DEFAULT_DIALOG_WIDTH,
            autoFocus: true,
            restoreFocus: true,
            scrollStrategy: this.scrollStrategyOptions.noop(),
            disableClose: true,
            data: {
                ...dialogData,
                subject: subjectMultipleChoice,
            },
        });

        this.subscribeKeydownStop(dialogRef);

        return subjectMultipleChoice.asObservable();
    }
}
