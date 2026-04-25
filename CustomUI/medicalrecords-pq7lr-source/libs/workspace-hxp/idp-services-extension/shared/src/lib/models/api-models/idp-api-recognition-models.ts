/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const IdpActionTypes = {
    None: 0,
    MetadataExtraction: 1,
    Ocr: 2,
    Omr: 4,
} as const;

export type IdpActionTypes = typeof IdpActionTypes[keyof typeof IdpActionTypes];

export interface IdpFileMetadata {
    status: 'Queued' | 'Processing' | 'Succeeded' | 'Failed';
    pageCount: number;
    pages: Array<{
        pageIndex: number;
        imageWidth: number;
        imageHeight: number;
        skew: number;
        rotation: number;
        hasMachineTextLayer?: boolean;
    }>;
}

export interface IdpFilePageOcrData {
    status: 'Queued' | 'Processing' | 'Succeeded' | 'Failed';
    fileReference: string;
    words: Array<{
        text: string;
        confidence: number;
        boundingBox: {
            top: number;
            left: number;
            width: number;
            height: number;
        };
    }>;
    layout: string;
}

export interface IdpApiRecognitionJobPostResponse {
    jobId: string;
}

export interface IdpContentFileProcessingRequest {
    correlationId: string;
    fileReference: string;
    sourceUrl: string;
    actions: IdpActionTypes;
}
