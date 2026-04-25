/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ProcessDefinitionCloud } from '@alfresco/adf-process-services-cloud';

import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import {
    selectProcessDefinitionsLoadingError,
    selectRecentProcessDefinitionKeys,
    selectUserStartableProcessDefinitions,
} from '../../../../store/selectors/process-definitions.selector';
import { FeatureCloudRootState } from '../../../../store/states/state';
import { MatButtonModule } from '@angular/material/button';
import { ProcessListByCategoryComponent } from '../process-list-by-category/process-list-by-category.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    imports: [ProcessListByCategoryComponent, MatButtonModule, AsyncPipe, NgIf, MatIconModule, TranslatePipe, MatDialogModule],
    selector: 'apa-start-process-dialog',
    templateUrl: './start-process-dialog.component.html',
    styleUrls: ['./start-process-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class StartProcessDialogComponent implements OnInit {
    allProcesses$: Observable<ProcessDefinitionCloud[]>;
    loadingProcessesError$: Observable<string>;
    recentDefinitionKeys$: Observable<string[]>;

    private readonly store = inject<Store<FeatureCloudRootState>>(Store);
    private readonly dialog = inject<MatDialogRef<StartProcessDialogComponent>>(MatDialogRef);

    ngOnInit(): void {
        this.allProcesses$ = this.store.select(selectUserStartableProcessDefinitions);
        this.recentDefinitionKeys$ = this.store.select(selectRecentProcessDefinitionKeys);
        this.loadingProcessesError$ = this.store.select(selectProcessDefinitionsLoadingError);
    }

    onSelectProcess(process: { name: string }): void {
        this.dialog.close(process.name);
    }
}
