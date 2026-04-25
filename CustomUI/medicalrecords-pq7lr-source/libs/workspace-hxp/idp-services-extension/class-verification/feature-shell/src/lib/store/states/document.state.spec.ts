/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { isDocumentValid } from './document.state';
import { REJECTED_CLASS_ID, UNCLASSIFIED_CLASS_ID } from '../../models/screen-models';
import { IdentifierData, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { createMockDocument } from '../../models/mocked/mocked-documents';
import { mockDocumentEntitiesByIdpDocuments } from '../models/mocked/mocked-documents';

describe('Document State', () => {
    describe('isDocumentValid', () => {
        const mockDocumentClasses: IdentifierData[] = [
            { id: REJECTED_CLASS_ID, name: 'Rejected' },
            { id: UNCLASSIFIED_CLASS_ID, name: 'Unclassified' },
            { id: 'payslips', name: 'Payslips' },
            { id: 'contracts', name: 'Contracts' },
        ];

        describe('rejected documents', () => {
            it('should return true when document is rejected', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'payslips', name: 'Payslips', isSpecialClass: false },
                        rejectedReasonId: 'rr1',
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                    }),
                ]);

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(true);
            });

            it('should return true when document is rejected even without valid class', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: undefined,
                        rejectedReasonId: 'rr1',
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                    }),
                ]);

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(true);
            });

            it('should return true when document is rejected even with unclassified class', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: UNCLASSIFIED_CLASS_ID, name: 'Unclassified', isSpecialClass: true },
                        rejectedReasonId: 'rr1',
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                    }),
                ]);

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(true);
            });
        });

        describe('documents with valid class', () => {
            it('should return true when document has valid class and is auto valid', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'payslips', name: 'Payslips', isSpecialClass: false },
                        verificationStatus: IdpVerificationStatus.AutoValid,
                    }),
                ]);

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(true);
            });

            it('should return true when document has valid class and is manually valid', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'contracts', name: 'Contracts', isSpecialClass: false },
                        verificationStatus: IdpVerificationStatus.ManualValid,
                    }),
                ]);

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(true);
            });

            it('should return true when document has valid class and is resolved', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'payslips', name: 'Payslips', isSpecialClass: false },
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                    }),
                ]);
                document.markAsResolved = true;

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(true);
            });

            it('should return false when document has valid class but is auto invalid and not resolved', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'payslips', name: 'Payslips', isSpecialClass: false },
                        verificationStatus: IdpVerificationStatus.AutoInvalid,
                    }),
                ]);
                document.markAsResolved = false;

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(false);
            });

            it('should return true when document has valid class and is manual invalid', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'payslips', name: 'Payslips', isSpecialClass: false },
                        verificationStatus: IdpVerificationStatus.ManualInvalid,
                    }),
                ]);
                document.markAsResolved = false;

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(true);
            });

            it('should return true when document has valid class and is manual invalid but resolved', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'payslips', name: 'Payslips', isSpecialClass: false },
                        verificationStatus: IdpVerificationStatus.ManualInvalid,
                    }),
                ]);
                document.markAsResolved = true;

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(true);
            });
        });

        describe('documents with unclassified class', () => {
            it('should return false when document class is unclassified', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'unclassified', name: 'Unclassified', isSpecialClass: true },
                        verificationStatus: IdpVerificationStatus.ManualValid,
                    }),
                ]);

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(false);
            });

            it('should return false when document class is unclassified and is resolved', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'unclassified', name: 'Unclassified', isSpecialClass: true },
                        verificationStatus: IdpVerificationStatus.ManualValid,
                    }),
                ]);
                document.markAsResolved = true;

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(false);
            });
        });

        describe('documents without class', () => {
            it('should return false when document has no class', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: undefined,
                        verificationStatus: IdpVerificationStatus.ManualValid,
                    }),
                ]);

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(false);
            });

            it('should return false when document has no class and is resolved', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: undefined,
                        verificationStatus: IdpVerificationStatus.ManualValid,
                    }),
                ]);
                document.markAsResolved = true;

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(false);
            });
        });

        describe('documents with class not in document classes list', () => {
            it('should return false when document class is not in the list', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'unknown', name: 'Unknown', isSpecialClass: false },
                        verificationStatus: IdpVerificationStatus.ManualValid,
                    }),
                ]);

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(false);
            });

            it('should return false when document class is not in the list and is resolved', () => {
                const [document] = mockDocumentEntitiesByIdpDocuments([
                    createMockDocument('doc1', 0, {
                        class: { id: 'unknown', name: 'Unknown', isSpecialClass: false },
                        verificationStatus: IdpVerificationStatus.ManualValid,
                    }),
                ]);
                document.markAsResolved = true;

                const result = isDocumentValid(document, mockDocumentClasses);

                expect(result).toBe(false);
            });
        });

        it('should return false when document classes is empty', () => {
            const [document] = mockDocumentEntitiesByIdpDocuments([
                createMockDocument('doc1', 0, {
                    class: { id: 'payslips', name: 'Payslips', isSpecialClass: false },
                    verificationStatus: IdpVerificationStatus.AutoValid,
                }),
            ]);

            const result = isDocumentValid(document, []);

            expect(result).toBe(false);
        });

        it('should return false when mark as resolved is undefined', () => {
            const [document] = mockDocumentEntitiesByIdpDocuments([
                createMockDocument('doc1', 0, {
                    class: { id: 'payslips', name: 'Payslips', isSpecialClass: false },
                    verificationStatus: IdpVerificationStatus.AutoInvalid,
                }),
            ]);
            document.markAsResolved = undefined;

            const result = isDocumentValid(document, mockDocumentClasses);

            expect(result).toBe(false);
        });
    });
});
