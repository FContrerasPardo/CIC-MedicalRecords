/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { HumanReadableChoice } from '../../interfaces/dialog.interface';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { A11yModule } from '@angular/cdk/a11y';

export interface MultipleChoiceDialogPayload<T> {
    subject: Subject<MultipleChoiceDialogReturnType<T>>;
    choices?: HumanReadableChoice<T>[];
    title?: string;
    subtitle?: string;
    messages?: string[];
    message?: string;
}

export interface MultipleChoiceDialogReturnType<T> {
    dialogRef: MatDialogRef<MultipleChoiceDialogComponent<T>>;
    choice: T;
}

@Component({
    templateUrl: './multiple-choice-dialog.component.html',
    styleUrl: './multiple-choice-dialog.component.scss',
    imports: [MatProgressSpinnerModule, MatDialogModule, MatButtonModule, TranslatePipe, A11yModule],
})
export class MultipleChoiceDialogComponent<T> implements OnInit {
    dialog = inject<MatDialogRef<MultipleChoiceDialogComponent<T>>>(MatDialogRef);
    data = inject<MultipleChoiceDialogPayload<T>>(MAT_DIALOG_DATA, { optional: true });

    title!: string;
    subtitle!: string;
    messages: string[] = [];
    message!: string;
    subject!: Subject<MultipleChoiceDialogReturnType<T>>;
    choices!: HumanReadableChoice<T>[];
    loading: Record<string, boolean> = {};
    disableButtons = false;

    ngOnInit() {
        if (!this.data) {
            return;
        }
        this.title = this.data.title ?? '';
        this.subtitle = this.data.subtitle ?? '';
        this.messages = this.data.messages ?? [];
        this.message = this.data.message ?? '';
        this.choices = this.data.choices ?? [];
        this.subject = this.data.subject;
    }

    choose(choice: any): void {
        this.disableButtons = true;
        this.loading[choice] = true;
        this.subject.next({ dialogRef: this.dialog, choice });
        this.subject.complete();
    }

    isSpinnerVisible(choice: any) {
        return choice.spinnable && this.loading[choice.choice];
    }
}
