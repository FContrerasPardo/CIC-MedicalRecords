/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ExecutorContext } from '@nx/devkit';

import { CodeownerExecutorSchema } from './schema';
import executor from './codeowner';

const options: CodeownerExecutorSchema = { json: true };
const context: ExecutorContext = {
    root: '',
    cwd: process.cwd(),
    isVerbose: false,
    projectGraph: {
        nodes: {},
        dependencies: {},
    },
    projectsConfigurations: {
        projects: {},
        version: 2,
    },
    nxJsonConfiguration: {},
};

describe('Codeowner Executor', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    it('can run', async () => {
        const output = await executor(options, context);
        expect(output.success).toBe(true);
    });
});
