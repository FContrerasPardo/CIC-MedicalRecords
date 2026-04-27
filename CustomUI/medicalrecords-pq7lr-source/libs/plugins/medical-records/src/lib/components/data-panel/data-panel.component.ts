import { Component, Input } from '@angular/core';

@Component({
  selector: 'medical-records-data-panel',
  standalone: false,
  templateUrl: './data-panel.component.html',
  styleUrls: ['./data-panel.component.scss']
})
export class DataPanelComponent {
  @Input() title: string = '';
  @Input() icon: string = 'list';
}
