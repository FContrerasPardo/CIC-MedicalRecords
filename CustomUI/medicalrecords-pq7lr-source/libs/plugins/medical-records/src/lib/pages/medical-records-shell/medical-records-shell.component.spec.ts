import { readFileSync } from 'fs';
import { join } from 'path';

describe('MedicalRecordsShellComponent template', () => {
    const template = readFileSync(join(__dirname, 'medical-records-shell.component.html'), 'utf8');

    it('renders the Stitch dashboard shell instead of the placeholder', () => {
        expect(template).toContain('Hyland Cuentas Medicas');
        expect(template).toContain('Process Overview Dashboard');
        expect(template).toContain('Overview');
        expect(template).toContain('Intake');
        expect(template).toContain('Analysis');
        expect(template).toContain('Approval');
        expect(template).toContain('Execution');
        expect(template).toContain('Review');
        expect(template).toContain('Completed');
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
});
