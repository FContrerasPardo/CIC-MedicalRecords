/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ConnectedPosition, Overlay, OverlayConfig, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    TemplateRef,
    ViewChild,
    ViewContainerRef,
    inject,
} from '@angular/core';
import { merge, Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { SearchFilterData } from '../../../models/search-filter.data';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'hxp-governance-search-filter-container',
    templateUrl: './search-filter-container.component.html',
    styleUrl: './search-filter-container.component.scss',
    imports: [MatButtonModule, MatIconModule, MatTooltipModule, OverlayModule, PortalModule, ReactiveFormsModule, TranslatePipe],
})
export class SearchFilterContainerComponent implements AfterViewInit, OnChanges, OnDestroy {
    private static nextOverlayId = 0;

    @Input()
    name = '';

    @Input()
    filterForm: FormGroup = new FormGroup({});

    @Input()
    selectedValue?: SearchFilterData;

    /**
     * Event emitted when the filter overlay is closed without any explicit action (e.g. clear or apply filter)
     */
    @Output()
    overlayClosed = new EventEmitter<void>();

    @Output()
    filterCleared = new EventEmitter<void>();

    @Output()
    filterApplied = new EventEmitter<SearchFilterData | undefined>();

    @ViewChild('template') private template!: TemplateRef<any>;
    @ViewChild('chip') private chip?: ElementRef<HTMLButtonElement>;

    data?: SearchFilterData;
    selectionLabel = '';
    hiddenValuesCount = 0;
    protected readonly overlayId = `hxp-governance-search-filter-overlay-${SearchFilterContainerComponent.nextOverlayId++}`;

    protected isFilterOverlayOpened = false;
    protected overlayPosition: ConnectedPosition[] = [
        {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top',
        },
    ];
    protected overlayRef?: OverlayRef;
    protected templatePortal?: TemplatePortal<any>;

    private readonly onDestroy$ = new Subject<void>();
    private initializedFromQueryParams = false;

    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);

    ngAfterViewInit(): void {
        this.templatePortal = new TemplatePortal(this.template, this.viewContainerRef);
    }

    ngOnChanges(changes: SimpleChanges) {
        const { selectedValue } = changes;
        if (!selectedValue) {
            return;
        }

        const currentValue = selectedValue.currentValue as SearchFilterData;

        if (this.data === currentValue || (this.data === undefined && currentValue === undefined) || this.data?.isEquivalentTo(currentValue)) {
            this.filterForm.markAsPristine();
        } else {
            this.filterForm.markAsDirty();
        }

        // Auto-apply only once, on initial query param load
        if (!this.initializedFromQueryParams && currentValue) {
            this.data = currentValue;
            this.computeLabelVisibility();
            this.initializedFromQueryParams = true;
        } else if (!currentValue) {
            this.data = undefined;
            this.computeLabelVisibility();
        }
    }

    ngOnDestroy(): void {
        this.closeOverlay(false);
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }

    applyChanges(): void {
        this.data = this.selectedValue;
        this.filterForm.markAsPristine();
        this.computeLabelVisibility();
    }

    clearChanges(): void {
        this.selectedValue = undefined;
        this.data = undefined;
        this.filterForm.markAsPristine();
        this.computeLabelVisibility();
    }

    protected clearFilter(event: Event): void {
        event.stopPropagation();
        event.preventDefault();

        this.clearChanges();
        this.filterCleared.emit();
        this.closeOverlay();
    }

    protected applyFilter(event: Event): void {
        event.stopPropagation();
        event.preventDefault();

        this.applyChanges();
        this.filterApplied.emit(this.data);
        this.closeOverlay();
    }

    protected computeLabelVisibility(): void {
        if ((this.selectedValue?.values || []).length > 0 && this.data?.values) {
            this.selectionLabel = this.data.values[0].label;
            this.hiddenValuesCount = this.data.values.length - 1;
        } else {
            this.selectionLabel = '';
            this.hiddenValuesCount = 0;
        }
    }

    protected hasPendingChanges(): boolean {
        return this.data !== this.selectedValue;
    }

    protected discardPendingChanges(): void {
        this.selectedValue = this.data;
    }

    focusChip(): void {
        this.chip?.nativeElement.focus();
    }

    closeFilterOverlay(restoreFocus = true): void {
        this.closeOverlay(restoreFocus);
    }

    protected onFormKeydownEnter(event: Event): void {
        const target = event.target as HTMLElement;
        const isInteractiveElement = target.tagName === 'BUTTON' || target.tagName === 'MAT-LIST-OPTION';
        if (!isInteractiveElement) {
            event.preventDefault();
        }
    }

    protected openFilterOverlay(): void {
        if (this.isFilterOverlayOpened) {
            return;
        }

        const positionStrategy = this.chip
            ? this.overlay.position().flexibleConnectedTo(this.chip.nativeElement).withPositions(this.overlayPosition)
            : undefined;

        const overlayConfig = new OverlayConfig({
            hasBackdrop: true,
            backdropClass: 'cdk-overlay-transparent-backdrop',
            positionStrategy,
        });

        this.overlayRef = this.overlay.create(overlayConfig);
        this.overlayRef.attach(this.templatePortal);

        this.isFilterOverlayOpened = true;

        merge(this.overlayRef.backdropClick(), this.overlayRef.keydownEvents().pipe(filter((e) => e.key === 'Escape')))
            .pipe(take(1), takeUntil(this.onDestroy$))
            .subscribe({
                next: () => {
                    if (this.hasPendingChanges()) {
                        this.discardPendingChanges();
                    }
                    this.overlayClosed.emit();
                    this.closeOverlay();
                },
            });
    }

    protected closeOverlay(restoreFocus = true): void {
        const chipElement = this.chip?.nativeElement;
        const activeElement = document.activeElement as HTMLElement | null;
        const shouldRestoreFocus =
            restoreFocus &&
            !!chipElement &&
            activeElement !== chipElement &&
            (!activeElement || activeElement === document.body || this.overlayRef?.overlayElement.contains(activeElement));
        this.isFilterOverlayOpened = false;
        if (this.overlayRef) {
            this.overlayRef.dispose();
            this.overlayRef = undefined;
        }
        if (shouldRestoreFocus && chipElement) {
            setTimeout(() => {
                const nextActiveElement = document.activeElement as HTMLElement | null;
                if (!nextActiveElement || nextActiveElement === document.body) {
                    chipElement.focus();
                }
            });
        }
    }
}
