/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileModel } from '@hxp/shared-hxp/services';
import { UploadDocumentModelStatus } from '../model/upload-document.model';

export const generateMockUploadData = (size: number = 2, primaryType: string = 'SysFile') => {
    const mockUploadData = [];
    for (let i = 0; i < size; i++) {
        mockUploadData.push({
            fileModel: new FileModel({ name: 'bigFile.png', size: 1_000_000 } as File),
            documentModel: {
                status: UploadDocumentModelStatus.PENDING as UploadDocumentModelStatus,
                document: {
                    sys_primaryType: primaryType,
                    sys_title: `Document ${i}`,
                    sysfile_blob: {
                        uploadId: '',
                    },
                },
            },
            postFileUploadAction: undefined,
        });
    }
    return mockUploadData;
};
