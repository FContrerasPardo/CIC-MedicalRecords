import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
    deriveExternalCheckRows,
    deriveValidationStates,
    EXTERNAL_CHECKS_NO_DATA_KEY,
    ExternalValidationState,
    ExternalCheckDefinition,
    ExternalCheckRow,
    externalChecksFor,
    externalChecksSettled,
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

/**
 * External verifications shown while the pre-analysis runs. Ported from CIC-Fin's
 * `components/external-checks/external-checks-animation.component.ts` (`agentic-bank-external-checks`):
 * same rows (origin node, link with packets going and coming back, pulsing target) and inline styles,
 * generalized per `docs/propuesta-preanalisis-interoperabilidad.md` §2:
 * - systems per channel (`externalChecksFor`), or explicit `checks`;
 * - results from the adapters under `EXTERNAL_VERIFICATION_ADAPTERS` (mock, synthetic, no HTTP in v1);
 * - row states `querying | ok | no_response`; every simulated check ends verified (no alerts in the demo);
 * - per system, the validation types it runs (affiliation on the service date, prior authorization,
 *   agreed tariff…), checked one by one while the row queries;
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
                                    <span class="state state--{{ row.state }}">
                                        <mat-icon aria-hidden="true">{{ stateIcon(row) }}</mat-icon>{{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.STATE.' + row.state.toUpperCase() | translate }}
                                        @if (row.result?.checkedAt; as at) {
                                            <time [attr.datetime]="at">{{ at | date: 'shortTime' }}</time>
                                        }
                                    </span>
                                </span>
                            </div>
                            @if (row.definition.validationKeys.length) {
                                <ul class="validations">
                                    @for (validationKey of row.definition.validationKeys; track validationKey; let index = $index) {
                                        @let validationState = validationStates(row)[index];
                                        <li class="validation" [attr.data-state]="validationState">
                                            <mat-icon aria-hidden="true">{{ validationIcon(validationState) }}</mat-icon>
                                            <span>{{ validationKey | translate }}</span>
                                        </li>
                                    }
                                </ul>
                            }
                            @if (row.result; as result) {
                                <span class="detail">
                                    {{ (result.items[0]?.detailKey ?? noDataKey) | translate }} ·
                                    {{ 'MEDICAL_RECORDS.RADICATION.EXTERNAL_CHECKS.CHECKED' | translate: { count: result.items.length } }}
                                </span>
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
            .validations { display: grid; gap: 2px; margin: 2px 0 0; padding: 0; list-style: none; }
            .validation { display: flex; align-items: flex-start; gap: 5px; font-size: 12px; line-height: 16px; color: var(--ab-muted, #5b6b70); transition: color 200ms ease, opacity 200ms ease; }
            .validation mat-icon { flex: 0 0 14px; width: 14px; height: 14px; margin-top: 1px; font-size: 14px; line-height: 14px; }
            .validation[data-state='pending'] { opacity: 0.55; }
            .validation[data-state='checking'] { color: var(--ab-accent-text, #5146b8); font-weight: 600; }
            .validation[data-state='checking'] mat-icon { animation: spin 1.3s linear infinite; }
            .validation[data-state='ok'] mat-icon { color: var(--ab-ok-text, #1c875f); }
            .state { display: inline-flex; align-items: center; gap: 4px; min-height: 20px; font-size: 12px; font-weight: 700; color: var(--ab-muted, #5b6b70); }
            .state mat-icon { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; font-size: 15px; line-height: 15px; }
            .state time { margin-inline-start: 2px; font-weight: 400; color: var(--ab-muted, #5b6b70); }
            .state--ok { color: var(--ab-ok-text, #1c875f); }
            .state--querying mat-icon { animation: spin 1.3s linear infinite; }
            .check.done .target { animation: none; }
            .check.done .packet { animation: none; opacity: 0; }
            .check.done .link { opacity: 0.55; }
            .check[data-state='ok'] .target { background: var(--ab-soft-green, #e7f6ee); color: var(--ab-ok-text, #1c875f); }
            .check[data-state='ok'] .link { background: var(--ab-ok-text, #1c875f); }
            .check[data-state='no_response'] .target { color: var(--ab-muted, #5b6b70); }
            .check[data-state='no_response'] .link { background: repeating-linear-gradient(90deg, var(--ab-muted, #5b6b70) 0 4px, transparent 4px 10px); }
            @keyframes packet-out { 0% { left: 0; opacity: 0; } 8% { opacity: 1; } 40% { left: calc(100% - 10px); opacity: 1; } 46%, 100% { left: calc(100% - 10px); opacity: 0; } }
            @keyframes packet-back { 0%, 54% { left: calc(100% - 10px); opacity: 0; } 60% { opacity: 1; } 92% { left: 0; opacity: 1; } 98%, 100% { left: 0; opacity: 0; } }
            @keyframes target-pulse { 0%, 36%, 56%, 100% { box-shadow: 0 0 0 0 transparent; } 46% { box-shadow: 0 0 0 7px var(--ab-brand-glow, rgba(81, 70, 184, 0.18)); } }
            @keyframes spin { to { transform: rotate(360deg); } }
            @media (prefers-reduced-motion: reduce) {
                .target, .packet, .state--querying mat-icon, .validation[data-state='checking'] mat-icon { animation: none; }
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
    /** Emitted once, when every row shows its result (its animation finished). */
    readonly settled = output<void>();

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

        // Tells the page the verifications are over, so the next stage can start.
        let announced = false;
        effect(() => {
            const rows = this.rows();
            if (!announced && rows.length && externalChecksSettled(rows)) {
                announced = true;
                untracked(() => this.settled.emit());
            }
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

    /** Validation types of a row at the current animation time. */
    validationStates(row: ExternalCheckRow): ExternalValidationState[] {
        return deriveValidationStates(row, this.elapsed());
    }

    validationIcon(state: ExternalValidationState): string {
        return state === 'ok' ? 'check_circle' : state === 'checking' ? 'autorenew' : 'radio_button_unchecked';
    }

    stateIcon(row: ExternalCheckRow): string {
        switch (row.state) {
            case 'ok':
                return 'check_circle';
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
