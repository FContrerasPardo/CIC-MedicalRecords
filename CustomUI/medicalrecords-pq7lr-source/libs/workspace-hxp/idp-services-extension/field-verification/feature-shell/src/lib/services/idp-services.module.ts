/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { IdpContextTaskBaseService, IdpShortcutService, SessionService } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { FieldVerificationContextTaskService } from './context-task/field-verification-context-task.service';
import { ActionHistoryService, ActionLinearHistoryService } from './action-history.service';
import { IdpVerificationService } from './verification/verification.service';
import { FIELD_VERIFICATION_SCREEN_SHORTCUT_PROVIDER } from './idp-verification-shortcuts';
import { IdpFormCloudService } from './idp-form-cloud.service';
import { TablePanelStateService } from './table-panel-state/table-panel-state.service';
import { IdpViewerEventBusService } from './viewer/idp-viewer-event-bus.service';
import { IdpViewerService } from './viewer/idp-viewer.service';
import { IdpRedactionService } from './redaction/idp-redaction.service';

export const IDP_FIELD_VERIFICATION_SERVICES_PROVIDER = [
    FieldVerificationContextTaskService,
    {
        provide: IdpContextTaskBaseService,
        useExisting: FieldVerificationContextTaskService,
    },
    { provide: ActionHistoryService, useClass: ActionLinearHistoryService },
    FIELD_VERIFICATION_SCREEN_SHORTCUT_PROVIDER,
    IdpShortcutService,
    IdpVerificationService,
    IdpFormCloudService,
    IdpViewerEventBusService,
    IdpViewerService,
    IdpRedactionService,
    SessionService,
    TablePanelStateService,
];
