/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { MockService } from 'ng-mocks';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import {
    ActionContext,
    DocumentPermissions,
    FileDownloadService,
    IsSingleDocumentWithMainBlobService,
} from '@alfresco/adf-hx-content-services/services';
import { SingleItemDownloadButtonActionService } from './single-item-download-button-action.service';
import { TestBed } from '@angular/core/testing';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { of } from 'rxjs';

describe('DocumentCopyButtonActionService', () => {
    let singleItemDownloadButtonActionService: SingleItemDownloadButtonActionService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                SingleItemDownloadButtonActionService,
                IsSingleDocumentWithMainBlobService,
                {
                    provide: FileDownloadService,
                    useValue: MockService(FileDownloadService),
                },
                {
                    provide: FeaturesServiceToken,
                    useValue: {
                        isOn$: jest.fn().mockReturnValue(of(false)),
                    },
                },
            ],
        });

        singleItemDownloadButtonActionService = TestBed.inject(SingleItemDownloadButtonActionService);
    });

    it("action is not available if there's no documents in context", () => {
        const actionContext: ActionContext = {
            documents: [],
        };
        expect(singleItemDownloadButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if there's no blob in the file", () => {
        const actionContext: ActionContext = {
            documents: [{ ...jestMocks.fileDocument, sysfile_blob: {} }],
        };
        expect(singleItemDownloadButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it("action is not available if user doesn't have `Read` permission on selected document", () => {
        const actionContext: ActionContext = {
            documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: [] }],
        };
        expect(singleItemDownloadButtonActionService.isAvailable(actionContext)).toBeFalsy();
    });

    it('action is available if user has `Read` permission on selected document and document has a main blob', () => {
        const actionContext: ActionContext = {
            documents: [{ ...jestMocks.fileDocument, sys_effectivePermissions: [DocumentPermissions.READ] }],
        };

        expect(singleItemDownloadButtonActionService.isAvailable(actionContext)).toBeTruthy();
    });
});
