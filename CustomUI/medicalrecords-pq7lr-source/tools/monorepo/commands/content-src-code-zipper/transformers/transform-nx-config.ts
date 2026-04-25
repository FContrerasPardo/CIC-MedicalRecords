/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FileTransformer } from './file-transformer.interface';
import { readNxJson } from 'nx/src/config/nx-json';
import { workspaceRoot } from '@nx/devkit';

export const transformNxConfig: FileTransformer = () => {
    const nxJson = readNxJson(workspaceRoot);

    return JSON.stringify(
        {
            tasksRunnerOptions: nxJson.tasksRunnerOptions,
            affected: nxJson.affected,
            targetDefaults: nxJson.targetDefaults,
            namedInputs: nxJson.namedInputs,
        },
        undefined,
        2
    );
};
