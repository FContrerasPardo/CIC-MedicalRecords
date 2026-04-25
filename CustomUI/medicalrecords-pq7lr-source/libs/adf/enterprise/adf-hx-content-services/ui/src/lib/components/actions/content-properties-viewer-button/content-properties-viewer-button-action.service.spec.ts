/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { ActionContext, DocumentPermissions, SidebarService } from '@alfresco/adf-hx-content-services/services';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { ContentPropertyViewerActionService } from './content-properties-viewer-button-action.service';

describe('ContentPropertyViewerActionService', () => {
    let propertyViewerButtonActionService: ContentPropertyViewerActionService;
    let sidebarService: SidebarService;

    beforeEach(() => {
        const sidebarServiceMock = {
            togglePanel: jest.fn(),
        };

        TestBed.configureTestingModule({
            providers: [ContentPropertyViewerActionService, { provide: SidebarService, useValue: sidebarServiceMock }],
        });

        propertyViewerButtonActionService = TestBed.inject(ContentPropertyViewerActionService);
        sidebarService = TestBed.inject(SidebarService);
    });

    it("action is not available if there's no documents in context", () => {
        const actionContext: ActionContext = { documents: [] };
        expect(propertyViewerButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if there's multiple documents in context", () => {
        const actionContext: ActionContext = { documents: [jestMocks.fileDocument, jestMocks.nestedDocument] };
        expect(propertyViewerButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if user doesn't have required permission on provided document", () => {
        const actionContext: ActionContext = { documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: [] }] };
        expect(propertyViewerButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is available if there's a single document and user has required permission on provided document", () => {
        const actionContext: ActionContext = { documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: [DocumentPermissions.READ] }] };
        expect(propertyViewerButtonActionService.isAvailable(actionContext)).toBeTruthy();
    });

    it('should call togglePanel with property on action execution', () => {
        propertyViewerButtonActionService.execute();
        expect(sidebarService.togglePanel).toHaveBeenCalledWith('property');
    });
});
