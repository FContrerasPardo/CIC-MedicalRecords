import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { KnowledgeDiscoveryPlaceService } from './knowledge-discovery-place.service';
import { KnowledgeDiscoveryLink, KnowledgeDiscoveryLinkSource, validateKnowledgeDiscoveryInput } from './knowledge-discovery-place.util';

const I18N = 'MEDICAL_RECORDS.KNOWLEDGE_DISCOVERY';

export interface KnowledgeDiscoveryConfigDialogData {
    placeId: string;
    /** Link shown by the launcher (place file or fallback), or null. */
    link: KnowledgeDiscoveryLink | null;
    source: KnowledgeDiscoveryLinkSource;
    /** Theme tokens of the launcher's page: the dialog lives in the overlay, outside the plugin's tree. */
    theme?: Record<string, string>;
}

/**
 * Knowledge Discovery link of one place, in a dialog like CIC-Fin's
 * `KnowledgeDiscoveryDialogComponent`: agent URL (https only), button text and an optional
 * description. An empty URL clears the place. Closes with `true` after a save.
 */
@Component({
    selector: 'medical-records-knowledge-discovery-config-dialog',
    standalone: true,
    imports: [FormsModule, MatButtonModule, MatDialogModule, TranslateModule],
    template: `
        <h2 mat-dialog-title>
            <span class="material-icons" aria-hidden="true">travel_explore</span>{{ i18n + '.DIALOG_TITLE' | translate }}
        </h2>
        <mat-dialog-content [attr.aria-busy]="busy">
            <p class="kd-dialog__lead">{{ i18n + '.DIALOG_LEAD' | translate }}</p>
            @if (data.source === 'fallback') {
                <p class="kd-dialog__note" role="note">{{ i18n + '.FROM_FALLBACK' | translate }}</p>
            }
            @if (error) {
                <p class="kd-dialog__error" role="alert">{{ i18n + '.' + error | translate }}</p>
            }
            <form class="kd-dialog__form" id="kd-dialog-form" (ngSubmit)="save()">
                <label for="kd-dialog-url">{{ i18n + '.URL' | translate }}</label>
                <input
                    id="kd-dialog-url"
                    type="url"
                    name="url"
                    inputmode="url"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="https://…"
                    [(ngModel)]="url"
                    (blur)="touched = true"
                    [attr.aria-invalid]="touched && !valid"
                    aria-describedby="kd-dialog-url-hint"
                />
                <small id="kd-dialog-url-hint" [class.kd-dialog__error]="touched && !valid">
                    {{ (touched && !valid ? i18n + '.URL_INVALID' : i18n + '.URL_HINT') | translate }}
                </small>
                <label for="kd-dialog-label">{{ i18n + '.LABEL' | translate }}</label>
                <input id="kd-dialog-label" type="text" name="label" autocomplete="off" [(ngModel)]="label" [placeholder]="i18n + '.OPEN' | translate" />
                <label for="kd-dialog-description">{{ i18n + '.DESCRIPTION' | translate }}</label>
                <textarea id="kd-dialog-description" name="description" rows="2" [(ngModel)]="description"></textarea>
            </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button type="button" mat-dialog-close [disabled]="busy">{{ i18n + '.CLOSE' | translate }}</button>
            @if (data.link) {
                <a mat-button [href]="data.link.url" target="_blank" rel="noopener noreferrer">
                    {{ i18n + '.OPEN' | translate }}<span class="kd-dialog__sr-only">{{ i18n + '.NEW_TAB' | translate }}</span>
                </a>
            }
            <button mat-flat-button color="primary" type="submit" form="kd-dialog-form" [disabled]="!canSave">
                {{ (busy ? i18n + '.SAVING' : clearing ? i18n + '.CLEAR' : i18n + '.SAVE') | translate }}
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            :host {
                display: block;
                color: var(--mr-on-surface, #0b1c30);
            }
            h2 {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--mr-heading, #001b3d);
            }
            .kd-dialog__lead,
            .kd-dialog__note {
                margin: 0 0 12px;
                color: var(--mr-muted, #475467);
                line-height: 1.45;
            }
            .kd-dialog__form {
                display: grid;
                gap: 6px;
            }
            label {
                margin-top: 6px;
                color: var(--mr-muted, #475467);
                font-size: 12px;
                font-weight: 600;
            }
            input,
            textarea {
                box-sizing: border-box;
                width: 100%;
                min-width: 0;
                padding: 10px 12px;
                border: 1px solid var(--mr-border, #d0d5dd);
                border-radius: 8px;
                background: var(--mr-surface, #fff);
                color: var(--mr-on-surface, #0b1c30);
                font: inherit;
            }
            input:focus-visible,
            textarea:focus-visible {
                outline: 2px solid var(--mr-primary, #00478d);
                outline-offset: 2px;
            }
            small {
                color: var(--mr-muted, #667085);
                font-size: 11.5px;
            }
            .kd-dialog__error {
                color: var(--mr-error-text, #ba1a1a) !important;
            }
            .kd-dialog__sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                overflow: hidden;
                clip: rect(0 0 0 0);
                white-space: nowrap;
            }
            mat-dialog-actions {
                flex-wrap: wrap;
                gap: 8px;
            }
        `,
    ],
})
export class KnowledgeDiscoveryConfigDialogComponent implements OnInit {
    private readonly service = inject(KnowledgeDiscoveryPlaceService);
    private readonly dialogRef = inject<MatDialogRef<KnowledgeDiscoveryConfigDialogComponent, boolean>>(MatDialogRef);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    readonly data = inject<KnowledgeDiscoveryConfigDialogData>(MAT_DIALOG_DATA);

    readonly i18n = I18N;
    url = '';
    label = '';
    description = '';
    touched = false;
    busy = false;
    error: 'SAVE_ERROR' | null = null;

    get valid(): boolean {
        return !validateKnowledgeDiscoveryInput({ url: this.url });
    }

    /** Saving an empty URL removes the link of the place. */
    get clearing(): boolean {
        return !this.url.trim() && !!this.data.link;
    }

    get changed(): boolean {
        const link = this.data.link;
        return (link?.url ?? '') !== this.url.trim() || (link?.label ?? '') !== this.label.trim() || (link?.description ?? '') !== this.description.trim();
    }

    /** A link read from the fallback can be saved unchanged: it is then kept in the place's own file. */
    get canSave(): boolean {
        return !this.busy && this.valid && (this.changed || this.data.source === 'fallback') && (!!this.url.trim() || !!this.data.link);
    }

    ngOnInit(): void {
        this.url = this.data.link?.url ?? '';
        this.label = this.data.link?.label ?? '';
        this.description = this.data.link?.description ?? '';
        for (const [token, value] of Object.entries(this.data.theme ?? {})) {
            this.host.nativeElement.style.setProperty(token, value);
        }
    }

    async save(): Promise<void> {
        this.touched = true;
        if (!this.canSave) {
            return;
        }
        this.busy = true;
        this.error = null;
        this.dialogRef.disableClose = true;
        try {
            await this.service.save(this.data.placeId, { url: this.url, label: this.label, description: this.description });
            this.dialogRef.close(true);
        } catch {
            this.error = 'SAVE_ERROR';
        } finally {
            this.busy = false;
            this.dialogRef.disableClose = false;
        }
    }
}
