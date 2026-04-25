/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { DocumentMoreMenuItemsFactoryService } from './document-more-menu-items-factory.service';
import { ContentActionRef, ExtensionService } from '@alfresco/adf-extensions';
import { of, firstValueFrom, toArray } from 'rxjs';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { MockProvider } from 'ng-mocks';

const DOCUMENT_MORE_ACTION_REF = {
    id: 'app.document.more',
    type: 'menu',
    order: 10_000,
    icon: 'more_vert',
    title: 'APP.ACTIONS.MORE',
    children: [
        {
            id: 'document.move',
            order: 200,
            type: 'custom',
            component: 'document.move',
            rules: {
                visible: 'app.canShowMove',
            },
        },
        {
            id: 'document.create_version',
            order: 200,
            type: 'custom',
            component: 'document.create_version',
        },
    ],
};

const EXTENSION_CONFIG = {
    $schema: '../../../extension.schema.json',
    $id: 'app.core',
    $name: 'app.core',
    $version: '0.0.1',
    $vendor: 'Alfresco Software, Ltd.',
    $license: 'LGPL-3.0',
    $runtime: '1.7.0',
    $description: 'Core application extensions and features',
    $references: [],
    $ignoreReferenceList: [],
    features: {
        header: [
            {
                id: 'app.header.more',
                type: 'menu',
                order: 10_000,
                icon: 'more_vert',
                title: 'APP.ACTIONS.MORE',
                children: [
                    {
                        id: 'app.logout',
                        order: 200,
                        type: 'custom',
                        component: 'app.logout',
                        rules: {
                            visible: 'app.canShowLogout',
                        },
                    },
                ],
            },
        ],
        document: [DOCUMENT_MORE_ACTION_REF],
    },
};

describe('DocumentMoreMenuItemsFactoryService', () => {
    let documentMoreMenuItemsFactoryService: DocumentMoreMenuItemsFactoryService;
    let extensionService: ExtensionService;
    const featuresServiceSpy = {
        isOn$: jest.fn().mockReturnValue(of(false)),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MockProvider(ExtensionService), { provide: FeaturesServiceToken, useValue: featuresServiceSpy }],
        });

        documentMoreMenuItemsFactoryService = TestBed.inject(DocumentMoreMenuItemsFactoryService);
        extensionService = TestBed.inject(ExtensionService);
        extensionService.setup$ = of(EXTENSION_CONFIG);
    });

    it('should return an action ref of type "menu" with a child with id "document.move"', async () => {
        const actionRef: ContentActionRef = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(actionRef.type).toEqual('menu');
        expect(actionRef.children?.length).toBeGreaterThan(0);

        const subActionRef = actionRef.children?.find((ref) => ref.id === 'document.move');

        expect(subActionRef).toBeDefined();
    });

    it('should return an action ref of type "menu" with a child with id "document.create_version"', async () => {
        const actionRef: ContentActionRef = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(actionRef.type).toEqual('menu');
        expect(actionRef.children?.length).toBeGreaterThan(0);

        const subActionRef = actionRef.children?.find((ref) => ref.id === 'document.create_version');

        expect(subActionRef).toBeDefined();
    });

    it('should load items from contributions', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'default.document.more',
                        type: 'menu',
                        children: [{ id: 'default.action1', order: 100, type: 'custom' }],
                    },
                    {
                        id: 'my-plugin.document.more',
                        type: 'menu',
                        children: [{ id: 'my-plugin.document.copy', order: 300, type: 'custom' }],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.children?.length).toBe(2);
        expect(result.children?.some((c) => c.id === 'default.action1')).toBe(true);
        expect(result.children?.some((c) => c.id === 'my-plugin.document.copy')).toBe(true);
    });

    it('should sort menu items by order', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'default.document.more',
                        type: 'menu',
                        children: [
                            { id: 'action.order200', order: 200, type: 'custom' },
                            { id: 'action.order100', order: 100, type: 'custom' },
                        ],
                    },
                    {
                        id: 'plugin.document.more',
                        type: 'menu',
                        children: [
                            { id: 'action.order300', order: 300, type: 'custom' },
                            { id: 'action.order50', order: 50, type: 'custom' },
                        ],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.children?.length).toBe(4);
        expect(result.children?.[0].id).toBe('action.order50');
        expect(result.children?.[1].id).toBe('action.order100');
        expect(result.children?.[2].id).toBe('action.order200');
        expect(result.children?.[3].id).toBe('action.order300');
    });

    it('should treat items without order as order 0', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'default.document.more',
                        type: 'menu',
                        children: [
                            { id: 'action.with.order', order: 100, type: 'custom' },
                            { id: 'action.without.order', type: 'custom' },
                        ],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.children?.[0].id).toBe('action.without.order');
        expect(result.children?.[1].id).toBe('action.with.order');
    });

    it('should sort items with same order by id for deterministic ordering', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'default.document.more',
                        type: 'menu',
                        children: [
                            { id: 'zebra.action', order: 100, type: 'custom' },
                            { id: 'alpha.action', order: 100, type: 'custom' },
                            { id: 'beta.action', order: 100, type: 'custom' },
                        ],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.children?.length).toBe(3);
        expect(result.children?.[0].id).toBe('alpha.action');
        expect(result.children?.[1].id).toBe('beta.action');
        expect(result.children?.[2].id).toBe('zebra.action');
    });

    it('should load children items', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'core.document.more',
                        type: 'menu',
                        children: [{ id: 'core.action', order: 100, type: 'custom' }],
                    },
                    {
                        id: 'plugin-a.document.more',
                        type: 'menu',
                        children: [{ id: 'plugin-a.action', order: 200, type: 'custom' }],
                    },
                    {
                        id: 'plugin-b.document.more',
                        type: 'menu',
                        children: [{ id: 'plugin-b.action', order: 150, type: 'custom' }],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.children?.length).toBe(3);
        expect(result.children?.[0].id).toBe('core.action');
        expect(result.children?.[1].id).toBe('plugin-b.action');
        expect(result.children?.[2].id).toBe('plugin-a.action');
    });

    it('should use last defined icon when multiple contributions define icons', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'default.document.more',
                        type: 'menu',
                        icon: 'default_icon',
                        children: [{ id: 'default.action', order: 100, type: 'custom' }],
                    },
                    {
                        id: 'plugin.document.more',
                        type: 'menu',
                        icon: 'custom_icon',
                        children: [{ id: 'plugin.action', order: 200, type: 'custom' }],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.icon).toBe('custom_icon');
    });

    it('should use last defined title when multiple contributions define titles', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'default.document.more',
                        type: 'menu',
                        title: 'Default Title',
                        children: [{ id: 'default.action', order: 100, type: 'custom' }],
                    },
                    {
                        id: 'plugin.document.more',
                        type: 'menu',
                        title: 'Custom Title',
                        children: [{ id: 'plugin.action', order: 200, type: 'custom' }],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.title).toBe('Custom Title');
    });

    it('should preserve default icon when client contribution does not define one', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'default.document.more',
                        type: 'menu',
                        icon: 'default_icon',
                        title: 'Default Title',
                        children: [{ id: 'default.action', order: 100, type: 'custom' }],
                    },
                    {
                        id: 'plugin.document.more',
                        type: 'menu',
                        title: 'Custom Title',
                        children: [{ id: 'plugin.action', order: 200, type: 'custom' }],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.icon).toBe('default_icon');
        expect(result.title).toBe('Custom Title');
    });

    it('should filter merged children from multiple contributions based on feature flags', async () => {
        featuresServiceSpy.isOn$.mockImplementation((flag: string) => {
            if (flag === 'enabled-feature') {
                return of(true);
            }
            return of(false);
        });

        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'core.document.more',
                        type: 'menu',
                        children: [
                            { id: 'core.action.no-flag', order: 100, type: 'custom' },
                            { id: 'core.action.enabled', order: 150, type: 'custom', rules: { featureFlag: 'enabled-feature' } },
                            { id: 'core.action.disabled', order: 175, type: 'custom', rules: { featureFlag: 'disabled-feature' } },
                        ],
                    },
                    {
                        id: 'plugin.document.more',
                        type: 'menu',
                        children: [
                            { id: 'plugin.action.enabled', order: 200, type: 'custom', rules: { featureFlag: 'enabled-feature' } },
                            { id: 'plugin.action.disabled', order: 250, type: 'custom', rules: { featureFlag: 'another-disabled-feature' } },
                            { id: 'plugin.action.no-flag', order: 300, type: 'custom' },
                        ],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.children?.length).toBe(4);
        expect(result.children?.map((c) => c.id)).toEqual([
            'core.action.no-flag',
            'core.action.enabled',
            'plugin.action.enabled',
            'plugin.action.no-flag',
        ]);
        expect(result.children?.some((c) => c.id === 'core.action.disabled')).toBe(false);
        expect(result.children?.some((c) => c.id === 'plugin.action.disabled')).toBe(false);
    });

    it('should handle contributions with empty children arrays', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'empty.document.more',
                        type: 'menu',
                        children: [],
                    },
                    {
                        id: 'populated.document.more',
                        type: 'menu',
                        children: [{ id: 'populated.action', order: 100, type: 'custom' }],
                    },
                    {
                        id: 'another-empty.document.more',
                        type: 'menu',
                        children: [],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.children?.length).toBe(1);
        expect(result.children?.[0].id).toBe('populated.action');
    });

    it('should handle contributions with missing children property', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'no-children.document.more',
                        type: 'menu',
                    },
                    {
                        id: 'with-children.document.more',
                        type: 'menu',
                        children: [{ id: 'valid.action', order: 100, type: 'custom' }],
                    },
                ],
            },
        });

        const result = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems());

        expect(result.children?.length).toBe(1);
        expect(result.children?.[0].id).toBe('valid.action');
    });

    it('should not emit when all contributions have empty or missing children', async () => {
        extensionService.setup$ = of({
            $id: 'test.config',
            $name: 'test.config',
            $version: '0.0.1',
            $vendor: 'Test',
            $license: 'MIT',
            features: {
                document: [
                    {
                        id: 'empty.document.more',
                        type: 'menu',
                        children: [],
                    },
                    {
                        id: 'no-children.document.more',
                        type: 'menu',
                    },
                ],
            },
        });

        const results = await firstValueFrom(documentMoreMenuItemsFactoryService.getMoreMenuItems().pipe(toArray()));

        expect(results.length).toBe(0);
    });
});
