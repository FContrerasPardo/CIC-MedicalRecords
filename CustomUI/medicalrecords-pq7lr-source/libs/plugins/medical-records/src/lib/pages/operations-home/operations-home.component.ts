import { Component, EventEmitter, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ProviderSelection } from '../../services/medical-accounts-process.service';
import { OperationsProviderCardsComponent } from './operations-provider-cards/operations-provider-cards.component';
import { DashboardOverviewComponent } from '../../dashboard/components/dashboard-overview/dashboard-overview.component';

@Component({
    selector: 'medical-records-operations-home',
    standalone: true,
    imports: [RouterModule, TranslateModule, DashboardOverviewComponent, OperationsProviderCardsComponent],
    templateUrl: './operations-home.component.html',
    styleUrls: ['./operations-home.component.scss'],
})
export class OperationsHomeComponent {
    @Output() startAccount = new EventEmitter<void>();
    /** Emitted when a provider card is picked; navigating to its accounts is a later step. */
    @Output() providerSelected = new EventEmitter<ProviderSelection>();
}
