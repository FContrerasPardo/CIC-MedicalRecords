/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileReaderService } from './hxp-file-reader.service';

describe('FileReaderService', () => {
    let service: FileReaderService;

    beforeEach(() => {
        service = new FileReaderService();
    });

    describe('readFileAsText', () => {
        it('should read JSON file content as text', async () => {
            const jsonContent = JSON.stringify({ key: 'value' });
            const mockFile = new Blob([jsonContent], { type: 'application/json' });
            const file = new File([mockFile], 'test.json', { type: 'application/json' });

            const result = await service.readFileAsText(file);
            expect(result).toEqual(jsonContent);
        });

        it('should handle errors during file reading', (done) => {
            const mockFile = new Blob([''], { type: 'text/plain' });
            const file = new File([mockFile], 'test.txt', { type: 'text/plain' });

            const mockFrInstance = new FileReader();
            jest.spyOn(window, 'FileReader').mockReturnValue(mockFrInstance);
            jest.spyOn(mockFrInstance, 'readAsText').mockImplementation(function () {
                this.onerror(new ProgressEvent('error'));
            });

            service
                .readFileAsText(file)
                .then(() => {
                    throw new Error('Expected readFileAsText to reject with an error');
                })
                .catch((error) => {
                    expect(error).toBeInstanceOf(ProgressEvent);
                    expect(error.type).toBe('error');
                    done();
                });
        });
    });
});
