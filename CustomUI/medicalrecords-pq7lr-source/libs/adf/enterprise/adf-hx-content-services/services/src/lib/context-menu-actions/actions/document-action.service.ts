/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { ActionContext } from './action-context.interface';
import { ActionExecutor } from './action-executor.interface';
import { PermissionChecker } from '../../permission/models/permission-checker.interface';

@Injectable()
export abstract class DocumentActionService implements PermissionChecker, ActionExecutor {
    abstract isAvailable(context: ActionContext): boolean;
    abstract execute(context: ActionContext): void;
}
