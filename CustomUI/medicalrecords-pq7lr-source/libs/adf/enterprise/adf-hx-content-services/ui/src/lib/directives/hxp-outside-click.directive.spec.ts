/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HxpOutsideClickDirective } from './hxp-outside-click.directive';

@Component({
    selector: 'hxp-test-component',
    template: `
        <div id="outside">Outside element</div>
        <div id="host" (hxpOutsideClick)="onClickOutside($event)">
            <button id="inside">Inside button</button>
        </div>
    `,
    imports: [HxpOutsideClickDirective],
})
class TestComponent {
    @ViewChild(HxpOutsideClickDirective)
    directive: HxpOutsideClickDirective | undefined;

    clickOutsideEvent: Event | null = null;

    onClickOutside(event: Event): void {
        this.clickOutsideEvent = event;
    }
}

describe('HxpOutsideClickDirective', () => {
    let fixture: ComponentFixture<TestComponent>;
    let component: TestComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HxpOutsideClickDirective, TestComponent],
        });
        fixture = TestBed.createComponent(TestComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should emit hxpOutsideClick when clicking outside the host element', async () => {
        const outsideElement: HTMLElement = fixture.nativeElement.querySelector('#outside');

        outsideElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await fixture.whenStable();

        expect(component.clickOutsideEvent).toBeTruthy();
        expect(component.clickOutsideEvent?.target).toBe(outsideElement);
    });

    it('should not emit hxpOutsideClick when clicking inside the host element', async () => {
        const insideButton: HTMLElement = fixture.nativeElement.querySelector('#inside');
        insideButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await fixture.whenStable();

        expect(component.clickOutsideEvent).toBeNull();
    });

    it('should not emit hxpOutsideClick when clicking on the host element itself', async () => {
        const hostElement: HTMLElement = fixture.nativeElement.querySelector('#host');
        hostElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await fixture.whenStable();

        expect(component.clickOutsideEvent).toBeNull();
    });
});
