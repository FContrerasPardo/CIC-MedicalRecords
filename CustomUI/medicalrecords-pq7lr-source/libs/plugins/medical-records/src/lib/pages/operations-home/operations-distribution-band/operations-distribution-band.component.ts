import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';
import { ProcessAttentionItem } from '../../../dashboard/definitions/process-attention.model';
import { buildDistributionCells, DistributionCell } from './operations-distribution-band.util';
import { MedicalRecordsTaskQueryService } from '../../../dashboard/services/medical-records-task-query.service';

@Component({
    selector: 'medical-records-operations-distribution-band',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    templateUrl: './operations-distribution-band.component.html',
    styleUrls: ['./operations-distribution-band.component.scss'],
})
export class OperationsDistributionBandComponent implements OnInit {
    readonly state$ = this.taskQueryService.state$;

    constructor(private readonly taskQueryService: MedicalRecordsTaskQueryService) {}

    ngOnInit(): void {
        // The dashboard widgets normally trigger the load; only start it when nobody has.
        this.state$.pipe(take(1)).subscribe((state) => {
            if (!state.loading && !state.error && !state.items.length) {
                this.taskQueryService.loadAttentionItems();
            }
        });
    }

    cells(items: ProcessAttentionItem[]): DistributionCell[] {
        return buildDistributionCells(items);
    }

    trackByKey(_: number, cell: DistributionCell): string {
        return cell.key;
    }
}
