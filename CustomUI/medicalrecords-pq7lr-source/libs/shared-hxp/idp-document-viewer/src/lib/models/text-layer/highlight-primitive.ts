/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { DrawStyles } from './drawing-config';
import { DrawingMethods } from './drawing-methods';
import { ViewerOcrCandidate, ViewerTextData } from './ocr-candidate';
import { PrimitiveElement, TextData } from './primitive-element';

export class HighlightPrimitive extends PrimitiveElement {
    readonly isSelectable: boolean;

    private constructor(left: number, top: number, width: number, height: number, scale: number, textData: TextData, isBorder = false, isSelectable = false) {
        super(
            left,
            top,
            width,
            height,
            scale,
            {
                state: textData.highlightState,
                drawingMethod: isBorder ? DrawingMethods.drawRectangle : DrawingMethods.drawBlock,
            },
            textData
        );
        this.isSelectable = isSelectable;
    }

    static fromTextData(data: ViewerTextData | ViewerOcrCandidate) {
        const isSelectable = 'isSelectable' in data ? data.isSelectable === true : false;
        return new HighlightPrimitive(
            data.left,
            data.top,
            data.width,
            data.height,
            1,
            {
                text: data.text,
                pageId: data.pageId,
                highlightState: 'highlightState' in data ? data.highlightState : DrawStyles.DEFAULT,
                additionalData: 'additionalData' in data ? data.additionalData : undefined,
                id: 'id' in data ? data.id : undefined,
                isBorder: 'isBorder' in data ? data.isBorder : false,
            },
            'isBorder' in data ? data.isBorder : false,
            isSelectable
        );
    }

    getHighlightId(): string | undefined {
        return 'id' in this.textData ? this.textData.id : undefined;
    }

    toViewerTextData(): ViewerTextData {
        return {
            left: this.actualRect.left,
            top: this.actualRect.top,
            width: this.actualRect.width,
            height: this.actualRect.height,
            text: this.textData.text,
            pageId: this.textData.pageId,
            highlightState: this.textData.highlightState,
            isSelectable: this.isSelectable,
            id: this.getHighlightId(),
        };
    }
}
