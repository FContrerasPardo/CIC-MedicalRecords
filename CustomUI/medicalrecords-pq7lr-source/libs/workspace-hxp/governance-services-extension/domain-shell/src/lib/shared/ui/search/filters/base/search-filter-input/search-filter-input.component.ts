/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'hxp-governance-search-filter-input',
    imports: [FormsModule, MatIconModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatButtonModule, TranslatePipe],
    templateUrl: './search-filter-input.component.html',
    styleUrl: './search-filter-input.component.scss',
})
export class SearchFilterInputComponent {
    @Input() applyOnEnter?: boolean = false;
    @Input() inputAriaLabel?: string;
    @Input() placeholder?: string;
    @Input() clearAriaLabel?: string;
    @Input() prefixIcon?: string;
    @Input() prefixAriaLabel?: string;

    // eslint-disable-next-line @angular-eslint/no-output-native
    @Output() search = new EventEmitter<string>();
    @Output() clear = new EventEmitter<void>();
    @Output() prefixClick = new EventEmitter<void>();

    searchTerm = '';

    applyFilter(event: KeyboardEvent): void {
        if (!this.applyOnEnter) {
            this.emitSearch();
        } else if (event.key === 'Enter') {
            this.emitSearch();
        }
    }

    emitSearch(): void {
        this.search.emit(this.searchTerm);
    }

    clearInput(): void {
        this.searchTerm = '';
        this.clear.emit();
    }

    onPrefixClick(): void {
        this.prefixClick.emit();
    }
}
