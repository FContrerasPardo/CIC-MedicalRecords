/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { MetadataSidebarService } from './hxp-metadata-sidebar.service';
import { of, firstValueFrom } from 'rxjs';
import { DOCUMENT_PROPERTIES_SERVICE } from '@alfresco/adf-hx-content-services/services';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';

describe('MetadataSidebarService', () => {
    let service: MetadataSidebarService;
    let documentPropertiesService: any;

    beforeEach(() => {
        const spy = {
            getDefaultPropertiesFromDocument: jest.fn(),
            getPropertiesFromDocument: jest.fn().mockImplementation((document, options) => {
                // Simulate the filtering behavior
                const allProperties = [
                    { key: 'custom1', value: 'val1' },
                    { key: 'custom2', value: 'val2' },
                    { key: 'sys_title', value: 'Title' },
                    { key: 'sysfile_blob', value: 'blob' },
                    { key: 'sysver_version', value: '1.0' },
                    { key: 'sysgov_policy', value: 'policy' },
                ];

                if (options?.exclude?.schemas) {
                    return of(allProperties.filter((prop) => !options.exclude.schemas.some((schema: string) => prop.key.startsWith(schema))));
                }

                return of(allProperties);
            }),
        };
        TestBed.configureTestingModule({
            providers: [{ provide: DOCUMENT_PROPERTIES_SERVICE, useValue: spy }],
        });
        service = TestBed.inject(MetadataSidebarService);
        documentPropertiesService = TestBed.inject(DOCUMENT_PROPERTIES_SERVICE);
    });

    it('should filter and sort editable system properties', async () => {
        const document = jestMocks.fileDocument;
        const mockProperties = [
            { key: 'sys_title', value: 'Title' },
            { key: 'sys_primaryType', value: 'Type' },
            { key: 'custom_property', value: 'Custom Value' },
            { key: 'sysfile_blob.filename', value: 'file.txt' },
        ];
        documentPropertiesService.getDefaultPropertiesFromDocument.mockReturnValue(of(mockProperties));
        const result = await firstValueFrom(service.getEditableSystemPropertiesFromDocument(document));

        // Expected order follows EDITABLE_DEFAULT_PROPERTIES array
        expect(result).toEqual([
            { key: 'sys_primaryType', value: 'Type' },
            { key: 'sys_title', value: 'Title' },
            { key: 'sysfile_blob.filename', value: 'file.txt' },
        ]);
    });

    it('should filter and sort non-editable system properties', async () => {
        const document = jestMocks.fileDocument;
        const mockProperties = [
            { key: 'sys_modified', value: '2020-01-01' },
            { key: 'irrelevant', value: 'ignored' },
            { key: 'sys_creator', value: 'Creator' },
            { key: 'sys_created', value: '2020-01-01' },
        ];
        documentPropertiesService.getDefaultPropertiesFromDocument.mockReturnValue(of(mockProperties));
        const result = await firstValueFrom(service.getNonEditableSystemPropertiesFromDocument(document));

        // Expected order follows NON_EDITABLE_DEFAULT_PROPERTIES array
        expect(result).toEqual([
            { key: 'sys_created', value: '2020-01-01' },
            { key: 'sys_modified', value: '2020-01-01' },
            { key: 'sys_creator', value: 'Creator' },
        ]);
    });

    it('should return custom properties using getPropertiesFromDocument', async () => {
        const document = jestMocks.fileDocument;

        const result = await firstValueFrom(service.getCustomProperties(document));

        expect(documentPropertiesService.getPropertiesFromDocument).toHaveBeenCalledWith(document, {
            exclude: {
                schemas: ['sysfile_blob', 'sys_', 'sysver_', 'sysgov_'],
            },
        });

        expect(result).toEqual([
            { key: 'custom1', value: 'val1' },
            { key: 'custom2', value: 'val2' },
        ]);
    });
});
