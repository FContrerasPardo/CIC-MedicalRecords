import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { extractBatchContext } from '../../../dashboard/mappers/attention-batch-context';
import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';
import { PatientCaseGroup } from '../utils/case-grouping.util';
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
    @Input({ required: true }) set group(value: PatientCaseGroup) {
        this._group = value;
        const primary = value.primary;
        const context = extractBatchContext(primary.processVariables['batchState']);
        this.patientName = context.patientName ?? primary.title;
        this.reviewRequired = value.items.some((task) => extractBatchContext(task.processVariables['batchState']).reviewRequired);
        this.steps = deriveValidationMap({ taskType: value.stage, variables: primary.processVariables });
        this.counts = countByState(this.steps);
    }
    get group(): PatientCaseGroup {
        return this._group;
    }
    @Input() selectable = false;
    @Input() selectedIds: ReadonlySet<string> = new Set();
    @Output() openCase = new EventEmitter<CaseTabTarget | undefined>();
    @Output() openTask = new EventEmitter<ProcessAttentionItem>();
    @Output() taskToggle = new EventEmitter<{ item: ProcessAttentionItem; event: Event }>();

    patientName = '';
    reviewRequired = false;
    steps: ValidationStep[] = [];
    counts = { executed: 0, pending: 0, blocking: 0 };

    private _group!: PatientCaseGroup;

    stepLabelKey(step: ValidationStep): string {
        return STEP_LABEL_KEYS[step.key];
    }

    open(target?: CaseTabTarget, event?: Event): void {
        event?.stopPropagation();
        this.openCase.emit(target);
    }

    toggleTask(item: ProcessAttentionItem, event: Event): void {
        event.stopPropagation();
        this.taskToggle.emit({ item, event });
    }

    openNativeTask(item: ProcessAttentionItem, event: Event): void {
        event.stopPropagation();
        this.openTask.emit(item);
    }

    taskTypeKey(item: ProcessAttentionItem): string {
        const keys: Record<string, string> = {
            intake: 'MEDICAL_RECORDS.TASK_TYPES.INTAKE',
            validateRules: 'MEDICAL_RECORDS.TASK_TYPES.VALIDATE_RULES',
            analysis: 'MEDICAL_RECORDS.TASK_TYPES.ANALYSIS',
        };
        return keys[item.taskType] ?? 'MEDICAL_RECORDS.TASK_TYPES.UNKNOWN';
    }
}
