/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { a11yReport, defaultConfiguration } from '@hxp/workspace-hxp/shared/testing';
import { EntityListComponent } from './entity-list.component';

interface TestRecord {
    id: number;
    name: string;
}

describe('EntityListComponent', () => {
    let component: EntityListComponent<TestRecord>;
    let fixture: ComponentFixture<EntityListComponent<TestRecord>>;

    const records: TestRecord[] = [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EntityListComponent, NoopTranslateModule, NoopAnimationsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(EntityListComponent<TestRecord>);
        component = fixture.componentInstance;
        component.records = records;
        component.ngOnChanges();
        fixture.detectChanges();
    });

    it('should toggle row selection on Enter key when row is focused', () => {
        const row = records[0];
        const rowElement = document.createElement('tr');
        const preventDefault = jest.fn();

        (component as any).onRowKeydown(
            {
                key: 'Enter',
                preventDefault,
                target: rowElement,
                currentTarget: rowElement,
            } as unknown as KeyboardEvent,
            row
        );

        expect(preventDefault).toHaveBeenCalled();
        expect((component as any).selection.isSelected(row)).toBe(true);
    });

    it('should not toggle row selection on Enter when event comes from nested interactive content', () => {
        const row = records[0];
        const rowElement = document.createElement('tr');
        const nestedButton = document.createElement('button');
        rowElement.append(nestedButton);
        const preventDefault = jest.fn();

        (component as any).onRowKeydown(
            {
                key: 'Enter',
                preventDefault,
                target: nestedButton,
                currentTarget: rowElement,
            } as unknown as KeyboardEvent,
            row
        );

        expect(preventDefault).not.toHaveBeenCalled();
        expect((component as any).selection.isSelected(row)).toBe(false);
    });

    it('should ignore non-activation keys for row keyboard handling', () => {
        const row = records[0];
        const rowElement = document.createElement('tr');
        const preventDefault = jest.fn();

        (component as any).onRowKeydown(
            {
                key: 'Tab',
                preventDefault,
                target: rowElement,
                currentTarget: rowElement,
            } as unknown as KeyboardEvent,
            row
        );

        expect(preventDefault).not.toHaveBeenCalled();
        expect((component as any).selection.isSelected(row)).toBe(false);
    });

    it('should treat Space code as an activation key for row selection', () => {
        const row = records[0];
        const rowElement = document.createElement('tr');
        const preventDefault = jest.fn();

        (component as any).onRowKeydown(
            {
                key: 'Unidentified',
                code: 'Space',
                preventDefault,
                target: rowElement,
                currentTarget: rowElement,
            } as unknown as KeyboardEvent,
            row
        );

        expect(preventDefault).toHaveBeenCalled();
        expect((component as any).selection.isSelected(row)).toBe(true);
    });

    it('should stop checkbox keydown propagation for activation keys only', () => {
        const activationStopPropagation = jest.fn();
        const nonActivationStopPropagation = jest.fn();

        (component as any).onRowCheckboxKeydown({
            key: ' ',
            code: 'Space',
            stopPropagation: activationStopPropagation,
        } as unknown as KeyboardEvent);

        (component as any).onRowCheckboxKeydown({
            key: 'Tab',
            code: 'Tab',
            stopPropagation: nonActivationStopPropagation,
        } as unknown as KeyboardEvent);

        expect(activationStopPropagation).toHaveBeenCalled();
        expect(nonActivationStopPropagation).not.toHaveBeenCalled();
    });

    it('should build row aria labels using default and id-specific translation keys', () => {
        const instantSpy = jest.spyOn((component as any).translate, 'instant');

        (component as any).getRowAriaLabel(undefined);
        (component as any).getRowAriaLabel(records[0]);
        (component as any).getRowAriaLabel({ id: { nested: true }, name: 'Fallback' } as unknown as TestRecord);

        expect(instantSpy).toHaveBeenCalledWith('GOVERNANCE.SEARCH_RESULTS.BUTTONS.SELECT_ROW.LABEL');
        expect(instantSpy).toHaveBeenCalledWith('GOVERNANCE.SEARCH_RESULTS.BUTTONS.SELECT_ROW_WITH_ID.LABEL', { id: 1 });
    });

    it('should pass accessibility audit', async () => {
        component.selectAllEnabled = false;
        component.showSelection = false;
        fixture.detectChanges();

        const report = await a11yReport(fixture.nativeElement, defaultConfiguration);
        expect(report?.violations).toEqual([]);
    });
});
