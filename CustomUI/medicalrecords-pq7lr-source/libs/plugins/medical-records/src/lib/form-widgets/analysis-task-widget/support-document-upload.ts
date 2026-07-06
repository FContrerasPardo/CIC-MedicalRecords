/**
 * Drives Automate's native attach-file widget (hxp-attach-file-widget) from a custom
 * form widget: it locates the native upload control in the DOM and clicks it, so the
 * platform handles the actual upload + node creation. Ported from the intake widget so
 * the analysis widget can reuse the same upload affordance against its own attach-file
 * field id. Pure DOM helpers — no Angular dependency.
 */

export type NativeUploadStatus = 'opened' | 'highlighted' | 'not-found';

export interface NativeUploadResult {
    ok: boolean;
    status: NativeUploadStatus;
}

const UPLOAD_CONTAINER_SELECTOR =
    'hxp-attach-file-widget, [id^="field-Attachfile"], [id*="field-Attachfile"], .adf-attach-file-widget-container, .adf-attach-widget, .adf-cloud-upload-widget-container, .adf-upload-widget';

function escapeSelectorId(id: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(id);
    }
    return id.replace(/["\\\]]/g, '\\$&');
}

/**
 * The task form (and ADF's attach-file widget) can live behind a shadow root or a
 * same-origin iframe depending on the host shell, which makes a plain
 * `document.querySelector` miss the button even though it is clearly visible. Collect the
 * main document plus every reachable open shadow root and same-origin iframe document so
 * lookups pierce those component boundaries.
 */
function collectRoots(): Array<Document | ShadowRoot> {
    const roots: Array<Document | ShadowRoot> = [document];

    for (let index = 0; index < roots.length; index += 1) {
        const root = roots[index];

        root.querySelectorAll('*').forEach((element) => {
            const shadow = (element as HTMLElement).shadowRoot;
            if (shadow && !roots.includes(shadow)) {
                roots.push(shadow);
            }
        });

        root.querySelectorAll('iframe').forEach((frame) => {
            try {
                const doc = (frame as HTMLIFrameElement).contentDocument;
                if (doc && !roots.includes(doc)) {
                    roots.push(doc);
                }
            } catch {
                // Cross-origin iframe — not accessible, skip.
            }
        });
    }

    return roots;
}

function deepQuery(selector: string): HTMLElement | null {
    for (const root of collectRoots()) {
        const match = root.querySelector<HTMLElement>(selector);
        if (match) {
            return match;
        }
    }
    return null;
}

function deepQueryAll(selector: string): HTMLElement[] {
    const matches: HTMLElement[] = [];
    for (const root of collectRoots()) {
        matches.push(...Array.from(root.querySelectorAll<HTMLElement>(selector)));
    }
    return matches;
}

function deepGetById(id: string): HTMLElement | null {
    const direct = document.getElementById(id);
    if (direct) {
        return direct;
    }
    return deepQuery(`#${escapeSelectorId(id)}`);
}

function isLikelyNativeUploadButton(button: HTMLButtonElement): boolean {
    const id = button.id?.toLowerCase() ?? '';
    const text = button.textContent?.trim().toLowerCase() ?? '';
    const className = typeof button.className === 'string' ? button.className.toLowerCase() : '';
    const hasKnownContainer = Boolean(button.closest(UPLOAD_CONTAINER_SELECTOR));
    const hasUploadIcon = Boolean(
        button.querySelector(
            'mat-icon[ng-reflect-svg-icon="attach_file"], mat-icon[ng-reflect-svg-icon="file_upload"], mat-icon[data-mat-icon-name="attach_file"], mat-icon[data-mat-icon-name="file_upload"], mat-icon[svgicon="attach_file"], mat-icon[svgicon="file_upload"]'
        )
    );

    if (id.startsWith('attachfile') || className.includes('adf-attach-widget__menu-upload__button')) {
        return true;
    }

    if (hasUploadIcon && /(attach|adjuntar|upload|cargar)/i.test(text)) {
        return true;
    }

    return hasKnownContainer && hasUploadIcon;
}

function normalizeUploadFieldContainer(element: HTMLElement): HTMLElement {
    return (
        element.closest<HTMLElement>(
            `${UPLOAD_CONTAINER_SELECTOR}, [data-automation-id], [id], [name], [adf-upload]`
        ) ?? element
    );
}

export function findNativeUploadFieldElement(fieldId: string): HTMLElement | null {
    // Most reliable: direct id lookup (document first, then any shadow root).
    const byId = deepGetById(fieldId);
    if (byId) {
        return normalizeUploadFieldContainer(byId);
    }

    const escaped = escapeSelectorId(fieldId);
    const selectors = [
        `[data-automation-id="${escaped}"]`,
        `[data-automation-id*="${fieldId}"]`,
        `[id*="${fieldId}"]`,
        `[name="${fieldId}"]`,
        `[name*="${fieldId}"]`,
        'hxp-attach-file-widget',
        '[id^="field-Attachfile"]',
        '[id*="field-Attachfile"]',
    ];

    for (const selector of selectors) {
        const match = deepQuery(selector);
        if (match) {
            return normalizeUploadFieldContainer(match);
        }
    }

    const directiveMatches = deepQueryAll('[adf-upload]');
    if (directiveMatches.length === 1) {
        return normalizeUploadFieldContainer(directiveMatches[0]);
    }

    const fileInputMatches = deepQueryAll('input[type="file"]');
    if (fileInputMatches.length === 1) {
        return normalizeUploadFieldContainer(fileInputMatches[0]);
    }

    const buttonSelectors = [
        '.adf-attach-widget__menu-upload__button',
        '.adf-attach-widget__menu-upload button',
        'hxp-attach-file-widget button',
        'button[id^="Attachfile"]',
        'button[id*="Attachfile"]',
        '.adf-cloud-upload-widget-container button',
    ];

    for (const selector of buttonSelectors) {
        const match = deepQuery(selector);
        if (match) {
            return normalizeUploadFieldContainer(match);
        }
    }

    const fallbackButton = deepQueryAll('button').find((button) =>
        isLikelyNativeUploadButton(button as HTMLButtonElement)
    );
    return fallbackButton ? normalizeUploadFieldContainer(fallbackButton) : null;
}

export function findNativeUploadClickTarget(container: HTMLElement): HTMLElement | null {
    const selectors = [
        '.adf-attach-widget__menu-upload__button:not([disabled])',
        'button[id^="Attachfile"]:not([disabled])',
        'button[id*="Attachfile"]:not([disabled])',
        'input[type="file"]:not([disabled])',
        '[adf-upload]:not([disabled])',
        'button:not([disabled])',
        '[role="button"]:not([aria-disabled="true"])',
    ];

    for (const selector of selectors) {
        if (container.matches(selector)) {
            return container;
        }

        const target = container.querySelector<HTMLElement>(selector);
        if (target) {
            return target;
        }
    }

    const hostComponent = container.closest<HTMLElement>('hxp-attach-file-widget');
    if (hostComponent) {
        return hostComponent;
    }

    return container.matches('hxp-attach-file-widget') ? container : null;
}

function highlightNativeUploadField(element: HTMLElement): void {
    element.style.outline = '3px solid #f59e0b';
    element.style.outlineOffset = '6px';
    element.style.boxShadow = '0 0 0 10px rgba(245, 158, 11, 0.18)';
    element.style.borderRadius = '18px';
    element.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease';
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Locate the native attach-file widget for `fieldId` and click it. Falls back to
 * highlighting the field if a direct click is not possible.
 */
export function triggerNativeUpload(fieldId: string): NativeUploadResult {
    const container = findNativeUploadFieldElement(fieldId);
    if (!container) {
        // eslint-disable-next-line no-console
        console.warn(
            `[analysis-task-widget] Attach-file control "${fieldId}" was not found in the document, shadow roots, or same-origin iframes.`
        );
        return { ok: false, status: 'not-found' };
    }

    const clickTarget = findNativeUploadClickTarget(container);
    if (clickTarget) {
        try {
            clickTarget.click();
            return { ok: true, status: 'opened' };
        } catch {
            // Fall through to highlight guidance below.
        }
    }

    highlightNativeUploadField(container);
    return { ok: true, status: 'highlighted' };
}
