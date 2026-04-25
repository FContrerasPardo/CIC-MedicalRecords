/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InjectionToken, ValueProvider } from '@angular/core';
import { Observable, of } from 'rxjs';

export const FORM_RULES_CONFIGURATION = new InjectionToken<Observable<FormRulesConfiguration>>('form-rules-configuration');

export interface FormRulesConfiguration {
    disableListeningForProcessFinish?: boolean;
    listenForProcessCreatedByActor?: boolean;
}

export const DEFAULT_FORM_RULES_CONFIGURATION: Readonly<FormRulesConfiguration> = {};

export const provideFormRulesConfiguration = (config: FormRulesConfiguration = DEFAULT_FORM_RULES_CONFIGURATION): ValueProvider => {
    return {
        provide: FORM_RULES_CONFIGURATION,
        useValue: of(config),
    };
};
