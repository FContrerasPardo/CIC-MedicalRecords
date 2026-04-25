/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentTypeIconComponent } from './document-type-icon.component';
import { NoopTranslateModule } from '@alfresco/adf-core';
import { jestMocks } from '@hxp/workspace-hxp/shared/testing';
import { Document } from '@hylandsoftware/hxcs-js-client';
import { DefaultIcon } from '@alfresco/adf-hx-content-services/icons';
import { BehaviorSubject } from 'rxjs';
import { FeaturesServiceToken } from '@alfresco/adf-core/feature-flags';

describe('ContentTypeIconComponent', () => {
    let component: ContentTypeIconComponent;
    let fixture: ComponentFixture<ContentTypeIconComponent>;
    let mockFeaturesService: { isOn$: jest.Mock };
    let featureFlagSubject: BehaviorSubject<boolean>;

    beforeEach(() => {
        featureFlagSubject = new BehaviorSubject<boolean>(false);

        mockFeaturesService = {
            isOn$: jest.fn().mockReturnValue(featureFlagSubject),
        };
        TestBed.configureTestingModule({
            imports: [NoopTranslateModule, ContentTypeIconComponent],
            providers: [{ provide: FeaturesServiceToken, useValue: mockFeaturesService }],
        });

        fixture = TestBed.createComponent(ContentTypeIconComponent);
        component = fixture.componentInstance;
    });

    it('given an undefined Document, the mimeType should be the default file icon type', () => {
        component.document = undefined;
        component.ngOnChanges();

        expect(component.mimeType).toBe(DefaultIcon.UNKNOWN);
    });

    it('given a Folder Document, the mimeType should be the default folder icon type', () => {
        component.document = jestMocks.folderDocument;
        component.ngOnChanges();

        expect(component.mimeType).toBe(DefaultIcon.FOLDER);
    });

    it('given an expanded Folder Document, the mimeType should be the expanded folder icon type', () => {
        component.document = jestMocks.folderDocument;
        component.isExpanded = true;
        component.ngOnChanges();

        expect(component.mimeType).toBe(DefaultIcon.OPEN_FOLDER);
    });

    it('given a File Document, the mimeType should be the document mimeType', () => {
        component.document = jestMocks.fileDocument;
        component.ngOnChanges();

        expect(component.mimeType).toBe(jestMocks.fileDocument['sysfile_blob'].mimeType);
    });

    it('given a File Document without a blob, the icon should be empty', () => {
        const document: Document = { ...jestMocks.fileDocument };
        delete document['sysfile_blob'];
        component.document = document;
        component.ngOnChanges();

        expect(component.mimeType).toBe(DefaultIcon.UNKNOWN);
    });
});
