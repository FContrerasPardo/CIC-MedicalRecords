/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { UnescapePipe } from './unescape.pipe';

describe('UnescapePipe', () => {
    let pipe: UnescapePipe;

    beforeEach(() => {
        pipe = new UnescapePipe();
    });

    it('should unescape HTML entities', () => {
        const escapedStrings = ['&lt', '&gt;', 'Hello', '&le;', '&ge;', '&ne;', ''];
        const unescapedStrings = ['<', '>', 'Hello', '≤', '≥', '≠', ''];
        for (const [index, escapedString] of escapedStrings.entries()) {
            expect(pipe.transform(escapedString)).toBe(unescapedStrings[index]);
        }
    });
});
