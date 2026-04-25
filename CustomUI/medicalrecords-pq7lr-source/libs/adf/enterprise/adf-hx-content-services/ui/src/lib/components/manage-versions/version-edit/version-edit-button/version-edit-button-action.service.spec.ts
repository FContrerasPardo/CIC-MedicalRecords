/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { MatDialog } from '@angular/material/dialog';
import { VersionEditButtonActionService } from './version-edit-button-action.service';
import { MockService } from 'ng-mocks';
import { ActionContext } from '@alfresco/adf-hx-content-services/services';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { TestBed } from '@angular/core/testing';

describe('VersionEditButtonActionService', () => {
    let versionEditButtonActionService: VersionEditButtonActionService;
    let mockMatDialog: MatDialog;

    beforeEach(() => {
        mockMatDialog = MockService(MatDialog);

        TestBed.configureTestingModule({
            providers: [
                VersionEditButtonActionService,
                {
                    provide: MatDialog,
                    useValue: mockMatDialog,
                },
            ],
        });

        versionEditButtonActionService = TestBed.inject(VersionEditButtonActionService);
    });

    it('action is not available if there is no document in context', () => {
        const actionContext: ActionContext = {
            documents: [],
        };

        expect(versionEditButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if user doesn't have `Write` permission on selected document", () => {
        const actionContext: ActionContext = {
            documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: [] }],
        };

        expect(versionEditButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it('action is not available if selected document is not a version', () => {
        const actionContext: ActionContext = {
            documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: ['Write'] }],
        };

        expect(versionEditButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if user doesn't have `WriteVersion` permission on selected document", () => {
        const actionContext: ActionContext = {
            documents: [{ ...jestMocks.fileVersionDocument, sys_effectivePermissions: ['Write'] }],
        };

        expect(versionEditButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it('action is not available if there are multiple documents in the context', () => {
        const actionContext: ActionContext = {
            documents: [
                { ...jestMocks.fileVersionDocument, sys_effectivePermissions: ['Write', 'WriteVersion'] },
                { ...jestMocks.fileVersionDocument, sys_effectivePermissions: ['Write', 'WriteVersion'] },
            ],
        };

        expect(versionEditButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it('action is available if user has `Write` and `WriteVersion` permission on selected document and document is a version', () => {
        const actionContext: ActionContext = {
            documents: [{ ...jestMocks.fileVersionDocument, sys_effectivePermissions: ['Write', 'WriteVersion'] }],
        };

        expect(versionEditButtonActionService.isAvailable(actionContext)).toBeTruthy();
    });
});
