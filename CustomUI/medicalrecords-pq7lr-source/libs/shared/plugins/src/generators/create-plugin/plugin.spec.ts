/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { MOCK_PLUGIN_FOLDER, MOCK_PLUGIN_NAME, MOCK_PLUGIN_OPTIONS, createTreeWithInitialWorkspace } from '../shared/testing/generate-mock-plugin';
import pluginGenerator from './plugin';
import { ProjectGraph, readProjectConfiguration, Tree } from '@nx/devkit';

let projectGraph: ProjectGraph;
jest.mock('@nx/devkit', () => ({
    ...jest.requireActual<any>('@nx/devkit'),
    createProjectGraphAsync: jest.fn().mockImplementation(() => {
        return Promise.resolve(projectGraph);
    }),
    formatFiles: jest.fn(),
}));

describe('Create plugin generator', () => {
    let appTree: Tree;

    beforeEach(() => {
        projectGraph = {
            nodes: {},
            dependencies: {},
        };
        appTree = createTreeWithInitialWorkspace(appTree);
    });

    it('should create a plugin', async () => {
        await pluginGenerator(appTree, MOCK_PLUGIN_OPTIONS);

        const indexExists = appTree.exists(`${MOCK_PLUGIN_FOLDER}/index.ts`);

        const moduleExists = appTree.exists(`${MOCK_PLUGIN_FOLDER}/${MOCK_PLUGIN_NAME}/src/lib/${MOCK_PLUGIN_NAME}.module.ts`);

        expect(indexExists).toBe(true);
        expect(moduleExists).toBe(true);
    }, 20000);

    it('should add plugin into app "implicitDependencies"', async () => {
        await pluginGenerator(appTree, MOCK_PLUGIN_OPTIONS);

        const rootAppProjectJson = readProjectConfiguration(appTree, 'workspace-hxp');
        const hasImplicitDependency = rootAppProjectJson.implicitDependencies.includes(`${MOCK_PLUGIN_NAME}`);
        expect(hasImplicitDependency).toBe(true);
    }, 20000);

    it('should have correct targets', async () => {
        await pluginGenerator(appTree, MOCK_PLUGIN_OPTIONS);

        const projectJson = readProjectConfiguration(appTree, `${MOCK_PLUGIN_NAME}`);
        const targets = projectJson.targets;

        expect(targets.test).toBeDefined();
        expect(targets.lint).toBeDefined();
        expect(targets.stylelint).toBeDefined();
    }, 20000);

    it('should create an assets folder', async () => {
        await pluginGenerator(appTree, MOCK_PLUGIN_OPTIONS);

        const assetsFolderExists = appTree.exists(`${MOCK_PLUGIN_FOLDER}/${MOCK_PLUGIN_NAME}/assets`);
        const rootAppProjectJson = readProjectConfiguration(appTree, 'workspace-hxp');
        const rootAppAssets = rootAppProjectJson.targets.build.options.assets;
        const rootAppAssetsContainsPluginAssets = rootAppAssets.some((asset) => {
            return (
                asset.input === `${MOCK_PLUGIN_FOLDER}/${MOCK_PLUGIN_NAME}/assets` &&
                asset.output === `assets/${MOCK_PLUGIN_NAME}` &&
                asset.glob === '**/*'
            );
        });

        expect(assetsFolderExists).toBe(true);
        expect(rootAppAssetsContainsPluginAssets).toBe(true);
    }, 20000);

    it('should create an i18n folder if addTranslations option set to true', async () => {
        await pluginGenerator(appTree, { ...MOCK_PLUGIN_OPTIONS, addTranslations: true });

        const i18nFolderExists = appTree.exists(`${MOCK_PLUGIN_FOLDER}/${MOCK_PLUGIN_NAME}/assets/i18n`);
        const enJsonFileExists = appTree.exists(`${MOCK_PLUGIN_FOLDER}/${MOCK_PLUGIN_NAME}/assets/i18n/en.json`);

        expect(i18nFolderExists).toBe(true);
        expect(enJsonFileExists).toBe(true);
    }, 20000);
});
