import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { agreementFileVersion } from '../store/agreement-store.util';
import { AgreementFileLoadResult, AgreementRepositoryService } from '../store/agreement-repository.service';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS.FILE';

/** State of a file of the agreement: origin, version, modification date and language (the path is in the technical diagnostics). */
@Component({
    selector: 'medical-records-agreement-file-status',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (file) {
            <div class="file-status file-status--{{ file.legacy ? 'legacy' : file.source }}" role="note">
                <span class="material-icons" aria-hidden="true">{{ icon }}</span>
                <span class="file-status__label">{{ i18n + '.SOURCE_' + (file.legacy ? 'LEGACY' : (file.source | uppercase)) | translate }}</span>
                @if (version) {
                    <span class="file-status__meta">{{ i18n + '.VERSION' | translate }} <code>{{ version }}</code></span>
                }
                @if (file.modifiedAt) {
                    <span class="file-status__meta">{{ i18n + '.MODIFIED' | translate }} {{ file.modifiedAt | date: 'dd/MM/yyyy HH:mm' }}</span>
                }
                @if (file.language) {
                    <span class="file-status__lang" [title]="i18n + '.LANGUAGE_HINT' | translate">{{ file.language | uppercase }}</span>
                }
            </div>
            @if (file.missingLanguage && file.language) {
                <div class="file-status file-status--legacy" role="note">
                    <span class="material-icons" aria-hidden="true">translate</span>
                    <span>{{ i18n + '.MISSING_LANGUAGE' | translate: { language: (file.language | uppercase) } }}</span>
                    <button type="button" class="file-status__action" (click)="createLanguage()" [disabled]="creating">
                        <span class="material-icons" aria-hidden="true">add</span>{{ (creating ? i18n + '.CREATING' : i18n + '.CREATE_LANGUAGE') | translate: { language: (file.language | uppercase) } }}
                    </button>
                    @if (createError) {
                        <span role="alert">{{ i18n + '.SAVE_ERROR' | translate }}</span>
                    }
                </div>
            }
            @if (file.baseVersion) {
                <div class="file-status file-status--default" role="note">
                    <span class="material-icons" aria-hidden="true">sync_problem</span>
                    <span>{{ i18n + '.BASE_NEWER' | translate: { version: file.baseVersion } }}</span>
                </div>
            }
        }
    `,
    styles: [
        `
            .file-status {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 6px 10px;
                padding: 8px 12px;
                border-radius: 12px;
                border: 1px solid transparent;
                font-size: 12.5px;
                line-height: 1.4;
            }
            .file-status .material-icons {
                font-size: 18px;
            }
            .file-status__label {
                font-weight: 600;
            }
            .file-status__lang {
                padding: 1px 7px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.75);
                font-size: 11px;
                font-weight: 700;
            }
            .file-status__action {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 3px 10px;
                border: 1px solid currentColor;
                border-radius: 999px;
                background: #fff;
                color: inherit;
                font: inherit;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
            }
            .file-status__action .material-icons {
                font-size: 16px;
            }
            .file-status + .file-status {
                margin-top: 6px;
            }
            .file-status__meta {
                color: var(--mr-muted, #667085);
            }
            .file-status--appdata {
                border-color: rgba(18, 128, 92, 0.25);
                background: rgba(18, 128, 92, 0.07);
                color: #0d6b4d;
            }
            .file-status--default,
            .file-status--legacy {
                border-color: rgba(0, 71, 141, 0.2);
                background: rgba(0, 94, 184, 0.06);
                color: var(--mr-primary, #00478d);
            }
            .file-status--invalid {
                border-color: rgba(186, 26, 26, 0.25);
                background: rgba(186, 26, 26, 0.06);
                color: #ba1a1a;
            }
        `,
    ],
})
export class AgreementFileStatusComponent {
    private readonly repository = inject(AgreementRepositoryService);
    private readonly cdr = inject(ChangeDetectorRef);

    @Input() file: AgreementFileLoadResult | null = null;
    /** The missing language version was created from what is shown: the page reloads the file. */
    @Output() readonly languageCreated = new EventEmitter<void>();

    creating = false;
    createError = false;

    async createLanguage(): Promise<void> {
        if (!this.file?.language || this.creating) {
            return;
        }
        this.creating = true;
        this.createError = false;
        this.cdr.markForCheck();
        try {
            await this.repository.createLanguageVersion(this.file, this.file.language);
            this.languageCreated.emit();
        } catch {
            this.createError = true;
        } finally {
            this.creating = false;
            this.cdr.markForCheck();
        }
    }

    readonly i18n = I18N;

    get icon(): string {
        if (!this.file) {
            return 'info';
        }
        if (this.file.legacy) {
            return 'history';
        }
        return this.file.source === 'appdata' ? 'cloud_done' : this.file.source === 'invalid' ? 'error' : 'inventory_2';
    }

    get version(): string {
        return this.file ? agreementFileVersion(this.file.kind, this.file.content) : '';
    }
}
