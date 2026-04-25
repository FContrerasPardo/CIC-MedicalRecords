/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, take, toArray } from 'rxjs';
import { IdpViewerTextData, IdpViewerTextHighlightState } from '@hyland/idp-document-viewer';
import { IdpFieldDataType, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { RedactionHighlight, IdpRedactionService } from './idp-redaction.service';
import { IdpVerificationService } from '../verification/verification.service';
import { IdpViewerService } from '../viewer/idp-viewer.service';
import { IdpBoundingBox, IdpDocument, IdpDocumentPage, IdpField, IdpValidationStatus } from '../../models/screen-models';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';

const PAGE_ID = 'page-1';
const FIELD_ID = 'field-1';

const PAGE: IdpDocumentPage = {
    id: PAGE_ID,
    name: 'Page 1',
    documentId: 'doc-1',
    fileReference: '',
    sourcePageIndex: 0,
    isSelected: false,
    hasIssue: false,
    height: 100,
    width: 100,
};

const DOCUMENT: IdpDocument = {
    id: 'doc-1',
    name: 'Doc',
    class: { id: 'c1', name: 'Class' },
    pages: [PAGE],
    hasIssue: false,
};

const BOUNDING_BOX: IdpBoundingBox = {
    pageIndex: 0,
    pageId: PAGE_ID,
    left: 10,
    top: 20,
    width: 100,
    height: 30,
};

function makeField(id: string, boundingBox?: IdpBoundingBox): IdpField {
    return {
        id,
        name: id,
        dataType: IdpFieldDataType.Text,
        format: '',
        confidence: 1,
        verificationStatus: IdpVerificationStatus.AutoValid,
        validationStatus: IdpValidationStatus.Valid,
        value: `value-${id}`,
        boundingBox,
    };
}

describe('IdpRedactionService', () => {
    let service: IdpRedactionService;
    let mockVerificationService: { activeField$: BehaviorSubject<IdpField | undefined>; redactedFields$: BehaviorSubject<IdpField[]>; document$: BehaviorSubject<IdpDocument> };
    let mockViewerService: { showRedaction$: BehaviorSubject<boolean>; currentPageIndex$: BehaviorSubject<number> };

    beforeEach(() => {
        mockVerificationService = {
            activeField$: new BehaviorSubject<IdpField | undefined>(undefined),
            redactedFields$: new BehaviorSubject<IdpField[]>([]),
            document$: new BehaviorSubject<IdpDocument>(DOCUMENT),
        };
        mockViewerService = {
            showRedaction$: new BehaviorSubject<boolean>(false),
            currentPageIndex$: new BehaviorSubject<number>(0),
        };

        TestBed.configureTestingModule({
            providers: [
                IdpRedactionService,
                { provide: IdpVerificationService, useValue: mockVerificationService },
                { provide: IdpViewerService, useValue: mockViewerService },
                { provide: FeaturesServiceToken, useValue: { isOn$: () => of(true), getFlags$: () => of([]) } },
            ],
        });

        service = TestBed.inject(IdpRedactionService);
    });

    describe('redactionHighlights$', () => {
        it('emits empty array when no redacted fields', () => {
            let result: IdpViewerTextData[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result).toEqual([]);
        });

        it('emits empty array when redacted fields have no boundingBox', () => {
            mockVerificationService.redactedFields$.next([makeField(FIELD_ID)]);

            let result: IdpViewerTextData[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result).toEqual([]);
        });

        it('includes fields on the current page and', () => {
            mockVerificationService.redactedFields$.next([makeField(FIELD_ID, { ...BOUNDING_BOX, pageIndex: 0 })]);

            let result: IdpViewerTextData[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.length).toBe(1);
        });

        it('excludes fields on a different page', () => {
            const page2: IdpDocumentPage = { ...PAGE, id: 'page-2', sourcePageIndex: 1 };
            mockVerificationService.document$.next({ ...DOCUMENT, pages: [PAGE, page2] });
            mockVerificationService.redactedFields$.next([makeField(FIELD_ID, { ...BOUNDING_BOX, pageIndex: 1, pageId: 'page-2' })]);
            mockViewerService.currentPageIndex$.next(0);

            let result: IdpViewerTextData[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result).toEqual([]);
        });

        it('returns redaction highlight correctly from redacted fields, active field and redaction state', () => {
            mockVerificationService.redactedFields$.next([makeField(FIELD_ID, { ...BOUNDING_BOX, pageIndex: 0 })]);

            let result: RedactionHighlight[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.[0]).toEqual(
                expect.objectContaining({
                    left: 0,    // original left 10 - padding 10
                    top: 10,    // original top 20 - padding 10
                    width: 120, // original width 100 + padding of 10 on each side
                    height: 50, // original height 30 + padding of 10 on each side
                    pageId: PAGE_ID,
                    fieldId: FIELD_ID,
                    text: `value-${FIELD_ID}`,
                    highlightState: IdpViewerTextHighlightState.REDACTION_INACTIVE,
                    isActiveRedaction: false,
                    isActiveField: false,
                })
            );
        });

        it('resolves page index via document when boundingBox pageIndex is undefined', () => {
            mockVerificationService.redactedFields$.next([makeField(FIELD_ID, { left: 5, top: 5, width: 10, height: 10, pageId: PAGE_ID })]);
            mockViewerService.currentPageIndex$.next(0);

            let result: IdpViewerTextData[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.length).toBe(1);
        });

        it('gives the active field REDACTION_INACTIVE highlight state and sets isActiveRedaction to true when showRedaction is true', () => {
            const field = makeField(FIELD_ID, BOUNDING_BOX);
            mockVerificationService.activeField$.next(field);
            mockVerificationService.redactedFields$.next([field]);
            mockViewerService.showRedaction$.next(true);

            let result: RedactionHighlight[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.[0]?.highlightState).toBe(IdpViewerTextHighlightState.REDACTION_INACTIVE);
            expect(result?.[0]?.isActiveRedaction).toBe(true);
        });

        it('gives non-active redacted fields REDACTION state and sets isActiveRedaction to false when showRedaction is true', () => {
            mockVerificationService.activeField$.next(makeField('active-field', BOUNDING_BOX));
            mockVerificationService.redactedFields$.next([makeField(FIELD_ID, BOUNDING_BOX)]);
            mockViewerService.showRedaction$.next(true);

            let result: RedactionHighlight[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.[0]?.highlightState).toBe(IdpViewerTextHighlightState.REDACTION);
            expect(result?.[0]?.isActiveRedaction).toBe(false);
        });

        it('gives all fields REDACTION_INACTIVE state and sets isActiveRedaction to false when showRedaction is false', () => {
            mockVerificationService.redactedFields$.next([makeField(FIELD_ID, BOUNDING_BOX)]);
            mockViewerService.showRedaction$.next(false);

            let result: RedactionHighlight[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.[0]?.highlightState).toBe(IdpViewerTextHighlightState.REDACTION_INACTIVE);
            expect(result?.[0]?.isActiveRedaction).toBe(false);
        });

        it('falls back to empty string for text when field.value is undefined', () => {
            mockVerificationService.redactedFields$.next([{ ...makeField(FIELD_ID, BOUNDING_BOX), value: undefined }]);

            let result: IdpViewerTextData[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.[0]?.text).toBe('');
        });

        it('falls back to document page id when boundingBox has no pageId', () => {
            mockVerificationService.redactedFields$.next([makeField(FIELD_ID, { left: 0, top: 0, width: 10, height: 10, pageIndex: 0 })]);

            let result: IdpViewerTextData[] | undefined;
            service.redactionHighlights$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.[0]?.pageId).toBe(PAGE_ID);
        });

        it('updates highlights when page index changes', () => {
            const page2: IdpDocumentPage = { ...PAGE, id: 'page-2', sourcePageIndex: 1 };
            mockVerificationService.document$.next({ ...DOCUMENT, pages: [PAGE, page2] });
            mockVerificationService.redactedFields$.next([
                makeField('f0', { ...BOUNDING_BOX, pageIndex: 0, pageId: PAGE_ID }),
                makeField('f1', { ...BOUNDING_BOX, pageIndex: 1, pageId: 'page-2' }),
            ]);

            let result: IdpViewerTextData[][] | undefined;
            service.redactionHighlights$.pipe(take(2), toArray()).subscribe((v) => (result = v));

            mockViewerService.currentPageIndex$.next(1);

            expect(result?.map((v) => v.length)).toEqual([1, 1]);
        });
    });

    describe('activeFieldRedactionHighlight$', () => {
        it('emits undefined when there is no active field', () => {
            let result: RedactionHighlight | undefined;
            service.activeFieldRedactionHighlight$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result).toBeUndefined();
        });

        it('emits undefined when active field is not in redacted fields', () => {
            mockVerificationService.activeField$.next(makeField(FIELD_ID, BOUNDING_BOX));

            let result: RedactionHighlight | undefined;
            service.activeFieldRedactionHighlight$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result).toBeUndefined();
        });

        it('emits the highlight for the active field when it is in redacted fields', () => {
            const field = makeField(FIELD_ID, BOUNDING_BOX);
            mockVerificationService.activeField$.next(field);
            mockVerificationService.redactedFields$.next([field]);

            let result: RedactionHighlight | undefined;
            service.activeFieldRedactionHighlight$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.fieldId).toBe(FIELD_ID);
        });

        it('has isActiveRedaction false when showRedaction is false', () => {
            const field = makeField(FIELD_ID, BOUNDING_BOX);
            mockVerificationService.activeField$.next(field);
            mockVerificationService.redactedFields$.next([field]);

            let result: RedactionHighlight | undefined;
            service.activeFieldRedactionHighlight$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.isActiveRedaction).toBe(false);
        });

        it('has isActiveRedaction true when showRedaction is true', () => {
            const field = makeField(FIELD_ID, BOUNDING_BOX);
            mockVerificationService.activeField$.next(field);
            mockVerificationService.redactedFields$.next([field]);
            mockViewerService.showRedaction$.next(true);

            let result: RedactionHighlight | undefined;
            service.activeFieldRedactionHighlight$.pipe(take(1)).subscribe((v) => (result = v));
            expect(result?.isActiveRedaction).toBe(true);
        });
    });
});
