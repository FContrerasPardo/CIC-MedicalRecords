/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { ReasoningDialogComponent } from './reasoning.dialog';
import { ReasoningDialogData } from '../../models/contracts/class-verification-models';

function createFixture(dialogData: ReasoningDialogData): ComponentFixture<ReasoningDialogComponent> {
    TestBed.configureTestingModule({
        imports: [NoopTranslateModule, MatButtonModule, MatDialogModule, MatIconTestingModule],
        providers: [{ provide: MAT_DIALOG_DATA, useValue: dialogData }],
    });
    const fixture = TestBed.createComponent(ReasoningDialogComponent);
    fixture.detectChanges();
    return fixture;
}

function query(fixture: ComponentFixture<ReasoningDialogComponent>, automationId: string): HTMLElement | null {
    return fixture.debugElement.nativeElement.querySelector(`[data-automation-id="${automationId}"]`);
}

const defaultData: ReasoningDialogData = {
    documentName: 'Test Document',
    candidates: [
        { name: 'Invoice', confidence: '95%', reason: 'Looks like an invoice', isSelected: true },
        { name: 'Contract', confidence: '80%', reason: 'Has contract elements', isSelected: false },
    ],
    selectionReason: 'AUTOWIN',
};

describe('ReasoningDialogComponent', () => {
    it('should render dialog title', () => {
        const fixture = createFixture(defaultData);
        const title = query(fixture, 'idp-reasoning-dialog__title');
        expect(title).toBeTruthy();
    });

    it('should render document name as subtitle', () => {
        const fixture = createFixture(defaultData);
        const subtitle = query(fixture, 'idp-reasoning-dialog__document-name');
        expect(subtitle).toBeTruthy();
        expect(subtitle?.textContent).toContain('Test Document');
    });

    it('should render a card for each candidate', () => {
        const fixture = createFixture(defaultData);
        expect(query(fixture, 'idp-reasoning-dialog__candidate-0')).toBeTruthy();
        expect(query(fixture, 'idp-reasoning-dialog__candidate-1')).toBeTruthy();
    });

    it('should render candidate name, confidence, and reason', () => {
        const fixture = createFixture(defaultData);
        expect(query(fixture, 'idp-reasoning-dialog__candidate-name-0')?.textContent).toContain('Invoice');
        expect(query(fixture, 'idp-reasoning-dialog__candidate-confidence-0')?.textContent).toContain('95%');
        expect(query(fixture, 'idp-reasoning-dialog__candidate-reason-0')?.textContent).toContain('Looks like an invoice');
    });

    it('should highlight selected candidate with --selected modifier', () => {
        const fixture = createFixture(defaultData);
        const card0 = query(fixture, 'idp-reasoning-dialog__candidate-0');
        expect(card0?.classList.contains('idp-reasoning-dialog__candidate-card--selected')).toBeTrue();

        const card1 = query(fixture, 'idp-reasoning-dialog__candidate-1');
        expect(card1?.classList.contains('idp-reasoning-dialog__candidate-card--selected')).toBeFalse();
    });

    it('should show winner badge on selected candidate only', () => {
        const fixture = createFixture(defaultData);
        const card0 = query(fixture, 'idp-reasoning-dialog__candidate-0');
        expect(card0?.querySelector('[data-automation-id="idp-reasoning-dialog__winner-badge"]')).toBeTruthy();

        const card1 = query(fixture, 'idp-reasoning-dialog__candidate-1');
        expect(card1?.querySelector('[data-automation-id="idp-reasoning-dialog__winner-badge"]')).toBeFalsy();
    });

    it('should render document-level selection reason banner', () => {
        const fixture = createFixture(defaultData);
        const banner = query(fixture, 'idp-reasoning-dialog__selection-reason');
        expect(banner).toBeTruthy();
        expect(banner?.textContent).toContain('IDP_CLASS_VERIFICATION.REASONING_DIALOG.SELECTION_REASONS.AUTOWIN');
    });

    it('should show selection reason banner even when candidates are empty', () => {
        const data: ReasoningDialogData = { ...defaultData, candidates: [], selectionReason: 'DEFAULT_CLASS_ID' };
        const fixture = createFixture(data);
        const banner = query(fixture, 'idp-reasoning-dialog__selection-reason');
        expect(banner).toBeTruthy();
        expect(banner?.textContent).toContain('IDP_CLASS_VERIFICATION.REASONING_DIALOG.SELECTION_REASONS.DEFAULT_CLASS_ID');
    });

    it('should show no candidates message when candidates array is empty', () => {
        const data: ReasoningDialogData = { ...defaultData, candidates: [] };
        const fixture = createFixture(data);
        expect(query(fixture, 'idp-reasoning-dialog__no-candidates')).toBeTruthy();
    });

    it('should render NO_CLASSIFICATION_LABEL when candidate name is null', () => {
        const data: ReasoningDialogData = {
            ...defaultData,
            candidates: [{ name: null, confidence: '90%', reason: 'test', isSelected: false }],
        };
        const fixture = createFixture(data);
        expect(query(fixture, 'idp-reasoning-dialog__candidate-name-0')?.textContent).toContain(
            'IDP_CLASS_VERIFICATION.REASONING_DIALOG.NO_CLASSIFICATION_LABEL'
        );
    });

    it('should hide reason block when candidate reason is null', () => {
        const data: ReasoningDialogData = {
            ...defaultData,
            candidates: [{ name: 'Invoice', confidence: '95%', reason: null, isSelected: true }],
        };
        const fixture = createFixture(data);
        expect(query(fixture, 'idp-reasoning-dialog__candidate-reason-0')).toBeFalsy();
    });

    it('should hide reason block when candidate reason is empty string', () => {
        const data: ReasoningDialogData = {
            ...defaultData,
            candidates: [{ name: 'Invoice', confidence: '95%', reason: '', isSelected: true }],
        };
        const fixture = createFixture(data);
        expect(query(fixture, 'idp-reasoning-dialog__candidate-reason-0')).toBeFalsy();
    });

    it('should have close icon button', () => {
        const fixture = createFixture(defaultData);
        expect(query(fixture, 'idp-reasoning-dialog__close-button')).toBeTruthy();
    });

    it('should have help icon button', () => {
        const fixture = createFixture(defaultData);
        expect(query(fixture, 'idp-reasoning-dialog__help-button')).toBeTruthy();
    });

    it('should toggle help tooltip', () => {
        const fixture = createFixture(defaultData);
        const tooltip = jasmine.createSpyObj<MatTooltip>('MatTooltip', ['toggle']);

        fixture.componentInstance.toggleHelpTooltip(tooltip);

        expect(tooltip.toggle).toHaveBeenCalled();
    });

    it('should have data-automation-id on key elements', () => {
        const fixture = createFixture(defaultData);
        expect(query(fixture, 'idp-reasoning-dialog')).toBeTruthy();
        expect(query(fixture, 'idp-reasoning-dialog__title')).toBeTruthy();
        expect(query(fixture, 'idp-reasoning-dialog__document-name')).toBeTruthy();
        expect(query(fixture, 'idp-reasoning-dialog__selection-reason')).toBeTruthy();
        expect(query(fixture, 'idp-reasoning-dialog__help-button')).toBeTruthy();
        expect(query(fixture, 'idp-reasoning-dialog__close-button')).toBeTruthy();
        expect(query(fixture, 'idp-reasoning-dialog__candidate-0')).toBeTruthy();
    });
});
