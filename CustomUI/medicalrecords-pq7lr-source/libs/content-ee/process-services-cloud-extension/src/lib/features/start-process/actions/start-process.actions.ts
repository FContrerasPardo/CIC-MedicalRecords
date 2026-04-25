/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';
import { NodeEntry } from '@alfresco/js-api';

interface ModalConfiguration {
    focusedElementOnCloseSelector?: string;
}

export interface StartProcessPayload {
    payload: NodeEntry[];
    configuration?: ModalConfiguration;
}

export const startProcess = createAction('[ProcessServicesCloud] StartProcess', props<StartProcessPayload>());
