/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Directive } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { DocumentPathChange } from './document-path-change.model';

@Directive()
export abstract class DocumentPathChangeNotifierService {
    readonly documentPathChange$: Observable<DocumentPathChange>;
    private readonly documentPathChangesSubject = new Subject<DocumentPathChange>();

    constructor() {
        this.documentPathChange$ = this.documentPathChangesSubject.asObservable();
    }

    protected emitDocumentPathChange(pathChange: DocumentPathChange): void {
        this.documentPathChangesSubject.next(pathChange);
    }
}
