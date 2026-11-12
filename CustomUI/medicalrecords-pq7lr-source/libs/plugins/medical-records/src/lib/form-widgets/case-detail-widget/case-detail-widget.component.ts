import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WidgetComponent } from '@alfresco/adf-core';
import { BatchStateSource } from '../intake-account-widget/batch-state.model';
import { BatchStateCaseDetailProvider } from '../../pages/case-detail/batch-state-case-detail.provider';
import { CaseDetail } from '../../pages/case-detail/case-detail.model';
import { CaseDetailComponent } from '../../pages/case-detail/case-detail.component';

/**
 * Form widget that opens the case detail inside an Automate task. It reads `batchState`
 * from its own field or from the form field `batchState` (same sources as the intake
 * widget) and is read-only: it never writes back to the form.
 */
@Component({
    template: '<medical-records-case-detail [data]="detail"></medical-records-case-detail>',
    selector: 'medical-records-case-detail-widget',
    standalone: true,
    imports: [CommonModule, CaseDetailComponent],
    changeDetection: ChangeDetectionStrategy.Default,
})
export class CaseDetailWidgetComponent extends WidgetComponent {
    private cachedPrimary: unknown;
    private cachedFallback: unknown;
    private cachedDetail: CaseDetail = new BatchStateCaseDetailProvider(null).getCase();

    get detail(): CaseDetail {
        const primary = this.field?.value;
        const fallback = this.field?.form?.getFieldById('batchState')?.value;
        if (primary !== this.cachedPrimary || fallback !== this.cachedFallback) {
            this.cachedPrimary = primary;
            this.cachedFallback = fallback;
            const batchState = this.parse(primary) ?? this.parse(fallback);
            this.cachedDetail = new BatchStateCaseDetailProvider(batchState).getCase();
        }
        return this.cachedDetail;
    }

    private parse(value: unknown): BatchStateSource | null {
        if (!value) {
            return null;
        }
        if (typeof value === 'string') {
            try {
                return JSON.parse(value) as BatchStateSource;
            } catch {
                return null;
            }
        }
        return typeof value === 'object' ? (value as BatchStateSource) : null;
    }
}
