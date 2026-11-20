import { buildInvoiceDiagnosticTables, summarizeCaseVariables } from './case-diagnostics.util';
import {
    applyIntakeCriteria,
    billedRowAmounts,
    buildIntakeFindings,
    computeIntakeKpis,
    documentsLinkedToService,
    filterServices,
    groupIntakeServices,
    intakeFindingAction,
    intakeGroupOptions,
    intakeServiceWarnings,
    IntakeServiceLike,
    intakeWarningsById,
    countIntakeServicesWithWarnings,
    NO_GROUP_KEY,
    originKey,
    parseAmount,
    pendingSupportByClass,
    resolvedIntakeServiceIds,
    serviceAuthorization,
    serviceDetailFields,
    servicesForFinding,
    servicesLinkedToDocument,
    servicesMissingDocument,
} from './case-intake.util';

/** Synthetic billed row; no real data. */
const service = (id: string, missing: string[], extra: Partial<IntakeServiceLike> = {}): IntakeServiceLike => ({
    id,
    serviceDate: '01/11/2026',
    serviceCode: `SVC-${id}`,
    cup: `CUP-${id}`,
    description: `Synthetic service ${id}`,
    quantity: '1',
    price: '100.00',
    total: '100.00',
    coverage: null,
    invoiceNumber: 'INV-1',
    category: 'Lab',
    completionPercent: missing.length ? 50 : 100,
    requiredDocuments: ['Invoice', ...missing],
    presentDocuments: ['Invoice'],
    missingDocuments: missing,
    extractionSource: 'Factura',
    sourceDocumentId: 'doc-invoice',
    extractedFields: [
        { label: 'CUP', value: `CUP-${id}` },
        { label: 'Paciente', value: 'Synthetic Patient' },
        { label: 'No. Autorizacion', value: 'AUT-001' },
    ],
    ...extra,
});

const label = (className: string): string => (className.includes('Factura') ? 'Invoice' : className);

describe('case-intake.util', () => {
    const services = [service('a', []), service('b', ['Lab Result']), service('c', ['Lab Result', 'Order'])];

    it('computes the indicator strip', () => {
        expect(computeIntakeKpis(services, 4)).toEqual({ documents: 4, services: 3, supported: 1, unsupported: 2, readiness: 67 });
        expect(computeIntakeKpis([], 0).readiness).toBe(100);
    });

    it('filters by support, review and linked document', () => {
        expect(filterServices(services, 'unsupported', new Set()).map((item) => item.id)).toEqual(['b', 'c']);
        expect(filterServices(services, 'unreviewed', new Set(['a'])).map((item) => item.id)).toEqual(['b', 'c']);
        expect(filterServices(services, 'all', new Set(), new Set(['c'])).map((item) => item.id)).toEqual(['c']);
    });

    it('groups pending support by class', () => {
        expect(pendingSupportByClass(services)).toEqual([
            { label: 'Lab Result', count: 2 },
            { label: 'Order', count: 1 },
        ]);
    });

    it('links documents and services both ways', () => {
        const documents = [
            { id: 'doc-invoice', className: 'Factura y Desglose' },
            { id: 'doc-other', className: 'Other' },
        ];
        expect(servicesLinkedToDocument(documents[0], services, label)).toEqual(['a', 'b', 'c']);
        expect(servicesLinkedToDocument(documents[1], services, label)).toEqual([]);
        expect(documentsLinkedToService(services[0], documents, label).map((document) => document.id)).toEqual(['doc-invoice']);
    });

    it('lists the main detail fields, including the authorization', () => {
        expect(serviceAuthorization(services[0])).toBe('AUT-001');
        const fields = serviceDetailFields(services[0], 'P');
        expect(fields.map((field) => field.label)).toEqual(['CODE', 'CUP', 'DESCRIPTION', 'CATEGORY', 'DATE', 'QUANTITY', 'UNIT_PRICE', 'TOTAL', 'AUTHORIZATION', 'INVOICE', 'SOURCE']);
        expect(fields[0].labelKey).toBe('P.FIELD.CODE');
    });

    describe('quantity, unit price and total (billedRowAmounts)', () => {
        it('uses the billed Total when present', () => {
            expect(billedRowAmounts({ quantity: '2', price: '100.00', total: '250.00' })).toEqual({ quantity: 2, quantityAssumed: false, price: 100, total: 250, totalComputed: false });
        });

        it('computes Price x Quantity when there is no Total', () => {
            expect(billedRowAmounts({ quantity: '3', price: '1.200,50', total: null })).toEqual({ quantity: 3, quantityAssumed: false, price: 1200.5, total: 3601.5, totalComputed: true });
        });

        it('assumes quantity 1 when it was not detected', () => {
            expect(billedRowAmounts({ quantity: null, price: '80.00', total: null })).toEqual({ quantity: 1, quantityAssumed: true, price: 80, total: 80, totalComputed: true });
        });

        it('assumes quantity 1 when it is not a number or zero', () => {
            expect(billedRowAmounts({ quantity: 'UND', price: '45.5', total: '' })).toEqual({ quantity: 1, quantityAssumed: true, price: 45.5, total: 45.5, totalComputed: true });
            expect(billedRowAmounts({ quantity: '0', price: '10.00', total: null }).total).toBe(10);
        });

        it('has no total without Total nor Price', () => {
            expect(billedRowAmounts({ quantity: '2', price: null, total: 'n/a' })).toEqual({ quantity: 2, quantityAssumed: false, price: null, total: null, totalComputed: false });
        });

        it('marks the assumed quantity and the computed total in the service detail', () => {
            const fields = serviceDetailFields(service('x', [], { quantity: null, price: '50.00', total: null }), 'P');
            const byLabel = new Map(fields.map((field) => [field.label, field]));
            expect(byLabel.get('QUANTITY')?.amount).toBe(1);
            expect(byLabel.get('QUANTITY')?.mark).toBe('assumed');
            expect(byLabel.get('UNIT_PRICE')?.amount).toBe(50);
            expect(byLabel.get('UNIT_PRICE')?.mark).toBeUndefined();
            expect(byLabel.get('TOTAL')?.amount).toBe(50);
            expect(byLabel.get('TOTAL')?.mark).toBe('computed');
            expect(serviceDetailFields(service('y', []), 'P').find((field) => field.label === 'TOTAL')?.mark).toBeUndefined();
        });
    });

    describe('finding card actions', () => {
        it('deletes analyst records and only dismisses agent observations', () => {
            expect(intakeFindingAction({ source: 'registration', origin: 'intake', status: 'open' })).toBe('delete');
            expect(intakeFindingAction({ source: 'audit', origin: 'intake', status: 'review' })).toBe('delete');
            expect(intakeFindingAction({ source: 'audit', origin: 'codingIntegrity', status: 'open' })).toBe('dismiss');
            expect(intakeFindingAction({ source: 'analysis', origin: 'complianceAlert', status: null })).toBe('dismiss');
            expect(intakeFindingAction({ source: 'audit', origin: 'financialVariance', status: 'dismissed' })).toBeNull();
        });
    });

    describe('filters, groups and findings', () => {
        const group = (key: string, label: string, order: number) => ({ key, code: key.replace('section:', ''), label, order });
        const room = group('section:300', '300 HABITACION', 0);
        const lab = group('section:400', '400 LABORATORIO', 5);
        const grouped = [
            service('g1', [], { serviceGroup: lab, total: '1,200.50', description: 'LAB TEST' }),
            service('g2', ['Order'], { serviceGroup: room, total: '300.00', description: 'ROOM DAY' }),
            service('g3', [], { serviceGroup: lab, total: '99.50', description: 'LAB PANEL' }),
            service('g4', [], { serviceGroup: null, total: null, price: null, description: 'PAQUETE QUIRURGICO' }),
        ];
        const criteria = {
            filter: 'all' as const,
            reviewed: new Set<string>(),
            withFinding: new Set<string>(),
            search: '',
            documentIds: null,
            groupKey: null,
            focusIds: null,
        };

        it('filters by reviewed and with finding', () => {
            expect(filterServices(grouped, 'reviewed', new Set(['g2'])).map((item) => item.id)).toEqual(['g2']);
            expect(filterServices(grouped, 'withFinding', new Set(), null, new Set(['g3'])).map((item) => item.id)).toEqual(['g3']);
        });

        it('combines search, group, document and focus', () => {
            expect(applyIntakeCriteria(grouped, { ...criteria, search: 'laboratorio' }).map((item) => item.id)).toEqual(['g1', 'g3']);
            expect(applyIntakeCriteria(grouped, { ...criteria, groupKey: NO_GROUP_KEY }).map((item) => item.id)).toEqual(['g4']);
            expect(applyIntakeCriteria(grouped, { ...criteria, groupKey: 'section:400', focusIds: new Set(['g3', 'g2']) }).map((item) => item.id)).toEqual(['g3']);
            expect(applyIntakeCriteria(grouped, { ...criteria, documentIds: new Set(['g1']), search: 'test' }).map((item) => item.id)).toEqual(['g1']);
        });

        it('lists the warnings of a service: subtotal mismatch and missing support only (computed total and assumed quantity are calculations)', () => {
            expect(intakeServiceWarnings(service('w0', []), null)).toEqual([]);
            expect(intakeServiceWarnings(service('w1', []), { subtotalMismatch: true })).toEqual(['subtotalMismatch']);
            expect(intakeServiceWarnings(service('w2', ['Order'], { quantity: null, total: null, price: '10.00' }), { subtotalMismatch: false })).toEqual(['unsupported']);
            expect(intakeServiceWarnings(service('w3', [], { quantity: '0' }), null)).toEqual([]);
            expect(intakeServiceWarnings(service('w4', [], { quantity: null, total: null, price: '10.00' }), null)).toEqual([]);
            expect(billedRowAmounts(service('w4', [], { quantity: null, total: null, price: '10.00' })).totalComputed).toBe(true);
        });

        it('drops every warning of a reviewed service', () => {
            const reviewed = resolvedIntakeServiceIds({ reviewed: ['r1'] });
            expect(intakeServiceWarnings(service('r1', ['Order']), { subtotalMismatch: true }, reviewed)).toEqual([]);
            expect(intakeServiceWarnings(service('r2', ['Order']), { subtotalMismatch: true }, reviewed)).toEqual(['subtotalMismatch', 'unsupported']);
            const warnings = intakeWarningsById([service('r1', ['Order']), service('r2', ['Order'])], reviewed);
            expect(warnings.get('r1')).toEqual([]);
            expect(countIntakeServicesWithWarnings(warnings)).toBe(1);
        });

        it('drops the warnings of a remediated service: remediation registration or finding in review, accepted or dismissed', () => {
            const invoice = ['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => service(id, ['Order']));
            const resolved = resolvedIntakeServiceIds({
                registrations: [
                    { kind: 'remediation', serviceIds: ['s1'], findingIds: [] },
                    { kind: 'finding', serviceIds: ['s2'], findingIds: ['f-accepted'] },
                    { kind: 'finding', serviceIds: ['s6'], findingIds: ['f-open'] },
                ],
                findings: [
                    { id: 'f-accepted', origin: 'codingIntegrity', status: 'accepted', sourceRef: null },
                    { id: 'f-review', origin: 'intake', status: 'review', sourceRef: 's3' },
                    { id: 'f-open', origin: 'intake', status: 'open', sourceRef: 's6' },
                ],
                findingStatus: { s4: 'dismissed', s5: 'glosa' },
            });
            expect([...resolved].sort()).toEqual(['s1', 's2', 's3', 's4']);
            const warnings = intakeWarningsById(invoice, resolved);
            expect(warnings.get('s5')).toEqual(['unsupported']);
            expect(warnings.get('s6')).toEqual(['unsupported']);
            expect(countIntakeServicesWithWarnings(warnings)).toBe(2);
            expect(filterServices(invoice, 'withWarnings', new Set(), null, new Set(), warnings).map((item) => item.id)).toEqual(['s5', 's6']);
        });

        it('computes group mismatches over the whole invoice, not the filtered view', () => {
            const billedLab = { ...lab, billedSubtotal: 500 };
            const invoice = [
                service('m1', [], { serviceGroup: billedLab, total: '200.00', description: 'LAB TEST' }),
                service('m2', [], { serviceGroup: billedLab, total: '200.00', description: 'LAB PANEL' }),
                service('m3', [], { serviceGroup: room, total: '300.00', description: 'ROOM DAY' }),
            ];
            const warnings = intakeWarningsById(invoice);
            expect(warnings.get('m1')).toEqual(['subtotalMismatch']);
            expect(warnings.get('m3')).toEqual([]);
            expect(applyIntakeCriteria(invoice, { ...criteria, filter: 'withWarnings', warnings, search: 'panel' }).map((item) => item.id)).toEqual(['m2']);
        });

        it('filters with warnings, by reason, combined with search and group', () => {
            const warnings = intakeWarningsById(grouped);
            const withWarnings = { ...criteria, filter: 'withWarnings' as const, warnings };
            expect(filterServices(grouped, 'withWarnings', new Set(), null, new Set(), warnings).map((item) => item.id)).toEqual(['g2']);
            const derived = [...grouped, service('g5', [], { serviceGroup: lab, total: null, price: '20.00', quantity: null, description: 'LAB DERIVED' })];
            const derivedWarnings = intakeWarningsById(derived);
            const derivedCriteria = { ...withWarnings, warnings: derivedWarnings };
            // g5 has a computed total: a calculation, not a warning.
            expect(applyIntakeCriteria(derived, derivedCriteria).map((item) => item.id)).toEqual(['g2']);
            expect(applyIntakeCriteria(derived, { ...derivedCriteria, groupKey: 'section:400' }).map((item) => item.id)).toEqual([]);
            expect(applyIntakeCriteria(derived, { ...derivedCriteria, search: 'room' }).map((item) => item.id)).toEqual(['g2']);
            expect(applyIntakeCriteria(derived, { ...derivedCriteria, warningReason: 'unsupported' }).map((item) => item.id)).toEqual(['g2']);
            expect(applyIntakeCriteria(derived, { ...derivedCriteria, warningReason: 'subtotalMismatch' })).toEqual([]);
            expect(applyIntakeCriteria(derived, { ...derivedCriteria, warnings: undefined })).toEqual([]);
        });

        it('parses billed amounts in both formats', () => {
            expect(parseAmount('1,200.50')).toBe(1200.5);
            expect(parseAmount('1.200,50')).toBe(1200.5);
            expect(parseAmount('$ 3,000')).toBe(3000);
            expect(parseAmount(null)).toBeNull();
            expect(parseAmount('-')).toBeNull();
        });

        it('groups services in invoice order with count, subtotal and support; no group last', () => {
            const groups = groupIntakeServices(grouped);
            expect(groups.map((item) => [item.label, item.services.length, item.subtotal, item.unsupported])).toEqual([
                ['300 HABITACION', 1, 300, 1],
                ['400 LABORATORIO', 2, 1300, 0],
                [null, 1, null, 0],
            ]);
            expect(intakeGroupOptions(grouped).map((option) => option.key)).toEqual(['section:300', 'section:400', NO_GROUP_KEY]);
            expect(servicesMissingDocument(grouped, 'Order')).toEqual(['g2']);
        });

        it('compares the item sum (Total, else Price x Quantity) with the billed subtotal of the group', () => {
            const billedLab = { ...lab, billedSubtotal: 1300 };
            const billedRoom = { ...room, billedSubtotal: 450 };
            const groups = groupIntakeServices([
                service('b1', [], { serviceGroup: billedLab, total: '1,200.50' }),
                service('b2', [], { serviceGroup: billedLab, total: null, price: '49.75', quantity: '2' }),
                service('b3', [], { serviceGroup: billedRoom, total: '300.00' }),
            ]);
            expect(groups.map((item) => [item.label, item.subtotal, item.billedSubtotal, item.subtotalMismatch])).toEqual([
                ['300 HABITACION', 300, 450, true],
                ['400 LABORATORIO', 1300, 1300, false],
            ]);
        });

        it('builds the findings panel: registrations, uncovered audit findings, analysis observations', () => {
            const audit = [
                { id: 'intake:k:g2', origin: 'intake', description: 'ROOM DAY', serviceCode: 'CUP-g2', status: 'open', comment: null, sourceRef: 'g2' },
                { id: 'codingIntegrity:k:F1', origin: 'codingIntegrity', description: 'Code mismatch', serviceCode: 'cup-g1', status: 'accepted', comment: null, sourceRef: 'F1' },
            ];
            const registrations = [{ id: 'r1', kind: 'finding' as const, serviceIds: ['g2', 'gone'], findingIds: ['intake:k:g2'], comment: 'Missing order', at: '2026-11-01T10:00:00Z' }];
            const analysis = [
                audit[1],
                { id: 'financialVariance:k:F9', origin: 'financialVariance', description: 'Price over agreement', serviceCode: 'CUP-g3', status: 'open', comment: null, sourceRef: 'F9' },
            ];
            const entries = buildIntakeFindings(grouped, registrations, audit, analysis);
            expect(entries.map((entry) => [entry.source, entry.title, entry.status, entry.serviceIds])).toEqual([
                ['registration', 'Missing order', 'open', ['g2']],
                ['audit', 'Code mismatch', 'accepted', ['g1']],
                ['analysis', 'Price over agreement', null, ['g3']],
            ]);
            expect(servicesForFinding({ origin: 'provider', serviceCode: null, sourceRef: null }, grouped)).toEqual([]);
            expect(originKey('codingIntegrity')).toBe('CODING_INTEGRITY');
        });
    });

    describe('case-diagnostics.util', () => {
        it('traces the invoice and its raw services without patient columns', () => {
            const [invoice, rows] = buildInvoiceDiagnosticTables({ key: 'k1', invoiceNumber: 'INV-1', documentIds: ['d1', 'd2'], totalBilled: 300, currency: 'DOP' }, services);
            expect(invoice.rows[0]).toEqual(['k1', 'INV-1', '2', '3', '300', 'DOP']);
            expect(rows.columns).toEqual(['id', 'document', 'CUP', 'No. Autorizacion']);
            expect(rows.rows[1]).toEqual(['b', 'doc-invoice', 'CUP-b', 'AUT-001']);
        });

        it('masks the variables: names and types only', () => {
            const fields = summarizeCaseVariables({ status: 'RUNNING', batchState: { documents: [] } });
            expect(fields.map((field) => field.name)).toEqual(['var_batchState', 'var_status']);
            expect(fields.every((field) => !field.samples)).toBe(true);
        });
    });
});
