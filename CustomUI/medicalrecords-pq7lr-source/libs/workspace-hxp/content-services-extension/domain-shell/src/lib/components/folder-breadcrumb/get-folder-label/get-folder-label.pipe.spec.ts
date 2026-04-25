/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { TranslateService } from '@ngx-translate/core';
import { MockService } from 'ng-mocks';
import { GetFolderLabelPipe } from './get-folder-label.pipe';
import { TestBed } from '@angular/core/testing';

describe('GetFolderLabelPipe', () => {
    let pipe: GetFolderLabelPipe;

    const mockTranslationService = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        instant: (_translationKey: string) => 'Root',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [GetFolderLabelPipe, { provide: TranslateService, useValue: MockService(TranslateService, mockTranslationService) }],
        });

        pipe = TestBed.inject(GetFolderLabelPipe);
    });

    it("should return 'Root' when the root folder is selected", () => {
        expect(pipe.transform(ROOT_DOCUMENT)).toBe('Root');
    });

    it('should return folder name only when a folder different from the root is selected', () => {
        expect(pipe.transform(jestMocks.fileDocument)).toBe(jestMocks.fileDocument.sys_name);
    });
});
