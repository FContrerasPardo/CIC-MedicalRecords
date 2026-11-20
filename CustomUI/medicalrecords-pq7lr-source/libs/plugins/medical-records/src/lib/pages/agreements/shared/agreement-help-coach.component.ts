import { Component, ElementRef, HostListener, inject, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

const I18N = 'MEDICAL_RECORDS.AGREEMENTS.HELP';
const STORAGE_PREFIX = 'medicalRecords.agreements.coachSeen.';
/** The first-time coach leaves on its own after this time, unless the user is reading it (hover or focus). */
const AUTO_HIDE_MS = 14000;

export type AgreementHelpTopic = 'GENERAL' | 'CHECKLIST' | 'POLICY' | 'AGENT_FINANCIAL' | 'AGENT_COMPLIANCE' | 'AGENT_CODING' | 'AI_RULES' | 'DOCUMENTS';

/** Whether the coach of a topic was already shown in this browser (storage may be blocked). */
export function coachSeen(topic: string): boolean {
    try {
        return localStorage.getItem(STORAGE_PREFIX + topic) === '1';
    } catch {
        return false;
    }
}

export function markCoachSeen(topic: string): void {
    try {
        localStorage.setItem(STORAGE_PREFIX + topic, '1');
    } catch {
        // Private mode or blocked storage: the coach shows again next time, nothing else changes.
    }
}

/**
 * Plain-language help of a tab of the Agreements page: what these rules are, what they do in the
 * demo and how to configure them. It appears by itself the first time the tab is shown (remembered
 * per tab in localStorage) and leaves on its own; «What is this?» opens it again. It floats as a
 * popover anchored to the button (absolute, over the content), so it never moves the page.
 */
@Component({
    selector: 'medical-records-agreement-help-coach',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <button #trigger type="button" class="coach-trigger" (click)="toggle()" aria-haspopup="dialog" [attr.aria-expanded]="open" [attr.aria-controls]="id">
            <span class="material-icons" aria-hidden="true">help_outline</span>{{ i18n + '.WHAT_IS_THIS' | translate }}
        </button>
        @if (open) {
            <section
                class="coach"
                [id]="id"
                role="dialog"
                aria-modal="false"
                [attr.aria-labelledby]="id + '-title'"
                (mouseenter)="hold()"
                (focusin)="hold()"
            >
                <span class="coach__avatar" aria-hidden="true"><span class="material-icons">tips_and_updates</span></span>
                <div class="coach__body">
                    <h3 #heading [id]="id + '-title'" tabindex="-1">{{ i18n + '.' + topic + '.TITLE' | translate }}</h3>
                    <dl>
                        <dt>{{ i18n + '.WHAT' | translate }}</dt>
                        <dd>{{ i18n + '.' + topic + '.WHAT' | translate }}</dd>
                        <dt>{{ i18n + '.WHY' | translate }}</dt>
                        <dd>{{ i18n + '.' + topic + '.WHY' | translate }}</dd>
                        <dt>{{ i18n + '.HOW' | translate }}</dt>
                        <dd>{{ i18n + '.' + topic + '.HOW' | translate }}</dd>
                    </dl>
                </div>
                <button type="button" class="coach__close" (click)="close(true)" [attr.aria-label]="i18n + '.CLOSE' | translate">
                    <span class="material-icons" aria-hidden="true">close</span>
                </button>
                @if (autoHiding) {
                    <span class="coach__timer" aria-hidden="true"></span>
                }
            </section>
        }
    `,
    styles: [
        `
            :host {
                position: relative;
                display: inline-flex;
                justify-self: end;
            }
            .coach-trigger {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border: 1px solid var(--mr-border, rgba(194, 198, 212, 0.55));
                border-radius: 999px;
                background: var(--mr-surface, #fff);
                color: var(--mr-primary, #00478d);
                font: inherit;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
            }
            .coach-trigger .material-icons {
                font-size: 16px;
            }
            .coach-trigger:focus-visible,
            .coach__close:focus-visible {
                outline: 2px solid var(--mr-primary, #00478d);
                outline-offset: 2px;
            }
            /* Floating card anchored to the trigger: it overlays the page and never pushes the content. */
            .coach {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                z-index: 40;
                display: flex;
                gap: 12px;
                width: min(440px, calc(100vw - 32px));
                box-sizing: border-box;
                padding: 14px 44px 14px 14px;
                border: 1px solid color-mix(in srgb, var(--mr-primary, #00478d) 22%, transparent);
                border-radius: 14px;
                background: linear-gradient(135deg, var(--mr-surface-hover, #eff4ff), var(--mr-surface, #fff));
                background-color: var(--mr-surface, #fff);
                box-shadow: 0 12px 32px rgba(0, 27, 61, 0.18);
                overflow: hidden;
                animation: coach-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
                text-align: left;
            }
            .coach::before {
                content: "";
                position: absolute;
                top: -6px;
                right: 24px;
                width: 10px;
                height: 10px;
                transform: rotate(45deg);
                background: var(--mr-surface-hover, #eff4ff);
            }
            .coach__avatar {
                display: grid;
                flex: 0 0 36px;
                width: 36px;
                height: 36px;
                place-items: center;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--mr-primary, #00478d), var(--mr-accent, #6e33ff));
                color: #fff;
                animation: coach-bounce 1.6s ease-in-out 2;
            }
            .coach__body h3 {
                margin: 0 0 6px;
                color: var(--mr-heading, #001b3d);
                font-size: 14px;
            }
            .coach__body h3:focus {
                outline: none;
            }
            .coach dl {
                display: grid;
                grid-template-columns: max-content minmax(0, 1fr);
                gap: 4px 10px;
                margin: 0;
                font-size: 13px;
                line-height: 1.45;
            }
            .coach dt {
                color: var(--mr-primary, #00478d);
                font-weight: 700;
            }
            .coach dd {
                margin: 0;
                color: var(--mr-on-surface-variant, #424752);
            }
            .coach__close {
                position: absolute;
                top: 8px;
                right: 8px;
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
            .coach__timer {
                position: absolute;
                left: 0;
                bottom: 0;
                height: 3px;
                width: 100%;
                background: var(--mr-primary, #00478d);
                transform-origin: left;
                animation: coach-timer ${AUTO_HIDE_MS}ms linear forwards;
            }
            @media (max-width: 640px) {
                .coach dl {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
            @keyframes coach-in {
                from {
                    opacity: 0;
                    transform: translateY(-8px);
                }
                to {
                    opacity: 1;
                    transform: none;
                }
            }
            @keyframes coach-bounce {
                0%,
                100% {
                    transform: none;
                }
                50% {
                    transform: translateY(-4px) rotate(-8deg);
                }
            }
            @keyframes coach-timer {
                from {
                    transform: scaleX(1);
                }
                to {
                    transform: scaleX(0);
                }
            }
            @media (prefers-reduced-motion: reduce) {
                .coach,
                .coach__avatar,
                .coach__timer {
                    animation: none;
                }
            }
        `,
    ],
})
export class AgreementHelpCoachComponent implements OnChanges, OnDestroy {
    /** Topic key under `MEDICAL_RECORDS.AGREEMENTS.HELP`. */
    @Input({ required: true }) topic!: AgreementHelpTopic;
    /** The tab is visible: the first time, the coach appears by itself. */
    @Input() active = true;

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;
    @ViewChild('heading') private heading?: ElementRef<HTMLElement>;

    readonly i18n = I18N;
    readonly id = `mr-coach-${Math.random().toString(36).slice(2, 9)}`;
    open = false;
    autoHiding = false;
    private timer: ReturnType<typeof setTimeout> | null = null;

    ngOnChanges(): void {
        if (this.active && this.topic && !this.open && !coachSeen(this.topic)) {
            markCoachSeen(this.topic);
            this.open = true;
            this.autoHiding = true;
            this.timer = setTimeout(() => this.close(false), AUTO_HIDE_MS);
        }
    }

    ngOnDestroy(): void {
        this.clearTimer();
    }

    toggle(): void {
        if (this.open) {
            this.close(true);
            return;
        }
        this.open = true;
        this.autoHiding = false;
        this.clearTimer();
        queueMicrotask(() => this.heading?.nativeElement.focus());
    }

    /** The user is reading it: it no longer leaves by itself. */
    hold(): void {
        this.autoHiding = false;
        this.clearTimer();
    }

    close(returnFocus: boolean): void {
        this.open = false;
        this.autoHiding = false;
        this.clearTimer();
        if (returnFocus) {
            queueMicrotask(() => this.trigger?.nativeElement.focus());
        }
    }

    @HostListener('keydown.escape', ['$event'])
    onEscape(event: Event): void {
        if (this.open) {
            event.stopPropagation();
            this.close(true);
        }
    }

    /** A click outside the card closes it (focus stays where the user clicked). */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.open && event.target instanceof Node && !this.host.nativeElement.contains(event.target)) {
            this.close(false);
        }
    }

    private clearTimer(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
