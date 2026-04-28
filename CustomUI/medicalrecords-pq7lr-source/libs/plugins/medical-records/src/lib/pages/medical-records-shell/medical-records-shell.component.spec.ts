import { readFileSync } from 'fs';
import { join } from 'path';

describe('MedicalRecordsShellComponent template', () => {
    const template = readFileSync(join(__dirname, 'medical-records-shell.component.html'), 'utf8');
    const component = readFileSync(join(__dirname, 'medical-records-shell.component.ts'), 'utf8');
    const service = readFileSync(join(__dirname, '..', '..', 'services', 'medical-record.service.ts'), 'utf8');

    it('renders the Stitch dashboard shell with translation-aware navigation', () => {
        expect(template).toContain("{{ 'MEDICAL_RECORDS.BRAND' | translate }}");
        expect(template).toContain("{{ activeDetail.titleKey | translate }}");
        expect(template).toContain('*ngFor="let phase of phases; trackBy: trackByPhase"');
        expect(template).toContain('{{ phase.labelKey | translate }}');
        expect(template).toContain("{{ 'MEDICAL_RECORDS.ACTIONS.NEW_INTAKE' | translate }}");
        expect(template).not.toContain('Medical Records Demo');
        expect(template).not.toContain('Automate menu');
    });

    it('includes dedicated Stitch-inspired workspaces for all process phases', () => {
        expect(template).toContain('class="intake-workspace"');
        expect(template).toContain('Elena Rodriguez');
        expect(template).toContain('Document Repository');
        expect(template).toContain('class="analysis-workspace"');
        expect(template).toContain('AI Pre-validation');
        expect(template).toContain('Billed Items Pre-validation');
        expect(template).toContain('class="approval-workspace phase-screen"');
        expect(template).toContain('Account Assembly');
        expect(template).toContain('Pre-Validated Claims');
        expect(template).toContain('class="execution-workspace phase-screen"');
        expect(template).toContain('Unified Appeals Management');
        expect(template).toContain('AI Appeal Justification');
        expect(template).toContain('class="review-workspace phase-screen"');
        expect(template).toContain('Final Review & Audit Phase');
        expect(template).toContain('Audit Logs');
        expect(template).toContain('class="completed-workspace phase-screen"');
        expect(template).toContain('Conciliacion y Cierre de Pagos');
        expect(template).toContain('Payment Reconciliation');
    });

    it('wires medical records actions to native Automate navigation handlers', () => {
        expect(component).toContain('openStartProcess');
        expect(component).toContain('openTaskDetails');
        expect(component).toContain('openProcessDetails');
        expect(component).toContain('openDocument');
        expect(template).toContain('(click)="openStartProcess()"');
        expect(template).toContain('(click)="openTaskDetails(item)"');
        expect(template).toContain('(click)="openProcessDetails({ id:');
        expect(template).toContain('(click)="openDocument()');
    });

    it('uses the native Document AI Process start form for new intake', () => {
        expect(service).toContain("medicalAccountStartProcessName = 'Document AI Process'");
    });
});
