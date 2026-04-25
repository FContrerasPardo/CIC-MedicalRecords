/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AddLegalHoldButtonComponent } from './add-legal-hold-button.component';
import { ActionContext } from '../../../../shared/definitions/governance-shared.interface';
import { AddLegalHoldButtonService } from './add-legal-hold-button.service';
import { GovernanceLegalCaseService } from '../../../legal-hold-management/services/governance-legal-case.service';
import { of, Subject } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { a11yReport } from '@hxp/workspace-hxp/shared/testing';

describe('AddLegalHoldButtonComponent', () => {
    let fixture: ComponentFixture<AddLegalHoldButtonComponent>;
    let component: AddLegalHoldButtonComponent;

    const mockActionContext: ActionContext = {
        records: [{ id: '1' }],
    };

    const executeMock = jest.fn();
    const isAvailableMock = jest.fn(() => of(true));

    const mockAddLegalHoldButtonService = {
        execute: executeMock,
        isAvailable: isAvailableMock,
    };

    const shouldRefreshList$ = new Subject<boolean>();

    const mockGovernanceLegalCaseService = {
        shouldRefreshList$: shouldRefreshList$.asObservable(),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AddLegalHoldButtonComponent, NoopTranslateModule, NoopAnimationsModule, MatIconTestingModule],
            providers: [
                provideHttpClientTesting(),
                { provide: AddLegalHoldButtonService, useValue: mockAddLegalHoldButtonService },
                { provide: GovernanceLegalCaseService, useValue: mockGovernanceLegalCaseService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AddLegalHoldButtonComponent);
        component = fixture.componentInstance;
        component.actionContext = mockActionContext;
        fixture.detectChanges();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should call isAvailable$ on init with current records', (done) => {
        component.isAvailable$.subscribe((val) => {
            expect(val).toBe(true);
            expect(isAvailableMock).toHaveBeenCalledWith(mockActionContext.records);
            done();
        });
    });

    it('should reopen dialog with highlightFirstRow=true when shouldRefreshList$ emits true', fakeAsync(() => {
        shouldRefreshList$.next(true);
        tick();

        expect(executeMock).toHaveBeenCalledTimes(1);
        expect(executeMock).toHaveBeenCalledWith(mockActionContext, { highlightFirstRow: true });
    }));

    it('should open dialog with plain actionContext when openLegalHoldDialog() is called', () => {
        component.openLegalHoldDialog();

        expect(executeMock).toHaveBeenCalledTimes(1);
        expect(executeMock).toHaveBeenCalledWith(mockActionContext);
    });

    it('should not react to shouldRefreshList$ after destroy', fakeAsync(() => {
        executeMock.mockClear();

        fixture.destroy();
        shouldRefreshList$.next(true);
        tick();

        expect(executeMock).not.toHaveBeenCalled();
    }));

    it('should pass accessibility audit', async () => {
        const report = await a11yReport(fixture.nativeElement);
        expect(report?.violations).toEqual([]);
    });
});
