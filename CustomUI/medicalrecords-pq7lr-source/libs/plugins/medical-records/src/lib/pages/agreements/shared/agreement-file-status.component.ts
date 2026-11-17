import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { agreementFileVersion } from '../store/agreement-store.util';
import { AgreementFileLoadResult } from '../store/agreement-repository.service';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS.FILE';

/** Where a file of the agreement comes from: origin, Appdata path, modification date and version. */
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
                <code class="file-status__path" [title]="file.path">{{ file.path }}</code>
                @if (version) {
                    <span class="file-status__meta">{{ i18n + '.VERSION' | translate }} <code>{{ version }}</code></span>
                }
                @if (file.modifiedAt) {
                    <span class="file-status__meta">{{ i18n + '.MODIFIED' | translate }} {{ file.modifiedAt | date: 'dd/MM/yyyy HH:mm' }}</span>
                }
            </div>
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
            .file-status__path {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding: 1px 6px;
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.65);
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                font-size: 11.5px;
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
    @Input() file: AgreementFileLoadResult | null = null;

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
