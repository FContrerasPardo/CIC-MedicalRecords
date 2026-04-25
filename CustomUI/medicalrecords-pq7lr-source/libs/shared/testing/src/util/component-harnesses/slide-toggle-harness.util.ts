/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSlideToggleHarness, SlideToggleHarnessFilters } from '@angular/material/slide-toggle/testing';
import { BaseHarnessProps } from './components-harness.interface';

interface SlideToggleProps extends BaseHarnessProps {
    slideToggleFilters?: SlideToggleHarnessFilters;
}

export class SlideToggleHarnessUtils {
    private static loader: HarnessLoader;

    public static async getSlideToggle({ fixture, slideToggleFilters, fromRoot = false }: SlideToggleProps): Promise<MatSlideToggleHarness> {
        SlideToggleHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const slideToggle = await SlideToggleHarnessUtils.loader.getHarness(MatSlideToggleHarness.with(slideToggleFilters));

        return slideToggle;
    }

    public static async getAllSlideToggles({ fixture, slideToggleFilters, fromRoot = false }: SlideToggleProps): Promise<MatSlideToggleHarness[]> {
        SlideToggleHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const slideToggles = await SlideToggleHarnessUtils.loader.getAllHarnesses(MatSlideToggleHarness.with(slideToggleFilters));

        return slideToggles;
    }
}
