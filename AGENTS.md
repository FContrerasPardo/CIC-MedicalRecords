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