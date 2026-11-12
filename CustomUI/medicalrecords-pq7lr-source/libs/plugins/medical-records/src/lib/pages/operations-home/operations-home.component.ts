import { Component, EventEmitter, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardOverviewComponent } from '../../dashboard/components/dashboard-overview/dashboard-overview.component';
import { OperationsDistributionBandComponent } from './operations-distribution-band/operations-distribution-band.component';

@Component({
    selector: 'medical-records-operations-home',
    standalone: true,
    imports: [RouterModule, TranslateModule, DashboardOverviewComponent, OperationsDistributionBandComponent],
    templateUrl: './operations-home.component.html',
    styleUrls: ['./operations-home.component.scss'],
})
export class OperationsHomeComponent {
    @Output() startAccount = new EventEmitter<void>();
}
