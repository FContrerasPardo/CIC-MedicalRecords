/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, inject, input, output, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { WidgetId } from '../../../definitions/dashboard.constants';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatChipsModule } from '@angular/material/chips';

@Component({
    selector: 'hxp-month-picker-control',
    imports: [MatButtonModule, MatIconModule, MatDatepickerModule, MatInputModule, MatFormFieldModule, TranslatePipe, MatChipsModule],
    templateUrl: './month-picker-control.component.html',
    styleUrl: './month-picker-control.component.scss',
})
export class MonthPickerControlComponent {
    selectedMonth = input<Date | undefined>();
    widgetId = input.required<WidgetId>();
    monthChange = output<{ date: Date; widgetId: WidgetId }>();

    picker = viewChild<MatDatepicker<Date>>('picker');

    private readonly translate: TranslateService = inject(TranslateService);

    get label(): string {
        const selected = this.selectedMonth();

        if (!selected) {
            return '';
        }

        const now = new Date();
        const isThisMonth = selected.getFullYear() === now.getFullYear() && selected.getMonth() === now.getMonth();

        return isThisMonth
            ? this.translate.instant('GOVERNANCE.DASHBOARD.THIS_MONTH')
            : selected.toLocaleString('default', { month: 'short', year: 'numeric' });
    }

    open() {
        this.picker()?.open();
    }

    onMonthSelected(date: Date) {
        this.monthChange.emit({ date, widgetId: this.widgetId() });
        this.picker()?.close();
    }

    isMonthChipActive(): boolean {
        const selected = this.selectedMonth();
        if (!selected) {
            return false;
        }

        const now = new Date();
        const isCurrent = selected.getFullYear() === now.getFullYear() && selected.getMonth() === now.getMonth();

        return !isCurrent;
    }
}
