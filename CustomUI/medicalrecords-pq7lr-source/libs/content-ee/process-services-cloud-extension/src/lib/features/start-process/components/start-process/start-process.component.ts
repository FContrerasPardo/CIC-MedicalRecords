/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, DoCheck, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { AsyncPipe, Location, NgIf } from '@angular/common';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { StartProcessService, UploadWidget } from '../../services/start-process.service';
import {
    DisplayModeService,
    FormCloudDisplayMode,
    ProcessDefinitionCloud,
    ProcessInstanceCloud,
    StartProcessCloudComponent,
    TaskVariableCloud,
} from '@alfresco/adf-process-services-cloud';
import { selectApplicationName } from '../../../../store/selectors/extension.selectors';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { Node } from '@alfresco/js-api';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { processCreationSuccess } from '../../../../store/actions/process-instance-cloud.action';
import { STORE_ACTIONS_PROVIDER } from '../../../../services/process-services-cloud-extension-actions.provider';
import { ADF_DISPLAY_TEXT_SETTINGS, ADF_CUSTOM_MESSAGE, FormModel, NotificationService } from '@alfresco/adf-core';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';
import { startFormCompletedRedirection } from '../../../../store/actions/task-details.actions';
import { TaskRedirectionService } from '../../../../services/task-redirection.service';
import { FORM_DISPLAY_MODES } from '../../../shared/form-display-mode';
import { PageLayoutContentComponent } from '../../../../components/page-layout/content/page-layout-content.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { PageLayoutHeaderComponent } from '../../../../components/page-layout/header/page-layout-header.component';
import { PageLayoutComponent } from '../../../../components/page-layout/page-layout.component';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { STUDIO_SHARED } from '@features';
import { FormDisplayTextConfigProviderService, CustomValidationMessageConfigProviderService } from '@alfresco-dbp/shared/form-rules';

const PROCESS_DEFINITION_QUERY_PARAM = 'process';

@Component({
    imports: [
        StartProcessCloudComponent,
        AsyncPipe,
        PageLayoutContentComponent,
        TranslatePipe,
        MatIconModule,
        PageLayoutHeaderComponent,
        PageLayoutComponent,
        NgIf,
    ],
    templateUrl: './start-process.component.html',
    styleUrls: ['./start-process.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: ADF_DISPLAY_TEXT_SETTINGS,
            useFactory: (service: FormDisplayTextConfigProviderService) => service.provideConfig(STUDIO_SHARED.STUDIO_VARIABLES_IN_FORM_DISPLAY_TEXT),
            deps: [FormDisplayTextConfigProviderService],
        },
        {
            provide: ADF_CUSTOM_MESSAGE,
            useFactory: (service: CustomValidationMessageConfigProviderService) =>
                service.provideConfig(STUDIO_SHARED.STUDIO_CONFIGURABLE_FORM_VALIDATION_MESSAGE),
            deps: [CustomValidationMessageConfigProviderService],
        },
    ],
})
export class StartProcessComponent implements OnInit, DoCheck {
    appName$: Observable<string>;
    defaultProcessName: string;
    formValues$: Observable<TaskVariableCloud[]>;
    processDefinitionName: string;
    defaultProcessDefinition?: string;
    processId: number;
    selectedNodes: Node[];
    displayConfigurations = FORM_DISPLAY_MODES;

    @ViewChild(StartProcessCloudComponent) startProcessComponent: StartProcessCloudComponent;

    private readonly destroyRef = inject(DestroyRef);
    private processDefinitionSelected$ = new Subject<string>();
    private redirectParameter = '';
    private customOutcomeId: string;

    private storeActions = inject(STORE_ACTIONS_PROVIDER, { optional: true });
    private readonly featuresService = inject(FeaturesServiceToken);

    protected readonly isParentVisibilityCheckEnabled = toSignal(
        this.featuresService.isOn$(STUDIO_SHARED.STUDIO_SKIP_VALIDATION_IN_GROUPS_SECTIONS),
        { initialValue: false }
    );

    protected formModel$ = new Subject<FormModel>();

    protected readonly stickyTabsEnabled = toSignal(
        combineLatest([
            this.formModel$.pipe(map((form) => form.json?.stickyTabs === true)),
            this.featuresService.isOn$(STUDIO_SHARED.STUDIO_FORM_STICKY_TABS),
        ]).pipe(map(([formOpt, flagOn]) => formOpt && flagOn)),
        { initialValue: false }
    );

    private readonly location = inject(Location);
    private readonly store = inject(Store<any>);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly startProcessServiceCloud = inject(StartProcessService);
    private readonly notificationService = inject(NotificationService);

    constructor() {
        this.appName$ = this.store.select(selectApplicationName);
        this.formValues$ = this.processDefinitionSelected$.pipe(switchMap(this.mapSelectedFilesFormKey.bind(this)));
    }

    ngOnInit() {
        this.route.queryParams.pipe(take(1)).subscribe((params: Params) => {
            this.defaultProcessDefinition = params[PROCESS_DEFINITION_QUERY_PARAM];
            this.setFileUploadingDialogVisibility(false);
            this.defaultProcessName = this.startProcessServiceCloud.getDefaultProcessName();
            // eslint-disable-next-line rxjs/no-nested-subscribe
            this.getSelectedNodes();
            this.redirectParameter = params[TaskRedirectionService.REDIRECTION_QUERY_PARAMETER];
        });

        this.destroyRef.onDestroy(() => {
            this.setFileUploadingDialogVisibility(true);
        });
    }

    private formDetected = false;

    ngDoCheck() {
        if (!this.formDetected && this.startProcessComponent?.formCloud) {
            this.formDetected = true;
            this.formModel$.next(this.startProcessComponent.formCloud);
        }
    }

    onProcessDefinitionSelection(processDefinition: ProcessDefinitionCloud) {
        this.addProcessNameToQueryParam(processDefinition.name);

        if (this.hasSelectedContent()) {
            this.processDefinitionSelected$.next(processDefinition.formKey);
        }
    }

    addProcessNameToQueryParam(processName: string) {
        void this.router.navigate(['.'], {
            relativeTo: this.route,
            queryParams: { [PROCESS_DEFINITION_QUERY_PARAM]: processName },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    mapSelectedFilesFormKey(formKey: string) {
        return this.startProcessServiceCloud.getContentUploadWidgets(formKey).pipe(
            filter((contentWidgets) => contentWidgets.length > 0),
            switchMap((contentWidgets) =>
                this.startProcessServiceCloud.selectedNodes$.pipe(
                    map((selectedNodes: Node[]) => {
                        if (contentWidgets.length > 0 && selectedNodes.length > 0) {
                            return this.prepareFormValues(contentWidgets, selectedNodes);
                        }
                        return of();
                    })
                )
            )
        );
    }

    prepareFormValues(contentWidgets: UploadWidget[], selectedNodes: Node[]): TaskVariableCloud[] {
        const values: TaskVariableCloud[] = [];
        const firstSimpleWidget = contentWidgets.find(({ type }) => type === 'single');
        const firstMultipleWidget = contentWidgets.find(({ type }) => type === 'multiple');

        if (selectedNodes.length === 1 && (firstSimpleWidget || firstMultipleWidget)) {
            values.push(
                new TaskVariableCloud({
                    name: (firstSimpleWidget || firstMultipleWidget).id,
                    value: selectedNodes,
                })
            );
        } else if (selectedNodes.length > 1 && firstMultipleWidget) {
            values.push(
                new TaskVariableCloud({
                    name: firstMultipleWidget.id,
                    value: selectedNodes,
                })
            );
        }

        return values;
    }

    onCustomOutcomeSelected(event: string) {
        this.customOutcomeId = event;
    }

    onProcessCreation(event: ProcessInstanceCloud): void {
        this.store.dispatch(
            processCreationSuccess({
                processId: event.id,
                processName: event.name,
                processDefinitionKey: event.processDefinitionKey,
            })
        );

        this.appName$.pipe(take(1)).subscribe((appName) => {
            this.store.dispatch(
                startFormCompletedRedirection({
                    appName,
                    processDefinitionName: this.defaultProcessDefinition,
                    redirectParameter: this.redirectParameter,
                    selectedOutcomeId: this.customOutcomeId,
                })
            );
        });
    }

    onFormContentClicked({ nodeId }) {
        void this.router.navigate([
            'start-process-cloud',
            {
                outlets: {
                    viewer: ['preview', nodeId],
                },
            },
        ]);
    }

    onProcessCreationError(event: any) {
        this.notificationService.showError(this.getMessageFromEvent(event.response.body));
    }

    getMessageFromEvent(body: any): string {
        if (body?.errors && Array.isArray(body.errors) && body.errors.length > 0) {
            return body.errors.map((error: any) => error?.message || '').join(' || ');
        }

        if (body?.message) {
            return body.message;
        }

        if (body?.entry?.message) {
            return body.entry.message;
        }

        if (body?.entry?.entry?.message) {
            return body.entry.entry.message;
        }

        return 'PROCESS_CLOUD_EXTENSION.ERROR.START_PROCESS_ERROR';
    }

    backFromProcessCreation(): void {
        DisplayModeService.changeDisplayMode({ displayMode: FormCloudDisplayMode.inline });
        this.location.back();
    }

    private getSelectedNodes() {
        this.startProcessServiceCloud.selectedNodes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((selectedNodes) => {
            this.selectedNodes = selectedNodes;
        });
    }

    private hasSelectedContent(): boolean {
        return this.selectedNodes?.length > 0;
    }

    private setFileUploadingDialogVisibility(visibility: boolean) {
        if (this.storeActions) {
            const uploadDialogVisibilityAction = visibility
                ? this.storeActions.getOnDestroyAction(visibility)
                : this.storeActions.getOnInitAction(visibility);
            this.store.dispatch(uploadDialogVisibilityAction);
        }
    }
}
