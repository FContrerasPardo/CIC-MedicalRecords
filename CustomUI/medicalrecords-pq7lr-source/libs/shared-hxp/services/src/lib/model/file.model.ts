/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Permissions } from './file-permissions.model';

/**
 * Represents upload progress information.
 * This interface defines the structure for tracking file upload progress.
 */
export interface UploadProgressEvent {
    /** The number of bytes uploaded so far */
    loaded: number;
    /** The total number of bytes to upload */
    total?: number;
    /** Whether the upload length is computable */
    lengthComputable: boolean;
    /** Bytes transferred (alias/additional tracking) */
    bytes?: number;
}

export interface FileUploadProgress extends UploadProgressEvent {
    percent?: number;
}

export class FileUploadOptions {
    /**
     * Root folder id.
     */
    parentId?: string;
    /**
     * Defines the **relativePath** value.
     * The relativePath specifies the folder structure to create relative to the node nodeId.
     * Folders in the relativePath that do not exist are created before the node is created.
     */
    path?: string;
    /**
     * The id of the content type to use when upload the file
     */
    contentType?: string = 'SysFile';

    newVersion?: boolean;

    permissions?: Permissions;
}


export const FileUploadStatus = {
    Pending: 0,
    Complete: 1,
    Starting: 2,
    Progress: 3,
    Cancelled: 4,
    Aborted: 5,
    Error: 6,
    Deleted: 7,
} as const;

export type FileUploadStatus = typeof FileUploadStatus[keyof typeof FileUploadStatus];

export class FileModel {
    readonly name: string;
    readonly size: number;
    readonly file: File;

    id?: string;
    status: FileUploadStatus = FileUploadStatus.Pending;
    errorCode: number | null;
    progress: FileUploadProgress;
    options: FileUploadOptions;
    data: any;

    constructor(file: File, options?: FileUploadOptions, id?: string) {
        this.file = file;
        this.id = id;
        this.name = file.name;
        this.size = file.size;
        this.data = null;
        this.errorCode = null;

        this.progress = {
            loaded: 0,
            total: 0,
            percent: 0,
            bytes: 0,
            lengthComputable: false,
        };

        this.options = Object.assign(
            {},
            {
                newVersion: false,
            },
            options
        );
    }

    get extension(): string {
        return this.name.slice((Math.max(0, this.name.lastIndexOf('.')) || Number.POSITIVE_INFINITY) + 1);
    }
}
