/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppConfigService } from '@alfresco/adf-core';
import { MockService } from 'ng-mocks';
import { SidenavExpansionService } from './sidenav-expansion.service';

describe('SidenavExpansionService', () => {
    let service: SidenavExpansionService;
    const mockAppConfigService: AppConfigService = MockService(AppConfigService);
    let spyAppConfig: any;

    beforeEach(() => {
        spyAppConfig = jest.spyOn(mockAppConfigService, 'get');

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [SidenavExpansionService, { provide: AppConfigService, useValue: mockAppConfigService }],
        });
        service = TestBed.inject(SidenavExpansionService);
    });

    it('should return true when landing page url is blank or undefined', () => {
        spyAppConfig.mockReturnValue('');

        expect(service.isSideNavExpanded()).toBeTruthy();
    });

    it('should return false when landing page url contains value', () => {
        spyAppConfig.mockReturnValue('/any-process-url');

        expect(service.isSideNavExpanded()).toBeFalsy();
    });
});
