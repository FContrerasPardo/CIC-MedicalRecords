/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InViewportDirective } from './in-viewport.directive';

type IntersectionCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class MockIntersectionObserver {
    public static instances: MockIntersectionObserver[] = [];
    public readonly observe = jest.fn();
    public readonly disconnect = jest.fn();
    private readonly callback: IntersectionCallback;

    constructor(callback: IntersectionCallback) {
        this.callback = callback;
        MockIntersectionObserver.instances.push(this);
    }

    trigger(ratio: number): void {
        this.callback([{ intersectionRatio: ratio }]);
    }
}

@Component({
    template: '<div hylandIdpInViewport [options]="options" (idpInViewport)="onInViewport($event)"></div>',
    standalone: true,
    imports: [InViewportDirective]
})
class TestHostComponent {
    options?: IntersectionObserverInit;
    onInViewport = jest.fn();
}

describe('InViewportDirective', () => {
    let originalIntersectionObserver: typeof IntersectionObserver | undefined;
    let fixture: ComponentFixture<TestHostComponent>;
    let component: TestHostComponent;

    beforeEach(() => {
        MockIntersectionObserver.instances = [];
        originalIntersectionObserver = (globalThis as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;

        const mockCtor = jest.fn().mockImplementation(function mockIntersectionObserverFactory(this: unknown, cb: IntersectionObserverCallback) {
            return new MockIntersectionObserver((entries) =>
                cb(entries as unknown as IntersectionObserverEntry[], {} as unknown as IntersectionObserver)
            ) as unknown as IntersectionObserver;
        });

        Object.defineProperty(globalThis, 'IntersectionObserver', {
            configurable: true,
            writable: true,
            value: mockCtor,
        });

        TestBed.configureTestingModule({
            imports: [TestHostComponent]
        });

        fixture = TestBed.createComponent(TestHostComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fixture?.destroy();
        if (originalIntersectionObserver === undefined) {
            delete (globalThis as unknown as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
        } else {
            Object.defineProperty(globalThis, 'IntersectionObserver', {
                configurable: true,
                writable: true,
                value: originalIntersectionObserver,
            });
        }
    });

    it('should emit when intersection meets numeric threshold', () => {
        component.options = { threshold: 0.5 };
        fixture.detectChanges();

        expect(MockIntersectionObserver.instances.length).toBe(1);
        const instance = MockIntersectionObserver.instances[0];

        instance.trigger(0.49);
        expect(component.onInViewport).not.toHaveBeenCalled();

        instance.trigger(0.6);
        expect(component.onInViewport).toHaveBeenCalledTimes(1);
        expect(component.onInViewport).toHaveBeenCalledWith(true);
        expect(instance.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should use max of array thresholds and emit only when met', () => {
        component.options = { threshold: [0.2, 0.6, 0.8] };
        fixture.detectChanges();

        const instance = MockIntersectionObserver.instances[0];

        instance.trigger(0.75);
        expect(component.onInViewport).not.toHaveBeenCalled();

        instance.trigger(0.8);
        expect(component.onInViewport).toHaveBeenCalledTimes(1);
        expect(instance.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should emit immediately when IntersectionObserver is unavailable', () => {
        const globalWithIO = globalThis as unknown as { IntersectionObserver?: typeof IntersectionObserver };
        globalWithIO.IntersectionObserver = undefined;

        fixture = TestBed.createComponent(TestHostComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.onInViewport).toHaveBeenCalledTimes(1);
        expect(component.onInViewport).toHaveBeenCalledWith(true);
    });
});
