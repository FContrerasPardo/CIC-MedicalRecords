/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { BehaviorSubject, catchError, concatMap, defer, from, fromEventPattern, ignoreElements, map, merge, retry, shareReplay, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { ScannerDetails } from '../models/scanning-models';

interface ScannerSettings {
    configurationData?: string;
    parentWindowTitle?: string;
}

type ScannedFileMimeType = 'image/tiff' | 'image/jpeg' | 'image/png';

interface ScanSettings {
    showSettingBeforeScan: boolean;
    preferredFormats: ReadonlyArray<ScannedFileMimeType>;
}

interface ScannedFile {
    details: {
        format: {
            mimeType: string;
            fileExtensions: string[];
        };
    };
    data: string | ArrayBuffer;
}

export type ScanningHubState =
    | { status: 'disconnected' }
    | { status: 'connecting' }
    | { status: 'connected' }
    | { status: 'failed'; error: any }
    ;


@Injectable({
    providedIn: 'root',
})
export class ScanningHubClient {
    private handshake$() {
        this.stateSubject.next({ status: 'connecting' });

        const port = ScanningHubClient.getPort();
        const token = ScanningHubClient.getToken();

        const hubUrl = new URL('http://localhost');
        hubUrl.port = port.toString();
        hubUrl.pathname = '/scanning';
        const connection = new HubConnectionBuilder()
            .withUrl(hubUrl.toString())
            .withAutomaticReconnect()
            .build();

        const establishConnection = async () => {
            await connection.start();
            ScanningHubClient.setPort(port);
            ScanningHubClient.setToken(token);
            return connection;
        };

        return from(establishConnection()).pipe(
            catchError((error) => {
                console.warn('Initial connection failed, starting handshake', { error });

                const handshakeUrl = new URL('hcsh://start');
                handshakeUrl.searchParams.set('port', port.toString());
                handshakeUrl.searchParams.set('token', token);
                globalThis.location.assign(handshakeUrl);

                return defer(() => from(establishConnection())).pipe(
                    retry({ count: 40, delay: 500 })
                );
            }),
            tap({
                next: () => this.stateSubject.next({ status: 'connected' }),
                error: (error) => this.stateSubject.next({ status: 'failed', error }),
            }),
            catchError((err) => throwError(() => err)), // do not replay errors
            shareReplay({ bufferSize: 1, refCount: false })
        );
    }

    private static getPort() {
        const savedPort = localStorage.getItem('idp-scanning-service-port');
        return savedPort ? Number.parseInt(savedPort, 10) : randomInt(50_000, 65_000);
    }

    private static setPort(port: number) {
        localStorage.setItem('idp-scanning-service-port', port.toString());
    }

    private static getToken() {
        const savedToken = localStorage.getItem('idp-scanning-service-token');
        return savedToken || crypto.randomUUID();
    }

    private static setToken(token: string) {
        localStorage.setItem('idp-scanning-service-token', token);
    }

    private readonly stateSubject = new BehaviorSubject<ScanningHubState>({ status: 'disconnected' });
    public readonly state$ = this.stateSubject.asObservable();

    private readonly connection$ = this.handshake$().pipe(
        switchMap(startIfNecessary)
    );

    findScanners$() {
        return this.connection$.pipe(
            switchMap((connection) => connection.invoke<ScannerDetails[]>('FindScanners'))
        );
    }

    showUserInterface$(scanner: ScannerDetails, scannerSettings?: ScannerSettings) {
        return this.connection$.pipe(
            concatMap((connection) => {
                const completed$ = onCompleted$(connection);
                return merge(
                    onConfigurationChanged$(connection),
                    completed$.pipe(ignoreElements()),
                    from(connection.invoke<void>('StartShowUserInterface', scanner, scannerSettings)).pipe(ignoreElements())
                ).pipe(
                    takeUntil(completed$)
                );
            })
        );
    }

    scan$(scanner: ScannerDetails, scannerSettings?: ScannerSettings, scanSettings?: Partial<ScanSettings>) {
        return this.connection$.pipe(
            concatMap((connection) => {
                const completed$ = onCompleted$(connection);
                return merge(
                    onConfigurationChanged$(connection),
                    onFileScanned$(connection),
                    completed$.pipe(ignoreElements()), // propagate errors from completed event
                    from(connection.invoke<void>('StartScan', scanner, scannerSettings, scanSettings)).pipe(ignoreElements()) // start scan after listening for events
                ).pipe(
                    takeUntil(completed$) // stop when completed
                );
            })
        );
    }
}

async function startIfNecessary(connection: HubConnection) {
    if (connection.state === 'Disconnected') {
        await connection.start();
    }
    return connection;
}

function onCompleted$(connection: HubConnection) {
    return on$<any>(connection, 'Completed').pipe(
        map((error) => { if (error) { throw error; } })
    );
}

function onConfigurationChanged$(connection: HubConnection) {
    return on$<string>(connection, 'ConfigurationChanged').pipe(map((config) => ({ config })));
}

function onFileScanned$(connection: HubConnection) {
    return on$<ScannedFile>(connection, 'FileScanned').pipe(
        map((file) => ({
            file: {
                ...file,
                data: scannedFileToBlob(file),
            },
        }))
    );
}

function on$<R>(connection: HubConnection, event: string, resultSelector?: Parameters<typeof fromEventPattern<R>>[2]) {
    return fromEventPattern<R>(
        (handler) => connection.on(event, handler),
        (handler) => connection.off(event, handler),
        resultSelector
    ).pipe(
        shareReplay({ refCount: true, bufferSize: 1 })
    );
}

function scannedFileToBlob(file: ScannedFile) {
    const bytes = typeof file.data === 'string' ? base64ToByteArray(file.data) : file.data;
    return new Blob([bytes], { type: file.details.format.mimeType });
}

function base64ToByteArray(base64: string) {
    const byteCharacters = atob(base64);
    const bytes = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        // eslint-disable-next-line unicorn/prefer-code-point
        bytes[i] = byteCharacters.charCodeAt(i);
    }
    return bytes;
}

function randomInt(min: number, max: number) {
    if (min > max) {
        throw new Error('min cannot be greater than max');
    }
    const range = max - min + 1;
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return min + (array[0] % range);
}
