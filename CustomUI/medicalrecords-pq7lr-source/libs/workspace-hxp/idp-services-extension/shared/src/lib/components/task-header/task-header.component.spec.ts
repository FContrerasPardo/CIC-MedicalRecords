/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { IdpContextTaskBaseService } from '../../services/context-task/context-task-base.service';
import { of, Subject } from 'rxjs';
import { TaskHeaderLeadingContentDirective, TaskHeaderComponent, TaskHeaderTrailingContentDirective } from './task-header.component';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { SatIconModule } from '@hylandsoftware/satori-ui/icons';

class MatDialogMock {
    close(value: any) {
        return value;
    }

    open = jasmine.createSpy().and.returnValue({
        afterClosed: () => of(true),
    });
}

describe('TaskHeaderComponent', () => {
    let fixture: ComponentFixture<TaskHeaderComponent>;
    let component: TaskHeaderComponent;
    let contextTaskService: IdpContextTaskBaseService;
    let taskInfoSubject$: Subject<any>;

    class MockContextTaskService implements Partial<IdpContextTaskBaseService> {
        taskInfo$ = taskInfoSubject$.asObservable();
        cancelTask = jasmine.createSpy('cancelTask');
        taskCanSave$? = of(true);
    }

    beforeEach(() => {
        taskInfoSubject$ = new Subject();

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, TaskHeaderComponent, SatIconModule],
            providers: [
                { provide: IdpContextTaskBaseService, useClass: MockContextTaskService },
                { provide: MatDialog, useClass: MatDialogMock },
            ],
        });

        fixture = TestBed.createComponent(TaskHeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        contextTaskService = TestBed.inject(IdpContextTaskBaseService);
    });

    it('should cancel task when goBack is called and task can be saved and discard is chosen on dialog', () => {
        component.goBack();
        expect(component.dialog.open).toHaveBeenCalled();
        expect(contextTaskService.cancelTask).toHaveBeenCalled();
    });

    it('should cancel task when goBack is called and discard is chosen on dialog', () => {
        component.taskCanSave = false;
        component.goBack();
        expect(component.dialog.open).not.toHaveBeenCalled();
        expect(contextTaskService.cancelTask).toHaveBeenCalled();
    });

    it('should have headerInfo$ observable', fakeAsync(() => {
        let receivedValue: any;
        component.headerInfo$.subscribe((info) => {
            receivedValue = info;
        });

        taskInfoSubject$.next({ taskId: '1', taskName: 'Test Task' });
        tick(2000);
        expect(receivedValue).toEqual({ taskId: '1', taskName: 'Test Task' });


        taskInfoSubject$.next(undefined);
        tick(2000);
        expect(receivedValue).toEqual({ taskId: '1', taskName: 'Test Task' });

        taskInfoSubject$.next({ taskId: '2', taskName: 'Another Task' });
        tick(2000);
        expect(receivedValue).toEqual({ taskId: '2', taskName: 'Another Task' });
    }));

    it('should set hasLeadingContent to false when leadingContent is not provided', () => {
        expect(component.leadingContent).toBeUndefined();
        component.ngAfterContentInit();
        expect(component.hasLeadingContent).toBe(false);
    });

    it('should set hasLeadingContent to true when leadingContent is provided', () => {
        @Component({
            template: `
                <hyland-idp-task-header>
                    <div hylandIdpTaskHeaderLeadingContent>Leading content</div>
                </hyland-idp-task-header>
            `,
            imports: [TaskHeaderComponent, TaskHeaderLeadingContentDirective],
        })
        class TestHostComponent {}

        const hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();

        const taskHeaderInstance = hostFixture.debugElement.query(By.directive(TaskHeaderComponent)).componentInstance as TaskHeaderComponent;

        expect(taskHeaderInstance.leadingContent).toBeDefined();
        expect(taskHeaderInstance.hasLeadingContent).toBe(true);
    });

    it('should set hasTrailingContent to false when trailingContent is not provided', () => {
        expect(component.trailingContent).toBeUndefined();
        component.ngAfterContentInit();
        expect(component.hasTrailingContent).toBe(false);
    });

    it('should set hasTrailingContent to true when trailingContent is provided', () => {
        @Component({
            template: `
                <hyland-idp-task-header>
                    <div hylandIdpTaskHeaderTrailingContent>Trailing content</div>
                </hyland-idp-task-header>
            `,
            imports: [TaskHeaderComponent, TaskHeaderTrailingContentDirective],
        })
        class TestHostComponent {}

        const hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();

        const taskHeaderInstance = hostFixture.debugElement.query(By.directive(TaskHeaderComponent)).componentInstance as TaskHeaderComponent;

        expect(taskHeaderInstance.trailingContent).toBeDefined();
        expect(taskHeaderInstance.hasTrailingContent).toBe(true);
    });
});
