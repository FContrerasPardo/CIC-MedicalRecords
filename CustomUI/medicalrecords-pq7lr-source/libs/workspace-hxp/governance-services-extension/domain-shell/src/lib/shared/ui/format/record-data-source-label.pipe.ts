/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Pipe, PipeTransform } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { GovernanceConfigurationService } from '../../config/governance-config.service';

@Pipe({
    name: 'recordDataSourceLabel',
    pure: false,
})
export class RecordDataSourceLabelPipe implements PipeTransform {
    private readonly asyncPipe = inject(AsyncPipe);
    private readonly governanceConfigService = inject(GovernanceConfigurationService);

    transform(dataSourceId: string): string {
        return dataSourceId
            ? this.asyncPipe.transform(this.governanceConfigService.getConfig())?.dataSources.find((dataSource) => dataSourceId === dataSource.id)
                  ?.name || ''
            : '';
    }
}
