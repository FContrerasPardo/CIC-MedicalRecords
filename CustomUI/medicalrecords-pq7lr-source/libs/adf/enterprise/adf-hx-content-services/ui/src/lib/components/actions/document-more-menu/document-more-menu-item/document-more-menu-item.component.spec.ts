/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ExtensionService } from '@alfresco/adf-extensions';
import { DocumentMoreMenuItemComponent } from './document-more-menu-item.component';

describe('DocumentMoreMenuItemComponent', () => {
    let component: DocumentMoreMenuItemComponent;
    let fixture: ComponentFixture<DocumentMoreMenuItemComponent>;

    beforeEach(async () => {
        const mockExtensionService = {
            getComponentById: jest.fn().mockReturnValue(null),
            setComponents: jest.fn(),
            getComponents: jest.fn().mockReturnValue({}),
            getAllowedPlugins: jest.fn().mockReturnValue([])
        };

        await TestBed.configureTestingModule({
            imports: [DocumentMoreMenuItemComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: ExtensionService,
                    useValue: mockExtensionService
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DocumentMoreMenuItemComponent);
        component = fixture.componentInstance;
        component.item = {
            id: 'test-action',
            component: 'test.component',
            type: 'custom'
        };
        component.actionContext = { documents: [] };
    });

    it('should return false when dynamic component is undefined', () => {
        Object.defineProperty(component, 'dynamicComponent', {
            value: () => undefined,
            writable: true
        });

        expect(component.isAvailable).toBe(false);
    });

    it('should return false when dynamic component has no componentRef', () => {
        const mockDynamicComponent = {} as any;
        Object.defineProperty(component, 'dynamicComponent', {
            value: () => mockDynamicComponent,
            writable: true
        });

        expect(component.isAvailable).toBe(false);
    });

    it('should return false when componentRef has no instance', () => {
        const mockDynamicComponent = {
            componentRef: {}
        } as any;
        Object.defineProperty(component, 'dynamicComponent', {
            value: () => mockDynamicComponent,
            writable: true
        });

        expect(component.isAvailable).toBe(false);
    });

    it('should return false when inner component isAvailable is undefined', () => {
        const mockDynamicComponent = {
            componentRef: {
                instance: {
                    isAvailable: undefined
                }
            }
        } as any;
        Object.defineProperty(component, 'dynamicComponent', {
            value: () => mockDynamicComponent,
            writable: true
        });

        expect(component.isAvailable).toBe(false);
    });

    it('should return false when inner component isAvailable is null', () => {
        const mockDynamicComponent = {
            componentRef: {
                instance: {
                    isAvailable: null
                }
            }
        } as any;
        Object.defineProperty(component, 'dynamicComponent', {
            value: () => mockDynamicComponent,
            writable: true
        });

        expect(component.isAvailable).toBe(false);
    });

    it('should return false when inner component isAvailable is false', () => {
        const mockDynamicComponent = {
            componentRef: {
                instance: {
                    isAvailable: false
                }
            }
        } as any;
        Object.defineProperty(component, 'dynamicComponent', {
            value: () => mockDynamicComponent,
            writable: true
        });

        expect(component.isAvailable).toBe(false);
    });

    it('should return true when inner component isAvailable is true', () => {
        const mockDynamicComponent = {
            componentRef: {
                instance: {
                    isAvailable: true
                }
            }
        } as any;
        Object.defineProperty(component, 'dynamicComponent', {
            value: () => mockDynamicComponent,
            writable: true
        });

        expect(component.isAvailable).toBe(true);
    });

    it('should initialize appComponent from item.component in ngOnInit', () => {
        component.item = {
            id: 'test',
            component: 'my.custom.component',
            type: 'custom'
        };

        component.ngOnInit();

        expect(component['appComponent']).toBe('my.custom.component');
    });

    it('should handle missing component in item', () => {
        component.item = {
            id: 'test',
            type: 'custom'
        };

        component.ngOnInit();

        expect(component['appComponent']).toBe('');
    });
});
