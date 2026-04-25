/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClassVerificationRootComponent } from './class-verification-root.component';
import { ClassVerificationContextTaskService } from '../../services/context-task/class-verification-context-task.service';
import { IdpDocumentToolbarService } from '../../services/document/idp-document-toolbar.service';
import { BehaviorSubject } from 'rxjs';
import { NoopTranslateModule, NotificationService } from '@alfresco/adf-core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { By } from '@angular/platform-browser';
import { FeaturesDirective } from '@alfresco/adf-core/feature-flags';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { IdpDocumentImportService } from '../../services/document-import/idp-document-import.service';
import { SessionService, TaskHeaderComponent, DiscardChangesDialogComponent } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { TranslatePipe } from '@ngx-translate/core';
import { IdpDocumentClassService } from '../../services/document-class/idp-document-class.service';
import { IdpConfigClass } from '../../models/screen-models';
import { MockComponent } from 'ng-mocks';
import { ClassListComponent } from '../document-browser/class-list/class-list.component';
import { ClassVerificationViewerComponent } from '../class-verification-viewer/class-verification-viewer.component';
import { DocumentUploadButtonComponent } from '../document-upload/upload-button/upload-button.component';
import { A11yModule } from '@angular/cdk/a11y';

describe('ClassVerificationRootComponent', () => {
    let component: ClassVerificationRootComponent;
    let fixture: ComponentFixture<ClassVerificationRootComponent>;
    let contextService: ClassVerificationContextTaskService;
    let documentToolbarService: IdpDocumentToolbarService;
    let documentImportServiceSpy: jasmine.SpyObj<IdpDocumentImportService>;
    let sessionServiceSpy: jasmine.SpyObj<SessionService>;
    let documentClassServiceMock: { allClasses$: BehaviorSubject<IdpConfigClass[]> };
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

    let loader: HarnessLoader;

    const toggleScreenReady$ = new BehaviorSubject(true);
    const toggleCanSave$ = new BehaviorSubject(true);
    const toggleCanComplete$ = new BehaviorSubject(true);
    const toggleShowUnclaim$ = new BehaviorSubject(true);
    const toggleUnclaimEnabled$ = new BehaviorSubject(true);
    class MockContextService implements Partial<ClassVerificationContextTaskService> {
        screenReady$ = toggleScreenReady$.asObservable();
        taskCanSave$ = toggleCanSave$.asObservable();
        taskCanComplete$ = toggleCanComplete$.asObservable();
        taskCanUnclaim$ = toggleShowUnclaim$.asObservable();
        taskUnclaimEnabled$ = toggleUnclaimEnabled$.asObservable();
        completeTask = jasmine.createSpy('completeTask');
        saveTask = jasmine.createSpy('saveTask');
        unclaimTask = jasmine.createSpy('unclaimTask');
    }

    class MockDocumentToolbarService implements Partial<IdpDocumentToolbarService> {
        handleShortcutAction = jasmine.createSpy('handleShortcutAction');
    }

    const isAutoNextTaskChecked$ = new BehaviorSubject(false);

    beforeEach(() => {
        documentClassServiceMock = {
            allClasses$: new BehaviorSubject<IdpConfigClass[]>([]),
        };
        notificationServiceSpy = jasmine.createSpyObj<NotificationService>('NotificationService', ['showInfo', 'showError', 'showWarning']);

        documentImportServiceSpy = jasmine.createSpyObj<IdpDocumentImportService>('IdpDocumentUploadService', ['queueDocumentUpload'], {
            isDocumentImportEnabled$: new BehaviorSubject(true),
            isDocumentImportRunning$: new BehaviorSubject(false),
        });

        sessionServiceSpy = jasmine.createSpyObj<SessionService>('SessionService', ['toggleAutoNextTask'], {
            isAutoNextTaskChecked$: isAutoNextTaskChecked$.asObservable(),
        });

        TestBed.configureTestingModule({
            providers: [
                { provide: ClassVerificationContextTaskService, useClass: MockContextService },
                { provide: IdpDocumentToolbarService, useClass: MockDocumentToolbarService },
                { provide: IdpDocumentImportService, useValue: documentImportServiceSpy },
                { provide: SessionService, useValue: sessionServiceSpy },
                { provide: IdpDocumentClassService, useValue: documentClassServiceMock },
                { provide: NotificationService, useValue: notificationServiceSpy },
            ],
        }).overrideComponent(ClassVerificationRootComponent, {
            set: {
                imports: [
                    A11yModule,
                    TranslatePipe,
                    CommonModule,
                    MatCheckboxModule,
                    MatProgressSpinnerModule,
                    NoopTranslateModule,
                    FeaturesDirective,
                    MockComponent(ClassListComponent),
                    MockComponent(ClassVerificationViewerComponent),
                    MockComponent(TaskHeaderComponent),
                    MockComponent(DocumentUploadButtonComponent),
                ],
            },
        });

        fixture = TestBed.createComponent(ClassVerificationRootComponent);
        component = fixture.componentInstance;
        contextService = TestBed.inject(ClassVerificationContextTaskService);
        documentToolbarService = TestBed.inject(IdpDocumentToolbarService);
        loader = TestbedHarnessEnvironment.loader(fixture);

        toggleScreenReady$.next(true);
        toggleCanSave$.next(true);
        toggleCanComplete$.next(true);
        toggleShowUnclaim$.next(true);
        toggleUnclaimEnabled$.next(true);

        fixture.detectChanges();
    });

    it('should call completeTask on onSubmit', async () => {
        toggleCanComplete$.next(true);
        fixture.detectChanges();

        const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-class-submit-button"]' }));
        await button.click();

        expect(contextService.completeTask).toHaveBeenCalled();
    });

    it('should call saveTask on onSave', async () => {
        toggleCanSave$.next(true);
        fixture.detectChanges();

        const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-class-save-button"]' }));
        await button.click();

        expect(contextService.saveTask).toHaveBeenCalled();
    });

    it('should handle shortcut key', () => {
        const event = new KeyboardEvent('keyup', { key: 'a' });
        component.onKeyUp(event);
        expect(documentToolbarService.handleShortcutAction).toHaveBeenCalledWith(event);
    });

    it('should prevent default action on repeated key event', () => {
        const event = new KeyboardEvent('keyup', { key: 'a', repeat: true });
        spyOn(event, 'preventDefault');
        component.onKeyUp(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should show progress spinner based on screenReady', () => {
        toggleScreenReady$.next(false);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.idp-class-verification-root__progress'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('.idp-class-verification-root'))).toBeFalsy();

        toggleScreenReady$.next(true);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('.idp-class-verification-root__progress'))).toBeFalsy();
        expect(fixture.debugElement.query(By.css('.idp-class-verification-root'))).toBeTruthy();
    });

    it('should toggle save button based on taskCanSave', async () => {
        toggleCanSave$.next(false);
        fixture.detectChanges();
        const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-class-save-button"]' }));
        let isDisabled = await button.isDisabled();
        expect(isDisabled).toBeTrue();

        toggleCanSave$.next(true);
        fixture.detectChanges();
        isDisabled = await button.isDisabled();
        expect(isDisabled).toBeFalse();
    });

    it('should toggle submit button based on taskCanComplete', async () => {
        toggleCanComplete$.next(false);
        fixture.detectChanges();
        const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-class-submit-button"]' }));
        let isDisabled = await button.isDisabled();
        expect(isDisabled).toBeTrue();

        toggleCanComplete$.next(true);
        fixture.detectChanges();
        isDisabled = await button.isDisabled();
        expect(isDisabled).toBeFalse();
    });

    it('should dispatch queueDocumentUpload on onUploadDocuments', () => {
        const files = [new File([''], 'file1.txt', { type: 'text/plain' }), new File([''], 'file2.pdf', { type: 'application/pdf' })];
        component.onUploadDocuments(files);

        expect(documentImportServiceSpy.queueDocumentUpload).toHaveBeenCalledWith(files);
    });

    it('should check the checkbox when isNextTaskCheckboxChecked is true', async () => {
        isAutoNextTaskChecked$.next(true);
        fixture.detectChanges();

        const checkbox = await loader.getHarness(MatCheckboxHarness.with({ selector: '[data-automation-id="idp-class-open-next-task-checkbox"]' }));
        const isChecked = await checkbox.isChecked();
        expect(isChecked).toBeTrue();
    });

    it('should uncheck the checkbox when isNextTaskCheckboxChecked is false', async () => {
        isAutoNextTaskChecked$.next(false);
        fixture.detectChanges();

        const checkbox = await loader.getHarness(MatCheckboxHarness.with({ selector: '[data-automation-id="idp-class-open-next-task-checkbox"]' }));
        const isChecked = await checkbox.isChecked();
        expect(isChecked).toBeFalse();
    });

    it('should call onNextTaskCheckboxCheckedChanged when the checkbox value changes', async () => {
        spyOn(component, 'onNextTaskCheckboxCheckedChanged');

        const checkbox = await loader.getHarness(MatCheckboxHarness.with({ selector: '[data-automation-id="idp-class-open-next-task-checkbox"]' }));
        await checkbox.toggle();

        expect(component.onNextTaskCheckboxCheckedChanged).toHaveBeenCalled();
    });

    it('should call SessionService.toggleAutoNextTask on onNextTaskCheckboxCheckedChanged', () => {
        component.onNextTaskCheckboxCheckedChanged();
        expect(sessionServiceSpy.toggleAutoNextTask).toHaveBeenCalled();
    });

    it('should show info snackbar when all non-special classes are ignored for review', () => {
        documentClassServiceMock.allClasses$.next([
            { id: 'c1', name: 'Class A', isSpecialClass: false, ignoreForReview: true } as IdpConfigClass,
            { id: 'c2', name: 'Class B', isSpecialClass: false, ignoreForReview: true } as IdpConfigClass,
        ]);
        toggleScreenReady$.next(true);

        fixture.detectChanges();

        expect(notificationServiceSpy.showInfo).toHaveBeenCalledWith('IDP_CLASS_VERIFICATION.NOTIFICATIONS.ALL_CLASSES_IGNORED_FOR_REVIEW');
    });

    it('should only notify once and ignore subsequent matching emissions', () => {
        documentClassServiceMock.allClasses$.next([
            { id: 'c1', name: 'Class A', isSpecialClass: false, ignoreForReview: true } as IdpConfigClass,
            { id: 'c2', name: 'Class B', isSpecialClass: false, ignoreForReview: true } as IdpConfigClass,
        ]);
        toggleScreenReady$.next(true);

        fixture.detectChanges();

        expect(notificationServiceSpy.showInfo).toHaveBeenCalledTimes(1);
        expect(notificationServiceSpy.showInfo).toHaveBeenCalledWith('IDP_CLASS_VERIFICATION.NOTIFICATIONS.ALL_CLASSES_IGNORED_FOR_REVIEW');

        documentClassServiceMock.allClasses$.next([
            { id: 'c3', name: 'Class C', isSpecialClass: false, ignoreForReview: true } as IdpConfigClass,
            { id: 'c4', name: 'Class D', isSpecialClass: false, ignoreForReview: true } as IdpConfigClass,
        ]);

        fixture.detectChanges();
        expect(notificationServiceSpy.showInfo).toHaveBeenCalledTimes(1);
    });

    describe('unclaim', () => {
        let openDiscardDialogSpy: jasmine.Spy;

        beforeEach(() => {
            openDiscardDialogSpy = spyOn(DiscardChangesDialogComponent, 'open');
        });

        it('should show unclaim button based on taskCanUnclaim', async () => {
            toggleShowUnclaim$.next(false);
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('[data-automation-id="idp-class-unclaim-button"]'))).toBeFalsy();

            toggleShowUnclaim$.next(true);
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('[data-automation-id="idp-class-unclaim-button"]'))).toBeTruthy();
        });

        it('should disable the unclaim button when unclaimEnabled is false', async () => {
            toggleShowUnclaim$.next(true);
            toggleUnclaimEnabled$.next(false);
            fixture.detectChanges();

            const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-class-unclaim-button"]' }));
            expect(await button.isDisabled()).toBeTrue();
        });

        it('should enable the unclaim button when unclaimEnabled is true', async () => {
            toggleShowUnclaim$.next(true);
            toggleUnclaimEnabled$.next(true);
            fixture.detectChanges();

            const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-class-unclaim-button"]' }));
            expect(await button.isDisabled()).toBeFalse();
        });

        describe('when taskCanSave is false', () => {
            it('should call unclaimTask directly without opening a dialog', async () => {
                toggleCanSave$.next(false);
                toggleShowUnclaim$.next(true);
                fixture.detectChanges();

                const button = await loader.getHarness(MatButtonHarness.with({ selector: '[data-automation-id="idp-class-unclaim-button"]' }));
                await button.click();

                expect(contextService.unclaimTask).toHaveBeenCalled();
                expect(openDiscardDialogSpy).not.toHaveBeenCalled();
            });
        });

        describe('when taskCanSave is true', () => {
            beforeEach(() => {
                toggleCanSave$.next(true);
                fixture.detectChanges();
            });

            it('should open the discard dialog instead of calling unclaimTask directly', () => {
                component.onUnclaim();

                expect(openDiscardDialogSpy).toHaveBeenCalled();
                expect(contextService.unclaimTask).not.toHaveBeenCalled();
            });

            it('should call unclaimTask when the discard callback is invoked', () => {
                component.onUnclaim();

                const discardCallback = openDiscardDialogSpy.calls.mostRecent().args[1] as () => void;
                discardCallback();

                expect(contextService.unclaimTask).toHaveBeenCalled();
            });
        });
    });
});
