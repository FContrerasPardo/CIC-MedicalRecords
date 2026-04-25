/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import * as fs from 'node:fs';

export interface Options {
    data?: string | Buffer | any;
    failOnStatusCode?: boolean;
    form?: { [key: string]: string | number | boolean };
    headers?: { [key: string]: string };
    ignoreHTTPSErrors?: boolean;
    maxRedirects?: number;
    params?: { [key: string]: string | number | boolean };
    multipart?: {
        [key: string]:
            | string
            | number
            | boolean
            | fs.ReadStream
            | {
                  name: string;
                  mimeType: string;
                  buffer: Buffer;
              };
    };
    timeout?: number;
}
