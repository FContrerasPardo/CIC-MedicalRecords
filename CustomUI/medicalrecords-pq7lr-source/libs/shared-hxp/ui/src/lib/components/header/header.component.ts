/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppConfigService } from '@alfresco/adf-core';
import { ContentActionRef, ExtensionService } from '@alfresco/adf-extensions';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDividerModule } from '@angular/material/divider';
import { HeaderComponent } from '@hxp/shared-hxp/navigation/header';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface HxpHeaderConfig {
    headerColor: string;
    headerTextColor: string;
    application: {
        name: string;
        logo: string;
        headerImagePath: string;
    };
    features?: {
        header?: ContentActionRef[];
    };
}

@Component({
    selector: 'hxp-workspace-header',
    templateUrl: './header.component.html',
    imports: [MatDividerModule, HeaderComponent],
})
export class HxpWorkspaceHeaderComponent {
    private readonly extensionService = inject(ExtensionService);
    private readonly appConfigService = inject(AppConfigService);

    readonly headerTextColor = signal<string>('');
    readonly backgroundColor = signal<string>('');
    readonly backgroundImage = signal<string>('');
    readonly logoPath = signal<string>('');

    readonly config = toSignal<HxpHeaderConfig | null>(
        this.extensionService.setup$.pipe(
            switchMap(() => of<HxpHeaderConfig | null>(this.appConfigService.config))
        ),
        { initialValue: null }
    );

    constructor() {
        effect(() => {
            const config = this.config();
            if (config) {
                if (config.headerTextColor) {
                    this.headerTextColor.set(config.headerTextColor);
                }
                if (config.headerColor) {
                    this.backgroundColor.set(config.headerColor);
                }
                if (config.application.headerImagePath) {
                    this.backgroundImage.set(config.application.headerImagePath);
                }
                if (config.application.logo) {
                    this.logoPath.set(config.application.logo);
                }
            }
        });
    }
}
