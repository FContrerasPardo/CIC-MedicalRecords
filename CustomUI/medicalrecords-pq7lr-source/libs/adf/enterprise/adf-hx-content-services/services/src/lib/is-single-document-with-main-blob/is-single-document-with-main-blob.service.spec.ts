/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { IsSingleDocumentWithMainBlobService } from './is-single-document-with-main-blob.service';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';

describe('IsSingleDocumentWithMainBlobService', () => {
    let service: IsSingleDocumentWithMainBlobService;
    let mockFeaturesService: { isOn$: jest.Mock };
    let featureFlagSubject: BehaviorSubject<boolean>;

    beforeEach(() => {
        featureFlagSubject = new BehaviorSubject<boolean>(false);

        mockFeaturesService = {
            isOn$: jest.fn().mockReturnValue(featureFlagSubject),
        };

        TestBed.configureTestingModule({
            providers: [IsSingleDocumentWithMainBlobService, { provide: FeaturesServiceToken, useValue: mockFeaturesService }],
        });

        service = TestBed.inject(IsSingleDocumentWithMainBlobService);
    });

    it('given only one File Document, should return true', () => {
        let documents: Document[] = [];

        expect(service.validate(documents)).toBe(false);

        documents = [jestMocks.fileDocument];

        expect(service.validate(documents)).toBe(true);

        documents = [jestMocks.fileDocument, jestMocks.fileDocument];

        expect(service.validate(documents)).toBe(false);
    });

    it('given a Folder Document, should return false', () => {
        const documents = [jestMocks.folderDocument];

        expect(service.validate(documents)).toBe(false);
    });

    it('given a File Document without blob, should return false', () => {
        const mockMissingBlobFileDocument = {
            ...jestMocks.fileDocument,
            sysfile_blob: undefined,
        };
        const documents = [mockMissingBlobFileDocument];

        expect(service.validate(documents)).toBe(false);
    });

    it('should return true when a folderish document with a valid blob is present and the Document Layout toggle feature flag is on', () => {
        featureFlagSubject.next(false);

        const folderishDocumentWithBlob: Document = {
            ...jestMocks.fileDocument,
            sys_isFolderish: true,
            sysfile_blob: {
                filename: 'folderish_file.zip',
                length: 1024,
                mimeType: 'application/zip',
            },
        };
        const documents = [folderishDocumentWithBlob];

        expect(service.validate(documents)).toBe(false);
    });

    it('should return true when a folderish document with a valid blob is present and the Document Layout toggle feature flag is on', () => {
        featureFlagSubject.next(true);

        const folderishDocumentWithBlob: Document = {
            ...jestMocks.fileDocument,
            sys_isFolderish: true,
            sysfile_blob: {
                filename: 'folderish_file.zip',
                length: 1024,
                mimeType: 'application/zip',
            },
        };
        const documents = [folderishDocumentWithBlob];

        expect(service.validate(documents)).toBe(true);
    });
});
