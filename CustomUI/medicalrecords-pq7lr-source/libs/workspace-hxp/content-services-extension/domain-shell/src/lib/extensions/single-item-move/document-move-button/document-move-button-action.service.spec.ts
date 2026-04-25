/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { MockService } from 'ng-mocks';
import { MatDialog } from '@angular/material/dialog';
import { ActionContext, DocumentPermissions } from '@alfresco/adf-hx-content-services/services';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { DocumentMoveButtonActionService } from './document-move-button-action.service';
import { DocumentMoveDialogComponent } from '../document-move-dialog/document-move-dialog.component';
import { DialogConfig } from '@alfresco/adf-hx-content-services/ui';
import { TestBed } from '@angular/core/testing';

describe('DocumentMoveButtonActionService', () => {
    let moveButtonActionService: DocumentMoveButtonActionService;
    let mockMatDialog: MatDialog;

    beforeEach(() => {
        mockMatDialog = MockService(MatDialog);

        TestBed.configureTestingModule({
            providers: [
                DocumentMoveButtonActionService,
                {
                    provide: MatDialog,
                    useValue: mockMatDialog,
                },
            ],
        });

        moveButtonActionService = TestBed.inject(DocumentMoveButtonActionService);
    });

    it('action is not available if parent document is not in context', () => {
        const actionContext: ActionContext = {
            documents: [jestMocks.fileDocument],
        };
        expect(moveButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if there' no documents in context", () => {
        const actionContext: ActionContext = {
            parentDocument: jestMocks.folderDocument,
            documents: [],
        };
        expect(moveButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if user doesn't have `DeleteChild` permission on parent document", () => {
        const actionContext: ActionContext = {
            parentDocument: { ...jestMocks.folderDocument, sys_effectivePermissions: [] },
            documents: [jestMocks.fileDocument],
        };

        expect(moveButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if user doesn't have `Delete` permission on current document", () => {
        const actionContext: ActionContext = {
            parentDocument: jestMocks.folderDocument,
            documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: [] }],
        };
        expect(moveButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it('action is available if user has `DeleteChild` permission on parent and `Delete` permission on current document', () => {
        const actionContext: ActionContext = {
            parentDocument: { ...jestMocks.folderDocument, sys_effectivePermissions: [DocumentPermissions.DELETE_CHILD] },
            documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: [DocumentPermissions.DELETE] }],
        };
        expect(moveButtonActionService.isAvailable(actionContext)).toBeTruthy();
    });

    it('should open dialog on action execution', () => {
        const spy = spyOn(mockMatDialog, 'open');
        const actionContext: ActionContext = {
            parentDocument: { ...jestMocks.folderDocument, sys_effectivePermissions: [DocumentPermissions.DELETE_CHILD] },
            documents: [jestMocks.fileDocument],
        };
        moveButtonActionService.execute(actionContext);
        expect(spy).toHaveBeenCalledWith(DocumentMoveDialogComponent, {
            width: DialogConfig.small.width,
            height: DialogConfig.small.height,
            data: {
                parentDocument: actionContext.parentDocument,
                documentToMove: actionContext.documents[0],
                shouldRefresh: true,
            },
        });
    });
});
