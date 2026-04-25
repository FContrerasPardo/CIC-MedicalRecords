/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DrawStyles } from './drawing-config';
import { Rect } from './size';

export interface ViewerOcrCandidate extends Rect {
    text: string;
    pageId: string;
}

export interface ViewerTextData extends ViewerOcrCandidate {
    highlightState: DrawStyles;
    isBorder?: boolean;
    isSelectable?: boolean;
    /** Optional id for selectable highlights. Generated for rubber-band-created items. */
    id?: string;
    additionalData?: unknown;
}

export interface ViewerTextHighlightInfo {
    highlights: ViewerTextHighlightData[];
    rotation: number;
}

export interface ViewerTextHighlightData extends Omit<ViewerOcrCandidate, keyof Rect> {
    text: string;
    pageId: string;
    rect: {
        actual: Rect;
        scaled: Rect;
        scale: number;
    };
    additionalData?: unknown;
}

export type ViewerLayoutData = Omit<ViewerOcrCandidate, keyof Rect>;
