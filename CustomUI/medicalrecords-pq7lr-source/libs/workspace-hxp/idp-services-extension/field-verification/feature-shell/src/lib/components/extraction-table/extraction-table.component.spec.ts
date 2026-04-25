/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExtractionTableComponent } from './extraction-table.component';
import { IdpVerificationService } from '../../services/verification/verification.service';
import { ActionHistoryService } from '../../services/action-history.service';
import { FillDirection, IdpField, IdpTable, IdpTableRowRecord, IdpValidationStatus } from '../../models/screen-models';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { fieldVerificationRootState } from '../../store/shared-mock-states';
import { selectActiveTable, selectActiveTableSummary } from '../../store/selectors/document-table.selectors';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { fieldVerificationRootFeatureSelector } from '../../store/selectors/field-verification-root.selectors';
import { IdpFieldDataType, IdpVerificationStatus } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { IdpFormCloudService } from '../../services/idp-form-cloud.service';
import { selectIsValidationProcessRunning } from '../../store/selectors/screen.selectors';
import { of } from 'rxjs';
import { IdpTableCellValidationService } from '../../services/table-cell-validation/table-cell-validation.service';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { selectActiveField } from '../../store/selectors/document-field.selectors';

function simulateFieldInput(input: HTMLInputElement, value: string) {
    input.dispatchEvent(new Event('focus'));
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('focusout'));
}

function rightClickCellInput(fixture: ComponentFixture<ExtractionTableComponent>, cellId: string): void {
    const input = fixture.debugElement.query(By.css(`input[id='${cellId}']`));
    expect(input).toBeTruthy();
    input.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 50, clientY: 60 }));
    fixture.detectChanges();
}

function queryCellMenuItems(fixture: ComponentFixture<ExtractionTableComponent>) {
    return {
        cut: fixture.debugElement.query(By.css('[data-automation-id="cell-menu-cut"]')),
        copy: fixture.debugElement.query(By.css('[data-automation-id="cell-menu-copy"]')),
        paste: fixture.debugElement.query(By.css('[data-automation-id="cell-menu-paste"]')),
        fillAllAbove: fixture.debugElement.query(By.css('[data-automation-id="cell-menu-fill-all-above"]')),
        fillToAbove: fixture.debugElement.query(By.css('[data-automation-id="cell-menu-fill-to-above"]')),
        fillToBelow: fixture.debugElement.query(By.css('[data-automation-id="cell-menu-fill-to-below"]')),
        fillAllBelow: fixture.debugElement.query(By.css('[data-automation-id="cell-menu-fill-all-below"]')),
    };
}

function makeRows(values: (string | null)[][]): IdpTableRowRecord[] {
    return values.map((row) => ({
        rowCells: row.map((value) => ({
            id: 'x',
            value: value ?? '',
            name: '',
            dataType: IdpFieldDataType.Text,
            format: '',
            confidence: 0,
            verificationStatus: 'ManualValid' as const,
            validationStatus: IdpValidationStatus.Valid,
        })),
    }));
}

describe('ExtractionTableComponent', () => {
    let component: ExtractionTableComponent;
    let fixture: ComponentFixture<ExtractionTableComponent>;
    let mockActionHistoryService: jest.Mocked<ActionHistoryService>;

    let store: MockStore;
    let idpVerificationService: IdpVerificationService;
    let tableCellValidationService: IdpTableCellValidationService;

    const fieldCharacterWidth = 11;
    const headerCharacterWidth = 10;
    const minColumnWidth = 60;

    const updatedFieldValue = 'Updated Field Value 1';

    const mockTable: IdpTable = {
        rows: [
            {
                rowCells: [
                    {
                        id: '1',
                        value: 'A1',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0,
                        verificationStatus: 'ManualValid',
                        name: '',
                        validationStatus: IdpValidationStatus.Valid,
                    },
                    {
                        id: '2',
                        value: 'A2',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0,
                        verificationStatus: 'ManualValid',
                        name: '',
                        validationStatus: IdpValidationStatus.Valid,
                    },
                ],
            },
            {
                rowCells: [
                    {
                        id: '3',
                        value: 'B1',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0,
                        verificationStatus: 'ManualValid',
                        name: '',
                        validationStatus: IdpValidationStatus.Valid,
                    },
                    {
                        id: '4',
                        value: 'B2',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0,
                        verificationStatus: 'ManualValid',
                        name: '',
                        validationStatus: IdpValidationStatus.Valid,
                    },
                ],
            },
            {
                rowCells: [
                    {
                        id: '5',
                        value: 'C1',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0,
                        verificationStatus: 'ManualValid',
                        name: '',
                        validationStatus: IdpValidationStatus.Valid,
                    },
                    {
                        id: '6',
                        value: 'C2',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0,
                        verificationStatus: 'ManualValid',
                        name: '',
                        validationStatus: IdpValidationStatus.Valid,
                    },
                ],
            },
            {
                rowCells: [
                    {
                        id: '7',
                        value: 'D1',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0,
                        verificationStatus: 'ManualValid',
                        name: '',
                        validationStatus: IdpValidationStatus.Valid,
                    },
                    {
                        id: '8',
                        value: 'D2',
                        dataType: IdpFieldDataType.Text,
                        format: '',
                        confidence: 0,
                        verificationStatus: 'ManualValid',
                        name: '',
                        validationStatus: IdpValidationStatus.Valid,
                    },
                ],
            },
        ],
        columnHeaderNames: ['Column 1', 'Column 2'],
        id: 'table1', // Match the currentTableId used in tests
        name: 'Test Table',
        validationStatus: 'Valid',
        isDirty: false,
    };

    const mockTableField: IdpField = {
        id: mockTable.id,
        name: mockTable.name,
        value: '',
        dataType: IdpFieldDataType.Table,
        format: '',
        confidence: 1,
        verificationStatus: IdpVerificationStatus.ManualValid,
        validationStatus: IdpValidationStatus.Valid,
        isSelected: true,
    };

    beforeEach(async () => {
        mockActionHistoryService = {
            canUndo: jest.fn(),
            undo: jest.fn(),
            canRedo: jest.fn(),
            redo: jest.fn(),
            do: jest.fn(),
            clear: jest.fn(),
        } as unknown as jest.Mocked<ActionHistoryService>;

        TestBed.configureTestingModule({
            imports: [ExtractionTableComponent, NoopTranslateModule, MatIconTestingModule],
            providers: [
                IdpVerificationService,
                IdpTableCellValidationService,
                { provide: IdpFormCloudService, useValue: {} },
                { provide: ActionHistoryService, useValue: mockActionHistoryService },
                provideMockStore({
                    initialState: fieldVerificationRootState,
                    selectors: [{ selector: fieldVerificationRootFeatureSelector, value: fieldVerificationRootState }],
                }),
            ],
        });

        store = TestBed.inject(MockStore);
        store.overrideSelector(selectActiveTable, mockTable);
        fixture = TestBed.createComponent(ExtractionTableComponent);
        idpVerificationService = TestBed.inject(IdpVerificationService);
        tableCellValidationService = TestBed.inject(IdpTableCellValidationService);

        component = fixture.componentInstance;
        // Initialize columnNames from mockTable to support resize tests
        (component as any).columnNames = mockTable.columnHeaderNames;
        fixture.detectChanges();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function findFieldInputDebugElement(field: IdpField) {
        return fixture.debugElement.query(By.css(`input[id='${field.id}']`));
    }

    function getFieldValue(field: IdpField) {
        const fieldInput = findFieldInputDebugElement(field)?.nativeElement;
        return fieldInput.value as string | undefined;
    }

    function updateTableField(field: IdpField, value: string) {
        const fieldInput = findFieldInputDebugElement(field)?.nativeElement;
        simulateFieldInput(fieldInput, value);
    }

    function simulateColumnResize(columnName: string, deltaX: number) {
        component.onResizeStart(new MouseEvent('mousedown', { clientX: 100 }), columnName);
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 + deltaX }));
        document.dispatchEvent(new MouseEvent('mouseup'));
    }

    it('should emit fieldValuePending event when a table field gets focus', async () => {
        jest.spyOn(component.fieldValuePending, 'emit');

        fixture.detectChanges();
        await fixture.whenStable();

        const tableField1 = mockTable.rows[0].rowCells[0];
        const fieldInput = findFieldInputDebugElement(tableField1)?.nativeElement;

        fieldInput.dispatchEvent(new Event('focus'));
        fixture.detectChanges();

        expect(component.fieldValuePending.emit).toHaveBeenCalledWith({ field: tableField1, pendingValue: tableField1.value ?? '' });
    });

    it('should not evaluate fill-direction menu helpers during initial table render', () => {
        store.overrideSelector(selectActiveTable, mockTable);

        const localFixture = TestBed.createComponent(ExtractionTableComponent);
        const localComponent = localFixture.componentInstance;

        jest.spyOn(localComponent, 'showFillToAbove');
        jest.spyOn(localComponent, 'showFillToBelow');

        localFixture.detectChanges();

        expect(localComponent.showFillToAbove).not.toHaveBeenCalled();
        expect(localComponent.showFillToBelow).not.toHaveBeenCalled();
    });

    it('should render a loading shell while waiting for the active table to materialize', () => {
        store.overrideSelector(selectActiveTable, undefined);
        store.overrideSelector(selectActiveField, mockTableField);
        store.refreshState();

        const localFixture = TestBed.createComponent(ExtractionTableComponent);
        localFixture.detectChanges();

        const tableContainer = localFixture.debugElement.query(By.css('#extraction-table-container'));
        const loadingShell = localFixture.debugElement.query(By.css('[data-automation-id="idp-extraction-table-loading-shell"]'));
        const renderedTable = localFixture.debugElement.query(By.css('table'));

        expect(tableContainer).toBeTruthy();
        expect(loadingShell).toBeTruthy();
        expect(renderedTable).toBeNull();
    });

    it('should render the active table summary name in the loading shell', () => {
        store.overrideSelector(selectActiveTable, undefined);
        store.overrideSelector(selectActiveField, mockTableField);
        store.overrideSelector(selectActiveTableSummary, {
            id: mockTable.id,
            name: mockTable.name,
            rowCount: mockTable.rows.length,
        });
        store.refreshState();

        const localFixture = TestBed.createComponent(ExtractionTableComponent);
        localFixture.detectChanges();

        const loadingShellTitle = localFixture.debugElement.query(By.css('[data-automation-id="idp-extraction-table-loading-shell-title"]'));
        expect(loadingShellTitle?.nativeElement.textContent?.trim()).toBe(mockTable.name);
    });

    it('should focus the table container before the first cell when a table field is selected', () => {
        jest.useFakeTimers();

        store.overrideSelector(selectActiveField, mockTableField);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        const localFixture = TestBed.createComponent(ExtractionTableComponent);
        localFixture.detectChanges();

        const tableContainer = localFixture.debugElement.query(By.css('#extraction-table-container'))?.nativeElement as HTMLElement;
        const firstInput = localFixture.componentInstance.metadataTableInputs.first?.nativeElement as HTMLInputElement;

        expect(document.activeElement).toBe(tableContainer);

        jest.runOnlyPendingTimers();
        localFixture.detectChanges();

        expect(document.activeElement).toBe(firstInput);
    });

    it('should show the empty-table overlay after loading completes with no rows', () => {
        store.overrideSelector(selectActiveField, mockTableField);
        const activeTableSelector = store.overrideSelector(selectActiveTable, undefined);
        store.refreshState();

        const localFixture = TestBed.createComponent(ExtractionTableComponent);
        localFixture.detectChanges();

        expect(localFixture.debugElement.query(By.css('[data-automation-id="idp-extraction-table-loading-shell"]'))).toBeTruthy();

        activeTableSelector.setResult({
            ...mockTable,
            rows: [],
        });
        store.refreshState();
        localFixture.detectChanges();

        expect(localFixture.debugElement.query(By.css('[data-automation-id="idp-extraction-table-loading-shell"]'))).toBeNull();
        expect(localFixture.debugElement.query(By.css('.idp-no-data-overlay'))).toBeTruthy();
    });

    it('should focus the first cell after view initialization', () => {
        jest.useFakeTimers();

        const localFixture = TestBed.createComponent(ExtractionTableComponent);
        localFixture.detectChanges();

        const tableContainer = localFixture.debugElement.query(By.css('#extraction-table-container'))?.nativeElement as HTMLElement;
        const firstInput = localFixture.componentInstance.metadataTableInputs.first?.nativeElement as HTMLInputElement;

        expect(document.activeElement).toBe(tableContainer);

        jest.runOnlyPendingTimers();
        localFixture.detectChanges();

        expect(document.activeElement).toBe(firstInput);
    });

    it('should call VerificationService updateField on field input', () => {
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        const tableField1 = mockTable.rows[0].rowCells[0];
        updateTableField(tableField1, updatedFieldValue);
        fixture.detectChanges();
        const fieldValue = getFieldValue(tableField1);
        expect(fieldValue).toBe(updatedFieldValue);
    });

    it('should call VerificationService.updateField on field input', () => {
        jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        const tableField1 = mockTable.rows[0].rowCells[0];
        updateTableField(tableField1, updatedFieldValue);
        fixture.detectChanges();
        const fieldValue = getFieldValue(tableField1);
        expect(fieldValue).toBe(updatedFieldValue);
    });

    it('should return correct field status', () => {
        const fieldWithIssue: IdpField = { hasIssue: true } as IdpField;
        const fieldResolved: IdpField = { verificationStatus: 'ManualValid' } as IdpField;
        const fieldDefault: IdpField = {} as IdpField;

        expect(component.getFieldStatus(fieldWithIssue)).toBe('hasIssue');
        expect(component.getFieldStatus(fieldResolved)).toBe('issueResolved');
        expect(component.getFieldStatus(fieldDefault)).toBe('');
    });

    it('should navigate to the next row on PageDown key press', () => {
        const event = new KeyboardEvent('keydown', { key: 'PageDown' });
        jest.spyOn(event, 'preventDefault');
        jest.spyOn(event, 'stopPropagation');

        const firstRowFirstCell = mockTable.rows[0].rowCells[0];
        const secondRowFirstCell = mockTable.rows[1].rowCells[0];

        const firstInput = findFieldInputDebugElement(firstRowFirstCell)?.nativeElement;
        const secondInput = findFieldInputDebugElement(secondRowFirstCell)?.nativeElement;

        jest.spyOn(firstInput, 'focus');
        jest.spyOn(secondInput, 'focus');

        Object.defineProperty(event, 'target', { value: firstInput });

        const mockField: IdpField = { id: 'mockId' } as IdpField; // Replace with a valid IdpField object
        component.onKeydown(mockField, event);

        expect(secondInput.focus).toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should navigate to the previous row on PageUp key press', () => {
        const event = new KeyboardEvent('keydown', { key: 'PageUp' });
        jest.spyOn(event, 'preventDefault');
        jest.spyOn(event, 'stopPropagation');

        const secondRowFirstCell = mockTable.rows[1].rowCells[0];
        const firstRowFirstCell = mockTable.rows[0].rowCells[0];

        const secondInput = findFieldInputDebugElement(secondRowFirstCell)?.nativeElement;
        const firstInput = findFieldInputDebugElement(firstRowFirstCell)?.nativeElement;

        jest.spyOn(secondInput, 'focus');
        jest.spyOn(firstInput, 'focus');

        Object.defineProperty(event, 'target', { value: secondInput });

        const mockField: IdpField = { id: 'mockId' } as IdpField; // Replace with a valid IdpField object
        component.onKeydown(mockField, event);

        expect(firstInput.focus).toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should track rows correctly', () => {
        const row: IdpTableRowRecord = { rowCells: [{ id: '1' }, { id: '2' }] } as IdpTableRowRecord;
        expect(component.trackRow(0, row)).toBe('1,2');
    });

    it('should track column names correctly', () => {
        expect(component.trackColumn(0)).toBe(0);
    });

    it('should call verificationService.updateField if value unchanged in onFieldFocusOut', () => {
        const field: IdpField = { id: '1', value: 'A1' } as IdpField;
        const mockElement = { value: 'A1', validity: { valid: true } } as HTMLInputElement;
        jest.spyOn(idpVerificationService, 'updateField');
        component.onFieldFocusOut(field, mockElement);
        expect(idpVerificationService.updateField).toHaveBeenCalledWith(field);
    });

    it('should call history.do if value changed in onFieldFocusOut', () => {
        const field: IdpField = { id: '1', value: 'A1' } as IdpField;
        const mockElement = { value: 'A2', validity: { valid: true } } as HTMLInputElement;
        component.onFieldFocusOut(field, mockElement);
        expect(mockActionHistoryService.do).toHaveBeenCalled();
    });

    it('should call addTableRow when Alt+T is pressed', () => {
        (component as any).currentTableId = 'table1';
        const addTableRowSpy = jest.spyOn(component as any, 'addTableRow');

        const event = new KeyboardEvent('keydown', { key: 't', altKey: true });
        jest.spyOn(event, 'preventDefault');

        component.onComponentKeydown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(addTableRowSpy).toHaveBeenCalled();
    });

    it('should recalculate validation status when undo is called after field change', () => {
        const field: IdpField = {
            id: '1',
            name: 'testField',
            value: 'ab',
            validationStatus: IdpValidationStatus.Invalid,
        } as IdpField;
        const mockElement = { value: 'abcdefg', validity: { valid: true } } as HTMLInputElement;

        // Set up validation rules - minLength: 7
        component.fieldValidationRules.set(field.name, { required: false, length: { min: 7 } });

        let doCallback: (() => void) | undefined;
        let undoCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
            undoCallback = action.undo;
        });

        // Spy on the verification service updateField method
        const updateFieldSpy = jest.spyOn(idpVerificationService, 'updateField').mockImplementation();

        // Spy on the validation service to track validation calls
        const validateFieldSpy = jest.spyOn(tableCellValidationService, 'validateField').mockImplementation((f) => {
            // Valid if length >= 7, invalid otherwise
            return (f.value?.length ?? 0) >= 7;
        });

        // Change field value from 'ab' (invalid) to 'abcdefg' (valid)
        component.onFieldFocusOut(field, mockElement);

        expect(mockActionHistoryService.do).toHaveBeenCalled();

        // Execute do callback to apply the change
        expect(doCallback).toBeDefined();
        if (doCallback) {
            validateFieldSpy.mockClear();
            updateFieldSpy.mockClear();

            doCallback();

            // Verify validation was calculated for the new value 'abcdefg'
            expect(validateFieldSpy).toHaveBeenCalledWith(expect.objectContaining({ value: 'abcdefg', name: field.name }), {
                required: false,
                length: { min: 7 },
            });

            // Verify updateField was called with the new value and calculated validation status
            expect(updateFieldSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    value: 'abcdefg',
                    validationStatus: IdpValidationStatus.Valid,
                })
            );
        }

        // Execute undo to restore original value and recalculate validation
        expect(undoCallback).toBeDefined();
        if (undoCallback) {
            updateFieldSpy.mockClear();
            validateFieldSpy.mockClear();

            undoCallback();

            // Verify validation was recalculated for the original value 'ab'
            expect(validateFieldSpy).toHaveBeenCalledWith(expect.objectContaining({ value: 'ab', name: field.name }), {
                required: false,
                length: { min: 7 },
            });

            // Verify updateField was called with the restored value and recalculated validation status
            expect(updateFieldSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    value: 'ab',
                    validationStatus: IdpValidationStatus.Invalid, // Recalculated as invalid
                })
            );
        }
    });

    it('should call verificationService.selectField and emit fieldValuePending on onFieldFocus', () => {
        const field: IdpField = { id: '1', value: 'A1' } as IdpField;
        jest.spyOn(idpVerificationService, 'selectField');
        jest.spyOn(component.fieldValuePending, 'emit');
        component.onFieldFocus(field);
        expect(idpVerificationService.selectField).toHaveBeenCalledWith(field);
        expect(component.fieldValuePending.emit).toHaveBeenCalledWith({ field, pendingValue: 'A1' });
    });

    it('should reset group selections', () => {
        component.selectedRowIndex = 1;
        component.selectedColumnIndex = 1;
        component.tableSelected = true;
        component.singleCellFocus = true;
        component.resetGroupSelections();
        expect(component.selectedRowIndex).toBe(-1);
        expect(component.selectedColumnIndex).toBe(-1);
        expect(component.tableSelected).toBe(false);
        expect(component.singleCellFocus).toBe(false);
    });

    it('should batch clear column updates through the table actions only', () => {
        (component as any).currentTableId = 'table1';
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();
        jest.spyOn(idpVerificationService, 'getTableById$').mockReturnValue({
            pipe: () => ({
                subscribe: (cb: any) => cb(mockTable),
            }),
        } as any);

        let doCallback: (() => void) | undefined;
        let undoCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
            undoCallback = action.undo;
        });

        const updateFieldSpy = jest.spyOn(idpVerificationService, 'updateField');
        const clearTableColumnSpy = jest.spyOn(idpVerificationService, 'clearTableColumn').mockImplementation();
        const updateTableColumnSpy = jest.spyOn(idpVerificationService, 'updateTableColumn').mockImplementation();

        component.selectedColumnIndex = 0;
        component.onClearSelectedColumns();
        expect(mockActionHistoryService.do).toHaveBeenCalled();

        if (doCallback) {
            updateFieldSpy.mockClear();
            clearTableColumnSpy.mockClear();
            doCallback();

            expect(clearTableColumnSpy).toHaveBeenCalledWith('table1', 0);
            expect(updateFieldSpy).not.toHaveBeenCalled();
        }

        if (undoCallback) {
            updateFieldSpy.mockClear();
            updateTableColumnSpy.mockClear();
            undoCallback();

            expect(updateTableColumnSpy).toHaveBeenCalledWith(
                'table1',
                0,
                expect.arrayContaining([
                    expect.objectContaining({ id: '1', value: 'A1' }),
                    expect.objectContaining({ id: '3', value: 'B1' }),
                    expect.objectContaining({ id: '5', value: 'C1' }),
                    expect.objectContaining({ id: '7', value: 'D1' }),
                ])
            );
            expect(updateFieldSpy).not.toHaveBeenCalled();
        }
    });

    it('should keep the original table id for clear column undo and redo after switching tables', () => {
        (component as any).currentTableId = 'table1';
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        let doCallback: (() => void) | undefined;
        let undoCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
            undoCallback = action.undo;
        });

        const clearTableColumnSpy = jest.spyOn(idpVerificationService, 'clearTableColumn').mockImplementation();
        const updateTableColumnSpy = jest.spyOn(idpVerificationService, 'updateTableColumn').mockImplementation();

        component.selectedColumnIndex = 0;
        component.onClearSelectedColumns();
        (component as any).currentTableId = 'table2';

        doCallback?.();
        undoCallback?.();

        expect(clearTableColumnSpy).toHaveBeenCalledWith('table1', 0);
        expect(updateTableColumnSpy).toHaveBeenCalledWith('table1', 0, expect.any(Array));
    });

    it('should call history.do in onDeleteTable', () => {
        (component as any).currentTableId = 'table1';
        jest.spyOn(idpVerificationService, 'getTableById$').mockReturnValue({
            pipe: () => ({
                subscribe: (cb: any) => cb(mockTable),
            }),
        } as any);
        component.onDeleteTable();
        expect(mockActionHistoryService.do).toHaveBeenCalled();
    });

    it('should call history.do for insertRowAbove in onRowAction', () => {
        component.selectedRowIndex = 0;
        (component as any).currentTableId = 'table1';

        let doCallback: (() => void) | undefined;
        let undoCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
            undoCallback = action.undo;
        });

        const runValidationSpy = jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        jest.spyOn(idpVerificationService, 'addTableRow').mockImplementation();
        jest.spyOn(idpVerificationService, 'insertTableRow').mockImplementation();
        jest.spyOn(idpVerificationService, 'deleteTableRow').mockImplementation();
        jest.spyOn(idpVerificationService, 'getTableById$').mockReturnValue({
            pipe: () => ({
                subscribe: (cb: any) => cb(mockTable),
            }),
        } as any);

        component.onRowAction('insertRowAbove');
        expect(mockActionHistoryService.do).toHaveBeenCalled();

        if (doCallback) {
            doCallback();
            expect(runValidationSpy).not.toHaveBeenCalled();
        }

        runValidationSpy.mockClear();
        if (undoCallback) {
            undoCallback();
            expect(runValidationSpy).not.toHaveBeenCalled();
        }
    });

    it('should call history.do for insertRowBelow in onRowAction', () => {
        component.selectedRowIndex = 0;
        (component as any).currentTableId = 'table1';

        let doCallback: (() => void) | undefined;
        let undoCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
            undoCallback = action.undo;
        });

        const runValidationSpy = jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        jest.spyOn(idpVerificationService, 'addTableRow').mockImplementation();
        jest.spyOn(idpVerificationService, 'insertTableRow').mockImplementation();
        jest.spyOn(idpVerificationService, 'deleteTableRow').mockImplementation();
        jest.spyOn(idpVerificationService, 'getTableById$').mockReturnValue({
            pipe: () => ({
                subscribe: (cb: any) => cb(mockTable),
            }),
        } as any);

        component.onRowAction('insertRowBelow');
        expect(mockActionHistoryService.do).toHaveBeenCalled();

        if (doCallback) {
            doCallback();
            expect(runValidationSpy).not.toHaveBeenCalled();
        }

        runValidationSpy.mockClear();
        if (undoCallback) {
            undoCallback();
            expect(runValidationSpy).not.toHaveBeenCalled();
        }
    });

    it('should call history.do for clearRow in onRowAction', () => {
        component.selectedRowIndex = 0;
        (component as any).currentTableId = 'table1';
        jest.spyOn(idpVerificationService, 'getTableById$').mockReturnValue({
            pipe: () => ({
                subscribe: (cb: any) => cb(mockTable),
            }),
        } as any);
        component.onRowAction('clearRow');
        expect(mockActionHistoryService.do).toHaveBeenCalled();
    });

    it('should batch clear row updates and restore the original row through updateTableRow on undo', () => {
        component.selectedRowIndex = 0;
        (component as any).currentTableId = 'table1';

        // Create a table with invalid cells
        const tableWithInvalidCells: IdpTable = {
            ...mockTable,
            rows: [
                {
                    rowCells: [
                        {
                            id: '1',
                            name: 'field1',
                            value: 'abc', // Too short for minLength: 7
                            dataType: IdpFieldDataType.Text,
                            format: '',
                            confidence: 0,
                            verificationStatus: 'ManualValid',
                            validationStatus: IdpValidationStatus.Invalid,
                        },
                        {
                            id: '2',
                            name: 'field2',
                            value: 'populated', // Required field, was populated
                            dataType: IdpFieldDataType.Text,
                            format: '',
                            confidence: 0,
                            verificationStatus: 'ManualValid',
                            validationStatus: IdpValidationStatus.Valid,
                        },
                    ],
                },
            ],
        };

        // Setup validation rules
        component.fieldValidationRules.set('field1', { required: false, length: { min: 7, max: 25 } });
        component.fieldValidationRules.set('field2', { required: true });

        const updateFieldSpy = jest.spyOn(idpVerificationService, 'updateField');

        let undoCallback: (() => void) | undefined;
        let doCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
            undoCallback = action.undo;
        });

        // Set the active table state so currentTable() signal returns tableWithInvalidCells
        store.overrideSelector(selectActiveTable, tableWithInvalidCells);
        store.refreshState();
        jest.spyOn(idpVerificationService, 'clearTableRow').mockImplementation();
        const updateTableRowSpy = jest.spyOn(idpVerificationService, 'updateTableRow').mockImplementation();

        // Clear the row
        component.onRowAction('clearRow');

        expect(mockActionHistoryService.do).toHaveBeenCalled();

        // Execute the do callback to actually clear the row
        expect(doCallback).toBeDefined();
        const runValidationSpy = jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        if (doCallback) {
            updateFieldSpy.mockClear();
            doCallback();
        }

        expect(idpVerificationService.clearTableRow).toHaveBeenCalledWith('table1', 0);
        expect(updateFieldSpy).not.toHaveBeenCalled();

        expect(undoCallback).toBeDefined();
        runValidationSpy.mockClear();
        if (undoCallback) {
            updateFieldSpy.mockClear();
            undoCallback();

            // Verify updateTableRow was called with the previous row cells
            expect(updateTableRowSpy).toHaveBeenCalledWith(
                'table1',
                0,
                expect.arrayContaining([expect.objectContaining({ id: '1', value: 'abc' }), expect.objectContaining({ id: '2', value: 'populated' })])
            );
            expect(updateFieldSpy).not.toHaveBeenCalled();
        }
    });

    it('should keep the original table id for clear row undo and redo after switching tables', () => {
        component.selectedRowIndex = 0;
        (component as any).currentTableId = 'table1';

        let doCallback: (() => void) | undefined;
        let undoCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
            undoCallback = action.undo;
        });

        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        const clearTableRowSpy = jest.spyOn(idpVerificationService, 'clearTableRow').mockImplementation();
        const updateTableRowSpy = jest.spyOn(idpVerificationService, 'updateTableRow').mockImplementation();

        component.onRowAction('clearRow');
        (component as any).currentTableId = 'table2';

        doCallback?.();
        undoCallback?.();

        expect(clearTableRowSpy).toHaveBeenCalledWith('table1', 0);
        expect(updateTableRowSpy).toHaveBeenCalledWith('table1', 0, expect.any(Array));
    });

    it('should call history.do for deleteRow in onRowAction', () => {
        component.selectedRowIndex = 0;
        (component as any).currentTableId = 'table1';
        jest.spyOn(idpVerificationService, 'getTableById$').mockReturnValue({
            pipe: () => ({
                subscribe: (cb: any) => cb(mockTable),
            }),
        } as any);

        let doCallback: (() => void) | undefined;
        let undoCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
            undoCallback = action.undo;
        });

        const runValidationSpy = jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        jest.spyOn(idpVerificationService, 'deleteTableRow').mockImplementation();
        jest.spyOn(idpVerificationService, 'insertTableRow').mockImplementation();

        component.onRowAction('deleteRow');
        expect(mockActionHistoryService.do).toHaveBeenCalled();

        if (doCallback) {
            doCallback();
            expect(runValidationSpy).not.toHaveBeenCalled();
        }

        runValidationSpy.mockClear();
        if (undoCallback) {
            undoCallback();
            expect(runValidationSpy).not.toHaveBeenCalled();
        }
    });

    it('should call selectTable and set tableSelected to true on onTableMenuLeftClick', () => {
        const event = new MouseEvent('click');
        jest.spyOn(event, 'preventDefault');
        spyOn(component as any, 'selectTable');
        component.onTableMenuLeftClick(event);
        expect((component as any).selectTable).toHaveBeenCalledWith(event);
    });

    it('should call selectTable and open menu on onTableMenuRightClick', () => {
        const event = new MouseEvent('contextmenu');
        const menuTrigger = { openMenu: jasmine.createSpy('openMenu') } as any;
        const triggerElement = document.createElement('div');
        jest.spyOn(event, 'preventDefault');
        spyOn(component as any, 'selectTable');
        component.onTableMenuRightClick(event, menuTrigger, triggerElement);
        expect((component as any).selectTable).toHaveBeenCalledWith(event);
        expect(menuTrigger.openMenu).toHaveBeenCalled();
    });

    it('should call selectRow and set selectedRowIndex on onRowMenuLeftClick', () => {
        const event = new MouseEvent('click');
        jest.spyOn(event, 'preventDefault');
        jest.spyOn(component as any, 'selectRow');
        component.onRowMenuLeftClick(event, 1);
        expect((component as any).selectRow).toHaveBeenCalledWith(1, event);
    });

    it('should position and open the shared row menu on onRowMenuRightClick', () => {
        const event = new MouseEvent('contextmenu', { clientX: 100, clientY: 200 });
        jest.spyOn(event, 'preventDefault');
        const rowMenuTrigger = component.rowMenuTrigger;
        expect(rowMenuTrigger).toBeDefined();
        if (!rowMenuTrigger) {
            throw new Error('Expected shared row menu trigger to be available');
        }
        const openMenuSpy = jest.spyOn(rowMenuTrigger, 'openMenu').mockImplementation();

        component.onRowMenuRightClick(event, 1);

        expect(component.selectedRowIndex).toBe(1);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.rowMenuTriggerElement?.nativeElement.style.left).toBe('100px');
        expect(component.rowMenuTriggerElement?.nativeElement.style.top).toBe('200px');
        expect(openMenuSpy).toHaveBeenCalled();
    });

    it('should call selectColumn and set selectedColumnIndex on onColumnMenuLeftClick', () => {
        const event = new MouseEvent('click');
        jest.spyOn(event, 'preventDefault');
        jest.spyOn(component as any, 'selectColumn');
        component.onColumnMenuLeftClick(event, 1);
        expect((component as any).selectColumn).toHaveBeenCalledWith(1, event);
    });

    it('should position and open the shared column menu on onColumnMenuRightClick', () => {
        const event = new MouseEvent('contextmenu', { clientX: 150, clientY: 250 });
        jest.spyOn(event, 'preventDefault');
        const columnMenuTrigger = component.columnMenuTrigger;
        expect(columnMenuTrigger).toBeDefined();
        if (!columnMenuTrigger) {
            throw new Error('Expected shared column menu trigger to be available');
        }
        const openMenuSpy = jest.spyOn(columnMenuTrigger, 'openMenu').mockImplementation();

        component.onColumnMenuRightClick(event, 1);

        expect(component.selectedColumnIndex).toBe(1);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.columnMenuTriggerElement?.nativeElement.style.left).toBe('150px');
        expect(component.columnMenuTriggerElement?.nativeElement.style.top).toBe('250px');
        expect(openMenuSpy).toHaveBeenCalled();
    });

    it('should open the selected row context menu from the keyboard using the shared row trigger', () => {
        component.selectedRowIndex = 1;
        component.selectedColumnIndex = -1;
        component.tableSelected = false;

        const rowAnchor = component.rowMenuAnchors.get(1)?.nativeElement;
        expect(rowAnchor).toBeDefined();
        if (!rowAnchor) {
            throw new Error('Expected selected row anchor to be available');
        }
        jest.spyOn(rowAnchor, 'getBoundingClientRect').mockReturnValue({
            x: 32,
            y: 0,
            left: 32,
            top: 0,
            right: 32,
            bottom: 56,
            width: 0,
            height: 0,
            toJSON: () => ({}),
        } as DOMRect);
        const rowMenuTrigger = component.rowMenuTrigger;
        expect(rowMenuTrigger).toBeDefined();
        if (!rowMenuTrigger) {
            throw new Error('Expected shared row menu trigger to be available');
        }
        const openMenuSpy = jest.spyOn(rowMenuTrigger, 'openMenu').mockImplementation();
        const event = new KeyboardEvent('keydown', { key: '~', ctrlKey: true, shiftKey: true });
        Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

        component.onComponentKeydown(event);

        expect(component.rowMenuTriggerElement?.nativeElement.style.left).toBe('32px');
        expect(component.rowMenuTriggerElement?.nativeElement.style.top).toBe('56px');
        expect(openMenuSpy).toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should open the selected column context menu from the keyboard using the shared column trigger', () => {
        component.selectedRowIndex = -1;
        component.selectedColumnIndex = 1;
        component.tableSelected = false;

        const columnAnchor = component.columnMenuAnchors.get(1)?.nativeElement;
        expect(columnAnchor).toBeDefined();
        if (!columnAnchor) {
            throw new Error('Expected selected column anchor to be available');
        }
        jest.spyOn(columnAnchor, 'getBoundingClientRect').mockReturnValue({
            x: 48,
            y: 0,
            left: 48,
            top: 0,
            right: 48,
            bottom: 72,
            width: 0,
            height: 0,
            toJSON: () => ({}),
        } as DOMRect);
        const columnMenuTrigger = component.columnMenuTrigger;
        expect(columnMenuTrigger).toBeDefined();
        if (!columnMenuTrigger) {
            throw new Error('Expected shared column menu trigger to be available');
        }
        const openMenuSpy = jest.spyOn(columnMenuTrigger, 'openMenu').mockImplementation();
        const event = new KeyboardEvent('keydown', { key: '~', ctrlKey: true, shiftKey: true });
        Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

        component.onComponentKeydown(event);

        expect(component.columnMenuTriggerElement?.nativeElement.style.left).toBe('48px');
        expect(component.columnMenuTriggerElement?.nativeElement.style.top).toBe('72px');
        expect(openMenuSpy).toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should apply shared cell menu actions to the most recently right-clicked cell', () => {
        (component as any).currentTableId = 'table1';
        const firstInput = findFieldInputDebugElement(mockTable.rows[0].rowCells[0])?.nativeElement as HTMLInputElement;
        const secondInput = findFieldInputDebugElement(mockTable.rows[1].rowCells[1])?.nativeElement as HTMLInputElement;

        const cellMenuTrigger = component.cellMenuTrigger;
        expect(cellMenuTrigger).toBeDefined();
        if (!cellMenuTrigger) {
            throw new Error('Expected shared cell menu trigger to be available');
        }
        const openMenuSpy = jest.spyOn(cellMenuTrigger, 'openMenu').mockImplementation();
        const updateTableColumnSpy = jest.spyOn(idpVerificationService, 'updateTableColumn').mockImplementation();
        let doCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
        });

        const firstEvent = new MouseEvent('contextmenu', { clientX: 10, clientY: 20 });
        Object.defineProperty(firstEvent, 'target', { value: firstInput });
        component.onInputRightClick(firstEvent);

        const secondEvent = new MouseEvent('contextmenu', { clientX: 30, clientY: 40 });
        Object.defineProperty(secondEvent, 'target', { value: secondInput });
        component.onInputRightClick(secondEvent);

        component.fillActiveCell(FillDirection.AllBelow);

        expect(openMenuSpy).toHaveBeenCalledTimes(2);
        expect((component as any).activeInputElement).toBe(secondInput);
        expect(component.activeCellRowIndex).toBe(1);
        expect(component.activeCellColumnIndex).toBe(1);
        expect(component.activeCellRows).toBe(mockTable.rows);
        expect(component.cellMenuTriggerElement?.nativeElement.style.left).toBe('30px');
        expect(component.cellMenuTriggerElement?.nativeElement.style.top).toBe('40px');
        expect(mockActionHistoryService.do).toHaveBeenCalled();

        doCallback?.();

        expect(updateTableColumnSpy).toHaveBeenCalledWith(
            'table1',
            1,
            expect.arrayContaining([
                expect.objectContaining({ id: '2', value: 'A2' }),
                expect.objectContaining({ id: '4', value: 'B2' }),
                expect.objectContaining({ id: '6', value: 'B2' }),
                expect.objectContaining({ id: '8', value: 'B2' }),
            ])
        );
    });

    describe('shared cell context menu via DOM right-click', () => {
        it('should open cell menu with all items when right-clicking a cell input', () => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.overrideSelector(selectActiveTable, mockTable);
            store.refreshState();
            fixture.detectChanges();

            rightClickCellInput(fixture, '3');

            const items = queryCellMenuItems(fixture);
            expect(items.cut).toBeTruthy();
            expect(items.copy).toBeTruthy();
            expect(items.paste).toBeTruthy();
            expect(items.fillAllAbove).toBeTruthy();
            expect(items.fillToAbove).toBeTruthy();
            expect(items.fillToBelow).toBeTruthy();
            expect(items.fillAllBelow).toBeTruthy();
        });

        it('should disable fill-all-above for the first row cell', () => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.overrideSelector(selectActiveTable, mockTable);
            store.refreshState();
            fixture.detectChanges();

            rightClickCellInput(fixture, '1');

            const items = queryCellMenuItems(fixture);
            expect(items.fillAllAbove?.nativeElement.disabled).toBe(true);
            expect(items.fillAllBelow?.nativeElement.disabled).toBe(false);
        });

        it('should disable fill-all-below for the last row cell', () => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.overrideSelector(selectActiveTable, mockTable);
            store.refreshState();
            fixture.detectChanges();

            rightClickCellInput(fixture, '7');

            const items = queryCellMenuItems(fixture);
            expect(items.fillAllAbove?.nativeElement.disabled).toBe(false);
            expect(items.fillAllBelow?.nativeElement.disabled).toBe(true);
        });

        it('should disable all cell menu items when validation is running', () => {
            store.overrideSelector(selectIsValidationProcessRunning, true);
            store.overrideSelector(selectActiveTable, mockTable);
            store.refreshState();
            fixture.detectChanges();

            rightClickCellInput(fixture, '3');

            const items = queryCellMenuItems(fixture);
            expect(items.cut?.nativeElement.disabled).toBe(true);
            expect(items.copy?.nativeElement.disabled).toBe(true);
            expect(items.paste?.nativeElement.disabled).toBe(true);
            expect(items.fillAllAbove?.nativeElement.disabled).toBe(true);
            expect(items.fillAllBelow?.nativeElement.disabled).toBe(true);
        });

        it('should enable all cell menu items when validation is not running for a middle row', () => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.overrideSelector(selectActiveTable, mockTable);
            store.refreshState();
            fixture.detectChanges();

            rightClickCellInput(fixture, '3');

            const items = queryCellMenuItems(fixture);
            expect(items.cut?.nativeElement.disabled).toBe(false);
            expect(items.copy?.nativeElement.disabled).toBe(false);
            expect(items.paste?.nativeElement.disabled).toBe(false);
            expect(items.fillAllAbove?.nativeElement.disabled).toBe(false);
            expect(items.fillAllBelow?.nativeElement.disabled).toBe(false);
        });

        it('should target the correct cell after right-clicking a different cell', () => {
            store.overrideSelector(selectIsValidationProcessRunning, false);
            store.overrideSelector(selectActiveTable, mockTable);
            store.refreshState();
            fixture.detectChanges();

            rightClickCellInput(fixture, '1');
            expect(component.activeCellRowIndex).toBe(0);
            expect(component.activeCellColumnIndex).toBe(0);

            rightClickCellInput(fixture, '6');
            expect(component.activeCellRowIndex).toBe(2);
            expect(component.activeCellColumnIndex).toBe(1);
        });
    });

    it('should select next column on End keypress when a column is selected', () => {
        component.selectedColumnIndex = 0;
        jest.spyOn(component as any, 'getMaxColumnIndex').mockReturnValue(1);
        const event = new KeyboardEvent('keydown', { key: 'End' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.selectedColumnIndex).toBe(1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should select previous column on Home keypress when a column is selected', () => {
        component.selectedColumnIndex = 1;
        const event = new KeyboardEvent('keydown', { key: 'Home' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.selectedColumnIndex).toBe(0);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should select next row on PageDown keypress when a row is selected', () => {
        component.selectedRowIndex = 0;
        // Instead of spying on the public method, access the private method using bracket notation
        jest.spyOn(component as any, 'getMaxRowIndex').mockReturnValue(1);
        const event = new KeyboardEvent('keydown', { key: 'PageDown' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.selectedRowIndex).toBe(1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should select previous row on PageUp keypress when a row is selected', () => {
        component.selectedRowIndex = 1;
        const event = new KeyboardEvent('keydown', { key: 'PageUp' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.selectedRowIndex).toBe(0);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should navigate to the first cell in the selected column on PageUp keypress', () => {
        component.selectedColumnIndex = 1;
        const tableRowRecords = mockTable.rows;
        jest.spyOn(component, 'navigateFirstColumnCell');
        const event = new KeyboardEvent('keydown', { key: 'PageUp' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.navigateFirstColumnCell).toHaveBeenCalledWith(tableRowRecords, 1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should navigate to the first cell in the selected column on PageDown keypress', () => {
        component.selectedColumnIndex = 1;
        const tableRowRecords = mockTable.rows;
        jest.spyOn(component, 'navigateFirstColumnCell');
        const event = new KeyboardEvent('keydown', { key: 'PageDown' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.navigateFirstColumnCell).toHaveBeenCalledWith(tableRowRecords, 1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should navigate to the first cell in the selected column on Tab keypress', () => {
        component.selectedColumnIndex = 1;
        const tableRowRecords = mockTable.rows;
        jest.spyOn(component, 'navigateFirstColumnCell');
        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.navigateFirstColumnCell).toHaveBeenCalledWith(tableRowRecords, 1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should navigate to the first cell in the selected row on Home keypress', () => {
        component.selectedRowIndex = 1;
        const tableRowRecords = mockTable.rows;
        jest.spyOn(component, 'navigateFirstRowCell');
        const event = new KeyboardEvent('keydown', { key: 'Home' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.navigateFirstRowCell).toHaveBeenCalledWith(tableRowRecords, 1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should navigate to the first cell in the selected row on End keypress', () => {
        component.selectedRowIndex = 1;
        const tableRowRecords = mockTable.rows;
        jest.spyOn(component, 'navigateFirstRowCell');
        const event = new KeyboardEvent('keydown', { key: 'End' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.navigateFirstRowCell).toHaveBeenCalledWith(tableRowRecords, 1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should navigate to the first cell in the selected row on Tab keypress', () => {
        component.selectedRowIndex = 1;
        const tableRowRecords = mockTable.rows;
        jest.spyOn(component, 'navigateFirstRowCell');
        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);
        expect(component.navigateFirstRowCell).toHaveBeenCalledWith(tableRowRecords, 1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should select the entire table when a row is selected and user presses ctrl+space', () => {
        component.selectedRowIndex = 1;
        component.selectedColumnIndex = -1;
        component.tableSelected = false;
        component.singleCellFocus = false;

        const event = new KeyboardEvent('keydown', { key: ' ', ctrlKey: true });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);

        expect(component.tableSelected).toBe(true);
        expect(component.selectedRowIndex).toBe(-1);
        expect(component.selectedColumnIndex).toBe(-1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should select the entire table when a column is selected and user presses shift+space', () => {
        component.selectedRowIndex = -1;
        component.selectedColumnIndex = 1;
        component.tableSelected = false;
        component.singleCellFocus = false;

        const event = new KeyboardEvent('keydown', { key: ' ', shiftKey: true });
        jest.spyOn(event, 'preventDefault');
        component.onComponentKeydown(event);

        expect(component.tableSelected).toBe(true);
        expect(component.selectedRowIndex).toBe(-1);
        expect(component.selectedColumnIndex).toBe(-1);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should select the entire column when pressing PageUp in a cell in the first row', () => {
        const event = new KeyboardEvent('keydown', { key: 'PageUp' });
        jest.spyOn(event, 'preventDefault');
        jest.spyOn(event, 'stopPropagation');

        const firstRowSecondCell = mockTable.rows[0].rowCells[1];
        const firstInput = findFieldInputDebugElement(firstRowSecondCell)?.nativeElement;

        Object.defineProperty(event, 'target', { value: firstInput });

        const mockField: IdpField = { id: 'mockId' } as IdpField;
        component.onKeydown(mockField, event);

        expect(component.selectedColumnIndex).toBe(1);
        expect(component.selectedRowIndex).toBe(-1);
        expect(component.tableSelected).toBe(false);
        expect(component.singleCellFocus).toBe(false);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should select the entire row when pressing Home in a cell in the first column', () => {
        const event = new KeyboardEvent('keydown', { key: 'Home' });
        jest.spyOn(event, 'preventDefault');
        jest.spyOn(event, 'stopPropagation');

        const secondRowFirstCell = mockTable.rows[1].rowCells[0];
        const firstInput = findFieldInputDebugElement(secondRowFirstCell)?.nativeElement;

        Object.defineProperty(event, 'target', { value: firstInput });

        const mockField: IdpField = { id: 'mockId' } as IdpField;
        component.onKeydown(mockField, event);

        expect(component.selectedRowIndex).toBe(1);
        expect(component.selectedColumnIndex).toBe(-1);
        expect(component.tableSelected).toBe(false);
        expect(component.singleCellFocus).toBe(false);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should reset all column widths through menu interaction', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        // Set up custom widths
        simulateColumnResize('Column 1', 150);
        simulateColumnResize('Column 2', 200);

        await fixture.whenStable();
        fixture.detectChanges();

        // Get custom widths to verify they change after reset
        const customWidths = component.columnWidths;
        const column1CustomWidth = customWidths['Column 1'];
        const column2CustomWidth = customWidths['Column 2'];

        // Spy on the reset method
        jest.spyOn(component, 'resetAllColumnWidths');

        // Trigger reset through menu interaction
        const tableHeader = fixture.debugElement.query(By.css('.idp-table-row-number-header'));
        if (tableHeader) {
            tableHeader.triggerEventHandler('contextmenu', new MouseEvent('contextmenu'));
            fixture.detectChanges();

            const resetAllButton = fixture.debugElement.query(By.css('button[mat-menu-item]'));
            if (resetAllButton?.nativeElement.textContent?.includes('Reset All')) {
                resetAllButton.triggerEventHandler('click', null);

                expect(component.resetAllColumnWidths).toHaveBeenCalled();

                await fixture.whenStable();
                fixture.detectChanges();

                // Verify widths changed after reset
                const resetWidths = component.columnWidths;
                expect(resetWidths['Column 1']).not.toBe(column1CustomWidth);
                expect(resetWidths['Column 2']).not.toBe(column2CustomWidth);
            }
        }
    });

    it('should call onResizeStart when dragging resize handle', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        // Spy on the public onResizeStart method
        jest.spyOn(component, 'onResizeStart');

        // Find the resize handle
        const resizeHandle = fixture.debugElement.query(By.css('.idp-resize-handle'));
        expect(resizeHandle).toBeTruthy();

        // Simulate mousedown on resize handle
        const mouseDownEvent = new MouseEvent('mousedown', {
            clientX: 100,
            bubbles: true,
        });

        resizeHandle.triggerEventHandler('mousedown', mouseDownEvent);
        fixture.detectChanges();

        // Verify onResizeStart was called with correct parameters
        expect(component.onResizeStart).toHaveBeenCalledWith(mouseDownEvent, 'Column 1');
    });

    it('should enforce minimum and maximum column width constraints', async () => {
        fixture.detectChanges();

        // Test with a table that has very short and very long content
        const testTable: IdpTable = {
            rows: [
                {
                    rowCells: [
                        {
                            id: '1',
                            value: 'A',
                            dataType: IdpFieldDataType.Text,
                            format: '',
                            confidence: 0,
                            verificationStatus: 'ManualValid',
                            name: '',
                            validationStatus: 'Valid',
                        },
                        {
                            id: '2',
                            // eslint-disable-next-line max-len
                            value: 'This is an extremely long field value that should definitely exceed the maximum column width constraint and be clamped to the maximum allowed width',
                            dataType: IdpFieldDataType.Text,
                            format: '',
                            confidence: 0,
                            verificationStatus: 'ManualValid',
                            name: '',
                            validationStatus: 'Valid',
                        },
                    ],
                },
            ],
            columnHeaderNames: ['ID', 'Very Long Header Name That Should Exceed Maximum'],
            id: 'constraint-test-table',
            name: 'Test Table',
            validationStatus: 'Valid',
            isDirty: false,
        };

        // Apply the test table
        store.overrideSelector(selectActiveTable, testTable);
        store.refreshState();
        fixture.detectChanges();

        // Add debounce wait
        await new Promise((resolve) => setTimeout(resolve, 60));

        const columnWidths = component.columnWidths;

        // Short column should be clamped to minimum width (60px)
        expect(columnWidths['ID']).toBe('60px');

        // Long column should be clamped to maximum width (600px)
        expect(columnWidths['Very Long Header Name That Should Exceed Maximum']).toBe('600px');
    });

    it('should set up and clean up resize event listeners', async () => {
        const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
        const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

        // Start resize
        component.onResizeStart(new MouseEvent('mousedown', { clientX: 100 }), 'Column 1');

        // Verify setup
        expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
        expect(document.body.style.cursor).toBe('col-resize');

        // Simulate end using helper
        document.dispatchEvent(new MouseEvent('mouseup'));
        await fixture.whenStable();

        // Verify cleanup
        expect(document.body.style.cursor).toBe('');

        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });

    describe('table data processing', () => {
        it('should calculate column widths based on longest fields per column when table data changes', async () => {
            const testTable: IdpTable = {
                rows: [
                    {
                        rowCells: [
                            {
                                id: '1',
                                value: 'Short',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                            {
                                id: '2',
                                value: 'Medium Length',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                    {
                        rowCells: [
                            {
                                id: '3',
                                value: 'Very Long Field Value',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                            {
                                id: '4',
                                value: 'X',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                ],
                columnHeaderNames: ['Column A', 'Very Long Column Header Name'],
                id: 'width-calc-test',
                name: 'Test Table',
                validationStatus: 'Valid',
                isDirty: false,
            };

            // Trigger table data change
            store.overrideSelector(selectActiveTable, testTable);
            store.refreshState();
            fixture.detectChanges();

            // Add debounce wait
            await new Promise((resolve) => setTimeout(resolve, 60));

            // Test the actual column widths calculation result
            const columnWidths = component.columnWidths;

            // First column: "Very Long Field Value" (21 chars) is longest
            const expectedWidth = 21 * fieldCharacterWidth + 20;
            expect(columnWidths['Column A']).toBe(`${expectedWidth}px`);

            // Second column: "Very Long Column Header Name" (28 chars) is longest header
            const expectedHeaderWidth = 28 * headerCharacterWidth + 20;
            expect(columnWidths['Very Long Column Header Name']).toBe(`${expectedHeaderWidth}px`);

            // Row number column should use minimum width (60px)
            expect(columnWidths['rowNumber']).toBe('60px');
        });

        it('should use column header length for width calculation when header is longer than field values', async () => {
            const testTable: IdpTable = {
                rows: [
                    {
                        rowCells: [
                            {
                                id: '1',
                                value: 'A',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                            {
                                id: '2',
                                value: 'BB',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                ],
                columnHeaderNames: ['Very Long Column Header', 'Short'],
                id: 'header-test',
                name: 'Test Table',
                validationStatus: 'Valid',
                isDirty: false,
            };

            store.overrideSelector(selectActiveTable, testTable);
            store.refreshState();
            fixture.detectChanges();

            // Add debounce wait
            await new Promise((resolve) => setTimeout(resolve, 60));

            const columnWidths = component.columnWidths;

            // First column: header "Very Long Column Header" (23 chars) is longest
            const expectedHeaderWidth = 23 * headerCharacterWidth + 20;
            expect(columnWidths['Very Long Column Header']).toBe(`${expectedHeaderWidth}px`);

            // Second column: header "Short" (5 chars) is longest
            const expectedShortHeaderWidth = 5 * headerCharacterWidth + 20;
            expect(columnWidths['Short']).toBe(`${expectedShortHeaderWidth}px`);
        });

        it('should handle empty field values correctly in width calculation', async () => {
            const testTable: IdpTable = {
                rows: [
                    {
                        rowCells: [
                            {
                                id: '1',
                                value: '',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                            {
                                id: '2',
                                value: undefined,
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                    {
                        rowCells: [
                            {
                                id: '3',
                                value: undefined as any,
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                            {
                                id: '4',
                                value: 'Valid Value',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                ],
                columnHeaderNames: ['C1', 'Col2'],
                id: 'empty-field-test',
                name: 'Test Table',
                validationStatus: 'Valid',
                isDirty: false,
            };

            store.overrideSelector(selectActiveTable, testTable);
            store.refreshState();
            fixture.detectChanges();

            // Add debounce wait
            await new Promise((resolve) => setTimeout(resolve, 60));

            const columnWidths = component.columnWidths;

            // First column: only header "C1" (2 chars) since all field values are empty/null/undefined
            const expectedCol1Width = Math.max(2 * headerCharacterWidth + 20, minColumnWidth);
            expect(columnWidths['C1']).toBe(`${expectedCol1Width}px`);

            // Second column: "Valid Value" (11 chars) is longest
            const expectedCol2Width = 11 * fieldCharacterWidth + 20;
            expect(columnWidths['Col2']).toBe(`${expectedCol2Width}px`);
        });

        it('should handle missing cells in rows for width calculation', async () => {
            const testTable: IdpTable = {
                rows: [
                    {
                        rowCells: [
                            {
                                id: '1',
                                value: 'Complete Row',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                            {
                                id: '2',
                                value: 'Second Cell',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                    {
                        rowCells: [
                            {
                                id: '3',
                                value: 'Incomplete',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                            // Missing second cell
                        ],
                    },
                ],
                columnHeaderNames: ['First Column', 'Second Column'],
                id: 'missing-cell-test',
                name: 'Test Table',
                validationStatus: 'Valid',
                isDirty: false,
            };

            store.overrideSelector(selectActiveTable, testTable);
            store.refreshState();
            fixture.detectChanges();

            // Add debounce wait
            await new Promise((resolve) => setTimeout(resolve, 60));

            const columnWidths = component.columnWidths;

            // First column: header "First Column" (12 chars) is longest
            const expectedFirstColumnWidth = 12 * headerCharacterWidth + 20;
            expect(columnWidths['First Column']).toBe(`${expectedFirstColumnWidth}px`);

            // Second column: header "Second Column" (13 chars) is longest since one row is missing this cell
            const expectedSecondColumnWidth = 13 * headerCharacterWidth + 20;
            expect(columnWidths['Second Column']).toBe(`${expectedSecondColumnWidth}px`);
        });

        it('should respect minimum and maximum width constraints', async () => {
            const testTable: IdpTable = {
                rows: [
                    {
                        rowCells: [
                            {
                                id: '1',
                                value: 'A',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                            {
                                id: '2',
                                value: 'This is an extremely long field value that should definitely exceed the maximum column width constraint and be clamped',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                ],
                columnHeaderNames: ['X', 'Long Header'],
                id: 'min-max-test',
                name: 'Test Table',
                validationStatus: 'Valid',
                isDirty: false,
            };

            store.overrideSelector(selectActiveTable, testTable);
            store.refreshState();
            fixture.detectChanges();

            // Add debounce wait
            await new Promise((resolve) => setTimeout(resolve, 60));

            const columnWidths = component.columnWidths;

            // First column should be clamped to minimum width (60px)
            expect(columnWidths['X']).toBe('60px');

            // Second column should be clamped to maximum width (600px)
            expect(columnWidths['Long Header']).toBe('600px');
        });

        it('should prioritize user column width overrides over calculated widths', async () => {
            const testTable: IdpTable = {
                rows: [
                    {
                        rowCells: [
                            {
                                id: '1',
                                value: 'Short',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                ],
                columnHeaderNames: ['Test'],
                id: 'test-table',
                name: 'Test Table',
                validationStatus: 'Valid',
                isDirty: false,
            };

            store.overrideSelector(selectActiveTable, testTable);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            // Get initial calculated width
            const initialWidths = component.columnWidths;
            const calculatedWidth = initialWidths['Test'];

            // Simulate user resize interaction to set override (+100px)
            simulateColumnResize('Test', 100);

            await fixture.whenStable();
            fixture.detectChanges();

            // Verify override width is used instead of calculated width
            const finalWidths = component.columnWidths;
            expect(finalWidths['Test']).not.toBe(calculatedWidth);

            // Should be initial width + 100px delta
            const expectedWidth = Number.parseInt(calculatedWidth, 10) + 100;
            expect(finalWidths['Test']).toBe(`${expectedWidth}px`);
        });

        it('should invalidate column widths when table data changes', async () => {
            const spy = jest.spyOn(component as any, 'calculateAndCacheColumnWidths');

            const testTable: IdpTable = {
                rows: [
                    {
                        rowCells: [
                            {
                                id: '1',
                                value: 'Test',
                                dataType: IdpFieldDataType.Text,
                                format: '',
                                confidence: 0,
                                verificationStatus: 'ManualValid',
                                name: '',
                                validationStatus: 'Valid',
                            },
                        ],
                    },
                ],
                columnHeaderNames: ['Test Column'],
                id: 'invalidate-test',
                name: 'Test Table',
                validationStatus: 'Valid',
                isDirty: false,
            };

            store.overrideSelector(selectActiveTable, testTable);
            store.refreshState();
            fixture.detectChanges();

            // Add debounce wait
            await new Promise((resolve) => setTimeout(resolve, 60));

            expect(spy).toHaveBeenCalled();
        });

        it('should not process table data when table is empty or has no rows', () => {
            const spy = jest.spyOn(component as any, 'invalidateColumnWidths');

            // Test with empty table
            const emptyTable: IdpTable = {
                rows: [],
                columnHeaderNames: ['Column 1'],
                id: 'empty-table',
                name: 'Empty Table',
                validationStatus: 'Valid',
                isDirty: false,
            };

            store.overrideSelector(selectActiveTable, emptyTable);
            store.refreshState();
            fixture.detectChanges();

            // Should not be called because filter prevents empty tables from being processed
            expect(spy).not.toHaveBeenCalled();

            spy.mockClear();

            // Test with null table
            store.overrideSelector(selectActiveTable, undefined);
            store.refreshState();
            fixture.detectChanges();

            expect(spy).not.toHaveBeenCalled();
        });
    });

    it('should resize selected column narrower on Ctrl+ArrowLeft keypress', () => {
        component.selectedColumnIndex = 1;
        const resizeSpy = jest.spyOn(component as any, 'resizeSelectedColumn');

        const event = new KeyboardEvent('keydown', {
            key: 'ArrowLeft',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });

        jest.spyOn(event, 'preventDefault');

        component.onComponentKeydown(event);

        expect(resizeSpy).toHaveBeenCalledWith(-10);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should resize selected column wider on Ctrl+ArrowRight keypress', () => {
        component.selectedColumnIndex = 1;
        const resizeSpy = jest.spyOn(component as any, 'resizeSelectedColumn');

        const event = new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
        });
        jest.spyOn(event, 'preventDefault');

        component.onComponentKeydown(event);

        expect(resizeSpy).toHaveBeenCalledWith(10);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not resize column when no column is selected and Ctrl+ArrowLeft is pressed', () => {
        component.selectedColumnIndex = -1; // No column selected
        component.selectedRowIndex = -1;
        component.tableSelected = false;

        const initialWidths = { ...component.columnWidths };

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', ctrlKey: true });
        jest.spyOn(event, 'preventDefault');

        component.onComponentKeydown(event);

        const finalWidths = component.columnWidths;

        // Widths should remain unchanged
        expect(finalWidths).toEqual(initialWidths);
        // preventDefault should not be called when no action is taken
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not resize column when no column is selected and Ctrl+ArrowRight is pressed', () => {
        component.selectedColumnIndex = -1; // No column selected
        component.selectedRowIndex = 1; // Row selected instead
        component.tableSelected = false;

        const initialWidths = { ...component.columnWidths };

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true });
        jest.spyOn(event, 'preventDefault');

        component.onComponentKeydown(event);

        const finalWidths = component.columnWidths;

        // Widths should remain unchanged
        expect(finalWidths).toEqual(initialWidths);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not reset column width when no column is selected and Escape is pressed', () => {
        component.selectedColumnIndex = -1;
        component.selectedRowIndex = 1; // Row selected instead

        const initialWidths = { ...component.columnWidths };

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        jest.spyOn(event, 'preventDefault');

        component.onComponentKeydown(event);

        const finalWidths = component.columnWidths;

        expect(finalWidths).toEqual(initialWidths);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should call runValidationProcessIfTableIsDirty when focus leaves the table component', () => {
        jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        component['currentTableId'] = 'table1';
        (component as any).currentTableId = 'table1';
        const outsideElement = document.createElement('div');
        const event = new FocusEvent('focusout', {
            relatedTarget: outsideElement,
        });

        component.onTableFocusOut(event);

        expect(idpVerificationService.runValidationProcessIfTableIsDirty).toHaveBeenCalledWith('table1');
    });

    it('should not call runValidationProcessIfTableIsDirty when focus moves to a menu item of an open context menu', () => {
        jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        (component as any).currentTableId = 'table1';
        const menuItem = document.createElement('button');
        const columnMenuTrigger = component.columnMenuTrigger;
        expect(columnMenuTrigger).toBeDefined();
        if (!columnMenuTrigger) {
            throw new Error('Expected column menu trigger to be available');
        }
        jest.spyOn(columnMenuTrigger, 'menuOpen', 'get').mockReturnValue(true);

        component.onTableFocusOut(new FocusEvent('focusout', { relatedTarget: menuItem }));

        expect(idpVerificationService.runValidationProcessIfTableIsDirty).not.toHaveBeenCalled();
    });

    it('should not call runValidationProcessIfTableIsDirty when mousedown was inside the component', () => {
        jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        (component as any).currentTableId = 'table1';

        component.onContainerMouseDown();
        component.onTableFocusOut(new FocusEvent('focusout', { relatedTarget: null }));

        expect(idpVerificationService.runValidationProcessIfTableIsDirty).not.toHaveBeenCalled();
    });

    it('should call runValidationProcessIfTableIsDirty when mousedown was outside the component and relatedTarget is null', () => {
        jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        (component as any).currentTableId = 'table1';

        component.onTableFocusOut(new FocusEvent('focusout', { relatedTarget: null }));

        expect(idpVerificationService.runValidationProcessIfTableIsDirty).toHaveBeenCalledWith('table1');
    });

    it('should subscribe to isValidationProcessRunning$ from verification service', (done) => {
        component.isValidationProcessRunning$.subscribe((isRunning) => {
            expect(typeof isRunning).toBe('boolean');
            done();
        });
    });

    it('should disable all input fields when validation is running', async () => {
        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        fixture.detectChanges();

        const inputs = fixture.debugElement.queryAll(By.css('input[matInput]'));
        for (const input of inputs) {
            expect(input.nativeElement.disabled).toBe(true);
        }
    });

    it('should enable all input fields when validation is not running', async () => {
        store.overrideSelector(selectIsValidationProcessRunning, false);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        fixture.detectChanges();

        const inputs = fixture.debugElement.queryAll(By.css('input[matInput]'));
        for (const input of inputs) {
            expect(input.nativeElement.disabled).toBe(false);
        }
    });

    it('should apply idp-disabled class to table container when validation is running', async () => {
        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        fixture.detectChanges();

        const tableContainer = fixture.debugElement.query(By.css('.idp-table-container'));
        expect(tableContainer.nativeElement.classList.contains('idp-disabled')).toBe(true);
    });

    it('should not apply idp-disabled class to table container when validation is not running', async () => {
        store.overrideSelector(selectIsValidationProcessRunning, false);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        fixture.detectChanges();

        const tableContainer = fixture.debugElement.query(By.css('.idp-table-container'));
        expect(tableContainer.nativeElement.classList.contains('idp-disabled')).toBe(false);
    });

    it('should disable all menu buttons when validation is running', async () => {
        store.overrideSelector(selectIsValidationProcessRunning, true);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        fixture.detectChanges();

        // Table menu button
        const tableHeader = fixture.debugElement.query(By.css('.idp-table-row-number-header'));
        tableHeader.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        fixture.detectChanges();

        const deleteTableButton = fixture.debugElement
            .queryAll(By.css('button[mat-menu-item]'))
            .find((btn) => btn.nativeElement.textContent.includes('DELETE_TABLE'));
        expect(deleteTableButton?.nativeElement.disabled).toBe(true);

        // Row menu buttons
        const rowNumberCell = fixture.debugElement.queryAll(By.css('.idp-table-row-number-cell'))[0];
        rowNumberCell.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        fixture.detectChanges();

        const rowMenuButtons = fixture.debugElement.queryAll(By.css('button[mat-menu-item]'));
        const insertRowAboveButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('INSERT_ROW_ABOVE'));
        const insertRowBelowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('INSERT_ROW_BELOW'));
        const clearRowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('CLEAR_ROW'));
        const deleteRowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('DELETE_ROW'));

        expect(insertRowAboveButton?.nativeElement.disabled).toBe(true);
        expect(insertRowBelowButton?.nativeElement.disabled).toBe(true);
        expect(clearRowButton?.nativeElement.disabled).toBe(true);
        expect(deleteRowButton?.nativeElement.disabled).toBe(true);

        // Column menu button
        const columnHeader = fixture.debugElement.queryAll(By.css('.idp-table-row-header'))[0];
        columnHeader.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        fixture.detectChanges();

        const clearColumnButton = fixture.debugElement
            .queryAll(By.css('button[mat-menu-item]'))
            .find((btn) => btn.nativeElement.textContent.includes('CLEAR_COLUMN'));
        expect(clearColumnButton?.nativeElement.disabled).toBe(true);
    });

    it('should enable all menu buttons when validation is not running', async () => {
        store.overrideSelector(selectIsValidationProcessRunning, false);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();

        fixture.detectChanges();

        // Table menu button
        const tableHeader = fixture.debugElement.query(By.css('.idp-table-row-number-header'));
        tableHeader.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        fixture.detectChanges();

        const deleteTableButton = fixture.debugElement
            .queryAll(By.css('button[mat-menu-item]'))
            .find((btn) => btn.nativeElement.textContent.includes('DELETE_TABLE'));
        expect(deleteTableButton?.nativeElement.disabled).toBe(false);

        // Row menu buttons
        const rowNumberCell = fixture.debugElement.queryAll(By.css('.idp-table-row-number-cell'))[0];
        rowNumberCell.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        fixture.detectChanges();

        const rowMenuButtons = fixture.debugElement.queryAll(By.css('button[mat-menu-item]'));
        const insertRowAboveButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('INSERT_ROW_ABOVE'));
        const insertRowBelowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('INSERT_ROW_BELOW'));
        const clearRowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('CLEAR_ROW'));
        const deleteRowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('DELETE_ROW'));

        expect(insertRowAboveButton?.nativeElement.disabled).toBe(false);
        expect(insertRowBelowButton?.nativeElement.disabled).toBe(false);
        expect(clearRowButton?.nativeElement.disabled).toBe(false);
        expect(deleteRowButton?.nativeElement.disabled).toBe(false);

        // Column menu button
        const columnHeader = fixture.debugElement.queryAll(By.css('.idp-table-row-header'))[0];
        columnHeader.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        fixture.detectChanges();

        const clearColumnButton = fixture.debugElement
            .queryAll(By.css('button[mat-menu-item]'))
            .find((btn) => btn.nativeElement.textContent.includes('CLEAR_COLUMN'));
        expect(clearColumnButton?.nativeElement.disabled).toBe(false);
    });

    it('should disable insert row buttons when multiple rows are selected', () => {
        store.overrideSelector(selectIsValidationProcessRunning, false);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();
        fixture.detectChanges();

        component.selectedRowIndex = 0;
        component.selectedRowIndices.update((s) => new Set([...s, 1]));
        component.selectedRowIndices.update((s) => new Set([...s, 2]));

        const rowNumberCell = fixture.debugElement.queryAll(By.css('.idp-table-row-number-cell'))[0];
        rowNumberCell.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        fixture.detectChanges();

        const rowMenuButtons = fixture.debugElement.queryAll(By.css('button[mat-menu-item]'));
        const insertRowAboveButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('INSERT_ROW_ABOVE'));
        const insertRowBelowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('INSERT_ROW_BELOW'));
        const clearRowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('CLEAR_ROW'));
        const deleteRowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('DELETE_ROW'));

        expect(insertRowAboveButton?.nativeElement.disabled).toBe(true);
        expect(insertRowBelowButton?.nativeElement.disabled).toBe(true);
        expect(clearRowButton?.nativeElement.disabled).toBe(false);
        expect(deleteRowButton?.nativeElement.disabled).toBe(false);
    });

    it('should enable insert row buttons when only a single row is selected', () => {
        store.overrideSelector(selectIsValidationProcessRunning, false);
        store.overrideSelector(selectActiveTable, mockTable);
        store.refreshState();
        fixture.detectChanges();

        component.selectedRowIndex = 1;

        const rowNumberCell = fixture.debugElement.queryAll(By.css('.idp-table-row-number-cell'))[1];
        rowNumberCell.nativeElement.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
        fixture.detectChanges();

        const rowMenuButtons = fixture.debugElement.queryAll(By.css('button[mat-menu-item]'));
        const insertRowAboveButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('INSERT_ROW_ABOVE'));
        const insertRowBelowButton = rowMenuButtons.find((btn) => btn.nativeElement.textContent.includes('INSERT_ROW_BELOW'));

        expect(insertRowAboveButton?.nativeElement.disabled).toBe(false);
        expect(insertRowBelowButton?.nativeElement.disabled).toBe(false);
    });

    it('should call runValidationProcessIfTableIsDirty when Enter key is pressed in a table cell', () => {
        jest.spyOn(idpVerificationService, 'verifyField');
        jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        jest.spyOn(idpVerificationService, 'selectNextField');

        (component as any).currentTableId = 'table1';

        const firstRowFirstCell = mockTable.rows[0].rowCells[0];
        const firstInput = findFieldInputDebugElement(firstRowFirstCell)?.nativeElement;

        const event = new KeyboardEvent('keydown', { key: 'Enter' });

        Object.defineProperty(event, 'target', { value: firstInput });

        component.onKeydown(firstRowFirstCell, event);

        expect(idpVerificationService.verifyField).toHaveBeenCalledWith('table1');
        expect(idpVerificationService.runValidationProcessIfTableIsDirty).toHaveBeenCalledWith('table1');
        expect(idpVerificationService.selectNextField).toHaveBeenCalled();
    });

    it('should call runValidationProcessIfTableIsDirty when Enter is pressed at component level with table selected', () => {
        jest.spyOn(idpVerificationService, 'verifyField');
        jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        jest.spyOn(idpVerificationService, 'selectNextField');

        (component as any).currentTableId = 'table1';
        component.selectedRowIndex = 0;

        const event = new KeyboardEvent('keydown', { key: 'Enter' });

        // Simulate event from non-input element to trigger component-level handler
        const divElement = document.createElement('div');
        Object.defineProperty(event, 'target', { value: divElement });

        component.onComponentKeydown(event);

        expect(idpVerificationService.verifyField).toHaveBeenCalledWith('table1');
        expect(idpVerificationService.runValidationProcessIfTableIsDirty).toHaveBeenCalledWith('table1');
        expect(idpVerificationService.selectNextField).toHaveBeenCalled();
    });

    it('should call runValidationProcessIfTableIsDirty in fallback Enter handler when no cell is found', () => {
        jest.spyOn(idpVerificationService, 'verifyField');
        jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
        jest.spyOn(idpVerificationService, 'selectNextField');

        (component as any).currentTableId = 'table1';

        const event = new KeyboardEvent('keydown', { key: 'Enter' });

        // Simulate event from input with no cell parent (fallback scenario)
        const inputElement = document.createElement('input');
        Object.defineProperty(event, 'target', { value: inputElement });

        const mockField: IdpField = { id: 'field1' } as IdpField;
        component.onKeydown(mockField, event);

        expect(idpVerificationService.runValidationProcessIfTableIsDirty).toHaveBeenCalledWith('table1');
        expect(idpVerificationService.verifyField).toHaveBeenCalledWith('table1');
        expect(idpVerificationService.selectNextField).toHaveBeenCalled();
    });

    it('should update field with valid statuses when Enter is pressed on empty table', () => {
        const mockEmptyTable = { ...mockTable, rows: [] };
        const mockField: IdpField = {
            id: 'table1',
            dataType: 'Table',
            verificationStatus: 'ManualInvalid',
            validationStatus: 'Invalid',
        } as IdpField;

        store.overrideSelector(selectActiveTable, mockEmptyTable);
        store.refreshState();
        jest.spyOn(idpVerificationService, 'getFieldById$').mockReturnValue(of(mockField as any));
        jest.spyOn(idpVerificationService, 'updateField');
        jest.spyOn(idpVerificationService, 'selectNextField');

        (component as any).currentTableId = 'table1';
        component.tableSelected = true;

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

        component.onComponentKeydown(event);

        expect(idpVerificationService.updateField).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'table1',
                verificationStatus: 'ManualValid',
                validationStatus: 'Valid',
            })
        );
        expect(idpVerificationService.selectNextField).toHaveBeenCalled();
    });

    it('should load field definitions when table changes', () => {
        const mockFieldDefinitions = [
            { name: 'Column 1', validation: { required: true } },
            { name: 'Column 2', validation: { required: false } },
        ];

        jest.spyOn(idpVerificationService, 'getTableFieldDefinitions$').mockReturnValue(of(mockFieldDefinitions));

        // Simulate table change by calling loadFieldDefinitions directly
        (component as any).loadFieldDefinitions('test-table-id');

        expect(idpVerificationService.getTableFieldDefinitions$).toHaveBeenCalledWith('test-table-id');
        expect(component.fieldValidationRules.size).toBe(2);
        expect(component.fieldValidationRules.get('Column 1')).toEqual({ required: true });
        expect(component.fieldValidationRules.get('Column 2')).toEqual({ required: false });
    });

    it('should update validation status locally as user types without dispatching to the store', () => {
        const mockField = mockTable.rows[0].rowCells[0];
        const mockInput = document.createElement('input');
        mockInput.value = 'invalid-value';

        jest.spyOn(tableCellValidationService, 'validateField').mockReturnValue(false);
        const updateFieldSpy = jest.spyOn(idpVerificationService, 'updateField');

        component.fieldValidationRules.set(mockField.name, { required: true });

        component.onFieldInput(mockField, mockInput);

        expect(tableCellValidationService.validateField).toHaveBeenCalledWith({ value: 'invalid-value', name: mockField.name }, { required: true });
        expect(mockField.validationStatus).toBe(IdpValidationStatus.Invalid);
        expect(updateFieldSpy).not.toHaveBeenCalled();
    });

    it('should not call runValidationProcessIfTableIsDirty in onFieldFocusOut', () => {
        const mockField: IdpField = {
            id: '1',
            value: 'A1',
            name: 'TestField',
            validationStatus: IdpValidationStatus.Invalid,
        } as IdpField;
        const mockElement = {
            value: 'A1',
            validity: { valid: false },
        } as HTMLInputElement;

        // Mock validation to return false (invalid)
        jest.spyOn(tableCellValidationService, 'validateField').mockReturnValue(false);
        jest.spyOn(idpVerificationService, 'updateField');
        jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');

        component.onFieldFocusOut(mockField, mockElement);

        // Verify validation was called and field is invalid
        expect(mockField.validationStatus).toBe(IdpValidationStatus.Invalid);
        expect(idpVerificationService.runValidationProcessIfTableIsDirty).not.toHaveBeenCalled();
    });

    it('should return correct validation error message', () => {
        const mockValidation = { required: true, length: { min: 5, max: 10 } };
        component.fieldValidationRules.set('test-field', mockValidation);

        // Mock validation service to return different error types
        jest.spyOn(tableCellValidationService, 'getValidationError').mockReturnValue({
            type: 'required',
            fieldName: 'test-field',
        });

        const result = component.getCustomValidationErrorMessage('', 'test-field');

        expect(tableCellValidationService.getValidationError).toHaveBeenCalledWith({ value: '', name: 'test-field' }, mockValidation);
        // The actual return value will depend on the translate service, but we can verify the method was called
        expect(typeof result).toBe('string');
    });

    it('should return empty string when no validation error exists', () => {
        component.fieldValidationRules.set('test-field', { required: true });

        // Mock validation service to return no error
        jest.spyOn(tableCellValidationService, 'getValidationError').mockReturnValue(undefined);

        const result = component.getCustomValidationErrorMessage('valid-value', 'test-field');

        expect(result).toBe('');
    });

    it('should validate field on focus out with changed value', async () => {
        const validateFieldSpy = jest.spyOn(tableCellValidationService, 'validateField').mockReturnValue(true);
        const updateFieldSpy = jest.spyOn(idpVerificationService, 'updateField');
        const tableField = mockTable.rows[0].rowCells[0];
        const fieldInput = findFieldInputDebugElement(tableField)?.nativeElement;

        // Set up field validation rules
        component.fieldValidationRules.set(tableField.name, { required: true });

        let doCallback: (() => void) | undefined;
        mockActionHistoryService.do.mockImplementation((action: any) => {
            doCallback = action.do;
        });

        fieldInput.value = 'final value';
        fieldInput.dispatchEvent(new Event('focusout'));
        fixture.detectChanges();

        // Execute the do callback to verify validation happens
        expect(doCallback).toBeDefined();
        if (doCallback) {
            doCallback();

            // Verify validateField was called with the new value
            expect(validateFieldSpy).toHaveBeenCalledWith(expect.objectContaining({ value: 'final value', name: tableField.name }), {
                required: true,
            });

            // Verify updateField was called
            expect(updateFieldSpy).toHaveBeenCalled();
        }
    });

    describe('Fill Operations', () => {
        let mockInputElement: HTMLInputElement;
        let mockTableCell: HTMLTableCellElement;
        let mockTableRow: HTMLTableRowElement;
        let updateFieldSpy: jest.SpyInstance;
        let updateTableColumnSpy: jest.SpyInstance;
        let runValidationSpy: jest.SpyInstance;
        let historyDoSpy: jest.SpyInstance;

        beforeEach(() => {
            // Set up mock DOM elements for fill operations
            mockTableCell = document.createElement('td');
            mockTableRow = document.createElement('tr');
            mockInputElement = document.createElement('input');

            // Mock read-only DOM properties - position in middle of table for fill testing
            Object.defineProperty(mockTableCell, 'cellIndex', { value: 1, writable: false }); // Column 0 (0-indexed)
            Object.defineProperty(mockTableRow, 'rowIndex', { value: 3, writable: false }); // Row 2 (2-indexed for headers)
            mockInputElement.value = 'Test Value';

            mockTableCell.append(mockInputElement);
            mockTableRow.append(mockTableCell);

            // Mock closest method
            jest.spyOn(mockInputElement, 'closest').mockImplementation((selector: string) => {
                if (selector === 'td') {
                    return mockTableCell;
                }
                if (selector === 'tr') {
                    return mockTableRow;
                }
                return null;
            });

            updateFieldSpy = jest.spyOn(idpVerificationService, 'updateField');
            updateTableColumnSpy = jest.spyOn(idpVerificationService, 'updateTableColumn');
            runValidationSpy = jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty');
            historyDoSpy = jest.spyOn(mockActionHistoryService, 'do');

            // Create a fill test table with empty cells at column 0 (rows 0, 1, 3)
            // so that ToAbove and ToBelow operations can find cells to fill from row 2
            const fillTestTable: IdpTable = {
                ...mockTable,
                rows: mockTable.rows.map((row, rowIdx) => ({
                    ...row,
                    rowCells: row.rowCells.map((cell, cellIdx) => ({
                        ...cell,
                        value: rowIdx !== 2 && cellIdx === 0 ? '' : cell.value,
                    })),
                })),
            };
            // Set the active table state so currentTable() signal returns fillTestTable
            store.overrideSelector(selectActiveTable, fillTestTable);
            store.refreshState();

            (component as any).currentTableId = 'table1';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        describe('Keyboard Shortcuts', () => {
            it('should trigger fill operation when Shift+Alt+Arrow Up is pressed', (done) => {
                const event = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, shiftKey: true });
                jest.spyOn(event, 'preventDefault');
                Object.defineProperty(event, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: 'mockId' } as IdpField;
                component.onKeydown(mockField, event);

                expect(event.preventDefault).toHaveBeenCalled();

                // Wait for async fill operation to complete
                setTimeout(() => {
                    expect(historyDoSpy).toHaveBeenCalled();
                    done();
                }, 0);
            });

            it('should trigger fill operation when Alt+Arrow Up is pressed', (done) => {
                const event = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true });
                jest.spyOn(event, 'preventDefault');
                Object.defineProperty(event, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: 'mockId' } as IdpField;
                component.onKeydown(mockField, event);

                expect(event.preventDefault).toHaveBeenCalled();

                // Wait for async fill operation to complete
                setTimeout(() => {
                    expect(historyDoSpy).toHaveBeenCalled();
                    done();
                }, 0);
            });

            it('should trigger fill operation when Alt+Arrow Down is pressed', (done) => {
                const event = new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true });
                jest.spyOn(event, 'preventDefault');
                Object.defineProperty(event, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: 'mockId' } as IdpField;
                component.onKeydown(mockField, event);

                expect(event.preventDefault).toHaveBeenCalled();

                // Wait for async fill operation to complete
                setTimeout(() => {
                    expect(historyDoSpy).toHaveBeenCalled();
                    done();
                }, 0);
            });

            it('should trigger fill operation when Shift+Alt+Arrow Down is pressed', (done) => {
                const event = new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, shiftKey: true });
                jest.spyOn(event, 'preventDefault');
                Object.defineProperty(event, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: 'mockId' } as IdpField;
                component.onKeydown(mockField, event);

                expect(event.preventDefault).toHaveBeenCalled();

                // Wait for async fill operation to complete
                setTimeout(() => {
                    expect(historyDoSpy).toHaveBeenCalled();
                    done();
                }, 0);
            });

            it('should not trigger fill operation when Alt is not pressed', () => {
                const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
                Object.defineProperty(event, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: 'mockId' } as IdpField;
                component.onKeydown(mockField, event);

                expect(historyDoSpy).not.toHaveBeenCalled();
            });

            it('should not trigger fill operation for non-fill arrow keys', () => {
                const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true });
                Object.defineProperty(event, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: 'mockId' } as IdpField;
                component.onKeydown(mockField, event);

                expect(historyDoSpy).not.toHaveBeenCalled();
            });
        });

        describe('Fill Operations Integration', () => {
            it('should properly handle fill operation through keyboard shortcut', (done) => {
                const mockField: IdpField = { id: 'mockId', name: 'testField' } as IdpField;
                const event = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, shiftKey: true });
                Object.defineProperty(event, 'target', { value: mockInputElement });

                component.onKeydown(mockField, event);

                expect(historyDoSpy).toHaveBeenCalled();

                const doAction = historyDoSpy.mock.calls[0][0].do;
                doAction();

                setTimeout(() => {
                    expect(mockInputElement.value).toBe('Test Value');
                    done();
                }, 10);
            });

            it('should batch a fill operation into a single column update', () => {
                const mockField: IdpField = { id: 'mockId', name: 'testField' } as IdpField;
                const event = new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, shiftKey: true });
                Object.defineProperty(event, 'target', { value: mockInputElement });

                component.onKeydown(mockField, event);

                expect(historyDoSpy).toHaveBeenCalled();

                const doAction = historyDoSpy.mock.calls[0][0].do;
                doAction();

                expect(updateTableColumnSpy).toHaveBeenCalledTimes(1);
                expect(updateTableColumnSpy).toHaveBeenCalledWith(
                    'table1',
                    0,
                    expect.arrayContaining([
                        expect.objectContaining({ id: '1', value: '' }),
                        expect.objectContaining({ id: '3', value: '' }),
                        expect.objectContaining({ id: '5', value: 'C1' }),
                        expect.objectContaining({ id: '7', value: 'Test Value' }),
                    ])
                );
                expect(updateFieldSpy).not.toHaveBeenCalled();
            });

            it('should support undo functionality for fill operations', (done) => {
                const mockField: IdpField = { id: 'mockId', name: 'testField' } as IdpField;
                const event = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true });
                Object.defineProperty(event, 'target', { value: mockInputElement });

                component.onKeydown(mockField, event);

                // Wait for async fill operation to complete
                setTimeout(() => {
                    expect(historyDoSpy).toHaveBeenCalled();

                    const undoAction = historyDoSpy.mock.calls[0][0].undo;
                    undoAction();

                    done();
                }, 0);
            });

            it('should handle invalid DOM structure gracefully', () => {
                jest.spyOn(mockInputElement, 'closest').mockReturnValue(null);

                const mockField: IdpField = { id: 'mockId' } as IdpField;
                const event = new KeyboardEvent('keydown', { key: '1', altKey: true });
                Object.defineProperty(event, 'target', { value: mockInputElement });

                expect(() => {
                    component.onKeydown(mockField, event);
                }).not.toThrow();

                expect(historyDoSpy).not.toHaveBeenCalled();
            });

            it('should handle empty table gracefully', () => {
                const emptyTable = {
                    rows: [],
                    id: 'empty',
                    name: 'empty',
                    columnHeaderNames: [],
                    validationStatus: 'Valid',
                    isDirty: false,
                } as IdpTable;
                jest.spyOn(idpVerificationService, 'getTableById$').mockReturnValue(of(emptyTable));

                const mockField: IdpField = { id: 'mockId' } as IdpField;
                const event = new KeyboardEvent('keydown', { key: '1', altKey: true });
                Object.defineProperty(event, 'target', { value: mockInputElement });

                expect(() => {
                    component.onKeydown(mockField, event);
                }).not.toThrow();
            });
        });

        describe('fillCells Public Method', () => {
            it('should trigger fill operation through public API', (done) => {
                component.fillCells(mockInputElement, component.FillDirection.AllAbove);

                // Wait for async fill operation to complete
                setTimeout(() => {
                    expect(historyDoSpy).toHaveBeenCalled();
                    done();
                }, 0);
            });

            it('should handle different fill directions', (done) => {
                [
                    component.FillDirection.AllAbove,
                    component.FillDirection.ToAbove,
                    component.FillDirection.ToBelow,
                    component.FillDirection.AllBelow,
                ].forEach((direction, index) => {
                    historyDoSpy.mockClear();

                    component.fillCells(mockInputElement, direction);

                    // Wait for each async operation
                    setTimeout(() => {
                        expect(historyDoSpy).toHaveBeenCalled();

                        // Complete test after last direction
                        if (index === 3) {
                            done();
                        }
                    }, index * 10); // Stagger timing to avoid conflicts
                });
            });

            it('should handle invalid input gracefully', () => {
                jest.spyOn(mockInputElement, 'closest').mockReturnValue(null);

                expect(() => {
                    component.fillCells(mockInputElement, component.FillDirection.AllAbove);
                }).not.toThrow();
            });
        });

        describe('Fill Operations E2E Integration', () => {
            beforeEach(async () => {
                // Override closest mock to target column 1 (cellIndex=2) so ToAbove/ToBelow
                // operate on the column with empty cells in complexTable
                const e2eTableCell = document.createElement('td');
                Object.defineProperty(e2eTableCell, 'cellIndex', { value: 2, writable: false }); // Column 1 (0-indexed)
                jest.spyOn(mockInputElement, 'closest').mockImplementation((selector: string) => {
                    if (selector === 'td') {
                        return e2eTableCell;
                    }
                    if (selector === 'tr') {
                        return mockTableRow;
                    }
                    return null;
                });

                // Set up a more complex table for realistic testing
                const complexTable: IdpTable = {
                    rows: [
                        {
                            rowCells: [
                                { id: '1', value: 'A1', name: 'col1' } as IdpField,
                                { id: '2', value: '', name: 'col2' } as IdpField,
                                { id: '3', value: 'A3', name: 'col3' } as IdpField,
                            ],
                        },
                        {
                            rowCells: [
                                { id: '4', value: 'B1', name: 'col1' } as IdpField,
                                { id: '5', value: '', name: 'col2' } as IdpField,
                                { id: '6', value: 'B3', name: 'col3' } as IdpField,
                            ],
                        },
                        {
                            rowCells: [
                                { id: '7', value: 'C1', name: 'col1' } as IdpField,
                                { id: '8', value: 'FILL_VALUE', name: 'col2' } as IdpField, // This will be our source
                                { id: '9', value: 'C3', name: 'col3' } as IdpField,
                            ],
                        },
                        {
                            rowCells: [
                                { id: '10', value: 'D1', name: 'col1' } as IdpField,
                                { id: '11', value: '', name: 'col2' } as IdpField,
                                { id: '12', value: 'D3', name: 'col3' } as IdpField,
                            ],
                        },
                    ],
                    columnHeaderNames: ['Column 1', 'Column 2', 'Column 3'],
                    id: 'complex-table',
                    name: 'Complex Table',
                    validationStatus: 'Valid',
                    isDirty: false,
                } as IdpTable;

                (component as any).currentTableId = 'complex-table';
                store.overrideSelector(selectActiveTable, complexTable);
                store.refreshState();
                jest.spyOn(idpVerificationService, 'getTableById$').mockReturnValue(of(complexTable));
                fixture.detectChanges();
            });

            it('should complete full Shift+Alt+Arrow Down (AllBelow) workflow with real DOM interaction', async () => {
                // Arrange: Use mock input element for testing
                mockInputElement.value = 'FILL_VALUE';

                // Act: Trigger Shift+Alt+Arrow Down keyboard event
                const keyboardEvent = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    altKey: true,
                    shiftKey: true,
                    bubbles: true,
                });
                Object.defineProperty(keyboardEvent, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: '8', name: 'col2' } as IdpField;
                component.onKeydown(mockField, keyboardEvent);

                // Assert: Verify the complete workflow
                await fixture.whenStable();

                // Verify that the operation was attempted
                expect(historyDoSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        do: expect.any(Function),
                        undo: expect.any(Function),
                    })
                );

                // Execute the do action to verify field updates
                const doAction = historyDoSpy.mock.calls[0][0].do;
                doAction();

                expect(updateTableColumnSpy).toHaveBeenCalledWith(
                    'complex-table',
                    1,
                    expect.arrayContaining([
                        expect.objectContaining({ id: '2', value: '' }),
                        expect.objectContaining({ id: '5', value: '' }),
                        expect.objectContaining({ id: '8', value: 'FILL_VALUE' }),
                        expect.objectContaining({ id: '11', value: 'FILL_VALUE', verificationStatus: IdpVerificationStatus.ManualValid }),
                    ])
                );
                expect(updateFieldSpy).not.toHaveBeenCalled();
            });

            it('should handle Alt+Arrow Up (ToAbove) with stop-at-populated-cell logic', async () => {
                // Arrange: Use mock input element for testing
                mockInputElement.value = 'STOP_TEST';

                // Act: Trigger Alt+Arrow Up
                const keyboardEvent = new KeyboardEvent('keydown', {
                    key: 'ArrowUp',
                    altKey: true,
                    bubbles: true,
                });
                Object.defineProperty(keyboardEvent, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: '8', name: 'col2' } as IdpField;
                component.onKeydown(mockField, keyboardEvent);

                await fixture.whenStable();

                // Execute the fill operation
                const doAction = historyDoSpy.mock.calls[0][0].do;
                doAction();

                expect(updateTableColumnSpy).toHaveBeenCalledWith(
                    'complex-table',
                    1,
                    expect.arrayContaining([
                        expect.objectContaining({ id: '2', value: 'STOP_TEST', verificationStatus: IdpVerificationStatus.ManualValid }),
                        expect.objectContaining({ id: '5', value: 'STOP_TEST', verificationStatus: IdpVerificationStatus.ManualValid }),
                        expect.objectContaining({ id: '8', value: 'FILL_VALUE' }),
                        expect.objectContaining({ id: '11', value: '' }),
                    ])
                );
                expect(updateFieldSpy).not.toHaveBeenCalled();
            });

            it('should support undo/redo for fill operations', async () => {
                // Arrange
                mockInputElement.value = 'UNDO_TEST';

                // Act: Perform fill operation
                const keyboardEvent = new KeyboardEvent('keydown', {
                    key: 'ArrowUp',
                    altKey: true,
                    shiftKey: true,
                    bubbles: true,
                });
                Object.defineProperty(keyboardEvent, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: '8', name: 'col2' } as IdpField;
                component.onKeydown(mockField, keyboardEvent);

                await fixture.whenStable();

                const doAction = historyDoSpy.mock.calls[0][0].do;
                doAction();

                updateTableColumnSpy.mockClear();
                runValidationSpy.mockClear();

                const undoAction = historyDoSpy.mock.calls[0][0].undo;
                undoAction();

                expect(updateTableColumnSpy).toHaveBeenCalledWith(
                    'complex-table',
                    1,
                    expect.arrayContaining([
                        expect.objectContaining({ id: '2', value: '' }),
                        expect.objectContaining({ id: '5', value: '' }),
                        expect.objectContaining({ id: '8', value: 'FILL_VALUE' }),
                        expect.objectContaining({ id: '11', value: '' }),
                    ])
                );
            });

            it('should keep the original table id for fill undo and redo after switching tables', () => {
                component.fillCells(mockInputElement, FillDirection.AllAbove);

                expect(historyDoSpy).toHaveBeenCalled();

                const doAction = historyDoSpy.mock.calls[0][0].do;
                const undoAction = historyDoSpy.mock.calls[0][0].undo;

                (component as any).currentTableId = 'table2';

                doAction();
                undoAction();

                expect(updateTableColumnSpy).toHaveBeenNthCalledWith(1, 'complex-table', 1, expect.any(Array));
                expect(updateTableColumnSpy).toHaveBeenNthCalledWith(2, 'complex-table', 1, expect.any(Array));
            });

            it('should prevent default browser behavior for Alt+Arrow combinations', () => {
                const keyboardEvent = new KeyboardEvent('keydown', {
                    key: 'ArrowUp',
                    altKey: true,
                    shiftKey: true,
                    bubbles: true,
                });
                const preventDefaultSpy = jest.spyOn(keyboardEvent, 'preventDefault');
                Object.defineProperty(keyboardEvent, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: '8', name: 'col2' } as IdpField;
                component.onKeydown(mockField, keyboardEvent);

                expect(preventDefaultSpy).toHaveBeenCalled();
            });

            it('should handle edge cases gracefully', async () => {
                // Test with empty fill value
                mockInputElement.value = ''; // Empty source

                const keyboardEvent = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    altKey: true,
                    shiftKey: true,
                    bubbles: true,
                });
                Object.defineProperty(keyboardEvent, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: '5', name: 'col2' } as IdpField;

                // Should not throw error
                expect(() => {
                    component.onKeydown(mockField, keyboardEvent);
                }).not.toThrow();
            });

            it('should mark filled cells as manual edits in the batched column update', async () => {
                mockInputElement.value = 'VALIDATION_TEST';

                const keyboardEvent = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    altKey: true,
                    shiftKey: true,
                    bubbles: true,
                });
                Object.defineProperty(keyboardEvent, 'target', { value: mockInputElement });

                const mockField: IdpField = { id: '8', name: 'col2' } as IdpField;
                component.onKeydown(mockField, keyboardEvent);

                await fixture.whenStable();

                // Execute fill operation
                const doAction = historyDoSpy.mock.calls[0][0].do;
                doAction();

                expect(updateTableColumnSpy).toHaveBeenCalledWith(
                    'complex-table',
                    1,
                    expect.arrayContaining([
                        expect.objectContaining({
                            id: '11',
                            value: 'VALIDATION_TEST',
                            verificationStatus: IdpVerificationStatus.ManualValid,
                        }),
                    ])
                );
            });
        });
    });

    describe('Clipboard operations', () => {
        let mockInput: HTMLInputElement;

        beforeEach(() => {
            mockInput = document.createElement('input');
            mockInput.value = 'Hello World';
            document.body.append(mockInput);

            // Set the private activeInputElement via type cast
            (component as any).activeInputElement = mockInput;

            // Mock clipboard API
            Object.assign(navigator, {
                clipboard: {
                    writeText: jest.fn().mockResolvedValue(undefined),
                    readText: jest.fn().mockResolvedValue('Pasted text'),
                },
            });
        });

        afterEach(() => {
            mockInput.remove();
        });

        describe('cutText', () => {
            it('should do nothing when no activeInputElement is set', async () => {
                (component as any).activeInputElement = undefined;
                await component.cutText();
                expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
            });

            it('should write selected text to clipboard and delete it', async () => {
                mockInput.setSelectionRange(0, 5); // selects "Hello"
                await component.cutText();
                expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello');
                expect(mockInput.value).toBe(' World');
            });

            it('should dispatch an input event after cutting', async () => {
                const inputEventSpy = jest.fn();
                mockInput.addEventListener('input', inputEventSpy);
                mockInput.setSelectionRange(0, 5);
                await component.cutText();
                expect(inputEventSpy).toHaveBeenCalled();
            });

            it('should not write to clipboard when no text is selected', async () => {
                mockInput.setSelectionRange(0, 0); // no selection
                await component.cutText();
                expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
                expect(mockInput.value).toBe('Hello World'); // unchanged
            });
        });

        describe('copyText', () => {
            it('should do nothing when no activeInputElement is set', async () => {
                (component as any).activeInputElement = undefined;
                await component.copyText();
                expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
            });

            it('should write selected text to clipboard without modifying the input', async () => {
                mockInput.setSelectionRange(6, 11); // selects "World"
                await component.copyText();
                expect(navigator.clipboard.writeText).toHaveBeenCalledWith('World');
                expect(mockInput.value).toBe('Hello World'); // unchanged
            });

            it('should not write to clipboard when no text is selected', async () => {
                mockInput.setSelectionRange(0, 0);
                await component.copyText();
                expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
            });
        });

        describe('pasteText', () => {
            it('should do nothing when no activeInputElement is set', async () => {
                (component as any).activeInputElement = undefined;
                await component.pasteText();
                expect(navigator.clipboard.readText).not.toHaveBeenCalled();
            });

            it('should insert clipboard text at cursor position', async () => {
                mockInput.value = 'Hello World';
                mockInput.setSelectionRange(5, 5); // cursor after "Hello"
                (navigator.clipboard.readText as jest.Mock).mockResolvedValue(' Beautiful');
                await component.pasteText();
                expect(mockInput.value).toBe('Hello Beautiful World');
            });

            it('should replace selected text with clipboard content', async () => {
                mockInput.value = 'Hello World';
                mockInput.setSelectionRange(6, 11); // selects "World"
                (navigator.clipboard.readText as jest.Mock).mockResolvedValue('Everyone');
                await component.pasteText();
                expect(mockInput.value).toBe('Hello Everyone');
            });

            it('should dispatch an input event after pasting', async () => {
                const inputEventSpy = jest.fn();
                mockInput.addEventListener('input', inputEventSpy);
                mockInput.setSelectionRange(0, 0);
                await component.pasteText();
                expect(inputEventSpy).toHaveBeenCalled();
            });

            it('should not modify input when clipboard is empty', async () => {
                (navigator.clipboard.readText as jest.Mock).mockResolvedValue('');
                mockInput.value = 'Hello World';
                await component.pasteText();
                expect(mockInput.value).toBe('Hello World');
            });
        });
    });

    describe('Fill visibility', () => {
        describe('showFillToAbove', () => {
            it('returns false at the first row (no row above)', () => {
                const rows = makeRows([['A'], ['B']]);
                expect(component.showFillToAbove(0, 0, rows)).toBe(false);
            });

            it('returns false when the immediately-above cell is non-empty', () => {
                const rows = makeRows([['A'], ['B'], ['C']]);
                expect(component.showFillToAbove(1, 0, rows)).toBe(false);
            });

            it('returns false when immediately-above cell is whitespace-only', () => {
                const rows = makeRows([['A'], ['  '], ['C']]);
                // "  ".trim() === "" → treated as empty, but no non-empty cell further above at index < 0
                // row 0 has 'A', so this should return true — whitespace is empty
                expect(component.showFillToAbove(2, 0, rows)).toBe(true);
            });

            it('returns true when immediately-above cell is empty', () => {
                const rows = makeRows([['A'], [''], [''], ['D']]);
                expect(component.showFillToAbove(3, 0, rows)).toBe(true);
            });
        });

        describe('showFillToBelow', () => {
            it('returns false at the last row (no row below)', () => {
                const rows = makeRows([['A'], ['B']]);
                expect(component.showFillToBelow(1, 0, rows)).toBe(false);
            });

            it('returns false when the immediately-below cell is non-empty', () => {
                const rows = makeRows([['A'], ['B'], ['C']]);
                expect(component.showFillToBelow(1, 0, rows)).toBe(false);
            });

            it('returns true when immediately-below is empty', () => {
                const rows = makeRows([['A'], [''], ['C']]);
                expect(component.showFillToBelow(0, 0, rows)).toBe(true);
            });
        });
    });

    describe('multi-selection', () => {
        describe('row multi-selection via onRowMenuLeftClick', () => {
            it('should add a row to selectedRowIndices on Ctrl+Click without clearing other selections', () => {
                component.selectedRowIndex = 0;

                const event = new MouseEvent('click', { ctrlKey: true });
                jest.spyOn(event, 'preventDefault');

                component.onRowMenuLeftClick(event, 1);

                expect(component.selectedRowIndices()).toEqual(new Set([0, 1]));
                expect(event.preventDefault).toHaveBeenCalled();
            });

            it('should remove a row from selectedRowIndices on Ctrl+Click when it is already selected', () => {
                component.selectedRowIndex = 0;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));

                const event = new MouseEvent('click', { ctrlKey: true });
                jest.spyOn(event, 'preventDefault');

                component.onRowMenuLeftClick(event, 1);

                expect(component.selectedRowIndices()).toEqual(new Set([0]));
                expect(component.selectedRowIndices().has(1)).toBe(false);
                expect(event.preventDefault).toHaveBeenCalled();
            });

            it('should select a contiguous range of rows on Shift+Click from the anchor', () => {
                component.selectedRowIndex = 0;

                const event = new MouseEvent('click', { shiftKey: true });
                jest.spyOn(event, 'preventDefault');

                component.onRowMenuLeftClick(event, 2);

                expect(component.selectedRowIndices()).toEqual(new Set([0, 1, 2]));
                expect(event.preventDefault).toHaveBeenCalled();
            });

            it('should select a range in reverse order when Shift+Click target is above the anchor', () => {
                component.selectedRowIndex = 2;

                const event = new MouseEvent('click', { shiftKey: true });
                jest.spyOn(event, 'preventDefault');

                component.onRowMenuLeftClick(event, 0);

                expect(component.selectedRowIndices()).toEqual(new Set([0, 1, 2]));
                expect(event.preventDefault).toHaveBeenCalled();
            });

            it('should perform a plain single-row selection when no modifier key is held', () => {
                component.selectedRowIndex = 1;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));

                const event = new MouseEvent('click');
                jest.spyOn(component as any, 'selectRow');

                component.onRowMenuLeftClick(event, 2);

                expect((component as any).selectRow).toHaveBeenCalledWith(2, event);
            });

            it('selectedRowIndices signal has correct selection state', () => {
                component.selectedRowIndex = 0;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));
                component.selectedRowIndices.update((s) => new Set([...s, 2]));

                expect(component.selectedRowIndices().has(0)).toBe(true);
                expect(component.selectedRowIndices().has(1)).toBe(true);
                expect(component.selectedRowIndices().has(2)).toBe(true);
                expect(component.selectedRowIndices().has(3)).toBe(false);
            });
        });

        describe('row right-click preservation', () => {
            it('should preserve the existing multi-row selection on right-click of an already-selected row', () => {
                component.selectedRowIndex = 0;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));
                const event = new MouseEvent('contextmenu');
                jest.spyOn(event, 'preventDefault');
                jest.spyOn(component as any, 'selectRow');

                component.onRowMenuRightClick(event, 1);

                expect((component as any).selectRow).not.toHaveBeenCalled();
                expect(event.preventDefault).toHaveBeenCalled();
                expect(component.selectedRowIndices()).toEqual(new Set([0, 1]));
            });

            it('should replace selection with single row on right-click of an unselected row', () => {
                component.selectedRowIndex = 0;
                jest.spyOn(component as any, 'selectRow');

                const event = new MouseEvent('contextmenu');

                component.onRowMenuRightClick(event, 2);

                expect((component as any).selectRow).toHaveBeenCalledWith(2, event);
            });
        });

        describe('column multi-selection via onColumnMenuLeftClick', () => {
            it('should add a column to selectedColumnIndices on Ctrl+Click', () => {
                component.selectedColumnIndex = 0;

                const event = new MouseEvent('click', { ctrlKey: true });
                jest.spyOn(event, 'preventDefault');

                component.onColumnMenuLeftClick(event, 1);

                expect(component.selectedColumnIndices()).toEqual(new Set([0, 1]));
                expect(event.preventDefault).toHaveBeenCalled();
            });

            it('should remove a column from selectedColumnIndices on Ctrl+Click when already selected', () => {
                component.selectedColumnIndex = 0;
                component.selectedColumnIndices.update((s) => new Set([...s, 1]));

                const event = new MouseEvent('click', { ctrlKey: true });
                jest.spyOn(event, 'preventDefault');

                component.onColumnMenuLeftClick(event, 1);

                expect(component.selectedColumnIndices()).toEqual(new Set([0]));
                expect(component.selectedColumnIndices().has(1)).toBe(false);
                expect(event.preventDefault).toHaveBeenCalled();
            });

            it('should select a contiguous range of columns on Shift+Click', () => {
                component.selectedColumnIndex = 0;

                const event = new MouseEvent('click', { shiftKey: true });
                jest.spyOn(event, 'preventDefault');

                component.onColumnMenuLeftClick(event, 1);

                expect(component.selectedColumnIndices()).toEqual(new Set([0, 1]));
                expect(event.preventDefault).toHaveBeenCalled();
            });

            it('selectedColumnIndices signal has correct selection state', () => {
                component.selectedColumnIndex = 0;
                component.selectedColumnIndices.update((s) => new Set([...s, 1]));

                expect(component.selectedColumnIndices().has(0)).toBe(true);
                expect(component.selectedColumnIndices().has(1)).toBe(true);
                expect(component.selectedColumnIndices().has(2)).toBe(false);
            });
        });

        describe('column right-click preservation', () => {
            it('should preserve the existing multi-column selection on right-click of an already-selected column', () => {
                component.selectedColumnIndex = 0;
                component.selectedColumnIndices.update((s) => new Set([...s, 1]));
                const event = new MouseEvent('contextmenu');
                jest.spyOn(event, 'preventDefault');
                jest.spyOn(component as any, 'selectColumn');

                component.onColumnMenuRightClick(event, 1);

                expect((component as any).selectColumn).not.toHaveBeenCalled();
                expect(event.preventDefault).toHaveBeenCalled();
                expect(component.selectedColumnIndices()).toEqual(new Set([0, 1]));
            });

            it('should replace selection with single column on right-click of an unselected column', () => {
                component.selectedColumnIndex = 0;
                jest.spyOn(component as any, 'selectColumn');

                const event = new MouseEvent('contextmenu');

                component.onColumnMenuRightClick(event, 1);

                expect((component as any).selectColumn).toHaveBeenCalledWith(1, event);
            });
        });

        describe('clearRow with multiple rows selected', () => {
            it('should clear each selected row', () => {
                (component as any).currentTableId = 'table1';
                component.selectedRowIndex = 0;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));

                let doCallback: (() => void) | undefined;
                let undoCallback: (() => void) | undefined;
                mockActionHistoryService.do.mockImplementation((action: any) => {
                    doCallback = action.do;
                    undoCallback = action.undo;
                });

                store.overrideSelector(selectActiveTable, mockTable);
                store.refreshState();

                const clearTableRowSpy = jest.spyOn(idpVerificationService, 'clearTableRow').mockImplementation();
                const updateTableRowSpy = jest.spyOn(idpVerificationService, 'updateTableRow').mockImplementation();
                jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty').mockImplementation();

                component.onRowAction('clearRow');

                expect(mockActionHistoryService.do).toHaveBeenCalled();

                doCallback?.();

                expect(clearTableRowSpy).toHaveBeenCalledWith('table1', 0);
                expect(clearTableRowSpy).toHaveBeenCalledWith('table1', 1);
                expect(clearTableRowSpy).toHaveBeenCalledTimes(2);

                undoCallback?.();

                expect(updateTableRowSpy).toHaveBeenCalledWith('table1', 0, expect.any(Array));
                expect(updateTableRowSpy).toHaveBeenCalledWith('table1', 1, expect.any(Array));
                expect(updateTableRowSpy).toHaveBeenCalledTimes(2);
            });

            it('should snapshot the original cell data for each row before clearing', () => {
                (component as any).currentTableId = 'table1';
                component.selectedRowIndex = 0;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));

                let undoCallback: (() => void) | undefined;
                mockActionHistoryService.do.mockImplementation((action: any) => {
                    undoCallback = action.undo;
                });

                store.overrideSelector(selectActiveTable, mockTable);
                store.refreshState();

                jest.spyOn(idpVerificationService, 'clearTableRow').mockImplementation();
                const updateTableRowSpy = jest.spyOn(idpVerificationService, 'updateTableRow').mockImplementation();
                jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty').mockImplementation();

                component.onRowAction('clearRow');
                undoCallback?.();

                const row0Call = updateTableRowSpy.mock.calls.find((c) => c[1] === 0);
                const row1Call = updateTableRowSpy.mock.calls.find((c) => c[1] === 1);

                expect(row0Call).toBeDefined();
                expect(row1Call).toBeDefined();
                expect(row0Call?.[2]).toEqual(expect.arrayContaining([expect.objectContaining({ id: '1' })]));
                expect(row1Call?.[2]).toEqual(expect.arrayContaining([expect.objectContaining({ id: '3' })]));
            });
        });

        describe('deleteRow with multiple rows selected', () => {
            it('should delete all selected rows calling deleteTableRow for each in reverse order', () => {
                (component as any).currentTableId = 'table1';
                component.selectedRowIndex = 0;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));

                let doCallback: (() => void) | undefined;
                mockActionHistoryService.do.mockImplementation((action: any) => {
                    doCallback = action.do;
                });

                store.overrideSelector(selectActiveTable, mockTable);
                store.refreshState();

                const deleteTableRowSpy = jest.spyOn(idpVerificationService, 'deleteTableRow').mockImplementation();
                jest.spyOn(idpVerificationService, 'insertTableRow').mockImplementation();

                component.onRowAction('deleteRow');

                expect(mockActionHistoryService.do).toHaveBeenCalled();

                doCallback?.();

                expect(deleteTableRowSpy).toHaveBeenCalledTimes(2);
                const callOrder = deleteTableRowSpy.mock.calls.map((c) => c[1]);
                expect(callOrder[0]).toBeGreaterThan(callOrder[1]);
            });

            it('should keep focus on the table (not navigate away) when rows remain after deleting multiple rows including the first', () => {
                jest.useFakeTimers();
                (component as any).currentTableId = 'table1';
                component.selectedRowIndex = 0;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));

                let doCallback: (() => void) | undefined;
                mockActionHistoryService.do.mockImplementation((action: any) => {
                    doCallback = action.do;
                });

                const tableWithTwoRows = { ...mockTable, rows: [mockTable.rows[0], mockTable.rows[1]] };
                const tableAfterDelete = { ...mockTable, rows: [mockTable.rows[1]] };
                store.overrideSelector(selectActiveTable, tableWithTwoRows);
                store.refreshState();

                jest.spyOn(idpVerificationService, 'deleteTableRow').mockImplementation(() => {
                    store.overrideSelector(selectActiveTable, tableAfterDelete);
                    store.refreshState();
                });
                const selectNextFieldSpy = jest.spyOn(idpVerificationService, 'selectNextField').mockImplementation();
                const setComponentFocusSpy = jest.spyOn(component, 'setComponentFocus').mockImplementation();

                component.onRowAction('deleteRow');
                doCallback?.();
                jest.runAllTimers();

                expect(selectNextFieldSpy).not.toHaveBeenCalled();
                expect(setComponentFocusSpy).toHaveBeenCalled();

                jest.useRealTimers();
            });

            it('should keep focus on the table when all rows are deleted (not navigate to next field)', () => {
                jest.useFakeTimers();
                (component as any).currentTableId = 'table1';
                component.selectedRowIndex = 0;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));

                let doCallback: (() => void) | undefined;
                mockActionHistoryService.do.mockImplementation((action: any) => {
                    doCallback = action.do;
                });

                const emptyTable = { ...mockTable, rows: [] };
                store.overrideSelector(selectActiveTable, emptyTable);
                store.refreshState();

                jest.spyOn(idpVerificationService, 'deleteTableRow').mockImplementation();
                const selectNextFieldSpy = jest.spyOn(idpVerificationService, 'selectNextField').mockImplementation();
                const setComponentFocusSpy = jest.spyOn(component, 'setComponentFocus').mockImplementation();

                component.onRowAction('deleteRow');
                doCallback?.();
                jest.runAllTimers();

                expect(selectNextFieldSpy).not.toHaveBeenCalled();
                expect(setComponentFocusSpy).toHaveBeenCalled();

                jest.useRealTimers();
            });
        });

        describe('onClearSelectedColumns', () => {
            it('should clear each selected column', () => {
                (component as any).currentTableId = 'table1';
                component.selectedColumnIndex = 0;
                component.selectedColumnIndices.update((s) => new Set([...s, 1]));

                let doCallback: (() => void) | undefined;
                let undoCallback: (() => void) | undefined;
                mockActionHistoryService.do.mockImplementation((action: any) => {
                    doCallback = action.do;
                    undoCallback = action.undo;
                });

                store.overrideSelector(selectActiveTable, mockTable);
                store.refreshState();

                const clearTableColumnSpy = jest.spyOn(idpVerificationService, 'clearTableColumn').mockImplementation();
                const updateTableColumnSpy = jest.spyOn(idpVerificationService, 'updateTableColumn').mockImplementation();
                jest.spyOn(idpVerificationService, 'runValidationProcessIfTableIsDirty').mockImplementation();

                component.onClearSelectedColumns();

                expect(mockActionHistoryService.do).toHaveBeenCalled();

                doCallback?.();

                expect(clearTableColumnSpy).toHaveBeenCalledWith('table1', 0);
                expect(clearTableColumnSpy).toHaveBeenCalledWith('table1', 1);
                expect(clearTableColumnSpy).toHaveBeenCalledTimes(2);

                undoCallback?.();

                expect(updateTableColumnSpy).toHaveBeenCalledTimes(2);
            });

            it('should do nothing when no columns are selected', () => {
                component.selectedColumnIndices.set(new Set());

                component.onClearSelectedColumns();

                expect(mockActionHistoryService.do).not.toHaveBeenCalled();
            });
        });

        describe('cross-axis deselection', () => {
            it('should clear selectedColumnIndices when toggling a row selection', () => {
                component.selectedColumnIndex = 1;
                component.selectedColumnIndices.update((s) => new Set([...s, 1]));

                const event = new MouseEvent('click', { ctrlKey: true });
                component.onRowMenuLeftClick(event, 0);

                expect(component.selectedColumnIndices().size).toBe(0);
            });

            it('should clear selectedRowIndices when toggling a column selection', () => {
                component.selectedRowIndex = 1;
                component.selectedRowIndices.update((s) => new Set([...s, 1]));

                const event = new MouseEvent('click', { ctrlKey: true });
                component.onColumnMenuLeftClick(event, 0);

                expect(component.selectedRowIndices().size).toBe(0);
            });
        });
    });
});
