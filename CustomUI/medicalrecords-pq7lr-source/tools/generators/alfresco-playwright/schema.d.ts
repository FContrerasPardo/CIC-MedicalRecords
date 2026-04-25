/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export interface AlfrescoPlaywrightGeneratorSchema {
    name: string;
    directory: string;
    importPath?: string;
    standaloneConfig?: boolean;
    tags?: string;
    strict?: boolean;
    provideExample?: boolean;
    skipFormat?: boolean;
    addModuleSpec?: boolean;
    unitTestRunner: UnitTestRunner;
    linter?: AngularLinter;
    appName?: 'studio-hxp' | 'workspace-hxp' | 'admin-hxp' | 'none';
    ž;
}
