/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer } from '@angular/platform-browser';
import { SatIconModule } from '@hylandsoftware/satori-ui';

@Component({
    selector: 'hxp-search-filter-input',
    imports: [CommonModule, FormsModule, MatIconModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatButtonModule, SatIconModule],
    templateUrl: './search-filter-input.component.html',
    styleUrls: ['./search-filter-input.component.scss'],
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

    private readonly matIconRegistry = inject(MatIconRegistry);
    private readonly domSanitizer = inject(DomSanitizer);

    constructor() {
        const icons: Record<string, string> = {
            search_glass: 'assets/search-icons/Search.svg',
        };

        for (const [iconName, iconPath] of Object.entries(icons)) {
            this.matIconRegistry.addSvgIcon(iconName, this.domSanitizer.bypassSecurityTrustResourceUrl(iconPath));
        }
    }

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
