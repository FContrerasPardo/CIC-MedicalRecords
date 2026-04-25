/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppConfigService, LogService } from '@alfresco/adf-core';
import { ExtensionConfig, ExtensionService } from '@alfresco/adf-extensions';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { RouterExtensionsService } from './router.extension.service';
import { MainActionButtonComponent } from '../main-action-button/main-action-button.component';
import { HxpWorkspaceHeaderComponent, LogoutComponent } from '@hxp/shared-hxp/ui';
import { take } from 'rxjs/operators';
import { HelpComponent } from '../help/help.component';
import { HxpLanguageMenuComponent } from './language-menu.component';

@Injectable({ providedIn: 'root' })
export class AppExtensionService {
    private readonly extensions = inject(ExtensionService);
    private readonly routerExtensions = inject(RouterExtensionsService);
    private readonly logger = inject(LogService);
    private readonly store = inject(Store);
    private readonly appConfigService = inject(AppConfigService);

    private onLoadSubject$ = new ReplaySubject<void>();
    readonly onLoad$ = this.onLoadSubject$.asObservable();

    private config: ExtensionConfig;

    constructor() {
        this.updateContentServicePluginAvailability();
    }

    updateContentServicePluginAvailability() {
        this.appConfigService.onLoad.pipe(take(1)).subscribe((config) => {
            if (config?.plugins?.contentService) {
                this.enableContentServices();
            } else {
                this.disableContentServices();
            }
        });
    }

    async load(): Promise<void> {
        this.config = await this.extensions.load();

        this.setup(this.config);

        this.routerExtensions.mapExtensionRoutes();

        this.onLoadSubject$.next();
    }

    runActionById(id: string) {
        const action = this.extensions.getActionById(id);
        if (action) {
            const { type, payload } = action;

            const context = {
                selection: undefined,
            };

            const expression = this.extensions.runExpression(payload, context);

            this.store.dispatch({
                type,
                payload: expression,
            });
        } else {
            this.store.dispatch({
                type: id,
            });
        }
    }

    private disableContentServices() {
        if (localStorage) {
            localStorage.setItem('contentService', 'false');
        }
    }

    private enableContentServices() {
        if ((localStorage && localStorage.getItem('contentService') === 'false') || localStorage.getItem('contentService') === null) {
            localStorage.setItem('contentService', 'true');
        }
    }

    private setup(config: ExtensionConfig): void {
        this.extensions.setComponents({
            'app.layout.header': HxpWorkspaceHeaderComponent,
            'app.layout.sidenav': SidenavComponent,
            'task-list-header-action': MainActionButtonComponent,
            'processes-list-header-action': MainActionButtonComponent,
            'app.logout': LogoutComponent,
            'app.help': HelpComponent,
            'app.languages': HxpLanguageMenuComponent,
        });

        if (!config) {
            this.logger.error('Extension configuration not found');
            return;
        }

        // register application-specific rules, evaluators and components here
    }
}
