/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { combineLatest, filter, map, Observable, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IdpDocumentToolbarService } from '../../services/document/idp-document-toolbar.service';
import { ClassListComponent } from '../document-browser/class-list/class-list.component';
import { ClassVerificationViewerComponent } from '../class-verification-viewer/class-verification-viewer.component';
import { ClassVerificationContextTaskService } from '../../services/context-task/class-verification-context-task.service';
import {
    SessionService,
    TaskHeaderLeadingContentDirective,
    TaskHeaderComponent,
    DiscardChangesDialogComponent,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { DocumentUploadButtonComponent } from '../document-upload/upload-button/upload-button.component';
import { MatCheckbox, MatCheckboxModule } from '@angular/material/checkbox';
import { IdpDocumentImportService } from '../../services/document-import/idp-document-import.service';
import { IdpDocumentClassService } from '../../services/document-class/idp-document-class.service';
import { NotificationService } from '@alfresco/adf-core';
import { IMPORT_ACCEPT_FILE_EXTENSIONS } from '../../constants';
import { MatDialog } from '@angular/material/dialog';

@Component({
    selector: 'hyland-idp-class-verification-root',
    templateUrl: './class-verification-root.component.html',
    styleUrls: ['./class-verification-root.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        A11yModule,
        ClassListComponent,
        ClassVerificationViewerComponent,
        CommonModule,
        TaskHeaderComponent,
        TaskHeaderLeadingContentDirective,
        MatButtonModule,
        MatProgressSpinnerModule,
        TranslatePipe,
        DocumentUploadButtonComponent,
        MatCheckbox,
        MatCheckboxModule,
    ],
})
export class ClassVerificationRootComponent {
    screenLoading$: Observable<boolean>;
    taskCanSave$: Observable<boolean>;
    taskCanComplete$: Observable<boolean>;
    taskShowUnclaim$: Observable<boolean>;
    taskUnclaimEnabled$: Observable<boolean>;

    readonly importAcceptedFileExtensions = IMPORT_ACCEPT_FILE_EXTENSIONS;
    readonly isDocumentImportEnabled$: Observable<boolean>;
    readonly isDocumentImportRunning$: Observable<boolean>;

    readonly isAutoNextTaskChecked$: Observable<boolean>;

    private taskCanSave = false;

    private readonly contextService = inject(ClassVerificationContextTaskService);
    private readonly documentToolbarService = inject(IdpDocumentToolbarService);
    private readonly documentImportService = inject(IdpDocumentImportService);
    private readonly documentClassService = inject(IdpDocumentClassService);
    private readonly notificationService = inject(NotificationService);
    private readonly sessionService = inject(SessionService);
    private readonly dialog = inject(MatDialog);

    constructor() {
        this.screenLoading$ = this.contextService.screenReady$.pipe(
            takeUntilDestroyed(),
            map((ready) => !ready)
        );
        this.taskCanSave$ = this.contextService.taskCanSave$.pipe(takeUntilDestroyed());
        this.taskCanSave$.pipe(takeUntilDestroyed()).subscribe((canSave) => {
            this.taskCanSave = canSave;
        });
        this.taskCanComplete$ = this.contextService.taskCanComplete$.pipe(takeUntilDestroyed());
        this.taskShowUnclaim$ = this.contextService.taskCanUnclaim$.pipe(takeUntilDestroyed());
        this.taskUnclaimEnabled$ = this.contextService.taskUnclaimEnabled$.pipe(takeUntilDestroyed());

        this.isDocumentImportEnabled$ = this.documentImportService.isDocumentImportEnabled$.pipe(takeUntilDestroyed());
        this.isDocumentImportRunning$ = this.documentImportService.isDocumentImportRunning$.pipe(takeUntilDestroyed());

        this.isAutoNextTaskChecked$ = this.sessionService.isAutoNextTaskChecked$.pipe(takeUntilDestroyed());

        combineLatest([this.contextService.screenReady$, this.documentClassService.allClasses$])
            .pipe(
                filter(([ready]) => ready),
                map(([, classes]) => classes.filter((c) => !c.isSpecialClass)),
                filter((nonSpecial) => nonSpecial.length > 0 && nonSpecial.every((c) => Boolean(c.ignoreForReview))),
                take(1),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                this.notificationService.showInfo('IDP_CLASS_VERIFICATION.NOTIFICATIONS.ALL_CLASSES_IGNORED_FOR_REVIEW');
            });
    }

    @HostListener('window:keyup', ['$event'])
    onKeyUp(event: KeyboardEvent): void {
        this.onShortcutKey(event);
    }

    onSubmit(isAutoNextTaskChecked: boolean | undefined = false): void {
        this.contextService.completeTask(isAutoNextTaskChecked);
    }

    onSave(): void {
        this.contextService.saveTask();
    }

    onUnclaim(): void {
        if (this.taskCanSave) {
            DiscardChangesDialogComponent.open(this.dialog, () => this.contextService.unclaimTask());
        } else {
            this.contextService.unclaimTask();
        }
    }

    onUploadDocuments(files: File[]): void {
        this.documentImportService.queueDocumentUpload(files);
    }

    private onShortcutKey(event: KeyboardEvent): boolean {
        if (event.repeat) {
            event.preventDefault();
            return true;
        }
        return !this.documentToolbarService.handleShortcutAction(event);
    }

    onNextTaskCheckboxCheckedChanged() {
        this.sessionService.toggleAutoNextTask();
    }
}
