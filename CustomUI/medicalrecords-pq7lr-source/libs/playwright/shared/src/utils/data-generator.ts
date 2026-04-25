/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Document } from '@hylandsoftware/hxcs-js-client/cjs/index';

export const DataGenerator = {
    generateFilesData(count: number, fileNamePrefix: string): Document[] {
        return Array.from({ length: count }).map((_, index) => {
            return {
                sys_title: `${fileNamePrefix}-${index}`,
                sys_description: `${fileNamePrefix}-${index}-description`,
            };
        });
    },
};
