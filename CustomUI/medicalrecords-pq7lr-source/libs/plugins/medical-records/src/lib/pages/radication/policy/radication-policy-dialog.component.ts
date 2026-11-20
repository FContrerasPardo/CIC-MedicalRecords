import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { MULTI_INVOICE_PROFILE, PolicyClassStatus, PolicyView, SINGLE_INVOICE_PROFILE } from '../utils/radication-policy.util';
import { PolicySource } from './preanalysis-policy-repository.service';

const I18N = 'MEDICAL_RECORDS.RADICATION';

/** Theme tokens copied from where the dialog is declared, so it keeps the plugin's appearance once moved to `<body>`. */
const THEME_TOKENS = ['--mr-surface', '--mr-surface-muted', '--mr-surface-low', '--mr-border', '--mr-border-subtle', '--mr-primary', '--mr-heading', '--mr-on-surface', '--mr-muted', '--mr-success-text', '--mr-warning', '--mr-warning-surface', '--mr-error-text'];

const STATUS_ICONS: Record<PolicyClassStatus, string> = { found: 'task_alt', attention: 'warning_amber', missing: 'report', none: 'radio_button_unchecked' };

/**
 * The account's pre-analysis policy in plain language, as CIC-Fin explained its policy: which profile
 * applies and why, the documents it requires and the cross-checks the agent makes. Read only.
 *
 * The host is moved to `document.body` while open: the review layout is a size container (layout
 * containment) and its assistant column is sticky, and both trap `position: fixed` descendants in
 * their own stacking context, so the table's buttons painted over the dialog. Escape closes, focus
 * starts on Close and returns to the opener.
 */
@Component({
    selector: 'medical-records-radication-policy-dialog',
    standalone: true,
    imports: [MatIconModule, TranslateModule],
    template: `
        <div class="policy-backdrop" (click)="close()">
            <section class="policy-dialog" role="dialog" aria-modal="true" aria-labelledby="radication-policy-title" (click)="$event.stopPropagation()">
                <header class="policy-dialog__head">
                    <span class="policy-dialog__icon" aria-hidden="true"><mat-icon>policy</mat-icon></span>
                    <div class="policy-dialog__heading">
                        <span class="policy-dialog__eyebrow">{{ i18n + '.POLICY.TITLE' | translate }}</span>
                        <h2 id="radication-policy-title">{{ policy.profileLabel }}</h2>
                        <p class="policy-dialog__meta">
                            <span class="policy-tag">{{ (source === 'appdata' ? i18n + '.POLICY.SOURCE_APPDATA' : i18n + '.POLICY.SOURCE_DEFAULT') | translate }}</span>
                            @if (policy.version) {
                                <span class="policy-tag">v{{ policy.version }}</span>
                            }
                            @if (agreementName) {
                                <span class="policy-tag">{{ (agreementMatched ? i18n + '.POLICY.AGREEMENT_MATCHED' : i18n + '.POLICY.AGREEMENT_DEFAULT') | translate: { name: agreementName } }}</span>
                            }
                        </p>
                    </div>
                    <button #closeButton type="button" class="policy-dialog__close" (click)="close()">
                        <mat-icon aria-hidden="true">close</mat-icon><span>{{ i18n + '.PROVIDER_FLOW.POLICY_CLOSE' | translate }}</span>
                    </button>
                </header>
                <div class="policy-dialog__body">
                    @if (baseLanguageShown) {
                        <p class="policy-dialog__language"><mat-icon aria-hidden="true">translate</mat-icon>{{ i18n + '.POLICY.LANGUAGE_FALLBACK' | translate }}</p>
                    }
                    <section class="policy-section policy-section--why">
                        <h3><mat-icon aria-hidden="true">help_outline</mat-icon>{{ i18n + '.PROVIDER_FLOW.POLICY_WHY' | translate }}</h3>
                        <p>{{ profileReasonKey | translate: { count: invoiceCount } }}</p>
                    </section>
                    <section class="policy-section">
                        <h3>
                            <mat-icon aria-hidden="true">description</mat-icon>{{ i18n + '.POLICY.REQUIRED' | translate }}
                            <span class="policy-count">{{ policy.required.length }}</span>
                        </h3>
                        <p class="policy-section__lead">{{ i18n + '.PROVIDER_FLOW.POLICY_REQUIRED_LEAD' | translate }}</p>
                        <ul class="policy-list">
                            @for (item of policy.required; track item.className) {
                                <li>
                                    <span class="policy-list__text"><strong>{{ item.className }}</strong></span>
                                    <span class="policy-chip" [attr.data-status]="item.status">
                                        <mat-icon aria-hidden="true">{{ statusIcon(item.status) }}</mat-icon>{{ i18n + '.POLICY.STATUS.' + item.status.toUpperCase() | translate }}
                                    </span>
                                </li>
                            } @empty {
                                <li class="policy-list__empty">{{ i18n + '.PROVIDER_FLOW.POLICY_NONE' | translate }}</li>
                            }
                        </ul>
                    </section>
                    @if (policy.conditional.length) {
                        <section class="policy-section">
                            <h3>
                                <mat-icon aria-hidden="true">rule_folder</mat-icon>{{ i18n + '.POLICY.CONDITIONAL' | translate }}
                                <span class="policy-count">{{ policy.conditional.length }}</span>
                            </h3>
                            <p class="policy-section__lead">{{ i18n + '.PROVIDER_FLOW.POLICY_CONDITIONAL_LEAD' | translate }}</p>
                            <ul class="policy-list">
                                @for (item of policy.conditional; track item.className) {
                                    <li>
                                        <span class="policy-list__text">
                                            <strong>{{ item.className }}</strong>
                                            @if (item.condition) {
                                                <small>{{ item.condition }}</small>
                                            }
                                        </span>
                                        <span class="policy-chip" [attr.data-status]="item.status">
                                            <mat-icon aria-hidden="true">{{ statusIcon(item.status) }}</mat-icon>{{ i18n + '.POLICY.STATUS.' + item.status.toUpperCase() | translate }}
                                        </span>
                                    </li>
                                }
                            </ul>
                        </section>
                    }
                    <section class="policy-section">
                        <h3>
                            <mat-icon aria-hidden="true">compare_arrows</mat-icon>{{ i18n + '.POLICY.CROSS_CHECKS' | translate }}
                            <span class="policy-count">{{ policy.crossChecks.length }}</span>
                        </h3>
                        <p class="policy-section__lead">{{ i18n + '.PROVIDER_FLOW.POLICY_CROSS_CHECKS_LEAD' | translate }}</p>
                        <ul class="policy-list">
                            @for (check of policy.crossChecks; track check.checkId) {
                                <li>
                                    <mat-icon class="policy-list__icon" aria-hidden="true">rule</mat-icon>
                                    <span class="policy-list__text">
                                        <strong>{{ check.label }}</strong>
                                        @if (check.rule) {
                                            <small>{{ check.rule }}</small>
                                        }
                                    </span>
                                </li>
                            } @empty {
                                <li class="policy-list__empty">{{ i18n + '.PROVIDER_FLOW.POLICY_NONE' | translate }}</li>
                            }
                        </ul>
                    </section>
                    <p class="policy-dialog__note"><mat-icon aria-hidden="true">info_outline</mat-icon>{{ i18n + '.PROVIDER_FLOW.POLICY_NOTE' | translate }}</p>
                </div>
            </section>
        </div>
    `,
    styles: [
        `
            :host {
                --pd-paper: var(--mr-surface, #ffffff);
                --pd-tint: var(--mr-surface-muted, #f2f4f7);
                --pd-line: var(--mr-border, rgba(194, 198, 212, 0.55));
                --pd-line-soft: var(--mr-border-subtle, rgba(194, 198, 212, 0.35));
                --pd-ink: var(--mr-heading, #001b3d);
                --pd-text: var(--mr-on-surface, #0b1c30);
                --pd-muted: var(--mr-muted, #667085);
                --pd-brand: var(--mr-primary, #00478d);
                --pd-ok: #0f7b5f;
                --pd-warn: #b54708;
                --pd-error: var(--mr-error-text, #b42318);
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: block;
            }
            .policy-backdrop { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; box-sizing: border-box; background: rgba(11, 28, 48, 0.6); overscroll-behavior: contain; }
            .policy-dialog { display: grid; grid-template-rows: auto minmax(0, 1fr); width: min(760px, 100%); max-height: min(88vh, 900px); box-sizing: border-box; border: 1px solid var(--pd-line); border-radius: 18px; background: var(--pd-paper); color: var(--pd-text); box-shadow: 0 24px 64px rgba(11, 28, 48, 0.28); overflow: hidden; font: inherit; }
            .policy-dialog__head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: 14px; padding: 18px 22px 16px; border-bottom: 1px solid var(--pd-line-soft); background: linear-gradient(180deg, color-mix(in srgb, var(--pd-brand) 6%, var(--pd-paper)), var(--pd-paper)); }
            .policy-dialog__icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: color-mix(in srgb, var(--pd-brand) 12%, var(--pd-paper)); color: var(--pd-brand); }
            .policy-dialog__heading { min-width: 0; }
            .policy-dialog__eyebrow { color: var(--pd-brand); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
            .policy-dialog__head h2 { margin: 2px 0 8px; color: var(--pd-ink); font-size: 19px; line-height: 1.3; overflow-wrap: anywhere; }
            .policy-dialog__meta { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; }
            .policy-tag { display: inline-flex; align-items: center; padding: 2px 9px; border: 1px solid var(--pd-line); border-radius: 999px; background: var(--pd-paper); color: var(--pd-muted); font-size: 11px; font-weight: 600; overflow-wrap: anywhere; }
            .policy-dialog__close { display: inline-flex; align-items: center; gap: 4px; min-height: 36px; padding: 6px 12px; border: 1px solid var(--pd-line); border-radius: 10px; background: var(--pd-paper); color: var(--pd-brand); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
            .policy-dialog__close:hover { background: var(--pd-tint); }
            .policy-dialog__close:focus-visible { outline: 2px solid var(--pd-brand); outline-offset: 2px; }
            .policy-dialog__close mat-icon { width: 18px; height: 18px; font-size: 18px; }
            .policy-dialog__body { display: grid; align-content: start; gap: 14px; padding: 18px 22px 22px; overflow-y: auto; overscroll-behavior: contain; background: var(--pd-tint); }
            .policy-section { padding: 14px 16px; border: 1px solid var(--pd-line-soft); border-radius: 14px; background: var(--pd-paper); }
            .policy-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; color: var(--pd-ink); font-size: 15px; }
            .policy-section h3 mat-icon { width: 20px; height: 20px; font-size: 20px; color: var(--pd-brand); }
            .policy-count { min-width: 22px; padding: 0 7px; border-radius: 999px; background: color-mix(in srgb, var(--pd-brand) 10%, var(--pd-paper)); color: var(--pd-brand); font-size: 12px; line-height: 20px; text-align: center; }
            .policy-section p { margin: 0; font-size: 13px; line-height: 1.5; }
            .policy-section__lead { margin-bottom: 8px !important; color: var(--pd-muted); }
            .policy-list { margin: 0; padding: 0; list-style: none; }
            .policy-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-top: 1px solid var(--pd-line-soft); font-size: 13px; }
            .policy-list li:first-child { border-top: 0; }
            .policy-list__text { display: grid; gap: 2px; flex: 1; min-width: 0; }
            .policy-list__text strong { color: var(--pd-ink); font-weight: 600; overflow-wrap: anywhere; }
            .policy-list__text small { color: var(--pd-muted); font-size: 12px; line-height: 1.4; }
            .policy-list__icon { flex: 0 0 18px; width: 18px; height: 18px; font-size: 18px; color: var(--pd-brand); }
            .policy-list__empty { color: var(--pd-muted); }
            .policy-chip { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; padding: 3px 10px 3px 7px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; color: var(--pd-muted); background: var(--pd-tint); }
            .policy-chip mat-icon { width: 16px; height: 16px; font-size: 16px; }
            .policy-chip[data-status='found'] { color: var(--pd-ok); background: color-mix(in srgb, var(--pd-ok) 12%, var(--pd-paper)); }
            .policy-chip[data-status='attention'] { color: var(--pd-warn); background: color-mix(in srgb, var(--pd-warn) 12%, var(--pd-paper)); }
            .policy-chip[data-status='missing'] { color: var(--pd-error); background: color-mix(in srgb, var(--pd-error) 10%, var(--pd-paper)); }
            .policy-dialog__language, .policy-dialog__note { display: flex; align-items: flex-start; gap: 6px; margin: 0; color: var(--pd-muted); font-size: 12px; line-height: 1.45; }
            .policy-dialog__language mat-icon, .policy-dialog__note mat-icon { flex: 0 0 16px; width: 16px; height: 16px; font-size: 16px; }
            @media (max-width: 600px) {
                .policy-backdrop { padding: 12px; }
                .policy-dialog { max-height: calc(100vh - 24px); border-radius: 14px; }
                .policy-dialog__head { grid-template-columns: minmax(0, 1fr) auto; padding: 14px 16px; }
                .policy-dialog__icon { display: none; }
                .policy-dialog__close span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
                .policy-dialog__body { padding: 14px 16px 18px; }
                .policy-list li { flex-wrap: wrap; }
            }
        `,
    ],
})
export class RadicationPolicyDialogComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input({ required: true }) policy!: PolicyView;
    @Input() source: PolicySource | null = null;
    @Input() agreementName: string | null = null;
    @Input() agreementMatched = false;
    /** Some texts are in the base language (no version of the policy in the UI language). */
    @Input() baseLanguageShown = false;
    @Input() invoiceCount = 0;
    @Output() closed = new EventEmitter<void>();

    @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly document = inject(DOCUMENT);
    private opener: HTMLElement | null = null;

    readonly i18n = I18N;

    /** Why this profile: one invoice → full support, several → invoice only, otherwise the policy's default. */
    get profileReasonKey(): string {
        if (this.policy.profileKey === MULTI_INVOICE_PROFILE) {
            return `${I18N}.PROVIDER_FLOW.POLICY_WHY_MULTI`;
        }
        if (this.policy.profileKey === SINGLE_INVOICE_PROFILE && this.invoiceCount === 1) {
            return `${I18N}.PROVIDER_FLOW.POLICY_WHY_SINGLE`;
        }
        return `${I18N}.PROVIDER_FLOW.POLICY_WHY_DEFAULT`;
    }

    statusIcon(status: PolicyClassStatus): string {
        return STATUS_ICONS[status];
    }

    ngOnInit(): void {
        const element = this.host.nativeElement;
        const parent = element.parentElement;
        const view = this.document.defaultView;
        if (parent && view) {
            const computed = view.getComputedStyle(parent);
            for (const token of THEME_TOKENS) {
                const value = computed.getPropertyValue(token).trim();
                if (value) {
                    element.style.setProperty(token, value);
                }
            }
        }
        this.opener = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
        this.document.body.appendChild(element);
    }

    ngAfterViewInit(): void {
        this.closeButton?.nativeElement.focus();
    }

    ngOnDestroy(): void {
        this.host.nativeElement.remove();
        this.opener?.focus();
    }

    @HostListener('document:keydown.escape')
    close(): void {
        this.closed.emit();
    }
}
