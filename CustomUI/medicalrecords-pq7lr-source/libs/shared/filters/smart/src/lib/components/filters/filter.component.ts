/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Filter } from '@alfresco-dbp/shared-filters-services';
import { ChangeDetectorRef, EventEmitter, inject } from '@angular/core';

export abstract class FilterComponent<T = Filter> {
    private readonly changeDetectorRef = inject(ChangeDetectorRef);

    filter: T | undefined;
    filterChange: EventEmitter<T> = new EventEmitter<T>();
    filterRemove: EventEmitter<void> = new EventEmitter<void>();

    isMenuOpen = false;

    setUp(filter: T): void {
        this.filter = filter;
    }

    markForCheck(): void {
        this.changeDetectorRef.markForCheck();
    }

    removeFilter(): void {
        this.filterRemove.emit();
    }

    /**
     * Called when the filter input is updated from outside (e.g., reset).
     * Override in subclasses to update derived state like labelSuffix.
     */
    onFilterInputChange(): void {
        // Default implementation does nothing
    }

    abstract onUpdate(data: any): void;
}
