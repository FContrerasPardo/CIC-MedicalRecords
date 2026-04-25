/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ContentChild,
    DestroyRef,
    Directive,
    ElementRef,
    inject,
    Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { IdpContextTaskBaseService } from '../../services/context-task/context-task-base.service';
import { IdpTaskInfoBase } from '../../models/common-models';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DiscardChangesDialogComponent } from '../../dialogs/discard-changes-dialog/discard-changes-dialog';

@Directive({
    selector: '[hylandIdpTaskHeaderLeadingContent]',
})
export class TaskHeaderLeadingContentDirective {}

@Directive({
    selector: '[hylandIdpTaskHeaderTrailingContent]',
})
export class TaskHeaderTrailingContentDirective {}

@Component({
    selector: 'hyland-idp-task-header',
    templateUrl: './task-header.component.html',
    styleUrls: ['./task-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatButtonModule, MatIconModule, TranslatePipe],
})
export class TaskHeaderComponent implements AfterContentInit {
    @ContentChild(TaskHeaderLeadingContentDirective, { static: false }) leadingContent: ElementRef | undefined;
    @ContentChild(TaskHeaderTrailingContentDirective, { static: false }) trailingContent: ElementRef | undefined;

    headerInfo$: Observable<IdpTaskInfoBase>;
    hasLeadingContent = false;
    hasTrailingContent = false;

    private readonly destroyRef = inject(DestroyRef);
    private readonly contextTaskService = inject(IdpContextTaskBaseService);
    private readonly dialog = inject(MatDialog);
    private readonly injector = inject(Injector);
    taskCanSave = false;

    constructor() {
        this.headerInfo$ = this.contextTaskService.taskInfo$.pipe(
            filter((task) => !!task),
            takeUntilDestroyed(this.destroyRef)
        );
        this.contextTaskService.taskCanSave$.subscribe((v) => {
            this.taskCanSave = v;
        });
    }

    ngAfterContentInit(): void {
        this.hasLeadingContent = !!this.leadingContent;
        this.hasTrailingContent = !!this.trailingContent;
    }

    goBack() {
        if (!this.taskCanSave) {
            this.contextTaskService.cancelTask();
            return;
        }
        const dialogConfig: MatDialogConfig = {
            injector: this.injector,
            width: '600px',
            height: 'auto',
            autoFocus: '.idp-discard-changes-dialog__close-button',
            restoreFocus: true,
        };
        const dialogRef = this.dialog.open(DiscardChangesDialogComponent, dialogConfig);
        dialogRef.afterClosed().subscribe((result) => {
            if (result === true) {
                this.contextTaskService.cancelTask();
            }
        });
    }

    generateAutomationId(label: string): string {
        if (!label) {
            return '';
        }
        return 'header-' + label.toLowerCase().replaceAll(' ', '-');
    }
}
