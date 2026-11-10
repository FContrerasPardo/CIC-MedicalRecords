import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WORKSPACE_NAV_OPTIONS, parseWorkspaceNav } from './appearance.model';
import { AppearanceService } from './appearance.service';

/**
 * Floating "Appearance" panel, mounted once on <body> by `provideAppearanceManager()`.
 * Styles are global on purpose (see the stylesheet): they also hide the ADF application menu.
 */
@Component({
    selector: 'medical-records-appearance-manager',
    standalone: true,
    imports: [NgFor, TranslateModule],
    templateUrl: './appearance-manager.component.html',
    styleUrls: ['./appearance-manager.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppearanceManagerComponent {
    private readonly appearance = inject(AppearanceService);
    private readonly element = inject(ElementRef<HTMLElement>);

    @ViewChild('panel', { static: true }) private panel!: ElementRef<HTMLDetailsElement>;

    readonly preferences = this.appearance.preferences;
    readonly workspaceNavOptions = WORKSPACE_NAV_OPTIONS;

    onWorkspaceNavChange(event: Event): void {
        this.appearance.setWorkspaceNav(parseWorkspaceNav((event.target as HTMLSelectElement).value));
    }

    reset(): void {
        this.appearance.reset();
    }

    @HostListener('document:pointerdown', ['$event'])
    closeOnOutsideInteraction(event: PointerEvent): void {
        if (this.panel.nativeElement.open && event.target && !this.element.nativeElement.contains(event.target as Node)) {
            this.panel.nativeElement.open = false;
        }
    }

    closeOnEscape(panel: HTMLDetailsElement, summary: HTMLElement): void {
        if (panel.open) {
            panel.open = false;
            summary.focus();
        }
    }
}
