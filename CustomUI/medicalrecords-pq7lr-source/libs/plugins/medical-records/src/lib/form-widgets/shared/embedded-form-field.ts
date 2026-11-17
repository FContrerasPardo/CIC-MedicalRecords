/**
 * Minimal stand-in for an ADF form field, so a custom form widget (intake, analysis) can be
 * rendered outside an Automate task form, e.g. inside the case view. It exposes the same
 * surface the widgets read: `field.value`, `field.readOnly` and `field.form.getFieldById(id)`.
 *
 * Values come from a snapshot of process variables. Writes made by the widget (subsanation,
 * reviewed marks) stay in this in-memory copy: nothing is sent back to Automate.
 * Pure module: no Angular imports.
 */
export interface EmbeddedFieldEntry {
    id: string;
    value: unknown;
    readOnly: boolean;
}

export interface EmbeddedForm {
    getFieldById(id: string): EmbeddedFieldEntry;
    getFormFields(): EmbeddedFieldEntry[];
}

export interface EmbeddedFormField extends EmbeddedFieldEntry {
    form: EmbeddedForm;
}

export function createEmbeddedFormField(primaryId: string, variables: Record<string, unknown> | null | undefined, readOnly = false): EmbeddedFormField {
    const source = variables ?? {};
    const entries = new Map<string, EmbeddedFieldEntry>();
    const entry = (id: string): EmbeddedFieldEntry => {
        let found = entries.get(id);
        if (!found) {
            found = { id, value: source[id] ?? null, readOnly };
            entries.set(id, found);
        }
        return found;
    };
    const form: EmbeddedForm = {
        getFieldById: entry,
        getFormFields: () => Array.from(entries.values()),
    };
    // The primary field is the same entry the form returns, so writes through either path agree.
    return Object.assign(entry(primaryId), { form });
}
