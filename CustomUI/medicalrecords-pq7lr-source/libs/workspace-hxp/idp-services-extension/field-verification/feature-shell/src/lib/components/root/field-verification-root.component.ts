/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FieldVerificationContextTaskService } from '../../services/context-task/field-verification-context-task.service';
import { ExtractionViewComponent } from '../extraction-view/extraction-view.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    DiscardChangesDialogComponent,
    IdpShortcutAction,
    IdpShortcutService,
    SessionService,
} from '@hxp/workspace-hxp/idp-services-extension/shared';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { A11yModule } from '@angular/cdk/a11y';
import { TablePanelMode, TablePanelStateService } from '../../services/table-panel-state/table-panel-state.service';

@Component({
    selector: 'hyland-idp-field-verification-root',
    templateUrl: './field-verification-root.component.html',
    styleUrls: ['./field-verification-root.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [A11yModule, ExtractionViewComponent, CommonModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, MatCheckboxModule, TranslatePipe],
})
export class FieldVerificationRootComponent {
    private readonly contextService = inject(FieldVerificationContextTaskService);
    private readonly shortcutService = inject(IdpShortcutService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly tablePanelStateService = inject(TablePanelStateService);

    screenLoading$: Observable<boolean>;
    taskCanSave$: Observable<boolean>;
    taskCanComplete$: Observable<boolean>;
    taskShowUnclaim$: Observable<boolean>;
    taskUnclaimEnabled$: Observable<boolean>;

    private taskCanSave = false;
    private taskCanComplete = false;

    readonly saveTooltip = this.shortcutService.getFullTooltipForAction(IdpShortcutAction.Save);
    readonly submitTooltip = this.shortcutService.getFullTooltipForAction(IdpShortcutAction.Submit);

    readonly isAutoNextTaskChecked$: Observable<boolean>;

    private readonly sessionService = inject(SessionService);
    private readonly dialog = inject(MatDialog);

    constructor() {
        this.screenLoading$ = this.contextService.screenReady$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((ready) => !ready)
        );
        this.taskCanSave$ = this.contextService.taskCanSave$.pipe(takeUntilDestroyed(this.destroyRef));
        this.taskCanComplete$ = this.contextService.taskCanComplete$.pipe(takeUntilDestroyed(this.destroyRef));
        this.taskCanSave$.subscribe((canSave) => (this.taskCanSave = canSave));
        this.taskCanComplete$.subscribe((canComplete) => (this.taskCanComplete = canComplete));
        this.taskShowUnclaim$ = this.contextService.taskCanUnclaim$.pipe(takeUntilDestroyed());
        this.taskUnclaimEnabled$ = this.contextService.taskUnclaimEnabled$.pipe(takeUntilDestroyed());

        this.isAutoNextTaskChecked$ = this.sessionService.isAutoNextTaskChecked$.pipe(takeUntilDestroyed(this.destroyRef));
    }

    @HostListener('window:keydown', ['$event'])
    onWindowKeyDown(event: KeyboardEvent): void {
        if (event.repeat || event.defaultPrevented) {
            return;
        }

        const shortcut = this.shortcutService.getShortcutForEvent(event);
        if (!shortcut) {
            return;
        }

        switch (shortcut.action) {
            case IdpShortcutAction.Save:
            case IdpShortcutAction.Submit:
            case IdpShortcutAction.TablePanelMinimize:
            case IdpShortcutAction.TablePanelDefault:
            case IdpShortcutAction.TablePanelMaximize: {
                event.preventDefault();
                event.stopPropagation();
                break;
            }
            default: {
                break;
            }
        }
    }

    @HostListener('window:keyup', ['$event'])
    onKeyUp(event: KeyboardEvent): void {
        this.onShortcutKey(event);
    }

    onSubmit(isAutoNextTaskChecked: boolean | undefined = false) {
        if (this.taskCanComplete) {
            this.contextService.completeTask(isAutoNextTaskChecked);
        }
    }

    onSave() {
        if (this.taskCanSave) {
            this.contextService.saveTask();
        }
    }

    onUnclaim(): void {
        if (this.taskCanSave) {
            DiscardChangesDialogComponent.open(this.dialog, () => this.contextService.unclaimTask());
        } else {
            this.contextService.unclaimTask();
        }
    }

    private onShortcutKey(event: KeyboardEvent): boolean {
        if (event.repeat || event.defaultPrevented) {
            return true;
        }

        const shortcut = this.shortcutService.getShortcutForEvent(event);
        switch (shortcut?.action) {
            case IdpShortcutAction.Save: {
                this.onSave();
                return true;
            }
            case IdpShortcutAction.Submit: {
                this.onSubmit();
                return true;
            }
            case IdpShortcutAction.TablePanelMinimize:
            case IdpShortcutAction.TablePanelDefault:
            case IdpShortcutAction.TablePanelMaximize: {
                const mode = this.tablePanelStateService.mode();
                if (mode === TablePanelMode.Hidden) {
                    return true;
                }

                switch (shortcut?.action) {
                    case IdpShortcutAction.TablePanelMinimize: {
                        if (mode !== TablePanelMode.Minimized) {
                            this.tablePanelStateService.minimize();
                        }
                        break;
                    }
                    case IdpShortcutAction.TablePanelDefault: {
                        if (mode !== TablePanelMode.Default) {
                            this.tablePanelStateService.setDefault();
                        }
                        break;
                    }
                    case IdpShortcutAction.TablePanelMaximize: {
                        if (mode !== TablePanelMode.Maximized) {
                            this.tablePanelStateService.maximize();
                        }
                        break;
                    }
                }
                return true;
            }
        }

        return false;
    }

    onNextTaskCheckboxCheckedChanged() {
        this.sessionService.toggleAutoNextTask();
    }
}
