/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { AppKeyService } from './app-key.service';
import { JwtHelperService } from '@alfresco/adf-core';
import { mockJwtHelperAppKey, mockCurrentKey } from '../mocks/services/app-key.service.mock';

describe('AppKeyService', () => {
    let service: AppKeyService;

    function initTest(appkey: string) {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: JwtHelperService,
                    useValue: {
                        getValueFromLocalToken: () => ({
                            appkey,
                        }),
                    },
                },
            ],
        });

        service = TestBed.inject(AppKeyService);
    }

    it('should set currentKey to application key', () => {
        initTest(mockJwtHelperAppKey);
        expect(service.currentKey).toBe(mockCurrentKey);
    });

    it('should set empty currentKey if no application key', () => {
        initTest('');
        expect(service.currentKey).toBe('');
    });
});
