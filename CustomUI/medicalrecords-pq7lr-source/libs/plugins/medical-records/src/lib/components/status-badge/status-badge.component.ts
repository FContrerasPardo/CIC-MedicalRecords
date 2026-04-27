import { Component, Input } from '@angular/core';
import { AccountStatus } from '../../models/medical-record.model';

@Component({
  selector: 'medical-records-status-badge',
  standalone: false,
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  @Input() status!: AccountStatus;

  get badgeClass(): string {
    switch (this.status) {
      case 'Intake': return 'badge-intake';
      case 'Analysis': return 'badge-analysis';
      case 'Assembly': return 'badge-assembly';
      case 'Review': return 'badge-review';
      case 'Appeals': return 'badge-appeals';
      case 'Closed': return 'badge-closed';
      default: return 'badge-default';
    }
  }
}
