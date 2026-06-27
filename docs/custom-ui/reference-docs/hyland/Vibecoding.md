CIC UI Vibe Info
Building a Custom UI for Hyland CIC with the Satori Design System
A practical guide for developers new to the Hyland CIC platform, based on a production build of the Argumentum Commercial Submission UI.
ℹ️ What this guide covers
This page documents the end-to-end approach for building a fully custom Angular application that integrates with Hyland CIC (Content Intelligence Cloud): authenticating, starting and monitoring BPMN processes, working with Intelligent Document Processing (IDP) tasks, retrieving documents from HCS (Hyland Content Services), and surfacing process status in real time. All patterns come from a working production build.
________________________________________
 Table of Contents 
•	Building a Custom UI for Hyland CIC with the Satori Design System 
o	1. Before You Write a Single Line of Code 
	1.1 Information to Collect
	1.2 BPMN Process Audit Checklist
o	2. Project Setup 
	2.1 Recommended Stack
	2.2 Constants File — Create This First
	2.3 Build Command
	2.4 Deploying to CIC Studio
o	3. Authentication 
	3.1 How CIC Auth Works
	3.2 HTTP Interceptor Pattern
o	4. Starting a Process 
	4.1 Two-Step Start Pattern
	4.2 Race Condition with BPMN Gateways
	4.3 Variable Type Reference
o	5. Working with Tasks 
	5.1 Querying Tasks
	5.2 Completing a Task
	5.3 Mapping Task Definitions to UI Components
	5.4 Parallel Tasks (IDP)
	5.5 IDP Tasks and the Native CIC Form
o	6. Documents: Storing, Retrieving & Displaying 
	6.1 Two Completely Different Hosts
	6.2 Listing Documents in a Folder
	6.3 Downloading a Document
	6.4 Inline Viewer — The Blob URL Pattern
o	7. Deriving & Displaying Process Status 
	7.1 Status Is Not a Single Variable
	7.2 Conditional vs Sequential Steps in a Timeline
	7.3 Step Order Must Match BPMN Execution Order
	7.4 Real-Time Polling Pattern
o	8. Accelerating Development with Claude Code 
	8.1 CLAUDE.md — Your Project Brain ⭐ Highest ROI
	8.2 Memory Files for Discovered Knowledge
	8.3 Background Builds
	8.4 Parallel Explore Agents for Codebase Audits
	8.5 Plan Mode for Multi-File Changes
	8.6 Custom Slash Commands
	8.7 MCP Servers — Direct API Integration
	8.8 Hooks for Guardrails
o	9. Token Efficiency Tips 
	9.1 Front-Load Context, Don't Repeat It
	9.2 Ask for Targeted Changes
	9.3 Use /compact Before Long Implementation Sessions
	9.4 Background Agents for Reads
	9.5 Split Sessions at Natural Boundaries
	9.6 Reference Files by Path, Not by Pasting
	9.7 Batch Independent Changes in One Message
	9.8 Token Cost Reference
o	10. Master Gotcha Reference
1. Before You Write a Single Line of Code
The biggest time-sink on a CIC custom UI project is chasing down configuration values mid-build. Gather all of the following from your CIC Studio administrator before you start.
1.1 Information to Collect
What you need	Where to find it	Example
CIC Studio host URL	Browser address bar when logged into Studio	<https://<env-id>>.studio.experience.hyland.com/<app-id>
ECM / HCS host URL	Studio → Repository settings, or HAR network capture	<https://prod-<hash>>.content.experience.hyland.com
Process definition key	CIC Studio → Process Definitions list	Process_0PKssowP
Start form key	Process definition → Start Event → Form key field	submissionStartForm
Task definition keys	Each user task in the BPMN → Properties panel	ClassificationReview, FieldReview
All process variable names	BPMN gateway conditions + script task XML (copy-paste, do not retype)	bIGO, stNIGOReasonOutcom
BPM / Query API base path	Same origin as Studio, suffixed with app path	/<app-id>/rb/v1/ and /<app-id>/query/v1/
IAM / Auth issuer	CIC Studio → Identity / SSO settings	<https://auth.iam.experience.hyland.com/idp>
Deployed workspace / app name	CIC Studio → Applications list	ins-submission-k53n6
HCS staging folder ID	Hyland Content Services → folder node GUID	b4f2a...
🛑 Critical lesson learned — ECM host is a separate subdomain:
The ECM / HCS host is completely different from the CIC Studio host. Document downloads and folder listings must go directly to the ECM host. Routing them through the Studio host returns 404 because nginx does not proxy that path. Always confirm the ECM host by capturing a real HAR from a working CIC native UI session before building any document features.
1.2 BPMN Process Audit Checklist
Before writing any code, open every BPMN process in CIC Studio and record:
•	Every gateway condition and the exact variable name + expected value (copy from XML, do not retype — typos in BPMN variable names are common and must match exactly)
•	Which tasks are conditional (not every submission traverses them) vs always sequential
•	Which tasks can run in parallel (e.g., IDP field verification spawns one task per uploaded document)
•	Whether any subprocesses exist — these have their own process instance IDs and require separate API calls
•	The exact string values written to variables by service tasks (e.g., what value does the gateway write to stNIGOReasonOutcom when staff overrides?)
⚠️ Real example — a typo that caused a race condition:
In the Argumentum project the DocuSign gateway read the variable bAppilcationSigned (transposed letters). The start form submitted bApplicationSigned (correct spelling). Because these are different variable names the gateway could never read the submitted value. Always verify by reading the actual gateway condition XML — not the display label in the Studio canvas.
________________________________________
2. Project Setup
2.1 Recommended Stack
•	Angular 17+ with standalone components — no NgModules needed; each component declares its own imports[] array
•	NX monorepo — keeps the host application and plugin library cleanly separated with shared build tooling
•	Angular Material — Hyland's Satori design tokens layer on top of Material; tooltips, snackbars, and CDK overlays work out of the box
•	RxJS — all Hyland REST APIs are best consumed as Observables; embrace the pipeline pattern from day one
2.2 Constants File — Create This First
Create a single process.constants.ts that centralises every environment value. Never hardcode hosts or variable names inline.
// libs/your-plugin/src/lib/constants/process.constants.ts

export const ARG_BPM_HOST       = 'https://<env>.studio.experience.hyland.com/<app-id>';
export const ARG_ECM_HOST       = 'https://<prod-hash>.content.experience.hyland.com';
export const ARG_PROCESS_KEY    = 'Process_0PKssowP';
export const ARG_START_FORM_KEY = 'submissionStartForm';
export const ARG_APP_NAME       = 'your-app-name';
export const ARG_TEMP_FOLDER_ID = 'b4f2a...';  // HCS staging folder

// BPMN variable names — copy exact strings from the process XML, do not retype
export const VAR_IS_IGO                  = 'bIGO';
export const VAR_APPLICATION_SIGNED      = 'bApplicationSigned';
export const VAR_APPLICATION_SIGNED_TYPO = 'bAppilcationSigned'; // typo in BPMN — must match exactly
export const VAR_NIGO_REASON_OUTCOME     = 'stNIGOReasonOutcom';

// BPMN outcome values — also copy from XML
export const NIGO_OUTCOME_MISSING_DOC = 'Submit Missing Document';
export const NIGO_OUTCOME_OVERRIDE_UW = 'Override and Send to UW';
2.3 Build Command
If you are using NX, always set the cache-skip environment variable via PowerShell. The bash-style $env: syntax is silently ignored in a bash shell and NX will serve stale cached output without any warning — your changes will appear not to be working even though the source files are correct.
# PowerShell (correct — env var is actually set)
$env:NX_SKIP_NX_CACHE = 'true'; npm run pack-build your-workspace

# bash equivalent
NX_SKIP_NX_CACHE=true npm run pack-build your-workspace
✅ How to verify a fresh compile happened: Check that the main-<HASH>.js filename inside your dist zip changed between builds. If the content hash is identical to the previous build, the NX cache was not bypassed and your source changes were not compiled in.
2.4 Deploying to CIC Studio
1.	Build produces a dist/your-workspace-build.zip
2.	Log into CIC Studio → Applications → select your application
3.	Upload the zip via the Custom UI / Workspace upload panel
4.	After deploying, do a hard refresh in the browser (Ctrl+Shift+R) — the JS bundle filename changes with each build but the browser may still serve a cached copy of the old bundle if you do a normal refresh
________________________________________
3. Authentication
3.1 How CIC Auth Works
Hyland CIC uses Hyland IAM, an OpenID Connect provider. When a user is logged into CIC Studio, an access token is written to the browser's localStorage. Because your custom UI is deployed inside the Studio shell (same origin, same domain), it shares that localStorage and can read the token without a separate login flow.
3.2 HTTP Interceptor Pattern
Create an Angular HttpInterceptor that reads the token from localStorage and attaches it as a Bearer header to every outbound request:
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ArgAuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Try multiple known localStorage key names across CIC versions
    const token = localStorage.getItem('access_token')
               ?? localStorage.getItem('ALFRESCO_REMEMBER_ME');

    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
    return next.handle(req);
  }
}
Register it in your standalone application bootstrap:
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([argAuthInterceptorFn])),
  ],
});
⚠️ Scope: This localStorage approach works for custom UIs deployed within the CIC Studio shell (same origin). It is appropriate for internal tooling and demos. A standalone public-facing application requires a proper OAuth 2.0 PKCE flow with Hyland IAM as the identity provider.
________________________________________
4. Starting a Process
4.1 Two-Step Start Pattern
Use the Form API to start the process — it atomically creates the process instance and sets start-form variables in a single call, meaning those variables exist at t=0 before any BPMN gateway can evaluate. Use a secondary PUT variables call for any additional variables the form key does not expose.
// Step 1 — Start via Form API (variables arrive atomically at t=0)
POST /rb/v1/process-instances
{
  "processDefinitionKey": "Process_0PKssowP",
  "payloadType": "StartProcessPayload",
  "variables": {
    "bApplicationSigned": { "value": false, "type": "boolean" },
    "bAppilcationSigned": { "value": false, "type": "boolean" },
    "insuredName":         { "value": "Acme Corp", "type": "string" }
  }
}

// Step 2 — Belt-and-suspenders: also write via PUT after start
PUT /rb/v1/process-instances/{processInstanceId}/variables
[
  { "name": "bApplicationSigned", "value": false, "type": "boolean" },
  { "name": "bAppilcationSigned", "value": false, "type": "boolean" }
]
🛑 Critical — payloadType is mandatory on every process/task call: Both process start and task completion require a payloadType field. If you omit it, the API may return HTTP 200 but the operation will silently fail. This is not prominently documented. Always include:
•	Process start: "payloadType": "StartProcessPayload"
•	Task complete: "payloadType": "CompleteTaskPayload"
4.2 Race Condition with BPMN Gateways
BPMN exclusive gateways can evaluate within 1–2 seconds of process start. If your secondary variable PUT is delayed (e.g., due to 404 retries while the process instance warms up), the gateway may evaluate before your variable arrives and take the wrong path.
Three-layer mitigation:
1.	Include all gateway-critical variables in the Form API body so they arrive at t=0
2.	If a variable has a typo variant in the BPMN, send both spellings in the Form API body
3.	Keep secondary PUT retry delays short — 200ms, not 500ms
// Retry pattern — short delay is critical for race-sensitive gateways
retryWhen(errors =>
  errors.pipe(
    mergeMap((err, attempt) => {
      if (err?.status === 404 && attempt < 5) {
        return timer(200); // 200ms — gateway evaluates at ~t+2s, must beat it
      }
      return throwError(() => err);
    })
  )
)
4.3 Variable Type Reference
The process engine is strict about variable types. Always specify the type field — a boolean sent without it may be coerced to a string and fail gateway conditions silently.
TypeScript value	API type string
true / false	"boolean"
"some string"	"string"
42	"integer"
3.14	"double"
{ nested: true }	"json"
________________________________________
5. Working with Tasks
5.1 Querying Tasks
Use the Query API (not the Runtime API) for list views — it supports richer filtering and pagination. Tasks exist in two states you must query separately and merge:
# Tasks claimed by a user
GET /query/v1/tasks?status=ASSIGNED&processDefinitionKey=Process_0PKssowP&maxItems=100

# Tasks not yet claimed
GET /query/v1/tasks?status=CREATED&processDefinitionKey=Process_0PKssowP&maxItems=100

# Tasks for a specific process instance (both states)
GET /query/v1/tasks?rootProcessInstanceId={id}&status=ASSIGNED&maxItems=50
GET /query/v1/tasks?rootProcessInstanceId={id}&status=CREATED&maxItems=50
⚠️ CREATED vs ASSIGNED: A task that has not been claimed is CREATED. A task claimed by a user is ASSIGNED. If you query only one state, you will miss half the open tasks. Always merge both result sets.
5.2 Completing a Task
POST /rb/v1/tasks/{taskId}/complete
{
  "payloadType": "CompleteTaskPayload",
  "variables": {
    "stNIGOReasonOutcom": { "value": "Override and Send to UW", "type": "string" }
  }
}
5.3 Mapping Task Definitions to UI Components
Each user task in the BPMN has a definition key. Map these to a TypeScript enum so your UI can render the correct action panel for each task type:
export enum ArgTaskType {
  ClassificationReview = 'ClassificationReview',
  FieldReview          = 'FieldReview',
  ManageNIGO           = 'ManageNIGO',
  UnderwriterReview    = 'UnderwriterReview',
}

function deriveTaskType(task: ApiTask): ArgTaskType {
  const key = task.formKey ?? task.taskDefinitionKey ?? '';
  if (key.includes('Classification')) return ArgTaskType.ClassificationReview;
  if (key.includes('FieldReview'))    return ArgTaskType.FieldReview;
  if (key.includes('ManageNIGO'))     return ArgTaskType.ManageNIGO;
  return ArgTaskType.ClassificationReview; // safe fallback
}
5.4 Parallel Tasks (IDP)
IDP processes often spawn one task per document in parallel. All parallel tasks share the same rootProcessInstanceId but have different id values. Group them by root ID in your task list so they appear as a single row rather than multiple separate rows:
interface TaskGroup {
  rootProcessInstanceId: string;
  tasks: ArgTask[];       // all parallel tasks for this submission
  primaryTask: ArgTask;   // the one to show actions for (first or active)
  insuredName?: string;
}
5.5 IDP Tasks and the Native CIC Form
Classification Review and Field Review tasks require human review in the native CIC form before completion. The recommended UI pattern:
1.	Show a prominent notice explaining that review happens in the CIC form
2.	Provide a direct deep-link: https://<studio-host>/<app-id>/ui/<workspace>/tasks/<taskId>
3.	After the user returns from the CIC form, complete the task via your custom UI to advance the process
For demo or testing purposes, IDP tasks can be auto-completed programmatically by calling the complete endpoint immediately after the task appears — bypassing the manual review step entirely.
________________________________________
6. Documents: Storing, Retrieving & Displaying
6.1 Two Completely Different Hosts
This is the most common source of confusion when building document features. Every document operation goes to the ECM host, not the Studio host:
Host	Used for	Base URL pattern
CIC Studio host	BPMN APIs, task APIs, process variables, auth	https://<env>.studio.experience.hyland.com/<app-id>
ECM / HCS host	Document listing, download, upload, folder browsing	https://<prod-hash>.content.experience.hyland.com
Never route document download requests through the Studio host. The nginx proxy does not forward that path and you will receive 404 with no meaningful error message.
6.2 Listing Documents in a Folder
GET https://<ecm-host>/api/repository/v1/nodes/{folderId}/children
    ?include=properties,allowableOperations
    &where=(isFile=true)
Authorization: Bearer <token>
{
  "list": {
    "entries": [
      {
        "entry": {
          "sys_id": "abc123...",
          "sys_title": "Application_Form.pdf",
          "sysfile_blob": { "mimeType": "application/pdf", "length": 204800 }
        }
      }
    ]
  }
}
Note: The node identifier field is sys_id, not id. Use sys_id for all download calls.
6.3 Downloading a Document
GET https://<ecm-host>/api/download/{nodeId}/sysfile_blob?inline=false
Authorization: Bearer <token>
6.4 Inline Viewer — The Blob URL Pattern
The native CIC viewer workspace can suffer from Apollo GraphQL misconfiguration in custom environments, causing infinite loading spinners. A more reliable approach is to fetch the binary through your authenticated Angular HTTP service and inject it directly into a new browser tab using a Blob URL.
Why this approach:
•	Uses the same auth token as the rest of your app
•	Works regardless of whether the CIC viewer workspace is healthy
•	Supports all file types the browser can natively render (PDF, images, text)
•	Avoids popup blockers by opening the tab synchronously within the click handler
openDocument(nodeId: string, fileName: string): void {
  // IMPORTANT: open the tab synchronously inside the click handler.
  // window.open() called inside an async callback (e.g., inside .subscribe())
  // loses the user-gesture context and will be blocked by popup blockers.
  const newTab = window.open('about:blank', '_blank');
  if (!newTab) {
    this.snackBar.open(
      'Allow popups for this site to view documents.',
      'Dismiss', { duration: 5000 }
    );
    return;
  }

  this.docService.getDocumentContent(nodeId, this.ecmHost)
    .subscribe({
      next: (blob: Blob) => {
        const mimeType = this.resolveMime(fileName, blob);
        const typedBlob = new Blob([blob], { type: mimeType });
        const url = URL.createObjectURL(typedBlob);

        newTab.location.href = url;

        // Release the object URL after the browser has had time to load it
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        newTab.close();
        this.snackBar.open(
          `Could not open "${fileName}". Check HCS connectivity.`,
          'Dismiss', { duration: 5000 }
        );
      },
    });
}

private resolveMime(fileName: string, blob: Blob): string {
  if (blob.type && blob.type !== 'application/octet-stream') return blob.type;
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf:  'application/pdf',
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    tiff: 'image/tiff',
    tif:  'image/tiff',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}
________________________________________
7. Deriving & Displaying Process Status
7.1 Status Is Not a Single Variable
The process engine does not maintain a single "current status" variable. You derive status by examining a combination of process variables, open tasks, and subprocess state. Build a deriveSubmissionStatus() function that evaluates these signals in the correct priority order:
function deriveSubmissionStatus(variables, tasks): SubmissionStatus {
  const idxProps    = parseIdxProps(variables['idxPolicyDocProps']);
  const isIGO       = variables['bIGO'] as boolean | undefined;
  const isSigned    = variables['bApplicationSigned'] as boolean | undefined;
  const envelopeId  = variables['docuSignEnvelopeId'] as string | undefined;
  const nigoOutcome = variables['stNIGOReasonOutcom'] as string | undefined;

  // Check terminal states first
  if (variables['policyNumber'])  return SubmissionStatus.PolicyIssued;
  if (variables['quoteId'])       return SubmissionStatus.QuoteGenerated;

  // Check task-based states (requires open task list)
  const hasUwTask = tasks.some(t => t.taskType === TaskType.UnderwriterReview);
  if (hasUwTask)                  return SubmissionStatus.ReadyForUnderwriter;

  // Awaiting DocuSign signature
  if (envelopeId && !isSigned)   return SubmissionStatus.AwaitingSignature;

  // NIGO states — only valid AFTER IDP has completed (idxProps populated)
  if (idxProps?.submissionId) {
    if (isIGO === false && nigoOutcome === 'Override and Send to UW')
                                  return SubmissionStatus.NigoSkipped;
    if (isIGO === false)          return SubmissionStatus.NigoMissingInfo;
  }

  // IDP running
  if (idxProps?.submissionId)     return SubmissionStatus.IdpProcessing;

  // Process just started
  return SubmissionStatus.SubmissionReceived;
}
7.2 Conditional vs Sequential Steps in a Timeline
A pizza-tracker / timeline UI must distinguish between steps that were skipped (deliberately bypassed) and steps that are simply not yet reached. Use process variable evidence to determine which:
Step	"Done" evidence	"Skipped" evidence
NIGO / Missing Info	bIGO === false (gateway returned NIGO)	Step is behind current position AND bIGO !== false
Awaiting Signature	envelopeId is present (DocuSign was triggered)	Step is behind current position AND no envelopeId
All other steps	Step index is behind the current step index	N/A — non-conditional steps are never skipped
7.3 Step Order Must Match BPMN Execution Order
Your timeline array must reflect the actual BPMN execution order, not a logical guess:
export const SUBMISSION_STATUS_STEPS = [
  SubmissionStatus.SubmissionReceived,
  SubmissionStatus.IdpProcessing,
  SubmissionStatus.NigoMissingInfo,    // IGO gateway — BEFORE DocuSign
  SubmissionStatus.AwaitingSignature,  // DocuSign — AFTER NIGO resolution
  SubmissionStatus.ReadyForUnderwriter,
  SubmissionStatus.QuoteGenerated,
  SubmissionStatus.PolicyIssued,
];
7.4 Real-Time Polling Pattern
pollSubmissionStatus(processInstanceId: string): Observable<SubmissionStatus> {
  return timer(0, 8000).pipe(       // poll every 8 seconds
    switchMap(() => forkJoin({
      variables: this.getProcessVariables(processInstanceId),
      tasks:     this.getTasksForProcess(processInstanceId),
    })),
    map(({ variables, tasks }) => deriveSubmissionStatus(variables, tasks)),
    distinctUntilChanged(),         // only emit when status actually changes
    takeUntil(this.destroy$),
  );
}
________________________________________
8. Accelerating Development with Claude Code
8.1 CLAUDE.md — Your Project Brain ⭐ Highest ROI
Create a CLAUDE.md at the repo root. Claude reads it at the start of every session, so you never re-explain your environment. A 200-line file covering your architecture, constants, and known gotchas compresses onboarding from 10 minutes of chat to zero — and is prompt-cached, so it costs a fraction of a normal message.
# Project: Argumentum Commercial Submission UI

## Environment
- CIC Studio: https://<env>.studio.experience.hyland.com/<app-id>
- ECM Host: https://<prod-hash>.content.experience.hyland.com  ← separate subdomain!
- Process key: Process_0PKssowP
- Build command (PowerShell only):
    $env:NX_SKIP_NX_CACHE = 'true'; npm run pack-build workspace-hxp

## Key files
- Constants:          libs/plugins/argumentum/src/lib/constants/process.constants.ts
- Submission service: libs/plugins/argumentum/src/lib/services/argumentum-submission.service.ts
- Status component:   libs/plugins/argumentum/src/lib/submitter/submission-status/

## Known gotchas
- bAppilcationSigned (typo) is used by BPMN gateway — must be sent alongside bApplicationSigned
- payloadType is required on all process start and task complete API calls
- ECM host != Studio host — document downloads must go to ECM host directly
- NX cache skip requires PowerShell $env: syntax, not bash export
- timer() retry delay must be 200ms not 500ms (gateway evaluates at t~2s)
8.2 Memory Files for Discovered Knowledge
When Claude discovers something important mid-session, ask it to write that finding to a persistent memory file:
"Write to project memory: the ECM folder listing response uses
sys_id as the node identifier, not id. Use sys_id for download calls."
8.3 Background Builds
NX builds take 2–3 minutes. Run them in the background so Claude continues working while the build completes:
"Run the build in the background and start working on the extracted fields tab."
Claude will notify you when the build finishes. This cuts wall-clock time by 30–40% on build-heavy sessions.
8.4 Parallel Explore Agents for Codebase Audits
When auditing an existing codebase, Claude can spawn up to three read-only Explore agents simultaneously:
"Launch parallel agents to:
 1. Find all places that read or write BPMN process variables
 2. Find all HTTP calls targeting the ECM host
 3. Find all task completion calls and what variables they send"
8.5 Plan Mode for Multi-File Changes
For changes touching more than 3–4 files, use /plan. Claude reads all relevant files, designs the full approach, writes it to a persistent plan file, and waits for approval before editing anything. This prevents half-applied changes that leave the build broken.
8.6 Custom Slash Commands
Add project-specific slash commands to .claude/commands/:
# .claude/commands/rebuild.md
Build the workspace-hxp project using PowerShell with NX cache disabled:
  $env:NX_SKIP_NX_CACHE = 'true'; npm run pack-build workspace-hxp
Confirm success and report the new main-*.js hash to verify cache was bypassed.

# .claude/commands/har-debug.md
Read the HAR file at $ARGUMENTS. Find all requests to the ECM and BPM hosts.
Report: status codes, response sizes, any 4xx/5xx errors with request bodies,
and whether the correct main-*.js bundle hash was loaded.
Invoke with /rebuild or /har-debug ~/Downloads/capture.har.
8.7 MCP Servers — Direct API Integration
Model Context Protocol (MCP) servers let Claude call external APIs as native tools. High-value MCP integrations for CIC development:
•	Process inspector — query live process instances and their variable values by process key
•	Task monitor — list all open tasks, their types, assignees, and parent process IDs
•	HAR analyser — automatically parse and summarise network captures from the browser
•	Deploy trigger — push a new build zip to CIC Studio via the management API without manual upload
// Minimal MCP server example (Node.js / TypeScript)
server.tool('get_process_variables', {
  processInstanceId: z.string()
}, async ({ processInstanceId }) => {
  const res = await fetch(
    `${BPM_HOST}/rb/v1/process-instances/${processInstanceId}/variables`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );
  return { content: [{ type: 'text', text: JSON.stringify(await res.json(), null, 2) }] };
});
8.8 Hooks for Guardrails
Use Claude Code hooks to enforce project conventions automatically:
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit",
      "hooks": [{
        "type": "command",
        "command": "echo 'Reminder: rebuild requires PowerShell — $env:NX_SKIP_NX_CACHE'"
      }]
    }]
  }
}
________________________________________
9. Token Efficiency Tips
9.1 Front-Load Context, Don't Repeat It
Every fact in CLAUDE.md is loaded once and prompt-cached (5-minute TTL at ~10% of normal input cost). Re-explaining your environment in each session costs 10–20x more than maintaining a good CLAUDE.md.
9.2 Ask for Targeted Changes
Vague (expensive)	Specific (efficient)
"Update the documents tab to fix downloads"	"In documents-tab.component.ts, replace the openInCicViewer() method with a blob URL approach. Keep all other methods unchanged."
"Fix the status logic"	"In argumentum-submission.service.ts deriveSubmissionStatus() around line 430, add an inspol_SubmissionId guard before the isIGO === false check."
9.3 Use /compact Before Long Implementation Sessions
After a research or planning phase, run /compact to collapse the exploration history into a dense summary. You keep all findings; the raw file-read tokens are compressed. Do this especially after large HAR analysis or multi-file audits before switching to writing code.
9.4 Background Agents for Reads
Exploratory searches across many files can be delegated to a background Explore agent. The agent runs outside your main context window and returns only the relevant findings — the raw file content never enters your primary conversation.
9.5 Split Sessions at Natural Boundaries
Start a new session for each distinct feature or bug fix rather than chaining everything into one very long conversation. A focused 8K-token session with a good CLAUDE.md is faster and cheaper than a 180K-token session where the model must scan hours of history to find relevant context.
9.6 Reference Files by Path, Not by Pasting
Say "look at argumentum-submission.service.ts lines 140–160" rather than pasting the code into chat. Claude Code reads files directly, and repeated reads of the same file content are cached. Content pasted as user text is never cached and costs full input tokens every time.
9.7 Batch Independent Changes in One Message
If you need changes in three unrelated files, ask for all three in a single message. Claude can execute all edits in parallel. Three separate chat turns costs 3x the overhead of one well-written request.
9.8 Token Cost Reference
Activity	Relative cost	Better approach
Re-explaining the project every session	🔴 Very high	CLAUDE.md loaded automatically at session start
Pasting large file contents into chat	🔴 High	Give file path + line range; Claude reads directly
Very long sessions (150K+ tokens)	🔴 High	/compact mid-session, or start fresh with memory files
Broad "search everywhere" prompts	🟡 Medium	Specify file name and approximate line range
Background Explore agents for research	🟢 Low	Results summarised; raw reads stay out of main context
Cached CLAUDE.md / repeated system prompt reads	🟢 Very low	Same content within 5 min = ~10% of normal cost
________________________________________
10. Master Gotcha Reference
Quick-scan checklist of every hard lesson from the Argumentum build. Check this list before debugging.
#	Symptom	Root cause	Fix
1	Process starts but variables are ignored by gateway	Variable name typo in BPMN vs sent value, or missing type field	Copy variable names from BPMN XML; always include "type"
2	Process start returns 200 but nothing happens	Missing "payloadType": "StartProcessPayload"	Add payloadType to every process start and task complete body
3	Document download returns 404	Request going to Studio host instead of ECM host	Always use ARG_ECM_HOST for all document operations
4	Document opens as raw JSON or fails to display	Missing or incorrect MIME type on the blob	Resolve MIME from filename extension before creating the Blob
5	Popup blocked when opening document viewer	window.open() called inside async callback, not click handler	Call window.open('about:blank') synchronously, then navigate async
6	DocuSign skip doesn't work — process still goes to signature step	Gateway reads typo variable bAppilcationSigned; correct spelling never written	Send both spellings in Form API body and in secondary PUT
7	DocuSign skip intermittently fails	Secondary variable PUT retry delay too long; gateway evaluates before variable arrives	Reduce retry delay to 200ms; send both variables in Form API body atomically
8	Status shows "Missing Information" immediately after submission	Status derived before IDP populates idxPolicyDocProps	Guard NIGO status checks with idxProps?.submissionId
9	Pizza tracker step shows done (green) but was actually bypassed	Status derived from step position only, not from actual traversal evidence	Conditional steps (NIGO, DocuSign) require variable evidence, not just position
10	Task query returns empty even though tasks are open	Querying only ASSIGNED and missing unclaimed CREATED tasks	Always query both statuses and merge results
11	Build deploys but changes not visible in browser	NX served cached output — env var not bypassed in bash; or browser served old bundle	Use PowerShell $env:NX_SKIP_NX_CACHE = 'true'; do Ctrl+Shift+R hard refresh
12	CIC viewer shows infinite spinner	Apollo GraphQL misconfiguration in the CIC workspace application	Bypass CIC viewer entirely; use blob URL pattern in your own Angular HTTP service
13	Process diagram shows main process when task is inside a subprocess	Subprocess has a different process instance ID; must call diagram API with sub-ID	Check rootProcessInstanceId != processInstanceId on open tasks to detect subprocesses
________________________________________
Last updated: May 2026 · Based on Argumentum Commercial Submission UI build · Hyland CIC platform
