/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { DividerHarnessFilters, MatDividerHarness } from '@angular/material/divider/testing';
import type { BaseHarnessProps } from './components-harness.interface';

interface DividerProps extends BaseHarnessProps {
    dividerFilters?: DividerHarnessFilters;
}

export class DividerHarnessUtils {
    private static loader: HarnessLoader;

    public static async getDividerOrNull({ fixture, dividerFilters, fromRoot = false }: DividerProps): Promise<MatDividerHarness | null> {
        DividerHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);

        return DividerHarnessUtils.loader.getHarnessOrNull(MatDividerHarness.with(dividerFilters));
    }

    public static async getAllDividers({ fixture, dividerFilters, fromRoot = false }: DividerProps): Promise<MatDividerHarness[]> {
        DividerHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);

        const dividers = await DividerHarnessUtils.loader.getAllHarnesses(MatDividerHarness.with(dividerFilters));
        return dividers.length > 0 ? dividers : [];
    }
}
