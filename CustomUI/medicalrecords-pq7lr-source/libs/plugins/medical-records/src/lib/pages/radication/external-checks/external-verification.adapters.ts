import { InjectionToken, Provider } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
    buildSimulatedVerification,
    EXTERNAL_VERIFICATION_KEYS,
    ExternalVerificationKey,
    ExternalVerificationQuery,
    ExternalVerificationResult,
} from '../utils/external-verification.util';

/**
 * Contract of an external system check (`docs/propuesta-preanalisis-interoperabilidad.md` §2).
 * Integrating a real system means providing its adapter instead of the mock one.
 */
export interface ExternalVerificationAdapter {
    key: ExternalVerificationKey;
    query(ctx: ExternalVerificationQuery): Observable<ExternalVerificationResult>;
}

/** All available adapters (multi provider), one per system. */
export const EXTERNAL_VERIFICATION_ADAPTERS = new InjectionToken<ExternalVerificationAdapter[]>('EXTERNAL_VERIFICATION_ADAPTERS');

/** v1 adapter: no HTTP, deterministic synthetic result derived from each invoice number. */
export class MockExternalVerificationAdapter implements ExternalVerificationAdapter {
    constructor(readonly key: ExternalVerificationKey) {}

    query(ctx: ExternalVerificationQuery): Observable<ExternalVerificationResult> {
        return of(buildSimulatedVerification(this.key, ctx, new Date().toISOString()));
    }
}

/** Registers one mock adapter per system under `EXTERNAL_VERIFICATION_ADAPTERS`. */
export function provideMockExternalVerificationAdapters(): Provider[] {
    return EXTERNAL_VERIFICATION_KEYS.map((key) => ({ provide: EXTERNAL_VERIFICATION_ADAPTERS, useValue: new MockExternalVerificationAdapter(key), multi: true }));
}
