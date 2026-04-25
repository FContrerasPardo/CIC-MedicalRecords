/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HXP_DOCUMENT_INFO_ACTION_SERVICE, SidebarService } from '@alfresco/adf-hx-content-services/services';
import { APP_INITIALIZER, effect, importProvidersFrom, Injectable, Injector } from '@angular/core';
import { mocks } from '@hxp/workspace-hxp/shared/testing';
import { applicationConfig, Meta } from '@storybook/angular';
import { I18nModule } from '../../../configs/storybook/i18n.module';
import { ContentPropertyViewerActionService } from './content-properties-viewer-button-action.service';
import { ContentPropertiesViewerButtonComponent } from './content-properties-viewer-button.component';

@Injectable({
    providedIn: 'root',
})
class OpenViewerService {
    constructor(injector: Injector) {
        const sidebarService = injector.get(SidebarService);
        let isFirstRun = true;

        effect(() => {
            const panel = sidebarService.panel();

            if (isFirstRun) {
                isFirstRun = false;
                return;
            }

            if (panel === null) {
                alert('Sidebar panel closed');
            } else {
                alert(`Sidebar panel changed to: ${panel}`);
            }
        });
    }
}

export default {
    title: 'Ui/Actions/Content Properties Viewer Button',
    component: ContentPropertiesViewerButtonComponent,
    decorators: [
        applicationConfig({
            providers: [
                importProvidersFrom(I18nModule),
                {
                    provide: HXP_DOCUMENT_INFO_ACTION_SERVICE,
                    useClass: ContentPropertyViewerActionService,
                },
                {
                    provide: APP_INITIALIZER,
                    useFactory: (injector: Injector) => () => {
                        return new OpenViewerService(injector);
                    },
                    deps: [Injector],
                    multi: true,
                },
            ],
        }),
    ],
} as Meta<ContentPropertiesViewerButtonComponent>;

export const ViewerButton = {
    render: (args: ContentPropertiesViewerButtonComponent) => ({
        props: args,
    }),
    args: {
        actionContext: { documents: [mocks.fileDocument] },
    },
};

export const MissingViewerButtonAsDocumentUnavailable = {
    render: (args: ContentPropertiesViewerButtonComponent) => ({
        props: args,
    }),
    args: {
        actionContext: { documents: [] },
    },
};

export const MissingViewerButtonAsPermissionNotGiven = {
    render: (args: ContentPropertiesViewerButtonComponent) => ({
        props: args,
    }),
    args: {
        actionContext: { documents: [{ ...mocks.fileDocument, sys_effectivePermissions: [] }] },
    },
};
