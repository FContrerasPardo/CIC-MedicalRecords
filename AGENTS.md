# Codex Project Instructions - Token Saving Mode

## Default behavior
Work in TOKEN SAVING MODE unless I explicitly say otherwise.

## Token saving rules
- Do not scan the whole repository unless I ask for a full review.
- Do not run build, tests, lint, migrations, or install commands unless I explicitly request it.
- Do not read large files, generated files, logs, lock files, build outputs, or documentation folders unless directly relevant.
- For small changes, inspect only the specific files I mention or the minimum files needed.
- Prefer short answers with:
  1. What you found
  2. What you changed or recommend
  3. Risk/next step
- Ask before making broad refactors.
- Do not repeat long context already documented in IA_CONTEXT.md.
- Before starting, check IA_CONTEXT.md only if it exists and is relevant.

## Validation rules
- If validation is needed, first tell me the exact command you want to run and why.
- Do not run expensive validations automatically.
- For low-risk UI/text/config changes, provide the change and suggest manual validation.

## Code change rules
- Make minimal, high-confidence changes.
- Avoid unrelated formatting changes.
- Do not touch files outside the requested scope.
- Summarize changed files at the end.

## Harness, roles and skill first
- Shared protocol: `docs/agents/README.md`; project sources and parameters: `docs/agents/proyecto.md`. Load only the relevant profile in `docs/agents/hyland-*.md`.
- Consult `docs/agents/skills.md` before a repeatable task. Project Codex skills live in `.agents/skills/`; client role definitions live in `.codex/agents/` and `.claude/agents/`.
- Work in the main chat by default. Use subagents only when explicitly requested or authorized by applicable instructions; provide bounded scope and avoid overlapping writes. A role can be assumed directly without spawning an agent.
- Reuse CIC-Learn selectively; see `docs/agents/cic-learn.md`. Skill/plugin instructions do not authorize builds, installs, migrations, external writes or history rewrites beyond the user's request.
- Distinguish source inspected, code integrated, commands executed and runtime confirmed. Never claim a plugin is installed or a client discovered profiles without evidence.

## Continuity and shared checkouts
- Preserve existing work. Stage explicit paths only; do not use blanket staging, reset, stash or branch switching over another session's changes.
- Use `codex/` for new branches unless the user requests another convention. Existing branches keep their names. Create chats only when the user asks.
- Read current issues before relying on migration snapshots in `docs/backlog/`; do not recreate or change issues just by running migration scripts.
- Before an authorized commit affecting the Angular plugin, explain the final AOT command in `CLAUDE.md` and obtain command authorization if missing. A commit request alone does not waive the no-build rule. Documentation-only commits do not need an app build.
- End with changed files, evidence, pending checks and next action. Push, PR, merge and publishing require applicable user authorization; permissions from CIC-Fin are not inherited.
## Source order
Read only what the task needs, in this order: `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md` (functional scope), `IA_CONTEXT.md` (technical state and paths), then the docs closest to the code you will change.

## Session close
- One topic per session: one commit or PR scoped to the session's goal; anything else goes to another branch or stays unstaged.
- In a shared checkout stage explicit paths only; never `git add -A`, `commit -a`, `stash`, `reset` or `checkout --` over changes that are not yours.
- Do not switch branches while a build or the dev server is running.
- Commit when asked; push and PR only with explicit authorization in the turn.
- Close with a short summary: changed files, validations run, pending items.
