/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { ContentShareService } from './content-share.service';
import { Document } from '@hylandsoftware/hxcs-js-client';

describe('ContentShareService', () => {
    let service: ContentShareService;
    const selectedDocument = { sys_id: 'e43b6a72-f7a7-4f5a-8cd1-a3b84cc6af83' } as Document;

    beforeEach(() => {
        service = TestBed.inject(ContentShareService);
    });

    it('should always receive a document ID parameter and generated URL contains document ID', () => {
        const actualUrl = service.getSingleContentShareLink(selectedDocument);

        expect(actualUrl).toContain(`/documents/${selectedDocument.sys_id}`);
    });

    it('should return undefined when the id is undefined', () => {
        const undefinedId: Document | undefined = undefined;
        const result = service.getSingleContentShareLink(undefinedId);

        expect(result).toBeUndefined();
    });
});
