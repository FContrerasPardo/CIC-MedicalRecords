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

## Roles, sub-sessions and skill first
- Shared role profiles and protocol: `docs/agents/README.md` (load only the role you need). Project parameters: `docs/agents/proyecto.md`. Client definitions: `.claude/agents/` and `.codex/agents/`.
- One default agent. The main agent may delegate bounded tasks to subagents and pick model and effort per task when it pays off; subagents never create branches, sessions or other agents. Delegating does not grant permission to run project commands or parallel processes.
- A sub-session is one feature or task with its own branch, PR and context; two sessions never write the same files. UI work runs one at a time in the main checkout (the user's dev server shows it); docs, services and translations may use a separate worktree (see "Worktrees" in `docs/agents/proyecto.md`).
- Skill first: check `docs/agents/skills.md` before exploring; a procedure repeated twice becomes a `skill-candidate`.

## Source order
Read only what the task needs, in this order: `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md` (functional scope), `IA_CONTEXT.md` (technical state and paths), then the docs closest to the code you will change.

## Session close
- One topic per session: one commit or PR scoped to the session's goal; anything else goes to another branch or stays unstaged.
- In a shared checkout stage explicit paths only; never `git add -A`, `commit -a`, `stash`, `reset` or `checkout --` over changes that are not yours.
- Do not switch branches while a build or the dev server is running.
- Commit when asked; push and PR only with explicit authorization in the turn.
- Close with a short summary: changed files, validations run, pending items.