/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatRadioButtonHarness, MatRadioGroupHarness, RadioButtonHarnessFilters, RadioGroupHarnessFilters } from '@angular/material/radio/testing';
import { BaseHarnessProps } from './components-harness.interface';
interface RadioButtonsProps extends BaseHarnessProps {
    radioButtonsFilters?: RadioButtonHarnessFilters;
}

interface RadioGroupsProps extends BaseHarnessProps {
    radioGroupsFilters?: RadioGroupHarnessFilters;
}

export class RadioButtonHarnessUtils {
    private static loader: HarnessLoader;

    public static async getRadioGroup({ fixture, radioGroupsFilters, fromRoot = false }: RadioGroupsProps): Promise<MatRadioGroupHarness> {
        RadioButtonHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const radioGroup = await RadioButtonHarnessUtils.loader.getHarness(MatRadioGroupHarness.with(radioGroupsFilters));

        return radioGroup;
    }

    public static async getAllRadioGroups({ fixture, radioGroupsFilters, fromRoot = false }: RadioGroupsProps): Promise<MatRadioGroupHarness[]> {
        RadioButtonHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const radioGroups = await RadioButtonHarnessUtils.loader.getAllHarnesses(MatRadioGroupHarness.with(radioGroupsFilters));

        return radioGroups;
    }

    public static async getRadioButton({ fixture, radioButtonsFilters, fromRoot = false }: RadioButtonsProps): Promise<MatRadioButtonHarness> {
        RadioButtonHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        return RadioButtonHarnessUtils.loader.getHarness(MatRadioButtonHarness.with(radioButtonsFilters));
    }

    public static async getAllRadioButtons({ fixture, radioButtonsFilters, fromRoot = false }: RadioButtonsProps): Promise<MatRadioButtonHarness[]> {
        RadioButtonHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const radioButtons = await RadioButtonHarnessUtils.loader.getAllHarnesses(MatRadioButtonHarness.with(radioButtonsFilters));

        return radioButtons;
    }

    public static async checkRadioButton({ fixture, radioButtonsFilters, fromRoot = false }: RadioButtonsProps): Promise<void> {
        RadioButtonHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        return RadioButtonHarnessUtils.loader.getHarness(MatRadioButtonHarness.with(radioButtonsFilters)).then((radio) => radio.check());
    }
}
