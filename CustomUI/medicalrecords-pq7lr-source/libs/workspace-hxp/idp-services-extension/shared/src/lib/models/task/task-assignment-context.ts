/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TaskClaimPermissions } from './task-claim-permissions';

export interface TaskAssignmentContext extends TaskClaimPermissions {
    assignee?: string;
    candidateGroups?: string[];
    candidateUsers?: string[];
}
