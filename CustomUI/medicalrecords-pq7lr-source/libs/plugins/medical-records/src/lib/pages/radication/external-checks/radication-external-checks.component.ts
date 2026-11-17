import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
    deriveExternalCheckRows,
    EXTERNAL_CHECKS_NO_DATA_KEY,
    ExternalCheckDefinition,
    ExternalCheckRow,
    externalChecksFor,
    ExternalVerificationChannel,
    ExternalVerificationKey,
    ExternalVerificationQuery,
    ExternalVerificationResult,
    externalVerificationInvoices,
} from '../utils/external-verification.util';
import { EXTERNAL_VERIFICATION_ADAPTERS } from './external-verification.adapters';

/** What the checks are about: the account's invoices (from `buildCaseAccountView`) or just how many. */
export interface ExternalChecksContext {
    providerId?: string | null;
    invoices?: readonly { invoiceNumber: string | null }[] | null;
    invoiceCount?: number | null;
    /** Seed for synthetic invoice references when the invoices are not known yet (e.g. the radication number). */
    seed?: string | null;
}

const TICK_MS = 250;
const MAX_ISSUES_SHOWN = 3;

/**
 * External verifications shown while the pre-analysis runs. Ported from CIC-Fin's
 * `components/external-checks/external-checks-animation.component.ts` (`agentic-bank-external-checks`):
 * same rows (origin node, link with packets going and coming back, pulsing target) and inline styles,
 * generalized per `docs/propuesta-preanalisis-interoperabilidad.md` §2:
 * - systems per channel (`externalChecksFor`), or explicit `checks`;
 * - results from the adapters under `EXTERNAL_VERIFICATION_ADAPTERS` (mock, synthetic, no HTTP in v1);
 * - row states `querying | ok | alert | inconsistency | no_response` and a "Simulated" badge;
 * - `holdUntil`: the last row stays querying until it is true (the pre-analysis finished).
 * No localStorage: the result is derived again from the invoice numbers.
 */
@Component({
    selector: 'medical-records-radication-external-checks',
    standalone: true,
    imports: [DatePipe, MatIconModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="external-checks" [attr.aria-label]="'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.TITLE' | translate">
            <p class="ec-title" role="heading" aria-level="3">{{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.TITLE' | translate }}</p>
            <p class="detail">{{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.NOTICE' | translate }}</p>
            <div class="checks" aria-live="polite">
                @for (row of rows(); track row.definition.key) {
                    <div class="check" [attr.data-state]="row.state" [class.done]="row.state !== 'querying'">
                        <div class="node origin"><mat-icon aria-hidden="true">{{ originIcon() }}</mat-icon></div>
                        <div class="link" aria-hidden="true">
                            <span class="packet out"></span>
                            <span class="packet back"></span>
                        </div>
                        <div class="node target"><mat-icon aria-hidden="true">{{ row.definition.icon }}</mat-icon></div>
                        <div class="info">
                            <div class="line">
                                <strong>{{ row.definition.labelKey | translate }}</strong>
                                <span class="tags">
                                    @if (row.definition.mode === 'simulated') {
                                        <span class="badge">{{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.SIMULATED' | translate }}</span>
                                    }
                                    <span class="state state--{{ row.state }}">
                                        <mat-icon aria-hidden="true">{{ stateIcon(row) }}</mat-icon>{{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.STATE.' + row.state.toUpperCase() | translate }}
                                        @if (row.result?.checkedAt; as at) {
                                            <time [attr.datetime]="at">{{ at | date: 'shortTime' }}</time>
                                        }
                                    </span>
                                </span>
                            </div>
                            @if (row.result; as result) {
                                @if (issuesOf(result).length) {
                                    <ul class="issues">
                                        @for (item of issuesOf(result).slice(0, maxIssues); track item.invoiceNumber) {
                                            <li class="detail">
                                                {{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.INVOICE' | translate: { invoice: item.invoiceNumber } }} ·
                                                {{ item.detailKey | translate }}
                                            </li>
                                        }
                                    </ul>
                                } @else {
                                    <span class="detail">
                                        {{ (result.items[0]?.detailKey ?? noDataKey) | translate }} ·
                                        {{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.CHECKED' | translate: { count: result.items.length } }}
                                    </span>
                                }
                            } @else {
                                <span class="detail">{{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.QUERYING_DETAIL' | translate: { count: invoices().length } }}</span>
                            }
                        </div>
                    </div>
                }
            </div>
        </section>
    `,
    styles: [
        `
            :host { display: block; margin: 12px 0 4px; }
            .external-checks { display: grid; gap: 10px; padding: 14px 16px; border: 1px solid var(--ab-line, #e1e3f0); border-radius: 12px; background: var(--ab-paper, #ffffff); }
            .ec-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--ab-ink, #202554); }
            .checks { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px 24px; }
            .check { display: grid; grid-template-columns: 32px minmax(30px, 1fr) 32px; grid-template-areas: 'o l t' 'i i i'; align-items: center; gap: 6px 8px; }
            .line { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-width: 0; flex-wrap: wrap; }
            .tags { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
            .origin { grid-area: o; } .link { grid-area: l; } .target { grid-area: t; } .info { grid-area: i; }
            .node { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 50%; background: var(--ab-tint, #f5f4ff); border: 1px solid var(--ab-line, #dedbff); color: var(--ab-accent-text, #5146b8); }
            .node mat-icon { width: 18px; height: 18px; font-size: 18px; }
            .target { animation: target-pulse 2.4s ease-in-out infinite; }
            .link { position: relative; height: 4px; border-radius: 4px; background: repeating-linear-gradient(90deg, var(--ab-line, #e1e3f0) 0 8px, transparent 8px 14px); }
            .packet { position: absolute; top: 50%; width: 10px; height: 10px; margin-top: -5px; border-radius: 50%; opacity: 0; }
            .packet.out { background: var(--ab-brand, #5146b8); animation: packet-out 2.4s linear infinite; }
            .packet.back { background: var(--ab-brand-secondary, #8d8ae6); animation: packet-back 2.4s linear infinite; }
            .info { display: grid; gap: 2px; min-width: 0; }
            .info strong { font-size: 13px; color: var(--ab-ink, #202554); }
            .detail { font-size: 11px; line-height: 1.35; color: var(--ab-muted, #5b6b70); }
            .issues { display: grid; gap: 1px; margin: 0; padding: 0; list-style: none; }
            .badge { padding: 1px 6px; border: 1px dashed var(--ab-line, #d0d5dd); border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--ab-muted, #5b6b70); }
            .state { display: inline-flex; align-items: center; gap: 4px; min-height: 20px; font-size: 12px; font-weight: 700; color: var(--ab-muted, #5b6b70); }
            .state mat-icon { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; font-size: 15px; line-height: 15px; }
            .state time { margin-inline-start: 2px; font-weight: 400; color: var(--ab-muted, #5b6b70); }
            .state--ok { color: var(--ab-ok-text, #1c875f); }
            .state--alert { color: var(--ab-warn-text, #b54708); }
            .state--inconsistency { color: var(--ab-error-text, #b42318); }
            .state--querying mat-icon { animation: spin 1.3s linear infinite; }
            .check.done .target { animation: none; }
            .check.done .packet { animation: none; opacity: 0; }
            .check.done .link { opacity: 0.55; }
            .check[data-state='ok'] .target { background: var(--ab-soft-green, #e7f6ee); color: var(--ab-ok-text, #1c875f); }
            .check[data-state='ok'] .link { background: var(--ab-ok-text, #1c875f); }
            .check[data-state='alert'] .target { background: var(--ab-soft-warn, #fffaeb); color: var(--ab-warn-text, #b54708); }
            .check[data-state='alert'] .link { background: var(--ab-warn-text, #b54708); }
            .check[data-state='inconsistency'] .target { background: var(--ab-soft-error, #fef3f2); color: var(--ab-error-text, #b42318); }
            .check[data-state='inconsistency'] .link { background: var(--ab-error-text, #b42318); }
            .check[data-state='no_response'] .target { color: var(--ab-muted, #5b6b70); }
            .check[data-state='no_response'] .link { background: repeating-linear-gradient(90deg, var(--ab-muted, #5b6b70) 0 4px, transparent 4px 10px); }
            @keyframes packet-out { 0% { left: 0; opacity: 0; } 8% { opacity: 1; } 40% { left: calc(100% - 10px); opacity: 1; } 46%, 100% { left: calc(100% - 10px); opacity: 0; } }
            @keyframes packet-back { 0%, 54% { left: calc(100% - 10px); opacity: 0; } 60% { opacity: 1; } 92% { left: 0; opacity: 1; } 98%, 100% { left: 0; opacity: 0; } }
            @keyframes target-pulse { 0%, 36%, 56%, 100% { box-shadow: 0 0 0 0 transparent; } 46% { box-shadow: 0 0 0 7px var(--ab-brand-glow, rgba(81, 70, 184, 0.18)); } }
            @keyframes spin { to { transform: rotate(360deg); } }
            @media (prefers-reduced-motion: reduce) {
                .target, .packet, .state--querying mat-icon { animation: none; }
            }
        `,
    ],
})
export class RadicationExternalChecksComponent {
    /** Systems to show; by default the ones of the channel. */
    readonly checks = input<readonly ExternalCheckDefinition[] | null>(null);
    readonly channel = input<ExternalVerificationChannel>('provider');
    /** The provider's HIS may be queried (explicit, authorized access). */
    readonly hisAuthorized = input(false);
    readonly context = input<ExternalChecksContext | null>(null);
    /** The last row stays querying until this is true (e.g. the pre-analysis stage is done). */
    readonly holdUntil = input(true);

    readonly maxIssues = MAX_ISSUES_SHOWN;
    readonly noDataKey = EXTERNAL_CHECKS_NO_DATA_KEY;

    private readonly adapters = inject(EXTERNAL_VERIFICATION_ADAPTERS, { optional: true }) ?? [];
    private readonly destroyRef = inject(DestroyRef);
    private readonly startedAt = Date.now();
    private readonly elapsed = signal(0);
    private readonly results = signal<Partial<Record<ExternalVerificationKey, ExternalVerificationResult>>>({});
    private queries: Subscription[] = [];

    readonly definitions = computed(() => this.checks() ?? externalChecksFor(this.channel(), { hisAuthorized: this.hisAuthorized() }));
    readonly invoices = computed(() => {
        const context = this.context();
        return externalVerificationInvoices(context?.invoices, context?.invoiceCount ?? 0, context?.seed || 'ACCOUNT');
    });
    readonly rows = computed(() => deriveExternalCheckRows(this.definitions(), { elapsedMs: this.elapsed(), results: this.results(), released: this.holdUntil() }));
    readonly originIcon = computed(() => (this.channel() === 'ars' ? 'health_and_safety' : 'local_hospital'));

    constructor() {
        // Query again whenever the systems or the invoices change (the invoices may arrive later).
        effect(() => {
            const definitions = this.definitions();
            const query: ExternalVerificationQuery = { providerId: this.context()?.providerId ?? '', invoices: this.invoices() };
            untracked(() => this.query(definitions, query));
        });

        // Animation clock: runs until the slowest row's time passed; results and `holdUntil` resolve the rest.
        const timer = setInterval(() => {
            const elapsed = Date.now() - this.startedAt;
            this.elapsed.set(elapsed);
            if (elapsed >= Math.max(0, ...this.definitions().map((check) => check.durationMs))) {
                clearInterval(timer);
            }
        }, TICK_MS);
        this.destroyRef.onDestroy(() => {
            clearInterval(timer);
            this.queries.forEach((subscription) => subscription.unsubscribe());
        });
    }

    issuesOf(result: ExternalVerificationResult) {
        return result.items.filter((item) => item.status !== 'ok');
    }

    stateIcon(row: ExternalCheckRow): string {
        switch (row.state) {
            case 'ok':
                return 'check_circle';
            case 'alert':
                return 'warning_amber';
            case 'inconsistency':
                return 'error_outline';
            case 'no_response':
                return 'portable_wifi_off';
            default:
                return 'autorenew';
        }
    }

    private query(definitions: readonly ExternalCheckDefinition[], query: ExternalVerificationQuery): void {
        this.queries.forEach((subscription) => subscription.unsubscribe());
        this.queries = definitions.map((definition) => {
            const adapter = this.adapters.find((candidate) => candidate.key === definition.key);
            if (!adapter) {
                const missing: ExternalVerificationResult = { key: definition.key, mode: definition.mode, status: 'no_response', items: [], checkedAt: new Date().toISOString() };
                this.results.update((current) => ({ ...current, [definition.key]: missing }));
                return Subscription.EMPTY;
            }
            return adapter
                .query(query)
                .subscribe({
                    next: (result) => this.results.update((current) => ({ ...current, [definition.key]: result })),
                    error: () =>
                        this.results.update((current) => ({
                            ...current,
                            [definition.key]: { key: definition.key, mode: definition.mode, status: 'no_response', items: [], checkedAt: new Date().toISOString() },
                        })),
                });
        });
    }
}
