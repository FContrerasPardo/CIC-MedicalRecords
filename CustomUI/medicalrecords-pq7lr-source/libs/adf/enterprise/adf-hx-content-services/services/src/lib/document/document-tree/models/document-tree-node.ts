/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Document } from '@hylandsoftware/hxcs-js-client';
import { Subject } from 'rxjs';

export class DocumentTreeNode {
    constructor(
        public document: Document,
        public level: number = 1,
        public isExpandable: boolean = false,
        public isLoading: boolean = false,
        public isSelectable: boolean = true,
        public isSkeleton = false,
        public totalCount: number = 0,
        public nodeLoaded: Subject<boolean> = new Subject(),
        public loadCancel$: Subject<void> = new Subject<void>()
    ) {}
}
