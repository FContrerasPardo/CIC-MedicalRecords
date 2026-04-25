/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { LibraryGeneratorSchema } from '../schema';

export interface NormalizedSchema extends LibraryGeneratorSchema {
    name: string;
    projectName: string;
    projectRoot?: string;
    directory: string;
    parsedTags?: string[];
    offsetFromRoot?: string;
}
