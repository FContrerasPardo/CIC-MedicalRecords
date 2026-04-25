/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { RejectReason } from '../../models/contracts/task-input';
import { Observable } from 'rxjs';
import { IdpTaskActions, IdpTaskInfoBase } from '../../models/common-models';
import { TaskContext } from '../../models/api-models/task-context';
import { TaskClaimPermissions } from '../../models/task/task-claim-permissions';

@Injectable()
export abstract class IdpContextTaskBaseService {
    abstract readonly taskInfo$: Observable<IdpTaskInfoBase>;
    abstract readonly taskAction$: Observable<{ action: IdpTaskActions; openNextTask?: boolean }>;
    abstract readonly screenReady$: Observable<boolean>;
    abstract readonly taskCanSave$: Observable<boolean>;
    abstract readonly taskCanComplete$: Observable<boolean>;
    abstract readonly taskCanUnclaim$: Observable<boolean>;
    abstract readonly taskUnclaimEnabled$: Observable<boolean>;
    abstract readonly rejectReasons$: Observable<RejectReason[]>;

    abstract initialize(taskContext: TaskContext, taskClaimPermissions: TaskClaimPermissions): void;
    abstract reset(): void;
    abstract saveTask(): void;
    abstract completeTask(): void;
    abstract cancelTask(): void;
    abstract unclaimTask(): void;
}
