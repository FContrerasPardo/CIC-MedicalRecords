/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ShortcutBrowserDialogComponent } from '@hxp/workspace-hxp/idp-services-extension/shared';
import { provideSatoriIcons } from '@hylandsoftware/satori-ui';
import { ScanningSession } from '../../services/scanning-session.service';
import { ScanningViewComponent } from './scanning-view.component';
import { firstValueFrom, isObservable, Observable } from 'rxjs';

jest.mock('split.js', () => ({
    __esModule: true,
    default: jest.fn(() => ({
        destroy: jest.fn(),
    })),
}));

describe(ScanningViewComponent.name, () => {
    let fixture: ComponentFixture<ScanningViewComponent>;
    let component: ScanningViewComponent;
    let openDialogs: MatDialogRef<any>[];

    const selectedPageIds = signal<ReadonlySet<string>>(new Set<string>());
    const batch = signal({
        documents: [
            {
                id: 'doc-1',
                pages: [
                    { id: 'page-1', url: 'blob:page-1', file: new File([], 'page-1.png') },
                    { id: 'page-2', url: 'blob:page-2', file: new File([], 'page-2.png') },
                    { id: 'page-3', url: 'blob:page-3', file: new File([], 'page-3.png') },
                    { id: 'page-4', url: 'blob:page-4', file: new File([], 'page-4.png') },
                ],
            },
        ],
    });

    beforeEach(() => {
        openDialogs = [];
        selectedPageIds.set(new Set());

        TestBed.configureTestingModule({
            imports: [NoopTranslateModule],
            providers: [
                provideSatoriIcons(),
                { provide: MatDialog, useValue: { openDialogs } satisfies Partial<MatDialog> },
                {
                    provide: ScanningSession,
                    useValue: {
                        batch,
                        pageCount: computed(() => batch().documents.flatMap((document) => document.pages).length),
                        selectedPageIds,
                        activePageId: computed(() => [...selectedPageIds()].at(-1)),
                    } satisfies Partial<ScanningSession>,
                },
            ],
        });

        fixture = TestBed.createComponent(ScanningViewComponent);
        component = fixture.componentInstance;
    });

    it('should build viewer datasource from batch pages', async () => {
        const datasource = component.viewerDatasource();

        expect(datasource.documents.map((document) => document.id)).toEqual(['doc-1']);
        expect(datasource.documents[0].pages.map((page) => page.id)).toEqual(['page-1', 'page-2', 'page-3', 'page-4']);
        expect(await resolveFirstValueFrom(datasource.loadImageFn('page-3'))).toEqual(jasmine.objectContaining({ blobUrl: 'blob:page-3' }));
        expect(await resolveFirstValueFrom(datasource.loadThumbnailFn('page-4'))).toEqual('blob:page-4');
    });

    it('should throw when datasource is asked for an unknown page', () => {
        const datasource = component.viewerDatasource();

        expect(() => datasource.loadImageFn('missing-page')).toThrow();
        expect(() => datasource.loadThumbnailFn('missing-page')).toThrow();
    });

    it('should select a single page on regular click', () => {
        component.onPageClick('page-2', new MouseEvent('click'));

        expect([...selectedPageIds()]).toEqual(['page-2']);
    });

    it('should toggle page selection on ctrl-click', () => {
        selectedPageIds.set(new Set(['page-1', 'page-2']));

        component.onPageClick('page-2', new MouseEvent('click', { ctrlKey: true }));
        expect([...selectedPageIds()]).toEqual(['page-1']);

        component.onPageClick('page-3', new MouseEvent('click', { ctrlKey: true }));
        expect([...selectedPageIds()]).toEqual(['page-1', 'page-3']);
    });

    it('should select a page range on shift-click', () => {
        selectedPageIds.set(new Set(['page-2']));

        component.onPageClick('page-4', new MouseEvent('click', { shiftKey: true }));

        expect([...selectedPageIds()]).toEqual(['page-2', 'page-3', 'page-4']);
    });

    it('should add a page range to current selection on ctrl-shift-click', () => {
        selectedPageIds.set(new Set(['page-1', 'page-2']));

        component.onPageClick('page-4', new MouseEvent('click', { ctrlKey: true, shiftKey: true }));

        expect([...selectedPageIds()]).toEqual(['page-1', 'page-2', 'page-3', 'page-4']);
    });

    it('should update selection from viewer page selected event', () => {
        selectedPageIds.set(new Set(['page-1', 'page-2']));

        component.viewerEvent$.emit({
            type: 'PageSelected',
            data: {
                newValue: {
                    pageNavInfo: {
                        currentPageIndex: 0,
                        totalPages: 4,
                    },
                },
            },
        } as any);

        expect([...selectedPageIds()]).toEqual(['page-2', 'page-1']);
    });

    it('should open shortcut browser only when there are no dialogs open', () => {
        const openDialogSpy = jest.spyOn(ShortcutBrowserDialogComponent, 'openDialog').mockImplementation();

        component.onShortcutBrowserClick();
        expect(openDialogSpy).toHaveBeenCalledTimes(1);

        openDialogs.push({} as MatDialogRef<any>);
        component.onShortcutBrowserClick();
        expect(openDialogSpy).toHaveBeenCalledTimes(1);

        openDialogSpy.mockRestore();
    });
});

function resolveFirstValueFrom<T>(source: Observable<T> | PromiseLike<T> | T) {
    return Promise.resolve(isObservable(source) ? firstValueFrom(source) : source);
}
