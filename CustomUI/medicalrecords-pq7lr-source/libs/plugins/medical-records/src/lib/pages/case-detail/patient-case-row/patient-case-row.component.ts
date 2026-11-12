import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { extractBatchContext } from '../../../dashboard/mappers/attention-batch-context';
import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';
import { CaseTabTarget } from '../utils/case-navigation.util';
import { countByState, deriveValidationMap, ValidationStep } from '../utils/case-validation-map.util';

const STEP_LABEL_KEYS: Record<ValidationStep['key'], string> = {
    compliance: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.COMPLIANCE',
    eligibility: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.ELIGIBILITY',
    readiness: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.READINESS',
    medicalReport: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.MEDICAL_REPORT',
    consolidation: 'MEDICAL_RECORDS.CASE_DETAIL.STEPS.CONSOLIDATION',
};

/**
 * One patient case in the open-tasks list. The whole row and each validation button open the
 * case detail; the host performs the navigation. Scores are placeholders until their
 * definition is validated; nothing here writes to Automate.
 */
@Component({
    selector: 'medical-records-patient-case-row',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './patient-case-row.component.html',
    styleUrls: ['./patient-case-row.component.scss'],
})
export class PatientCaseRowComponent {
    @Input({ required: true }) set item(value: ProcessAttentionItem) {
        this._item = value;
        const context = extractBatchContext(value.processVariables['batchState']);
        this.patientName = context.patientName ?? value.title;
        this.reviewRequired = context.reviewRequired;
        this.steps = deriveValidationMap({ taskType: value.taskType, variables: value.processVariables });
        this.counts = countByState(this.steps);
    }
    get item(): ProcessAttentionItem {
        return this._item;
    }
    @Input() selectable = false;
    @Input() selected = false;
    @Output() openCase = new EventEmitter<CaseTabTarget | undefined>();
    @Output() selectionToggle = new EventEmitter<Event>();

    patientName = '';
    reviewRequired = false;
    steps: ValidationStep[] = [];
    counts = { executed: 0, pending: 0, blocking: 0 };

    private _item!: ProcessAttentionItem;

    stepLabelKey(step: ValidationStep): string {
        return STEP_LABEL_KEYS[step.key];
    }

    open(target?: CaseTabTarget, event?: Event): void {
        event?.stopPropagation();
        this.openCase.emit(target);
    }

    toggle(event: Event): void {
        event.stopPropagation();
        this.selectionToggle.emit(event);
    }
}
