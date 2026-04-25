/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileTransformer } from './file-transformer.interface';
import * as fs from 'node:fs';

export interface TransformStringInFileConfig {
    from: string;
    to: string;
}

export const transformStringInFile: FileTransformer<TransformStringInFileConfig> = (filePath: string, config: TransformStringInFileConfig) => {
    const appConfigBuffer = fs.readFileSync(filePath);
    const appConfig = appConfigBuffer.toString();
    return appConfig.replace(config.from, config.to);
};
