import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WidgetComponent } from '@alfresco/adf-core';
import { BatchStateSource } from '../intake-account-widget/batch-state.model';
import { parseBatchState } from '../../pages/case-detail/batch-state-case-detail.provider';
import { CaseDetailComponent } from '../../pages/case-detail/case-detail.component';

/**
 * Form widget that opens the medical account view inside an Automate task. It reads `batchState`
 * from its own field or from the form field `batchState` (same sources as the intake widget) and
 * passes it to the case view; it never writes back to the form.
 */
@Component({
    template: '<medical-records-case-detail [batchStateSource]="batchState"></medical-records-case-detail>',
    selector: 'medical-records-case-detail-widget',
    standalone: true,
    imports: [CommonModule, CaseDetailComponent],
    changeDetection: ChangeDetectionStrategy.Default,
})
export class CaseDetailWidgetComponent extends WidgetComponent {
    private cachedPrimary: unknown;
    private cachedFallback: unknown;
    private cachedBatchState: BatchStateSource | null = null;

    get batchState(): BatchStateSource | null {
        const primary = this.field?.value;
        const fallback = this.field?.form?.getFieldById('batchState')?.value;
        if (primary !== this.cachedPrimary || fallback !== this.cachedFallback) {
            this.cachedPrimary = primary;
            this.cachedFallback = fallback;
            this.cachedBatchState = parseBatchState(primary) ?? parseBatchState(fallback);
        }
        return this.cachedBatchState;
    }
}
