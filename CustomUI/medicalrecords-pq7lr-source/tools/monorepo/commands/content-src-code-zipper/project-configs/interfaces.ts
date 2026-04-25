/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileTransformer } from '../transformers/file-transformer.interface';
import * as ReaddirGlob from 'readdir-glob';

export interface FilePathWithTransformer {
    name: string;
    transformer: FileTransformer;
    transformerConfig?: any;
}

export type ProjectFilePathToBeExtracted = string | FilePathWithTransformer | { name: string; globOptions: ReaddirGlob.Options };

export interface InRepoPackageConfig {
    lib: string;
    package: string;
}
