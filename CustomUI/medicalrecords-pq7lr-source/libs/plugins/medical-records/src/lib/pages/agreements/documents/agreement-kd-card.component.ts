import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { KnowledgeDiscoveryLauncherComponent } from '../../../components/knowledge-discovery/knowledge-discovery-launcher.component';
import { KnowledgeDiscoveryLink } from '../../../components/knowledge-discovery/knowledge-discovery-place.util';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS.KD';

/**
 * Floating Knowledge Discovery card of the Documents tab (it takes the place of the rules assistant
 * there): what KD is and the Knowledge Discovery launcher of the agreement's place (open in a new
 * tab, or configure it in a dialog the first time). It can be collapsed to a small button.
 */
@Component({
    selector: 'medical-records-agreement-kd-card',
    standalone: true,
    imports: [TranslateModule, KnowledgeDiscoveryLauncherComponent],
    template: `
        @if (expanded) {
            <section class="kd-card" [id]="cardId" role="complementary" [attr.aria-labelledby]="cardId + '-title'">
                <header class="kd-card__head">
                    <span class="kd-card__avatar" aria-hidden="true"><span class="material-icons">travel_explore</span></span>
                    <h2 [id]="cardId + '-title'">{{ i18n + '.TITLE' | translate }}</h2>
                    <button type="button" class="kd-card__close" (click)="collapse()" [attr.aria-label]="i18n + '.COLLAPSE' | translate">
                        <span class="material-icons" aria-hidden="true">close</span>
                    </button>
                </header>
                <p>{{ i18n + '.WHAT' | translate }}</p>
                <medical-records-knowledge-discovery-launcher [placeId]="placeId" [fallback]="fallback" icon="open_in_new" appearance="accent" [block]="true"></medical-records-knowledge-discovery-launcher>
            </section>
        } @else {
            <button #expandButtonRef type="button" class="kd-fab" (click)="expand()" [attr.aria-expanded]="false" [attr.aria-controls]="cardId">
                <span class="material-icons" aria-hidden="true">travel_explore</span>{{ i18n + '.TITLE' | translate }}
            </button>
        }
    `,
    styles: [
        `
            :host {
                position: fixed;
                right: 24px;
                bottom: 24px;
                z-index: 30;
                font-size: 13px;
                color: var(--mr-on-surface, #0b1c30);
            }
            .kd-card {
                display: grid;
                gap: 10px;
                width: min(320px, calc(100vw - 32px));
                box-sizing: border-box;
                padding: 14px 16px 16px;
                border: 1px solid var(--mr-border, #d0d5dd);
                border-radius: 18px;
                background: var(--mr-surface, #fff);
                box-shadow: 0 18px 48px rgba(16, 24, 40, 0.18);
            }
            .kd-card p {
                margin: 0;
                color: var(--mr-on-surface-variant, #424752);
                line-height: 1.45;
            }
            .kd-card__head {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .kd-card__head h2 {
                flex: 1 1 auto;
                margin: 0;
                color: var(--mr-heading, #001b3d);
                font-size: 15px;
            }
            .kd-card__avatar {
                display: grid;
                flex: 0 0 32px;
                width: 32px;
                height: 32px;
                place-items: center;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--mr-primary, #00478d), var(--mr-accent, #6e33ff));
                color: #fff;
            }
            .kd-card__avatar .material-icons {
                font-size: 18px;
            }
            .kd-card__close {
                display: grid;
                width: 28px;
                height: 28px;
                place-items: center;
                border: 0;
                border-radius: 8px;
                background: transparent;
                color: var(--mr-on-surface-variant, #424752);
                cursor: pointer;
            }
            .kd-fab {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 9px 16px;
                border: 0;
                border-radius: 999px;
                background: linear-gradient(135deg, var(--mr-primary, #00478d), var(--mr-accent, #6e33ff));
                color: #fff;
                font: inherit;
                font-weight: 700;
                text-decoration: none;
                cursor: pointer;
            }
            .kd-fab {
                box-shadow: 0 10px 28px rgba(0, 71, 141, 0.28);
            }
            .kd-fab .material-icons {
                font-size: 18px;
            }
            .kd-fab:focus-visible,
            .kd-card__close:focus-visible {
                outline: 3px solid var(--mr-accent, #6e33ff);
                outline-offset: 3px;
            }
            @media (max-width: 640px) {
                :host {
                    right: 16px;
                    bottom: 16px;
                }
            }
        `,
    ],
})
export class AgreementKdCardComponent {
    /** Knowledge Discovery place of the agreement's documents (`agreements.<agreementId>.documents`). */
    @Input() placeId = '';
    /** Older link of the agreement (`agreement.json` → `knowledgeDiscovery`), used while the place has none. */
    @Input() fallback: Partial<KnowledgeDiscoveryLink> | null = null;

    @ViewChild('expandButtonRef') private expandButton?: ElementRef<HTMLButtonElement>;

    readonly i18n = I18N;
    readonly cardId = `mr-kd-card-${Math.random().toString(36).slice(2, 9)}`;
    expanded = true;

    collapse(): void {
        this.expanded = false;
        setTimeout(() => this.expandButton?.nativeElement.focus());
    }

    expand(): void {
        this.expanded = true;
    }

    @HostListener('keydown.escape')
    onEscape(): void {
        if (this.expanded) {
            this.collapse();
        }
    }
}
