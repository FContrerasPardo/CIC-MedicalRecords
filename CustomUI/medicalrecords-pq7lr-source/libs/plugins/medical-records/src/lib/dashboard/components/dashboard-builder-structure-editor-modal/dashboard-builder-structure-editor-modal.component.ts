import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
    DashboardContainerConfig,
    DashboardContainerLayoutMode,
    DashboardPageConfig,
} from '../../definitions/dashboard-widget.model';

export type DashboardStructureEditorMode = 'tab' | 'container';

@Component({
    selector: 'medical-records-dashboard-builder-structure-editor-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './dashboard-builder-structure-editor-modal.component.html',
    styleUrls: ['./dashboard-builder-structure-editor-modal.component.scss'],
})
export class DashboardBuilderStructureEditorModalComponent {
    @Input({ required: true }) mode!: DashboardStructureEditorMode;
    @Input() page: DashboardPageConfig | null = null;
    @Input() container: DashboardContainerConfig | null = null;
    @Input() containerLayoutModes: DashboardContainerLayoutMode[] = ['kpi-strip', 'grid-12', 'grid-4', 'list'];

    @Output() pagePatch = new EventEmitter<Partial<DashboardPageConfig>>();
    @Output() containerPatch = new EventEmitter<Partial<DashboardContainerConfig>>();
    @Output() closeModal = new EventEmitter<void>();

    containerLayoutModeLabel(mode: DashboardContainerLayoutMode): string {
        const key = mode.toUpperCase().replace(/-/g, '_');
        return `MEDICAL_RECORDS.DASHBOARD_BUILDER.CONTAINER_MODE_${key}`;
    }

    onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeModal.emit();
        }
    }
}
