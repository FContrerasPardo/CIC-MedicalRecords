/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { IconHarnessFilters, MatIconHarness } from '@angular/material/icon/testing';
import { BaseHarnessProps } from './components-harness.interface';
import { HarnessLoader } from '@angular/cdk/testing';

interface IconProps extends BaseHarnessProps {
    iconFilters?: IconHarnessFilters;
}

export class IconHarnessUtils {
    public static async getIcon({ fixture, iconFilters, fromRoot = false }: IconProps) {
        const loader: HarnessLoader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);

        const icon = await loader.getHarness(MatIconHarness.with(iconFilters));
        return icon;
    }

    public static async getIconOrNull({ fixture, iconFilters, fromRoot = false }: IconProps): Promise<MatIconHarness | null> {
        const loader: HarnessLoader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);

        const icon = await loader.getHarnessOrNull(MatIconHarness.with(iconFilters));
        return icon;
    }

    public static async getAllIcons({ fixture, iconFilters, fromRoot = false }: IconProps) {
        const loader: HarnessLoader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);

        const icons = await loader.getAllHarnesses(MatIconHarness.with(iconFilters));
        return icons;
    }

    public static async getIconName({ fixture, iconFilters, fromRoot = false }: IconProps) {
        const loader: HarnessLoader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);

        const icon = await loader.getHarness(MatIconHarness.with(iconFilters));
        return icon.getName();
    }
}
