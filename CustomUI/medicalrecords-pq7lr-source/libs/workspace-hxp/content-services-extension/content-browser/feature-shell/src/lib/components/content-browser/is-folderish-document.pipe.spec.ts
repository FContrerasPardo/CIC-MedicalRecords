/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { IsFolderishDocumentPipe } from './is-folderish-document.pipe';

describe('Is Folderish Document Pipe', () => {
    let pipe: IsFolderishDocumentPipe;

    beforeEach(() => {
        pipe = new IsFolderishDocumentPipe();
    });

    it('should be a folderish document', () => {
        expect(pipe.transform(jestMocks.folderDocument)).toBeTruthy();
    });

    it('should not be a folderish document', () => {
        expect(pipe.transform(jestMocks.fileDocument)).toBeFalsy();
    });
});
