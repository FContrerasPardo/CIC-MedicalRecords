/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { AfterViewInit, Component, ViewEncapsulation, OnDestroy, signal, computed, inject } from '@angular/core';
import {
    FormModel,
    ThumbnailService,
    UploadWidgetContentLinkModel,
    WidgetComponent,
    ErrorWidgetComponent,
    ViewerComponent,
    JwtHelperService,
    FormFieldModel,
} from '@alfresco/adf-core';
import { of, Subject } from 'rxjs';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { AttachFileDialogData, SelectionMode } from './models/attach-file-dialog-data.interface';
import { FileSourceServiceId } from './models/file-source-service-id';
import {
    SharedAttachFileDialogService,
    FormSubmitterIdValue,
    Permissions,
    PendingDocument,
    PendingDocumentCleanupService,
    isPendingDocument,
    HxpPendingDocumentService,
    PENDING_DOCUMENT_SERVICE
} from '@hxp/shared-hxp/services';
import { finalize, map, startWith, switchMap, take, tap } from 'rxjs/operators';
import { FormWidgetService } from '../../services/form-widget/form-widget.service';
import { DOCUMENT_SERVICE, SharedDocumentService } from '@alfresco/adf-hx-content-services/services';
import { TranslatePipe } from '@ngx-translate/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { TableSkeletonLoaderComponent } from '@alfresco/adf-hx-content-services/ui';
import { DownloadInfo } from '../../model/download-info.model';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { STUDIO_SHARED } from '@features';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';

export interface AttachedFileViewModel {
    id: string;
    title: string;
    fileName: string;
    icon: string;
    isPending: boolean;
    isBlobMissing: boolean;
    source: Document | PendingDocument;
}

@Component({
    selector: 'hxp-attach-file-widget',
    templateUrl: './attach-file.widget.html',
    styleUrls: ['./attach-file.widget.scss'],
    host: {
        '(click)': 'event($event)',
        '(blur)': 'event($event)',
        '(change)': 'event($event)',
        '(focus)': 'event($event)',
        '(focusin)': 'event($event)',
        '(focusout)': 'event($event)',
        '(input)': 'event($event)',
        '(invalid)': 'event($event)',
        '(select)': 'event($event)',
    },
    encapsulation: ViewEncapsulation.None,
    imports: [
        MatButtonModule,
        MatTooltipModule,
        MatIconModule,
        MatTableModule,
        MatMenuModule,
        TableSkeletonLoaderComponent,
        ErrorWidgetComponent,
        ViewerComponent,
        TranslatePipe,
    ],
})
export class AttachFileWidgetComponent extends WidgetComponent implements AfterViewInit, OnDestroy {
    private readonly dialogService = inject(SharedAttachFileDialogService);
    private readonly thumbnailService = inject(ThumbnailService);
    private readonly formWidgetService = inject(FormWidgetService);
    private readonly documentService = inject<SharedDocumentService>(DOCUMENT_SERVICE);
    protected readonly featuresService = inject<IFeaturesService>(FeaturesServiceToken);
    private readonly jwtHelperService = inject(JwtHelperService);
    private readonly cleanupService = inject(PendingDocumentCleanupService);
    private readonly documentOps = inject<HxpPendingDocumentService | null>(PENDING_DOCUMENT_SERVICE, { optional: true });

    private static readonly VARIABLES_PREFIX = 'variables.';

    readonly selectedId = signal<string | null>(null);
    lastSentToViewers: Document | PendingDocument | null = null;
    viewingFile: DownloadInfo | null = null;
    readonly isLoading = signal(true);
    readonly attachedFiles = signal<AttachedFileViewModel[]>([]);
    readonly hasAttachedFiles = computed(() => this.attachedFiles().length > 0);
    readonly isAttachButtonDisabled = computed(() => this.hasAttachedFiles() && !this.field.params['multiple']);

    private readonly isPendingDocFeatureEnabled: ReturnType<typeof toSignal<boolean>>;

    constructor() {
        super();

        this.isPendingDocFeatureEnabled = toSignal(this.featuresService.isOn$(STUDIO_SHARED.FORMS_DEFERRED_DOC_CREATION), {
            initialValue: false,
        });

        this.fieldChanged.pipe(
            startWith(this.field),
            switchMap((field: FormFieldModel) => {
                this.isLoading.set(true);
                return this.formWidgetService.getDocumentsFromField(field).pipe(
                    finalize(() => this.isLoading.set(false)),
                );
            }),
            map((files: (Document | PendingDocument)[]) => files.map((file) => this.mapToViewModel(file))),
            tap((files) => this.attachedFiles.set(files)),
            takeUntilDestroyed(),
        ).subscribe({});
    }

    ngOnDestroy(): void {
        if (this.isPendingDocFeatureEnabled() && this.documentOps) {
            this.cleanupService.cleanupUnpersisted(this.documentOps).catch(() => {});
        }
    }

    private mapToViewModel(item: Document | PendingDocument): AttachedFileViewModel {
        const isPending = this.isPendingDocFeatureEnabled() && isPendingDocument(item);
        const doc = isPending ? (item as PendingDocument).document : (item as Document);

        return {
            id: doc.sys_id ?? '',
            title: doc?.['sysfile_blob']?.['title'] || doc?.sys_title || '',
            fileName: doc?.['sysfile_blob']?.['filename'] || doc?.sys_name || '',
            icon: this.thumbnailService.getMimeTypeIcon(doc?.['sysfile_blob']?.['mimeType']),
            isPending,
            isBlobMissing: !doc?.['sysfile_blob'],
            source: item,
        };
    }

    showActionsMenu(): boolean {
        const menuOptions = this.field.params.menuOptions;
        return !!(menuOptions?.show || menuOptions?.download || menuOptions?.remove);
    }

    private getFileId(item: Document | PendingDocument): string {
        if (this.isPendingDocFeatureEnabled() && isPendingDocument(item)) {
            return item.document.sys_id ?? '';
        }
        return (item as Document).sys_id ?? '';
    }

    clearFileData(): void {
        this.viewingFile = null;
    }

    onViewOptionClicked(fileVm: AttachedFileViewModel): void {
        const document = fileVm.isPending
            ? (fileVm.source as PendingDocument).document
            : (fileVm.source as Document);
        this.formWidgetService
            .getViewerContentFromDocument(document)
            .pipe(take(1))
            .subscribe((fileData) => {
                this.viewingFile = fileData;
            });
    }

    onRemoveOptionClicked(fileVm: AttachedFileViewModel): void {
        if (this.selectedId() === fileVm.id) {
            this.selectedId.set(null);
        }
        if (fileVm.isPending && this.documentOps) {
            void this.cleanupService.untrackAndDelete(fileVm.id, this.documentOps);
        }
        this.field.value = this.field.value.filter((f: Document | PendingDocument) => this.getFileId(f) !== fileVm.id);
        this.syncFieldValueToForm();
        this.fieldChanged.emit(this.field);
        this.notifySubscribedViewers();
    }

    onDownloadClicked(fileVms: AttachedFileViewModel[]): void {
        const documentsOnly = fileVms.map((vm) =>
            vm.isPending ? (vm.source as PendingDocument).document : (vm.source as Document)
        );
        this.dialogService.downloadDocuments(documentsOnly);
    }

    onRowClicked(fileVm: AttachedFileViewModel): void {
        if (this.selectedId() === fileVm.id) {
            this.selectedId.set(null);
        } else {
            const index = this.field.value.findIndex((f: Document | PendingDocument) => this.getFileId(f) === fileVm.id);
            if (index >= 0) {
                this.field.value.splice(index, 1);
                this.field.value.unshift(fileVm.source);
                this.notifySubscribedViewers();
                this.field.value.splice(0, 1);
                this.field.value.splice(index, 0, fileVm.source);
                this.syncFieldValueToForm();
            }

            this.selectedId.set(fileVm.id);
        }
    }

    async openSelectDialog(): Promise<void> {
        this.openUploadFileDialog().subscribe((attachedFiles: (Document | PendingDocument)[]) => {
            if (!this.field.value || !Array.isArray(this.field.value)) {
                this.field.value = attachedFiles;
            }

            for (const attachedFile of attachedFiles) {
                const fileId = this.getFileId(attachedFile);
                const index = this.field.value.findIndex((file: Document | PendingDocument) => {
                    return this.getFileId(file) === fileId;
                });
                if (index === -1) {
                    this.addFileToFieldValue(attachedFile);
                } else {
                    this.replaceFileInFieldValue(index, attachedFile);
                }
            }

            this.syncFieldValueToForm();
            this.notifySubscribedViewers();
            this.fieldChanged.emit(this.field);
        });
    }

    private getFilePermissions(): Permissions {
        const filePermissions = this.field?.params?.filePermissions;

        if (!filePermissions || !Array.isArray(filePermissions)) {
            return [];
        }

        const userId = this.jwtHelperService.getValueFromLocalIdToken<string>('sub') ?? '';

        if (!userId?.trim()) {
            return filePermissions.filter((perm) => !('user' in perm) || perm.user?.id !== FormSubmitterIdValue);
        }

        return filePermissions.map((perm) => {
            if (perm.user?.id === FormSubmitterIdValue) {
                return {
                    ...perm,
                    user: { id: userId },
                };
            }
            return perm;
        }) as Permissions;
    }

    private openUploadFileDialog(): Subject<(Document | PendingDocument)[]> {
        const selectionSubject$ = new Subject<(Document | PendingDocument)[]>();
        const filePermissions = this.getFilePermissions();
        const contentType = this.field?.params?.contentType;

        const data: AttachFileDialogData = {
            selectionMode: this.field.params['multiple'] ? SelectionMode.multiple : SelectionMode.single,
            selectionSubject$,
            isLocalUploadAvailable: false,
            isContentUploadAvailable: true,
            defaultDocumentPath$: of(),
            ...(filePermissions ? { filePermissions } : {}),
            ...(contentType ? { contentType } : {}),
        };

        const serviceId = this.field?.params?.fileSource?.serviceId;
        const isLocal = serviceId === FileSourceServiceId.HXP_LOCAL;
        const isContent = serviceId === FileSourceServiceId.HXP_CONTENT;
        const isAllFileSources = serviceId === FileSourceServiceId.ALL_FILE_SOURCES;

        const path = this.field?.params?.fileSource?.destinationFolderPath?.value;
        let path$ = of(path);

        if (path) {
            if (this.field?.params?.fileSource?.destinationFolderPath?.type === 'string-variable') {
                path$ = of(this.getVariableValue(this.field.form, path));
            } else if (this.field?.params?.fileSource?.destinationFolderPath?.type === 'content-variable') {
                const contentReference = this.formWidgetService.createContentReference(this.getVariableValue(this.field.form, path));
                path$ = (
                    contentReference.type === 'path'
                        ? this.documentService.getDocumentByPath(contentReference.reference!)
                        : this.documentService.getDocumentById(contentReference.reference!)
                ).pipe(
                    take(1),
                    map((doc) => doc.sys_path)
                );
            }
        }

        data.defaultDocumentPath$ = path$;
        data.isLocalUploadAvailable = isLocal || isAllFileSources;
        data.isContentUploadAvailable = isContent || isAllFileSources;

        this.dialogService.openDialog(data);

        return selectionSubject$;
    }

    private getVariableValue(form: FormModel, variableName: string): any {
        const variable = form.variables.find((existingVar) => existingVar.name === variableName);
        if (!variable) {
            return null;
        }
        if (form.processVariables && form.processVariables.length > 0) {
            const processVar = form.processVariables.find(
                (processVariable) => processVariable.name === AttachFileWidgetComponent.VARIABLES_PREFIX + variableName
            );
            if (processVar) {
                return processVar.value;
            }
        }
        return variable.value;
    }

    private notifySubscribedViewers(): void {
        const currentFirstItem = this.field.value?.[0];
        const lastId = this.lastSentToViewers ? this.getFileId(this.lastSentToViewers) : null;
        const currentId = currentFirstItem ? this.getFileId(currentFirstItem) : null;

        if (lastId !== currentId) {
            this.lastSentToViewers = currentFirstItem;
            const linkModel = new UploadWidgetContentLinkModel(null, this.field.id, { linkedWidgetType: 'hxpUploadWidget' });
            this.formService?.formContentClicked.next(linkModel);
        }
    }

    private replaceFileInFieldValue(index: number, attachedFile: Document | PendingDocument): void {
        this.field.value[index] = attachedFile;
    }

    private addFileToFieldValue(attachedFile: Document | PendingDocument): void {
        this.field.value.push(attachedFile);
    }

    private syncFieldValueToForm(): void {
        if (this.field?.form?.values) {
            this.field.form.values[this.field.id] = this.field.value;
        }
    }
}
