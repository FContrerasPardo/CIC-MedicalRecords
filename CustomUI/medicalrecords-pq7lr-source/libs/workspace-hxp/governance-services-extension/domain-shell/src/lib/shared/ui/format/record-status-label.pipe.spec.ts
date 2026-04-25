/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { RecordStatusLabelPipe } from './record-status-label.pipe';
import { STATUS_LABEL_MAP } from '../search/filters/status/status-options.data';
import { RecordStatus } from '@alfresco/adf-hx-content-services/services';

describe('RecordStatusLabelPipe', () => {
    let pipe: RecordStatusLabelPipe;

    beforeEach(() => {
        pipe = new RecordStatusLabelPipe();
    });

    it('should return the correct label for each status key', () => {
        for (const key of Object.keys(STATUS_LABEL_MAP)) {
            expect(pipe.transform(key as keyof typeof RecordStatus)).toBe(STATUS_LABEL_MAP[key as keyof typeof STATUS_LABEL_MAP]);
        }
    });

    it('should return an empty string for an unknown status', () => {
        expect(pipe.transform('UnknownStatus')).toBe('');
    });
});
