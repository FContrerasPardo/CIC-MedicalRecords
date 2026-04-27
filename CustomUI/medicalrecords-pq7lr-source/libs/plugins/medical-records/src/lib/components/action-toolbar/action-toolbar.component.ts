import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'medical-records-action-toolbar',
  standalone: false,
  templateUrl: './action-toolbar.component.html',
  styleUrls: ['./action-toolbar.component.scss']
})
export class ActionToolbarComponent {
  @Input() title: string = '';
  @Input() primaryActionLabel: string = 'New Action';
  @Input() primaryActionIcon: string = 'add';
  @Output() primaryActionClicked = new EventEmitter<void>();
  @Output() secondaryActionClicked = new EventEmitter<void>();

  onPrimaryClick() {
    this.primaryActionClicked.emit();
  }

  onSecondaryClick() {
    this.secondaryActionClicked.emit();
  }
}
