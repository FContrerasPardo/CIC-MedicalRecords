/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, input, output, signal, WritableSignal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { SORT_OPTION } from '../../../definitions/dashboard.constants';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-sorting-picker-control',
    imports: [MatFormFieldModule, MatSelectModule, MatIconModule, TranslatePipe],
    templateUrl: './sorting-picker-control.component.html',
    styleUrl: './sorting-picker-control.component.scss',
})
export class SortingPickerControlComponent {
    selected = input<string | undefined>();
    optionChange = output<string | null>();
    disabled = input<boolean>(false);

    internalSelected: WritableSignal<string> = signal(SORT_OPTION.ValueDesc);

    readonly SORT_OPTION = SORT_OPTION;

    constructor() {
        if (this.selected()) {
            const selectedValue = this.selected() ?? SORT_OPTION.ValueDesc;
            this.internalSelected.set(selectedValue);
        }
    }

    onSelect(val: string | null) {
        if (val) {
            this.internalSelected.set(val);
            this.optionChange.emit(val);
        }
    }
}
