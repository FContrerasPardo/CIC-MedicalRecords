/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export interface LibraryGeneratorSchema {
    type: string;
    addTailwind?: boolean;
    skipFormat?: boolean;
    simpleModuleName?: boolean;
    addModuleSpec?: boolean;
    directory?: string;
    category: string;
    sourceDir?: string;
    buildable?: boolean;
    publishable?: boolean;
    importPath?: string;
    standaloneConfig?: boolean;
    spec?: boolean;
    flat?: boolean;
    commonModule?: boolean;
    prefix?: string;
    routing?: boolean;
    lazy?: boolean;
    parentModule?: string;
    tags?: string;
    externalWorkstreamScope?: 'none' | 'idp' | 'cicgov' | 'rpa' | 'ai';
    strict?: boolean;
    linter?: AngularLinter;
    unitTestRunner?: UnitTestRunner;
    compilationMode?: 'full' | 'partial';
    setParserOptionsProject?: boolean;
    style?: 'css' | 'scss' | 'sass' | 'less' | 'none';
}
