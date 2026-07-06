import { MedicalRecordService } from '../../services/medical-record.service';
import { NativeAutomationReference } from '../../models/medical-record.model';
import { ProcessListOpenTarget } from '../definitions/dashboard-widget.model';
import { ProcessAttentionItem } from '../definitions/process-attention.model';

export function resolveAttentionItemUrl(
    item: ProcessAttentionItem,
    openTarget: ProcessListOpenTarget,
    medicalRecordService: MedicalRecordService
): string {
    const reference = item.nativeReference ?? {};

    switch (openTarget) {
        case 'task':
            return medicalRecordService.getTaskDetailsUrl(reference);
        case 'subprocess':
            return medicalRecordService.getProcessDetailsUrl(resolveSubprocessReference(reference));
        case 'macroProcess':
            return medicalRecordService.getProcessDetailsUrl(resolveMacroProcessReference(reference));
        default:
            return medicalRecordService.getTaskDetailsUrl(reference);
    }
}

function resolveSubprocessReference(reference: NativeAutomationReference): NativeAutomationReference {
    return {
        ...reference,
        processInstanceId: reference.processInstanceId ?? reference.rootProcessInstanceId,
    };
}

function resolveMacroProcessReference(reference: NativeAutomationReference): NativeAutomationReference {
    return {
        ...reference,
        processInstanceId: reference.rootProcessInstanceId ?? reference.processInstanceId,
    };
}
