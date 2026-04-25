/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { PublicFormComponent } from '../public-form/public-form.component';
import { PUBLIC_PROCESS_CONFIG, ProcessConfig } from '../../tokens/process-id.token';
import { PublicFormContainerService } from './public-form-container.service';
import { EMPTY, map, of, switchMap } from 'rxjs';

const processConfig: ProcessConfig = {
    id: '',
};

@Component({
    selector: 'hxp-public-form-container',
    templateUrl: './public-form-container.component.html',
    imports: [PublicFormComponent],
    providers: [{ provide: PUBLIC_PROCESS_CONFIG, useValue: processConfig }],
})
export class PublicFormContainerComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly activatedRoute = inject(ActivatedRoute);
    private readonly publicFormContainerService = inject(PublicFormContainerService);

    processId: string | null = null;

    ngOnInit(): void {
        this.activatedRoute.paramMap
            .pipe(
                switchMap((params) => {
                    const processId = params.get('processId');
                    const processKey = params.get('processKey');

                    if (processId) {
                        return of({ processId });
                    } else if (processKey) {
                        return this.publicFormContainerService.fetchLatestProcessDefinition(processKey).pipe(
                            map((processDefinition) => ({
                                processId: processDefinition.id,
                            }))
                        );
                    }

                    return EMPTY;
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(({ processId }) => {
                processConfig.id = processId;
                this.processId = processId;
            });
    }
}
