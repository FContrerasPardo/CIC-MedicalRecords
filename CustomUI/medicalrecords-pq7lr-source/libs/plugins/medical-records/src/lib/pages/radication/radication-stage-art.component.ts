import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RadicationStageKey, RadicationStageState } from './utils/radication-progress.util';

/**
 * Decorative scene for each radication stage. Adapted from CIC-Fin (agentic-bank plugin):
 * - `radicated`: `CARD_RADICATION` scene of `pages/underwriting-dashboard/factory-scene.component.html`
 *   (stamp over a sheet); here the stamp lands once the account is radicated.
 * - `extraction`: packets between two nodes from `components/external-checks/external-checks-animation.component.ts`
 *   (provider → IDP instead of bank → bureau).
 * - `verification`: `stage-advance-*` scale and stamp from `pages/loan-application/loan-application.component.scss`.
 * - `checklist`: `idp-checklist-*` document and rule rows from the same stylesheet.
 * The processing page uses it for `radicated`; `preanalysis` and `intake` use CIC-Fin's validation-track
 * art (signatures/checklist/packaging) in the page template, `extraction` the IDP trio.
 * Animations run only while the stage is active; the base style is the final state, so
 * `prefers-reduced-motion` leaves a readable still image. Purely visual (aria-hidden).
 */
@Component({
    selector: 'medical-records-radication-stage-art',
    standalone: true,
    imports: [TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="art art--{{ state }}" aria-hidden="true">
            @switch (stage) {
                @case ('radicated') {
                    <svg class="scene" viewBox="0 0 72 48" focusable="false">
                        <path class="muted" d="M8 44h56" />
                        <rect class="paper" x="14" y="26" width="44" height="16" rx="3" />
                        <rect class="muted" x="26" y="30" width="20" height="8" rx="2" stroke-dasharray="3 3" />
                        <g class="stamp-tool">
                            <rect class="paper" x="32" y="3" width="8" height="9" rx="2.5" />
                            <rect class="paper" x="27" y="12" width="18" height="6" rx="2" />
                        </g>
                        <rect class="seal" x="26" y="30" width="20" height="8" rx="2" />
                    </svg>
                }
                @case ('extraction') {
                    <div class="link-art">
                        <span class="node"><span class="material-icons">local_hospital</span></span>
                        <span class="link"><span class="packet packet--out"></span><span class="packet packet--back"></span></span>
                        <span class="node node--target"><span class="material-icons">document_scanner</span></span>
                    </div>
                }
                @case ('intake') {
                    <div class="scale">
                        <span class="scale__stand"></span>
                        <span class="scale__beam"></span>
                        <span class="scale__pan scale__pan--left"></span>
                        <span class="scale__pan scale__pan--right"></span>
                        <span class="scale__stamp">{{ 'MEDICAL_RECORDS.RADICATION.ART.VERIFIED' | translate }}</span>
                    </div>
                }
                @case ('analysis') {
                    <div class="checklist-art">
                        <span class="doc"></span>
                        <span class="rules">
                            @for (row of rows; track row) {
                                <span class="rules__row rules__row--{{ row }}">
                                    <span class="rules__mark"><span class="material-icons">check</span></span>
                                    <span class="rules__line"></span>
                                </span>
                            }
                        </span>
                    </div>
                }
            }
        </div>
    `,
    styleUrls: ['./radication-stage-art.component.scss'],
})
export class RadicationStageArtComponent {
    @Input({ required: true }) stage!: RadicationStageKey;
    @Input() state: RadicationStageState = 'pending';

    readonly rows = [1, 2, 3];
}
