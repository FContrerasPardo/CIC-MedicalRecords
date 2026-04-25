/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { IdpViewerTextData, IdpViewerTextHighlightData, IdpViewerTextHighlightState } from '@hyland/idp-document-viewer';
import { isEqual } from 'es-toolkit';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { IdpVerificationService } from '../verification/verification.service';
import { IdpViewerService } from '../viewer/idp-viewer.service';
import { FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { IdpField } from '../../models/screen-models';

export type RedactionHighlight = IdpViewerTextData & { fieldId: string; isActiveRedaction?: boolean; isActiveField?: boolean };

export type LocatedField = IdpField & { boundingBox: NonNullable<IdpField['boundingBox']> };

type Rect = IdpViewerTextHighlightData['rect']['actual'];

type RedactedFieldViewData = Rect & { pageId: string; fieldId: string; text: string };

function paddedBoundingBox<T extends Rect>(rect: T, padding: number): T & Rect {
    return {
        ...rect,
        left: rect.left - padding,
        top: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
    };
}

@Injectable()
export class IdpRedactionService {
    private readonly REDACTION_PADDING = 10;

    private readonly verificationService = inject(IdpVerificationService);
    private readonly viewerService = inject(IdpViewerService);
    private readonly featureService = inject<IFeaturesService>(FeaturesServiceToken);

    private readonly idpRedactionFeature = WORKSPACE_IDP_HXP.REDACTION;

    private readonly redactedFieldsOnCurrentPage$: Observable<RedactedFieldViewData[]> = combineLatest([
        this.featureService.isOn$(this.idpRedactionFeature),
        this.verificationService.document$,
        this.verificationService.redactedFields$,
        this.viewerService.currentPageIndex$,
    ]).pipe(
        map(([isRedactionFeatureOn, document, fields, pageIndex]) => {
            if (!isRedactionFeatureOn) {
                return [];
            }
            const pageIndexById = new Map(document.pages.map((page, index) => [page.id, index]));
            return fields
                .filter((field): field is LocatedField => {
                    const fieldBoundingBox = field.boundingBox;
                    if (!fieldBoundingBox) {
                        return false;
                    }
                    const boxPageIndex = fieldBoundingBox.pageIndex ?? (fieldBoundingBox.pageId ? pageIndexById.get(fieldBoundingBox.pageId) : undefined);
                    return boxPageIndex === pageIndex;
                })
                .map((field) => {
                    const fieldBoundingBox = field.boundingBox;
                    return {
                        ...paddedBoundingBox(fieldBoundingBox, this.REDACTION_PADDING),
                        pageId: fieldBoundingBox.pageId || document.pages[fieldBoundingBox.pageIndex ?? 0].id,
                        fieldId: field.id,
                        text: field.value ?? '',
                    };
                });
        }),
        distinctUntilChanged(isEqual)
    );

    readonly redactionHighlights$: Observable<RedactionHighlight[]> = combineLatest([
        this.redactedFieldsOnCurrentPage$,
        this.verificationService.activeField$,
        this.viewerService.showRedaction$,
    ]).pipe(
        map(([fields, activeField, showRedaction]) =>
            fields.map((field) => {
                const isActiveField = activeField?.id === field.fieldId;
                return {
                    ...field,
                    highlightState: showRedaction && !isActiveField
                        ? IdpViewerTextHighlightState.REDACTION
                        : IdpViewerTextHighlightState.REDACTION_INACTIVE,
                    isActiveRedaction: showRedaction && isActiveField,
                    isActiveField,
                };
            })
        ),
        distinctUntilChanged(isEqual),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    readonly activeFieldRedactionHighlight$: Observable<RedactionHighlight | undefined> =
        this.redactionHighlights$.pipe(
            map((highlights) => highlights.find((h) => h.isActiveField)),
            distinctUntilChanged(isEqual)
        );
}
