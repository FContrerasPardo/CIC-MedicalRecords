/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TestBed } from '@angular/core/testing';
import { LegalHoldCaseTagComponent } from './legal-hold-case-tag.component';
import { GovernanceRecordService } from '../../services/governance-record.service';
import { of, throwError, Subject } from 'rxjs';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LegalHoldCase } from '../../../legal-hold-management/definitions/legal-hold.interface';
import { GovernanceRecord } from '../../../../shared/definitions/governance-shared.interface';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('LegalHoldCaseTagComponent', () => {
    let serviceMock: { getLinkedLegalHoldCases: jest.Mock };

    const makeFixture = () => {
        TestBed.configureTestingModule({
            imports: [LegalHoldCaseTagComponent, NoopTranslateModule, NoopAnimationsModule],
            providers: [{ provide: GovernanceRecordService, useValue: serviceMock }],
        });

        const fixture = TestBed.createComponent(LegalHoldCaseTagComponent);
        const component = fixture.componentInstance;
        const el: HTMLElement = fixture.nativeElement;
        return { fixture, component, el };
    };

    beforeEach(() => {
        serviceMock = {
            getLinkedLegalHoldCases: jest.fn(),
        };
    });

    it('should call service and render chips (happy path)', () => {
        const cases = [
            { legalCaseId: 'LC1', legalCaseName: 'Case Alpha' },
            { legalCaseId: 'LC2', legalCaseName: 'Case Beta' },
        ] as LegalHoldCase[];

        serviceMock.getLinkedLegalHoldCases.mockReturnValue(of(cases));

        const { fixture, component, el } = makeFixture();
        component.record = { contentID: 'CID#1', environmentDataSourceId: 'EDS#1' } as GovernanceRecord;

        fixture.detectChanges();

        expect(serviceMock.getLinkedLegalHoldCases).toHaveBeenCalledTimes(1);
        expect(serviceMock.getLinkedLegalHoldCases).toHaveBeenCalledWith('CID#1', 'EDS#1');

        const chips = el.querySelectorAll('.hxp-lhc-chip');
        expect(chips.length).toBe(2);
        expect(chips[0].textContent?.trim()).toBe('Case Alpha');
        expect(chips[1].textContent?.trim()).toBe('Case Beta');

        expect(component.loading).toBe(false);
        expect(el.querySelector('.hxp-lhc-skeleton')).toBeNull();
    });

    it('should NOT call service and stop loading when IDs are missing', () => {
        const { fixture, component, el } = makeFixture();

        component.record = { environmentDataSourceId: 'EDS#1' } as GovernanceRecord;

        fixture.detectChanges();

        expect(serviceMock.getLinkedLegalHoldCases).not.toHaveBeenCalled();
        expect(component.loading).toBe(false);
        expect(component.tags.length).toBe(0);
        expect(el.querySelector('.hxp-lhc-skeleton')).toBeNull();
        expect(el.querySelectorAll('.hxp-lhc-chip').length).toBe(0);
    });

    it('should handle service error and stop loading', () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        serviceMock.getLinkedLegalHoldCases.mockReturnValue(throwError(() => new Error('boom')));

        const { fixture, component, el } = makeFixture();
        component.record = { contentID: 'CID#2', environmentDataSourceId: 'EDS#2' } as GovernanceRecord;

        fixture.detectChanges();

        expect(serviceMock.getLinkedLegalHoldCases).toHaveBeenCalledWith('CID#2', 'EDS#2');
        expect(component.loading).toBe(false);
        expect(component.tags.length).toBe(0);
        expect(el.querySelector('.hxp-lhc-skeleton')).toBeNull();
        expect(el.querySelectorAll('.hxp-lhc-chip').length).toBe(0);
    });

    it('should render no chips when service returns an empty list', () => {
        serviceMock.getLinkedLegalHoldCases.mockReturnValue(of([]));

        const { fixture, component, el } = makeFixture();
        component.record = { contentID: 'CID#3', environmentDataSourceId: 'EDS#3' } as GovernanceRecord;

        fixture.detectChanges();

        expect(serviceMock.getLinkedLegalHoldCases).toHaveBeenCalledWith('CID#3', 'EDS#3');
        expect(component.loading).toBe(false);

        expect(el.querySelector('.hxp-lhc-tags')).toBeNull();
        expect(el.querySelectorAll('.hxp-lhc-chip').length).toBe(0);
    });

    it('should show skeleton while loading, then render chips after stream emits', () => {
        const subject = new Subject<LegalHoldCase[]>();
        serviceMock.getLinkedLegalHoldCases.mockReturnValue(subject.asObservable());

        const { fixture, component, el } = makeFixture();
        component.record = { contentID: 'CID#4', environmentDataSourceId: 'EDS#4' } as GovernanceRecord;

        fixture.detectChanges();
        expect(component.loading).toBe(true);
        expect(el.querySelector('.hxp-lhc-skeleton')).not.toBeNull();
        expect(el.querySelectorAll('.hxp-lhc-chip').length).toBe(0);

        subject.next([{ legalCaseId: 'LC9', legalCaseName: 'Late Case' }] as LegalHoldCase[]);
        subject.complete();
        fixture.detectChanges();

        expect(component.loading).toBe(false);
        expect(el.querySelector('.hxp-lhc-skeleton')).toBeNull();

        const chips = el.querySelectorAll('.hxp-lhc-chip');
        expect(chips.length).toBe(1);
        expect(chips[0].textContent?.trim()).toBe('Late Case');
    });

    it('should render the title', () => {
        serviceMock.getLinkedLegalHoldCases.mockReturnValue(of([]));
        const { fixture, component, el } = makeFixture();
        component.record = { contentID: 'CID#5', environmentDataSourceId: 'EDS#5' } as GovernanceRecord;

        fixture.detectChanges();

        expect(el.querySelector('.hxp-lhc-title')?.textContent?.trim()).toBe('GOVERNANCE.SIDEBAR.LINKED_CASE');
    });

    it('should render legal case payloads as plain text without executing alert', () => {
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
        const imagePayload = '"><img src=x onerror=alert(1)>';
        const scriptPayload = '<script>alert(1)</script>';

        try {
            serviceMock.getLinkedLegalHoldCases.mockReturnValue(
                of([
                    { legalCaseId: 'LCX-1', legalCaseName: imagePayload },
                    { legalCaseId: 'LCX-2', legalCaseName: scriptPayload },
                ] as LegalHoldCase[])
            );

            const { fixture, component, el } = makeFixture();
            component.record = { contentID: 'CID#6', environmentDataSourceId: 'EDS#6' } as GovernanceRecord;

            fixture.detectChanges();

            const chipsText = [...el.querySelectorAll('.hxp-lhc-chip')]
                .map((chip) => chip.textContent?.trim() || '')
                .join(' ');

            expect(chipsText).toContain(imagePayload);
            expect(chipsText).toContain(scriptPayload);
            expect(el.querySelector('img[src="x"]')).toBeNull();
            expect(el.querySelector('script')).toBeNull();
            expect(alertSpy).not.toHaveBeenCalled();
        } finally {
            alertSpy.mockRestore();
        }
    });

    it('should pass accessibility checks with tags rendered', async () => {
        const cases = [
            { legalCaseId: 'LC1', legalCaseName: 'Case Alpha' },
        ] as LegalHoldCase[];

        serviceMock.getLinkedLegalHoldCases.mockReturnValue(of(cases));

        const { fixture, el } = makeFixture();
        fixture.componentInstance.record = { contentID: 'CID#7', environmentDataSourceId: 'EDS#7' } as GovernanceRecord;
        fixture.detectChanges();

        const res = await a11yReport(el);
        expect(res?.violations).toEqual([]);
    });
});
