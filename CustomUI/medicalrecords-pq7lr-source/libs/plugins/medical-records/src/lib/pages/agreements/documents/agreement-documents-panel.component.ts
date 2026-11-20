import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AttachFileDialogData, SelectionMode } from '@hxp/shared-hxp/form-widgets/feature-shell';
import { isPendingDocument, PendingDocument, SharedAttachFileDialogService } from '@hxp/shared-hxp/services';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { of, Subject, take } from 'rxjs';
import { CaseDocument } from '../../case-detail/case-detail.model';
import { CaseDocumentViewerComponent } from '../../case-detail/case-document-viewer.component';
import { AgreementHelpCoachComponent } from '../shared/agreement-help-coach.component';
import { AgreementFileLoadResult, AgreementRepositoryService } from '../store/agreement-repository.service';
import { agreementContractFolderPath, cloneJson, stampAgreementFile } from '../store/agreement-store.util';
import {
    AGREEMENT_DOCUMENT_TYPES,
    AgreementContractFile,
    agreementContractFiles,
    AgreementDocumentType,
    contractFileValidity,
    withContractFiles,
    withoutContractFile,
} from './agreement-documents.util';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS';

/**
 * «Documents» tab: upload and consult the contract and annexes of the agreement. Upload uses the
 * native attach dialog, like the radication (`SharedAttachFileDialogService`), on
 * `/MedRec/Appdata/Agreements/<agreementId>/Contract/`; the references are saved in `agreement.json`
 * and opened with the case document viewer. Knowledge Discovery (place
 * `agreements.<agreementId>.documents`) is offered by the page's floating agent, not by this panel.
 */
@Component({
    selector: 'medical-records-agreement-documents-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AgreementHelpCoachComponent, CaseDocumentViewerComponent],
    templateUrl: './agreement-documents-panel.component.html',
    styleUrls: ['../agreements-page.component.scss'],
})
export class AgreementDocumentsPanelComponent implements OnChanges {
    private readonly repository = inject(AgreementRepositoryService);
    private readonly attachFileDialog = inject(SharedAttachFileDialogService, { optional: true });

    @Input() agreementId = '';
    @Input() file: AgreementFileLoadResult | null = null;
    @Input() providerName = '';
    @Input() active = true;
    @Output() saved = new EventEmitter<void>();

    readonly i18n = I18N;
    readonly types = AGREEMENT_DOCUMENT_TYPES;

    files: AgreementContractFile[] = [];
    uploadType: AgreementDocumentType = 'CONTRACT';
    validFrom = '';
    validTo = '';
    working = false;
    error: 'UPLOAD' | 'SAVE' | null = null;
    done: string | null = null;
    viewerDocument: CaseDocument | null = null;

    get folderPath(): string {
        return agreementContractFolderPath(this.agreementId);
    }

    get pickerAvailable(): boolean {
        return !!this.attachFileDialog;
    }

    get agreementName(): string {
        const general = (this.file?.content['general'] as Record<string, unknown>) ?? {};
        return [general['contractId'], general['planName']].filter(Boolean).join(' · ') || this.agreementId;
    }

    ngOnChanges(): void {
        this.files = agreementContractFiles(this.file?.content ?? {});
        const general = (this.file?.content['general'] as Record<string, unknown>) ?? {};
        this.validFrom ||= String(general['effectiveFrom'] ?? '');
        this.validTo ||= String(general['effectiveTo'] ?? '');
    }

    validity(file: AgreementContractFile): string {
        return contractFileValidity(file).toUpperCase();
    }

    /** Opens the native attach dialog on the agreement's contract folder (created when missing). */
    async upload(): Promise<void> {
        if (!this.attachFileDialog || !this.file || this.working) {
            return;
        }
        this.working = true;
        this.error = null;
        this.done = null;
        let folder: string;
        try {
            folder = await this.repository.ensureContractFolder(this.agreementId);
        } catch {
            this.working = false;
            this.error = 'UPLOAD';
            return;
        }
        const selectionSubject$ = new Subject<(Document | PendingDocument)[]>();
        const dialogData: AttachFileDialogData = {
            selectionMode: SelectionMode.multiple,
            selectionSubject$,
            isLocalUploadAvailable: true,
            isContentUploadAvailable: true,
            defaultDocumentPath$: of(folder),
            contentType: 'SysFile',
        };
        selectionSubject$.pipe(take(1)).subscribe({
            next: (selection) => void this.attach(selection ?? []),
            error: () => {
                this.working = false;
                this.error = 'UPLOAD';
            },
        });
        this.attachFileDialog.openDialog(dialogData);
        // The dialog may be closed without a selection: the button is enabled again right away.
        this.working = false;
    }

    async remove(entry: AgreementContractFile): Promise<void> {
        if (!this.file || entry.declared || this.working) {
            return;
        }
        await this.save(withoutContractFile(cloneJson(this.file.content), entry.documentId), 'REMOVED');
    }

    view(entry: AgreementContractFile): void {
        this.viewerDocument = {
            categoryKey: `${I18N}.DOCUMENTS.TYPE_${entry.type}`,
            name: entry.name,
            classification: 'attached',
            classificationKey: `${I18N}.DOCUMENTS.TYPE_${entry.type}`,
            date: entry.validFrom || null,
            originKey: `${I18N}.DOCUMENTS.TITLE`,
            referenceKey: entry.documentId,
            nodeId: entry.documentId || null,
            mimeType: entry.mimeType || (/\.pdf$/i.test(entry.name) ? 'application/pdf' : null),
        };
    }

    private async attach(selection: readonly (Document | PendingDocument)[]): Promise<void> {
        const now = new Date().toISOString();
        const added: AgreementContractFile[] = selection
            .map((item) => (isPendingDocument(item) ? item.document : item))
            .filter((document): document is Document => !!document?.sys_id && !document.sys_isFolderish)
            .map((document) => ({
                documentId: document.sys_id as string,
                name: String(document.sys_name ?? document.sys_title ?? document.sys_id),
                type: this.uploadType,
                validFrom: this.validFrom,
                validTo: this.validTo,
                mimeType: String((document as { sysfile_blob?: { mimeType?: string } }).sysfile_blob?.mimeType ?? ''),
                addedAt: now,
            }));
        if (!added.length || !this.file) {
            return;
        }
        await this.save(withContractFiles(cloneJson(this.file.content), added), 'ADDED');
    }

    private async save(content: Record<string, unknown>, done: string): Promise<void> {
        if (!this.file) {
            return;
        }
        this.working = true;
        this.error = null;
        try {
            await this.repository.saveAgreementFile(this.file, stampAgreementFile('agreement', { ...content, agreementId: this.agreementId }));
            this.done = done;
            this.saved.emit();
        } catch {
            this.error = 'SAVE';
        } finally {
            this.working = false;
        }
    }
}
