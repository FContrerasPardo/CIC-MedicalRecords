/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { ManageVersionsButtonActionService } from './manage-versions-button-action.service';
import { ActionContext } from '../../context-menu-actions/actions/action-context.interface';
import { DocumentPermissions } from '../../document/configs/document-permissions.enum';
import { SidebarService } from '../../sidebar/sidebar-service';

describe('ManageVersionsButtonActionService', () => {
    let manageVersionsButtonActionService: ManageVersionsButtonActionService;
    let sidebarService: SidebarService;

    beforeEach(() => {
        const sidebarServiceMock = {
            togglePanel: jest.fn(),
        };

        TestBed.configureTestingModule({
            providers: [ManageVersionsButtonActionService, { provide: SidebarService, useValue: sidebarServiceMock }],
        });

        manageVersionsButtonActionService = TestBed.inject(ManageVersionsButtonActionService);
        sidebarService = TestBed.inject(SidebarService);
    });

    it("should not be available if there's no documents in context", () => {
        const actionContext: ActionContext = { documents: [] };
        expect(manageVersionsButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("should not be available if there's multiple documents in context", () => {
        const actionContext: ActionContext = { documents: [jestMocks.fileDocument, jestMocks.nestedDocument] };
        expect(manageVersionsButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it('should be available if document support versioning and user has required permission on provided document', () => {
        const actionContext: ActionContext = {
            documents: [{ ...jestMocks.versionSupportedDocument, sys_effectivePermissions: [DocumentPermissions.READ_VERSION] }],
        };
        expect(manageVersionsButtonActionService.isAvailable(actionContext)).toBeTruthy();
    });

    it('should call togglePanel with version on action execution', () => {
        manageVersionsButtonActionService.execute();
        expect(sidebarService.togglePanel).toHaveBeenCalledWith('version');
    });
});
