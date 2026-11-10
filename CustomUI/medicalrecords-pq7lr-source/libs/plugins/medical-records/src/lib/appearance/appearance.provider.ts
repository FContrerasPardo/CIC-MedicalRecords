import { DOCUMENT } from '@angular/common';
import {
    ApplicationRef,
    EnvironmentInjector,
    EnvironmentProviders,
    NgZone,
    afterNextRender,
    createComponent,
    inject,
    provideAppInitializer,
} from '@angular/core';
import { AppearanceManagerComponent } from './appearance-manager.component';
import { AppearanceService } from './appearance.service';

const MANAGER_SELECTOR = 'medical-records-appearance-manager';

/**
 * Starts the appearance feature with the app:
 *  - applies the stored preferences to <html> right away, so a hidden menu does not flash back;
 *  - once the first render is done, mounts the floating panel on <body>, which keeps it available
 *    on every page (native Automate task pages included), not only on the plugin routes.
 *
 * Cosmetic by design: any failure is logged and never blocks the application from starting.
 */
export function provideAppearanceManager(): EnvironmentProviders {
    return provideAppInitializer(() => {
        const injector = inject(EnvironmentInjector);
        try {
            inject(AppearanceService).apply();
            // afterNextRender callbacks run outside the Angular zone; mount inside it so the panel's
            // events trigger change detection like any other component.
            afterNextRender(() => injector.get(NgZone).run(() => mountManager(injector)), { injector });
        } catch (error) {
            console.warn('[medical-records] Appearance preferences could not be applied.', error);
        }
    });
}

function mountManager(injector: EnvironmentInjector): void {
    try {
        const doc = injector.get(DOCUMENT);
        if (doc.querySelector(MANAGER_SELECTOR)) {
            return;
        }
        const manager = createComponent(AppearanceManagerComponent, { environmentInjector: injector });
        injector.get(ApplicationRef).attachView(manager.hostView);
        doc.body.appendChild(manager.location.nativeElement);
    } catch (error) {
        console.warn('[medical-records] The appearance panel could not be mounted.', error);
    }
}
