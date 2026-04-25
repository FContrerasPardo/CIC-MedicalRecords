/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppConfigService } from '@alfresco/adf-core';
import { StoragePrefixFactory } from './storage-prefix.factory';
import { firstValueFrom, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';

type TestAppConfigService = Pick<AppConfigService, 'select'>;

describe('StoragePrefixFactory', () => {
    it('should get prefix from deployed apps from app.config.json', async () => {
        const deployedAppName = 'test-app';

        const appConfigService: TestAppConfigService = {
            select: jest.fn().mockReturnValue(of<Array<{ name: string }>>([{ name: deployedAppName }])),
        };

        TestBed.configureTestingModule({
            providers: [
                StoragePrefixFactory,
                {
                    provide: AppConfigService,
                    useValue: appConfigService,
                },
            ],
        });

        const serviceFactory = TestBed.inject(StoragePrefixFactory);
        const prefix = await firstValueFrom(serviceFactory.getPrefix());

        expect(prefix).toBe(deployedAppName);
    });

    it('should work, when there are no deployed apps', async () => {
        const appConfigService: TestAppConfigService = {
            select: jest.fn().mockReturnValue(of<Array<{ name: string }>>([])),
        };

        TestBed.configureTestingModule({
            providers: [
                StoragePrefixFactory,
                {
                    provide: AppConfigService,
                    useValue: appConfigService,
                },
            ],
        });

        const serviceFactory = TestBed.inject(StoragePrefixFactory);
        const prefix = await firstValueFrom(serviceFactory.getPrefix());

        expect(prefix).toBe(undefined);
    });
});
