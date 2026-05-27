# nCopilot Daily Mode

This repository is now operated in `.github-only` mode for daily Copilot work.

## Folder Roles

- `.github/` is the only operational surface for GitHub Copilot workflows.
- `.agent/` is optional archival/upstream reference and is not required for daily runtime.

## Daily Usage Rule

If you are using GitHub Copilot day-to-day, use only `.github/` files:

- `.github/copilot-instructions.md`
- `.github/agents/`
- `.github/prompts/`
- `.github/skills/`
- `.github/rules/`
- `.github/scripts/`

## Optional `.agent/`

- Keep it only if you want upstream diff/reference history.
- Daily prompts, agents, skills, and scripts should run via `.github/` paths.

## Sync Principle

- If upstream sync is needed later, sync into `.github/` as the final source of truth.
- Avoid dual-editing `.agent/` and `.github/` for the same intent.
