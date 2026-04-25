/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ClipboardService, INFO_DRAWER_DIRECTIVES, NotificationService } from '@alfresco/adf-core';
import { FieldType, mockHxcsJsClientConfigurationService } from '@alfresco/adf-hx-content-services/api';
import { DOCUMENT_PROPERTIES_SERVICE, DOCUMENT_SERVICE } from '@alfresco/adf-hx-content-services/services';
import { importProvidersFrom } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideAnimations } from '@angular/platform-browser/animations';
import { mocks } from '@hxp/workspace-hxp/shared/testing';
import { applicationConfig, Meta, moduleMetadata } from '@storybook/angular';
import { of } from 'rxjs';
import { I18nModule } from '../../configs/storybook/i18n.module';
import { defaultPropertiesMock } from '../../configs/storybook/properties-management.mock';
import { PropertiesViewerContentComponent } from './properties-viewer-content.component';

export default {
    title: 'Ui/Properties Management/Viewer',
    component: PropertiesViewerContentComponent,
    decorators: [
        applicationConfig({
            providers: [importProvidersFrom(I18nModule), provideAnimations(), MatSnackBar],
        }),
        moduleMetadata({
            imports: [...INFO_DRAWER_DIRECTIVES],
            providers: [
                mockHxcsJsClientConfigurationService,
                ClipboardService,
                NotificationService,
                {
                    provide: DOCUMENT_SERVICE,
                    useValue: {
                        updateDocument: () => {
                            return of({ ...mocks.fileDocument, sys_title: 'Home' });
                        },
                    },
                },
                {
                    provide: DOCUMENT_PROPERTIES_SERVICE,
                    useValue: {
                        getRequiredProperties: (): string[] => {
                            return ['sys_title', 'sysfile_blob.filename'];
                        },
                        propertyType: () => {
                            return FieldType.String;
                        },
                        isFieldTypeArray: () => {},
                    },
                },
            ],
        }),
    ],
} as Meta<PropertiesViewerContentComponent>;

export const ReadonlyProperty = {
    render: (args: PropertiesViewerContentComponent) => ({
        props: args,
    }),
    args: {
        properties: defaultPropertiesMock,
        editable: false,
        expanded: true,
    },
};

export const EditableProperty = {
    render: (args: PropertiesViewerContentComponent) => ({
        props: args,
    }),
    args: {
        properties: defaultPropertiesMock,
        editable: true,
        expanded: true,
        document: mocks.fileDocument,
    },
};

export const CollapsedProperty = {
    render: (args: PropertiesViewerContentComponent) => ({
        props: args,
    }),
    args: {
        properties: defaultPropertiesMock,
        editable: false,
        expanded: false,
    },
};
