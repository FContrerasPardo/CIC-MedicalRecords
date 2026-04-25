/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'hxp-search-box',
    imports: [CommonModule, MatFormFieldModule, MatInputModule, MatIconModule, FormsModule, TranslatePipe, MatButtonModule],
    templateUrl: './search-box.component.html',
    styleUrl: './search-box.component.scss',
})
export class SearchBoxComponent {
    @Input() placeholder = '';
    @Input() disabled = false;
    @Input() searchText = '';

    // eslint-disable-next-line @angular-eslint/no-output-native
    @Output() search = new EventEmitter<string>();
    @Output() cleared = new EventEmitter<void>();
    @Output() inputChange = new EventEmitter<string>();

    onInputChange(): void {
        this.inputChange.emit(this.searchText);
    }

    clearSearch(): void {
        this.searchText = '';
        this.onInputChange();
    }

    onSearchClick(): void {
        this.search.emit(this.searchText.trim());
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.clearSearch();
            event.stopPropagation();
        } else if (event.key === 'Enter') {
            this.search.emit(this.searchText.trim());
        }
    }
}
