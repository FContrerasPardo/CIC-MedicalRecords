/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Document } from '@hylandsoftware/hxcs-js-client';
import { PendingDocument, isPendingDocument } from './pending-document.model';

const MOCK_DOCUMENT: Document = {
    sys_id: 'doc-123',
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
};

const MOCK_PENDING_DOCUMENT: PendingDocument = {
    document: MOCK_DOCUMENT,
    originalPermissions: [],
    pendingBy: 'user-123', persisted: false,
};

describe('isPendingDocument', () => {
    it('should return true for a valid PendingDocument', () => {
        expect(isPendingDocument(MOCK_PENDING_DOCUMENT)).toBe(true);
    });

    it('should return false for a plain Document', () => {
        expect(isPendingDocument(MOCK_DOCUMENT)).toBe(false);
    });

    it('should return false for null', () => {
        expect(isPendingDocument(null)).toBe(false);
    });

    it('should return false for undefined', () => {
        expect(isPendingDocument(undefined)).toBe(false);
    });

    it('should return false for a string', () => {
        expect(isPendingDocument('not-a-document')).toBe(false);
    });

    it('should return true for an object with document and originalPermissions regardless of extra properties', () => {
        expect(isPendingDocument({ document: MOCK_DOCUMENT, originalPermissions: [], pendingBy: 'user', persisted: false, extra: 'value' })).toBe(true);
    });

    it('should return false for an object missing document property', () => {
        expect(isPendingDocument({ originalPermissions: [] })).toBe(false);
    });

    it('should return false for an object missing originalPermissions property', () => {
        expect(isPendingDocument({ document: MOCK_DOCUMENT })).toBe(false);
    });
});
