/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { PendingDocumentCleanupService } from './pending-document-cleanup.service';
import { PendingDocument } from './model/pending-document.model';
import { HxpPendingDocumentService } from './pending-document.service';

const MOCK_DOCUMENT: Document = {
    sys_id: 'doc-123',
    sys_isFolderish: false,
    sys_primaryType: 'SysFile',
};

const createPendingDocument = (overrides: Partial<PendingDocument> = {}): PendingDocument => ({
    document: MOCK_DOCUMENT,
    originalPermissions: [{ permission: 'Read', granted: true, user: { id: 'some-user', username: 'some-user' } }],
    pendingBy: 'user-123',
    persisted: false,
    ...overrides,
});

describe('PendingDocumentCleanupService', () => {
    let service: PendingDocumentCleanupService;
    let mockDocumentOps: jest.Mocked<HxpPendingDocumentService>;

    beforeEach(() => {
        mockDocumentOps = {
            restorePermissions: jest.fn().mockResolvedValue(MOCK_DOCUMENT),
            deleteDocument: jest.fn().mockResolvedValue(undefined),
        };

        TestBed.configureTestingModule({
            providers: [PendingDocumentCleanupService],
        });

        service = TestBed.inject(PendingDocumentCleanupService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('track and untrack', () => {
        it('should track a pending document', () => {
            const doc = createPendingDocument();
            service.track(doc);
            expect(() => service.cleanupUnpersisted(mockDocumentOps)).not.toThrow();
        });

        it('should not track documents without sys_id', async () => {
            const doc = createPendingDocument({ document: { sys_primaryType: 'SysFile' } });
            service.track(doc);

            await service.cleanupUnpersisted(mockDocumentOps);
            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should untrack a specific document', async () => {
            const doc1 = createPendingDocument();
            const doc2 = createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-456' } });
            service.track(doc1);
            service.track(doc2);
            service.untrack('doc-123');

            await service.cleanupUnpersisted(mockDocumentOps);
            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledTimes(1);
            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledWith('doc-456');
        });

        it('should untrack and delete a document immediately', async () => {
            service.track(createPendingDocument());

            await service.untrackAndDelete('doc-123', mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledWith('doc-123');
        });

        it('should not call delete when untrackAndDelete is given an unknown id', async () => {
            await service.untrackAndDelete('unknown-id', mockDocumentOps);
            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should clear all tracked documents', async () => {
            service.track(createPendingDocument());
            service.track(createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-456' } }));
            service.clearTracking();

            await service.cleanupUnpersisted(mockDocumentOps);
            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });
    });

    describe('markAllPersisted', () => {
        it('should mark all tracked documents as persisted', async () => {
            service.track(createPendingDocument());
            service.track(createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-456' } }));

            service.markAllPersisted();
            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });
    });

    describe('markPersistedInFormValues', () => {
        it('should mark PendingDocuments found in form values as persisted', async () => {
            const doc = createPendingDocument();
            service.track(doc);

            service.markPersistedInFormValues({ attachField: doc });
            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should mark PendingDocuments in arrays as persisted', async () => {
            const doc = createPendingDocument();
            service.track(doc);

            service.markPersistedInFormValues({ files: [doc] });
            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should mark PendingDocuments in nested objects as persisted', async () => {
            const doc = createPendingDocument();
            service.track(doc);

            service.markPersistedInFormValues({ outer: { inner: doc } });
            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should handle null/undefined form values without error', () => {
            expect(() => service.markPersistedInFormValues(null)).not.toThrow();
            expect(() => service.markPersistedInFormValues(undefined)).not.toThrow();
        });
    });

    describe('cleanupUnpersisted', () => {
        it('should delete unpersisted documents', async () => {
            service.track(createPendingDocument());

            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledWith('doc-123');
        });

        it('should not delete persisted documents', async () => {
            service.track(createPendingDocument({ persisted: true }));

            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should only delete unpersisted documents when mix of persisted and unpersisted', async () => {
            service.track(createPendingDocument({ persisted: true }));
            service.track(createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-456' }, persisted: false }));

            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledTimes(1);
            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledWith('doc-456');
        });

        it('should remove deleted documents from tracking', async () => {
            service.track(createPendingDocument());
            await service.cleanupUnpersisted(mockDocumentOps);

            (mockDocumentOps.deleteDocument as jest.Mock).mockClear();
            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should not fail when deletion of individual documents fails', async () => {
            (mockDocumentOps.deleteDocument as jest.Mock).mockRejectedValueOnce(new Error('delete failed'));
            service.track(createPendingDocument());
            service.track(createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-456' } }));

            await expect(service.cleanupUnpersisted(mockDocumentOps)).resolves.not.toThrow();
            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledTimes(2);
        });

        it('should do nothing when no documents are tracked', async () => {
            await service.cleanupUnpersisted(mockDocumentOps);
            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should only delete documents added after markPersistedInFormValues (save-then-add-then-cancel)', async () => {
            const savedDoc = createPendingDocument();
            service.track(savedDoc);
            service.markPersistedInFormValues({ attachField: savedDoc });

            const newDoc = createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-456' } });
            service.track(newDoc);

            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledTimes(1);
            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledWith('doc-456');
        });

        it('should not delete any documents after clearTracking (post-complete)', async () => {
            service.track(createPendingDocument());
            service.track(createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-456' } }));

            service.clearTracking();
            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).not.toHaveBeenCalled();
        });

        it('should handle save-add-save-cancel: only delete documents not in any save', async () => {
            const doc1 = createPendingDocument();
            service.track(doc1);
            service.markPersistedInFormValues({ attachField: doc1 });

            const doc2 = createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-456' } });
            service.track(doc2);
            service.markPersistedInFormValues({ attachField: doc1, attachField2: doc2 });

            const doc3 = createPendingDocument({ document: { ...MOCK_DOCUMENT, sys_id: 'doc-789' } });
            service.track(doc3);

            await service.cleanupUnpersisted(mockDocumentOps);

            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledTimes(1);
            expect(mockDocumentOps.deleteDocument).toHaveBeenCalledWith('doc-789');
        });
    });
});
