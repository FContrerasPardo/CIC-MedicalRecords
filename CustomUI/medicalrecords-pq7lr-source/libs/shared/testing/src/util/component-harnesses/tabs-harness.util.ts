/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import {
    MatTabGroupHarness,
    MatTabHarness,
    MatTabLinkHarness,
    MatTabNavBarHarness,
    TabGroupHarnessFilters,
    TabHarnessFilters,
    TabLinkHarnessFilters,
    TabNavBarHarnessFilters
} from '@angular/material/tabs/testing';
import { BaseHarnessProps } from './components-harness.interface';

interface TabGroupProps extends BaseHarnessProps {
    tabGroupFilters?: TabGroupHarnessFilters;
}

interface TabProps extends TabGroupProps {
    tabFilters?: TabHarnessFilters;
}

interface TabNavbarProps extends BaseHarnessProps {
    tabNavbarFilters?: TabNavBarHarnessFilters;
}

interface TabNavbarLinksProps extends TabNavbarProps {
    tabLinkFilters?: TabLinkHarnessFilters;
}

export class TabsHarnessUtils {
    private static loader: HarnessLoader;

    public static async getTabGroup({ fixture, tabGroupFilters, fromRoot = false }: TabGroupProps): Promise<MatTabGroupHarness> {
        TabsHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const tabGroup = await TabsHarnessUtils.loader.getHarness(MatTabGroupHarness.with(tabGroupFilters));

        return tabGroup;
    }

    public static async getTabNavbar({ fixture, tabNavbarFilters, fromRoot = false }: TabNavbarProps): Promise<MatTabNavBarHarness> {
        TabsHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const tabNavbar = await TabsHarnessUtils.loader.getHarness(MatTabNavBarHarness.with(tabNavbarFilters));

        return tabNavbar;
    }

    public static async getTabNavbarLinks(navbarProps: TabNavbarLinksProps): Promise<MatTabLinkHarness[]> {
        const tabNavbar = await TabsHarnessUtils.getTabNavbar(navbarProps);

        return tabNavbar.getLinks(navbarProps.tabLinkFilters);
    }

    public static async getTabs(tabProps: TabProps): Promise<MatTabHarness[]> {
        const tabGroup = await TabsHarnessUtils.getTabGroup(tabProps);

        return tabGroup.getTabs(tabProps.tabFilters);
    }
}
