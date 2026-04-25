/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class FileReaderService {
    /**
     * Reads the content of a file as text.
     * @param {File} file - The file to be read.
     * @returns {Promise<string>} A promise that resolves with the file content as a string.
     */
    readFileAsText(file: File) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                resolve(reader.result);
            });
            reader.onerror = (error) => {
                reject(error);
            };
            reader.readAsText(file);
        });
    }
}
