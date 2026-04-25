/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatFormFieldHarness, FormFieldHarnessFilters } from '@angular/material/form-field/testing';
import { BaseHarnessProps } from './components-harness.interface';

interface FormFieldProps extends BaseHarnessProps {
    formFieldFilters?: FormFieldHarnessFilters;
}

export class FormFieldHarnessUtils {
    private static loader: HarnessLoader;

    public static async getFormField({ fixture, formFieldFilters, fromRoot = false }: FormFieldProps): Promise<MatFormFieldHarness> {
        FormFieldHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const formField = await FormFieldHarnessUtils.loader.getHarness(MatFormFieldHarness.with(formFieldFilters));
        return formField;
    }

    public static async getAllFormFields({ fixture, formFieldFilters, fromRoot = false }: FormFieldProps): Promise<MatFormFieldHarness[]> {
        FormFieldHarnessUtils.loader = fromRoot ? TestbedHarnessEnvironment.documentRootLoader(fixture) : TestbedHarnessEnvironment.loader(fixture);
        const allFormFields = await FormFieldHarnessUtils.loader.getAllHarnesses(MatFormFieldHarness.with(formFieldFilters));

        return allFormFields;
    }

    public static async getLabel(formFieldProps: FormFieldProps): Promise<string | null> {
        const formField = await FormFieldHarnessUtils.getFormField(formFieldProps);

        return formField.getLabel();
    }

    public static async getTextHints(formFieldProps: FormFieldProps): Promise<string[]> {
        const formField = await FormFieldHarnessUtils.getFormField(formFieldProps);

        return formField.getTextHints();
    }

    public static async getTextErrors(formFieldProps: FormFieldProps): Promise<string[]> {
        const formField = await FormFieldHarnessUtils.getFormField(formFieldProps);

        return formField.getTextErrors();
    }
}
