import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AccountStatus } from '../../models/medical-record.model';

@Component({
  selector: 'medical-records-workflow-stepper',
  standalone: false,
  templateUrl: './workflow-stepper.component.html',
  styleUrls: ['./workflow-stepper.component.scss']
})
export class WorkflowStepperComponent {
  @Input() currentStatus: AccountStatus = 'Intake';
  @Output() stepClicked = new EventEmitter<AccountStatus>();

  steps: { id: AccountStatus; label: string; icon: string }[] = [
    { id: 'Intake', label: 'Intake', icon: 'file_download' },
    { id: 'Analysis', label: 'Analysis', icon: 'analytics' },
    { id: 'Assembly', label: 'Assembly', icon: 'account_tree' },
    { id: 'Review', label: 'Review', icon: 'fact_check' },
    { id: 'Appeals', label: 'Appeals', icon: 'gavel' },
    { id: 'Closed', label: 'Closed', icon: 'check_circle' }
  ];

  isCompleted(stepId: AccountStatus): boolean {
    const currentIndex = this.steps.findIndex(s => s.id === this.currentStatus);
    const stepIndex = this.steps.findIndex(s => s.id === stepId);
    return stepIndex < currentIndex;
  }

  isCurrent(stepId: AccountStatus): boolean {
    return this.currentStatus === stepId;
  }

  onStepClick(stepId: AccountStatus) {
    this.stepClicked.emit(stepId);
  }
}
