import { Component, Input } from '@angular/core';

@Component({
  selector: 'medical-records-metric-card',
  standalone: false,
  templateUrl: './metric-card.component.html',
  styleUrls: ['./metric-card.component.scss']
})
export class MetricCardComponent {
  @Input() label: string = '';
  @Input() value: string = '';
  @Input() trend: string = '';
  @Input() trendUp: boolean = true;
  @Input() icon: string = '';
}
