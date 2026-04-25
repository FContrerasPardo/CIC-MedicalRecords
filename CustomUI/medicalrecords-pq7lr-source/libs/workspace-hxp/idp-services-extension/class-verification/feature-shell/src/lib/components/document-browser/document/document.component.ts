/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Subject } from 'rxjs';
import { Component, Output, ChangeDetectionStrategy, Input, ViewChild, EventEmitter, inject } from '@angular/core';
import { ListItemComponent } from '../../list-item/list-item.component';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentData } from '../../../directives/document-list.directive';
import { WORKSPACE_IDP_HXP } from '@hxp/workspace-hxp/feature-flag';
import { PageListComponent } from '../page-list/page-list.component';
import { FeaturesDirective, FeaturesServiceToken, IFeaturesService } from '@alfresco/adf-core/feature-flags';
import { FloorPercentPipe } from '../../../pipes/floor-percent.pipe';
import { DragPlaceholderMetadata } from '../../../services/document/idp-drag-drop.service';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { IdpDocument } from '../../../models/screen-models';
import { PageContextMenuComponent } from '../page-context-menu/page-context-menu.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface ConfidenceThreshold {
    High: number;
    Medium: number;
}

@Component({
    selector: 'hyland-idp-document',
    templateUrl: './document.component.html',
    styleUrls: ['./document.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatTooltipModule,
        MatListModule,
        CommonModule,
        DragDropModule,
        MatBadgeModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        ListItemComponent,
        PageListComponent,
        PageContextMenuComponent,
        FeaturesDirective,
        FloorPercentPipe,
    ],
})
export class DocumentComponent {
    @Input() document!: DocumentData;
    @Input() documentIndex!: number;
    @Input() canCutPages = false;

    @Input() formatDocumentName!: (doc: DocumentData) => string;
    @Input() isElementContained!: (el: HTMLElement) => boolean;

    @Input() onItemKeyDown!: (doc: DocumentData, e: KeyboardEvent) => void;
    @Input() onItemMouseDown!: (doc: DocumentData, e: MouseEvent, mode: string) => void;
    @Input() onItemMouseUp!: (doc: DocumentData, e: MouseEvent) => void;
    @Input() onDoubleClick!: (doc: DocumentData) => void;
    @Input() onPageCollapseRequest!: (doc: DocumentData) => void;

    @Output() collapseContainer = new Subject();
    @Output() pagesCut = new EventEmitter();

    // drag&drop
    @Input() dragPlaceholderMetadata?: DragPlaceholderMetadata;
    @Input() draggingDocuments: IdpDocument[] = [];
    @Output() documentMouseEnter = new EventEmitter<DocumentData>();
    @Output() documentDragStarted = new EventEmitter();
    @Output() documentDragStopped = new EventEmitter();

    @ViewChild(ListItemComponent) documentListItem!: ListItemComponent;

    @ViewChild('pageContextMenu')
    private readonly pageContextMenu?: PageContextMenuComponent;

    @ViewChild(PageListComponent)
    private readonly pageListComponent?: PageListComponent;

    idpClassificationSettingsFeature = WORKSPACE_IDP_HXP.CLASSIFICATION_SETTINGS;
    idpCutInsertFeature = WORKSPACE_IDP_HXP.CLASS_VERIFICATION_CUT_INSERT;
    isCutInsertFeatureOn = false;

    private readonly featureService = inject<IFeaturesService>(FeaturesServiceToken);

    constructor() {
        this.featureService
            .isOn$(this.idpCutInsertFeature)
            .pipe(takeUntilDestroyed())
            .subscribe((isCutInsertFeatureOn) => (this.isCutInsertFeatureOn = isCutInsertFeatureOn));
    }

    onContextMenu(event: MouseEvent): void {
        if (!this.isCutInsertFeatureOn) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.pageContextMenu?.openContextMenuAt(event.clientX, event.clientY);
    }

    openContextMenu(): void {
        if (!this.isCutInsertFeatureOn) {
            return;
        }

        if (this.document.pages.length === 1 && this.pageListComponent) {
            this.pageListComponent.openContextMenuForFirstPage();
        } else {
            this.pageContextMenu?.openContextMenu();
        }
    }

    onPageContextMenuClosed(): void {
        this.documentListItem.focus();
    }

    onMouseEnter(document: DocumentData) {
        this.documentMouseEnter.emit(document);
    }

    onDragStarted() {
        this.documentDragStarted.emit();
    }

    onDragStopped() {
        this.documentDragStopped.emit();
    }

    getClassificationConfidenceTagColor(document: DocumentData): string {
        if (!document.classificationConfidence || !document.class?.id) {
            return '';
        }
        const confidence = Math.floor(document.classificationConfidence * 100);
        const confidenceThreshold: ConfidenceThreshold = {
            High: this.decimalToPercent(document.class?.reviewThreshold),
            Medium: this.decimalToPercent(document.class?.classAssignmentThreshold),
        };
        const confidenceType = this.getConfidenceType(confidence, confidenceThreshold);
        return this.getConfidenceColor(confidenceType);
    }

    private getConfidenceType(confidence: number, threshold: ConfidenceThreshold): string {
        if (confidence >= threshold.High) {
            return 'high';
        }
        if (confidence >= threshold.Medium) {
            return 'medium';
        }
        return 'low';
    }

    private getConfidenceColor(confidenceLevel: string | undefined): string {
        switch (confidenceLevel) {
            case 'high': {
                return 'green';
            }
            case 'medium': {
                return 'yellow';
            }
            default: {
                return 'red';
            }
        }
    }

    private decimalToPercent(value: number | undefined): number {
        if (value == null) {
            return 0;
        }
        return Math.round(value * 100);
    }

    onPagesCut() {
        this.pagesCut.emit();
    }
}
