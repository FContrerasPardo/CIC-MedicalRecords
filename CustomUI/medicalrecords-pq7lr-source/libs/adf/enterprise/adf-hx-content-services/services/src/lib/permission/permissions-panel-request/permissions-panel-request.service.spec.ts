/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NoopTranslateModule } from '@alfresco/adf-core';
import { TestBed } from '@angular/core/testing';
import { PermissionsPanelRequestService } from './permissions-panel-request.service';
import { SidebarService } from '../../sidebar/sidebar-service';

describe('PermissionsPanelRequestService', () => {
    let permissionsPanelRequestService: PermissionsPanelRequestService;
    let sidebarService: SidebarService;

    beforeEach(() => {
        const sidebarServiceMock = {
            togglePanel: jest.fn(),
            closePanel: jest.fn(),
        };

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [PermissionsPanelRequestService, { provide: SidebarService, useValue: sidebarServiceMock }],
        });
        permissionsPanelRequestService = TestBed.inject(PermissionsPanelRequestService);
        sidebarService = TestBed.inject(SidebarService);
    });

    it('should notify requests for opening permissions panel', () => {
        permissionsPanelRequestService.requestOpenPanel();

        expect(sidebarService.togglePanel).toHaveBeenCalledWith('permission');
    });

    it('should notify requests for closing permissions panel', () => {
        permissionsPanelRequestService.requestClosePanel();

        expect(sidebarService.closePanel).toHaveBeenCalled();
    });
});
