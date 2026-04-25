/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpConfigClass, SYS_DOCUMENT_CLASS_REJECTED, SYS_DOCUMENT_CLASS_UNCLASSIFIED } from '../screen-models';

export function mockIdpConfigClasses(): IdpConfigClass[] {
    return [
        {
            ...SYS_DOCUMENT_CLASS_REJECTED,
            isExpanded: false,
            isSelected: false,
            isPreviewed: false,
            reviewThreshold: 0.85,
            classAssignmentThreshold: 0.8,
        },
        {
            ...SYS_DOCUMENT_CLASS_UNCLASSIFIED,
            isExpanded: false,
            isSelected: false,
            isPreviewed: false,
            reviewThreshold: 0.85,
            classAssignmentThreshold: 0.8,
        },
        {
            id: 'payslips',
            name: 'Payslips',
            isSpecialClass: false,
            isExpanded: false,
            isSelected: false,
            isPreviewed: false,
            reviewThreshold: 0.85,
            classAssignmentThreshold: 0.8,
        },
        {
            id: 'employment-contract',
            name: 'Employment Contract',
            isSpecialClass: false,
            isExpanded: false,
            isSelected: false,
            isPreviewed: false,
            reviewThreshold: 0.85,
            classAssignmentThreshold: 0.8,
        },
    ];
}

export function mockIdpConfigClassesClassificationThresholds() {
    return {
        reviewThreshold: 0.85,
        classAssignmentThreshold: 0.8,
        classCandidatesMinDistance: 0.05,
    };
}
