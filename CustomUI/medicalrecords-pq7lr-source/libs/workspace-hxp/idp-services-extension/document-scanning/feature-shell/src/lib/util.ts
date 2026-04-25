/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ComponentRef, InputSignal } from '@angular/core';

type UnwrapInputSignal<T> = T extends InputSignal<infer U> ? U : T;
export function setInput<T, K extends string & keyof T>(componentRef: ComponentRef<T>, name: K, value: UnwrapInputSignal<T[K]>) {
    componentRef.setInput(name, value);
}

export function lastOrDefault<T>(source: Iterable<T>): T | undefined;
export function lastOrDefault<T>(source: Iterable<T>, defaultValue: T): T;
export function lastOrDefault<T>(source: Iterable<T>, defaultValue?: T) {
    let lastItem = defaultValue;
    for (const item of source) {
        lastItem = item;
    }
    return lastItem;
}

export function firstOrDefault<T>(source: Iterable<T>): T | undefined;
export function firstOrDefault<T>(source: Iterable<T>, defaultValue: T): T;
export function firstOrDefault<T>(source: Iterable<T>, defaultValue?: T) {
    for (const item of source) {
        return item;
    }
    return defaultValue;
}
