/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatToolbarHarness, ToolbarHarnessFilters } from '@angular/material/toolbar/testing';
import { BaseHarnessProps } from './components-harness.interface';

interface ToolbarProps extends BaseHarnessProps {
    toolbarFilters?: ToolbarHarnessFilters;
}

export class ToolbarHarnessUtils {
    private static loader: HarnessLoader;

    static async getToolbar({ fixture, toolbarFilters, fromRoot = false }: ToolbarProps): Promise<MatToolbarHarness> {
        ToolbarHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const toolbar = await ToolbarHarnessUtils.loader.getHarness(MatToolbarHarness.with(toolbarFilters));

        return toolbar;
    }
}
