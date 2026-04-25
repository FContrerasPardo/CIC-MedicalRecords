/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { Document } from '@hylandsoftware/hxcs-js-client';
import {
    isRoot,
    isFile,
    isFolder,
    hasBlob,
    hasPermission,
    isDocumentParentFolder,
    isVersion,
    isVersionable,
    isGovernable,
    hasLegalHold,
    getRetentionStatus,
    isSysGovRecord,
    isPermissionError,
} from './document.utils';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { ROOT_DOCUMENT } from '@alfresco/adf-hx-content-services/api';
import { RecordStatus } from './document-retention.config';

describe('Document Utils', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({});
    });

    it('should recognize root document', () => {
        expect(isRoot(ROOT_DOCUMENT)).toBeTruthy();
        expect(isRoot(jestMocks.fileDocument)).toBeFalsy();
        expect(isRoot(jestMocks.folderDocument)).toBeFalsy();
    });

    it('should recognize folder document', () => {
        expect(isFolder(ROOT_DOCUMENT)).toBeTruthy();
        expect(isFolder(jestMocks.fileDocument)).toBeFalsy();
        expect(isFolder(jestMocks.folderDocument)).toBeTruthy();
    });

    it('should recognize file document', () => {
        expect(isFile(ROOT_DOCUMENT)).toBeFalsy();
        expect(isFile(jestMocks.fileDocument)).toBeTruthy();
        expect(isFile(jestMocks.folderDocument)).toBeFalsy();
    });

    it('should recognize document with blob', () => {
        expect(hasBlob(ROOT_DOCUMENT)).toBeFalsy();
        expect(hasBlob(jestMocks.fileDocument)).toBeTruthy();
        expect(hasBlob(jestMocks.folderDocument)).toBeFalsy();
    });

    it('should recognize a versionable document', () => {
        expect(isVersionable(ROOT_DOCUMENT)).toBeFalsy();
        expect(isVersionable({ ...jestMocks.fileDocument, sys_mixinTypes: ['SysVersionable'] })).toBeTruthy();
        expect(isVersionable(jestMocks.folderDocument)).toBeFalsy();
    });

    it('should recognize a document version', () => {
        expect(isVersion(ROOT_DOCUMENT)).toBeFalsy();
        expect(isVersion(jestMocks.fileDocument)).toBeFalsy();
        expect(isVersion({ ...jestMocks.fileDocument, sysver_isVersion: false })).toBeFalsy();
        expect(isVersion({ ...jestMocks.fileDocument, sysver_isVersion: true })).toBeTruthy();
    });

    it('should recognize a versionable document', () => {
        expect(isVersionable({ ...jestMocks.fileDocument, sys_mixinTypes: ['SysVersionable'] })).toBeTruthy();
        expect(isVersionable({ ...jestMocks.fileDocument, sys_mixinTypes: [] })).toBeFalsy();
    });

    it('should recognize a governable document', () => {
        expect(isGovernable(ROOT_DOCUMENT)).toBeFalsy();
        expect(isGovernable({ ...jestMocks.fileDocument, sys_mixinTypes: ['SysGovernable'] })).toBeTruthy();
        expect(isGovernable(jestMocks.folderDocument)).toBeFalsy();
    });

    it('should check document permissions', () => {
        expect(isFile(ROOT_DOCUMENT)).toBeFalsy();
        expect(isFile(jestMocks.fileDocument)).toBeTruthy();
        expect(hasPermission(jestMocks.fileDocument, 'Read')).toBeTruthy();
        expect(hasPermission(jestMocks.fileDocument, 'somethingMadeUp')).toBeFalsy();
        expect(hasPermission(jestMocks.fileDocument, '')).toBeFalsy();
        jestMocks.fileDocument.sys_effectivePermissions = [];
        expect(hasPermission(jestMocks.fileDocument, 'Read')).toBeFalsy();
    });

    it('should return true if the sys_parentId matches the folderId', () => {
        const document: Document = {
            sys_parentId: ROOT_DOCUMENT.sys_id,
        } as Document;
        const folder = ROOT_DOCUMENT;

        const result = isDocumentParentFolder(document, folder);

        expect(result).toBe(true);
    });

    it('should return false if the sys_parentId does not match the folderId', () => {
        const document: Document = {
            sys_parentId: ROOT_DOCUMENT.sys_id,
        } as Document;
        const folder: Document = {
            sys_primaryType: 'File',
            sys_id: 'e43b6a72-f7a7-4f5a-8cd1-a3b84cc6af83',
        };

        const result = isDocumentParentFolder(document, folder);

        expect(result).toBe(false);
    });

    it('should detect record flag', () => {
        const mock = { ...jestMocks.fileDocument, sysgov_isRecord: true };
        expect(isSysGovRecord(mock)).toBeTruthy();
    });

    it('should detect legal hold flag', () => {
        const mock = { ...jestMocks.fileDocument, sysgov_hasLegalHold: true };
        expect(hasLegalHold(mock)).toBeTruthy();
    });

    it('should return correct retention status - OnHold', () => {
        const mock = {
            sys_mixinTypes: ['SysGovernable'],
            sysgov_isRecord: true,
            sysgov_hasLegalHold: true,
        } as any;
        expect(getRetentionStatus(mock)).toBe(RecordStatus.OnHold);
    });

    it('should return correct retention status - UnderRetention', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        const mock = {
            sys_mixinTypes: ['SysGovernable'],
            sysgov_isRecord: true,
            sysgov_retainUntil: futureDate.toISOString(),
        } as any;

        expect(getRetentionStatus(mock)).toBe(RecordStatus.UnderRetention);
    });

    it('should return correct retention status - ReachedDisposition', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);

        const mock = {
            sys_mixinTypes: ['SysGovernable'],
            sysgov_isRecord: true,
            sysgov_retainUntil: pastDate.toISOString(),
        } as any;

        expect(getRetentionStatus(mock)).toBe(RecordStatus.ReachedDisposition);
    });

    it('should return undefined if not a record or not governable', () => {
        const mock = { sysgov_isRecord: false } as any;
        expect(getRetentionStatus(mock)).toBeUndefined();

        const mock2 = { sys_mixinTypes: [] } as any;
        expect(getRetentionStatus(mock2)).toBeUndefined();
    });

    describe('isPermissionError', () => {
        it('should detect 403 status at top level (Angular HttpErrorResponse)', () => {
            const error = { status: 403, statusText: 'Forbidden' };
            expect(isPermissionError(error)).toBe(true);
        });

        it('should detect 403 status in nested response object', () => {
            const error = { response: { status: 403 } };
            expect(isPermissionError(error)).toBe(true);
        });

        it('should return false for non-403 status at top level', () => {
            const error = { status: 404, statusText: 'Not Found' };
            expect(isPermissionError(error)).toBe(false);
        });

        it('should return false for non-403 status in nested response', () => {
            const error = { response: { status: 500 } };
            expect(isPermissionError(error)).toBe(false);
        });

        it('should return false for null or undefined', () => {
            expect(isPermissionError(null)).toBe(false);
            expect(isPermissionError(undefined)).toBe(false);
        });

        it('should return false for non-object errors', () => {
            expect(isPermissionError('error string')).toBe(false);
            expect(isPermissionError(403)).toBe(false);
            expect(isPermissionError(true)).toBe(false);
        });

        it('should return false for empty object', () => {
            expect(isPermissionError({})).toBe(false);
        });

        it('should return false when response is not an object', () => {
            const error = { response: 'not an object' };
            expect(isPermissionError(error)).toBe(false);
        });

        it('should return false when response exists but has no status', () => {
            const error = { response: { message: 'error' } };
            expect(isPermissionError(error)).toBe(false);
        });
    });
});
