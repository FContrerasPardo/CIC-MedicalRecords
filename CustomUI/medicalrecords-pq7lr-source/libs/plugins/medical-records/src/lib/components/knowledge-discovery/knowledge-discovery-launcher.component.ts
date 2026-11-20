import { Component, DestroyRef, ElementRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { KnowledgeDiscoveryConfigDialogComponent, KnowledgeDiscoveryConfigDialogData } from './knowledge-discovery-config-dialog.component';
import { KnowledgeDiscoveryPlaceService, KnowledgeDiscoveryPlaceState } from './knowledge-discovery-place.service';
import {
    isValidKnowledgeDiscoveryPlaceId,
    KnowledgeDiscoveryLink,
    KnowledgeDiscoveryLinkSource,
    resolveKnowledgeDiscoveryLink,
} from './knowledge-discovery-place.util';

const I18N = 'MEDICAL_RECORDS.KNOWLEDGE_DISCOVERY';

/** Theme tokens handed to the dialog (it is rendered in the overlay, outside the plugin's tree). */
const THEME_TOKENS = ['--mr-surface', '--mr-border', '--mr-primary', '--mr-heading', '--mr-on-surface', '--mr-muted', '--mr-error-text'];

/** Theme tokens of the plugin as computed on `element`, for the configuration dialog. */
export function knowledgeDiscoveryThemeTokens(element: HTMLElement): Record<string, string> {
    const style = getComputedStyle(element);
    const tokens: Record<string, string> = {};
    for (const token of THEME_TOKENS) {
        const value = style.getPropertyValue(token).trim();
        if (value) {
            tokens[token] = value;
        }
    }
    return tokens;
}

/** Opens the Knowledge Discovery configuration dialog of a place (same dialog for every entry point). */
export function openKnowledgeDiscoveryConfig(dialog: MatDialog, data: KnowledgeDiscoveryConfigDialogData): void {
    dialog.open(KnowledgeDiscoveryConfigDialogComponent, { width: '560px', maxWidth: '95vw', autoFocus: 'first-tabbable', data });
}

/**
 * Knowledge Discovery entry point of one place of the app (`placeId`, e.g.
 * `agreements.<agreementId>.documents`, `case.audit`, `radication.review`); each place can open a
 * different KD agent. First time (no link): one button «Configure Knowledge Discovery» that opens
 * the configuration dialog. Afterwards: the «Open» button (new tab) with the saved text, and a
 * discreet gear to change the link. The link is kept per place by `KnowledgeDiscoveryPlaceService`;
 * `fallback` is an older link of the caller, used while the place has no file of its own.
 */
@Component({
    selector: 'medical-records-knowledge-discovery-launcher',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <span class="kd-launcher" [class.kd-launcher--accent]="appearance === 'accent'" [class.kd-launcher--block]="block">
            @if (status === 'loading' && !link) {
                <button type="button" class="kd-launcher__main" disabled>
                    <span class="material-icons" aria-hidden="true">{{ icon }}</span>{{ i18n + '.LOADING' | translate }}
                </button>
            } @else if (link) {
                <a class="kd-launcher__main" [href]="link.url" target="_blank" rel="noopener noreferrer" [title]="link.description">
                    <span class="material-icons" aria-hidden="true">{{ icon }}</span>{{ label || link.label || (i18n + '.OPEN' | translate) }}
                    <span class="kd-launcher__sr-only">{{ i18n + '.NEW_TAB' | translate }}</span>
                </a>
                <button type="button" class="kd-launcher__settings" (click)="configure()" [disabled]="!placeValid" [attr.aria-label]="i18n + '.SETTINGS' | translate" [title]="i18n + '.SETTINGS' | translate">
                    <span class="material-icons" aria-hidden="true">settings</span>
                </button>
            } @else {
                <button type="button" class="kd-launcher__main" (click)="configure()" [disabled]="!placeValid" [title]="status === 'error' ? (i18n + '.LOAD_ERROR' | translate) : ''">
                    <span class="material-icons" aria-hidden="true">settings</span>{{ i18n + '.CONFIGURE_FIRST' | translate }}
                </button>
            }
        </span>
    `,
    styles: [
        `
            :host {
                display: inline-flex;
                max-width: 100%;
            }
            .kd-launcher {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                max-width: 100%;
            }
            .kd-launcher--block,
            .kd-launcher--block .kd-launcher__main {
                flex: 1 1 auto;
                width: 100%;
            }
            .kd-launcher__main {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 36px;
                box-sizing: border-box;
                padding: 7px 14px;
                border: 1px solid var(--mr-border, #d0d5dd);
                border-radius: 10px;
                background: var(--mr-surface, #fff);
                color: var(--mr-primary, #00478d);
                font: inherit;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
            }
            .kd-launcher--accent .kd-launcher__main {
                border: 0;
                border-radius: 999px;
                background: linear-gradient(135deg, var(--mr-primary, #00478d), var(--mr-accent, #6e33ff));
                color: #fff;
                font-weight: 700;
            }
            .kd-launcher__main[disabled] {
                cursor: default;
                opacity: 0.7;
            }
            .kd-launcher__main .material-icons {
                font-size: 18px;
            }
            .kd-launcher__settings {
                display: grid;
                flex: 0 0 32px;
                width: 32px;
                height: 32px;
                place-items: center;
                border: 0;
                border-radius: 8px;
                background: transparent;
                color: var(--mr-muted, #667085);
                cursor: pointer;
            }
            .kd-launcher__settings:hover {
                background: var(--mr-surface-muted, #f2f4f7);
                color: var(--mr-primary, #00478d);
            }
            .kd-launcher__settings .material-icons {
                font-size: 18px;
            }
            .kd-launcher__main:focus-visible,
            .kd-launcher__settings:focus-visible {
                outline: 3px solid var(--mr-accent, #6e33ff);
                outline-offset: 2px;
            }
            .kd-launcher__sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                overflow: hidden;
                clip: rect(0 0 0 0);
                white-space: nowrap;
            }
        `,
    ],
})
export class KnowledgeDiscoveryLauncherComponent implements OnChanges {
    private readonly service = inject(KnowledgeDiscoveryPlaceService);
    private readonly dialog = inject(MatDialog);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /** Place of the app whose KD agent this launcher opens (`/MedRec/Appdata/KnowledgeDiscovery/<placeId>.json`). */
    @Input() placeId = '';
    /** Older link of the caller, used while the place has no file (e.g. `agreement.json` → `knowledgeDiscovery`). */
    @Input() fallback: Partial<KnowledgeDiscoveryLink> | null = null;
    /** Text of the open button; else the saved text, else «Open Knowledge Discovery». */
    @Input() label = '';
    @Input() icon = 'travel_explore';
    /** `button`: outlined, like the page buttons; `accent`: gradient, for floating cards. */
    @Input() appearance: 'button' | 'accent' = 'button';
    /** Takes the full width of its container. */
    @Input() block = false;

    readonly i18n = I18N;
    status: KnowledgeDiscoveryPlaceState['status'] = 'loading';
    link: KnowledgeDiscoveryLink | null = null;
    source: KnowledgeDiscoveryLinkSource = 'none';
    private state: KnowledgeDiscoveryPlaceState | null = null;
    private subscription: Subscription | null = null;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
    }

    get placeValid(): boolean {
        return isValidKnowledgeDiscoveryPlaceId(this.placeId);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['placeId']) {
            this.subscription?.unsubscribe();
            this.subscription = null;
            this.state = null;
            if (this.placeValid) {
                this.subscription = this.service.watch(this.placeId).subscribe((state) => {
                    this.state = state;
                    this.resolve();
                });
            }
        }
        this.resolve();
    }

    /** Opens the configuration dialog of the place. */
    configure(): void {
        if (!this.placeValid) {
            return;
        }
        openKnowledgeDiscoveryConfig(this.dialog, { placeId: this.placeId, link: this.link, source: this.source, theme: knowledgeDiscoveryThemeTokens(this.host.nativeElement) });
    }

    private resolve(): void {
        this.status = this.placeValid ? this.state?.status ?? 'loading' : 'ready';
        // While loading, the fallback is not shown: the place file may clear or replace it.
        const ready = this.status !== 'loading';
        const resolved = ready ? resolveKnowledgeDiscoveryLink(this.state?.config ?? null, this.fallback) : { link: null, source: 'none' as const };
        this.link = resolved.link;
        this.source = resolved.source;
    }
}
