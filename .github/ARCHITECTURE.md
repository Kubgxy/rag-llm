# Antigravity Kit Architecture

> Comprehensive AI Agent Capability Expansion Toolkit

---

## 📋 Overview

Antigravity Kit is a modular system consisting of:

- **20 Specialist Agents** - Role-based AI personas
- **37 Skills** - Domain-specific knowledge modules
- **0 Workflows** - No `.github/workflows` folder in current workspace

---

## 🏗️ Directory Structure

```plaintext
.github/
├── ARCHITECTURE.md          # This file
├── agents/                  # 20 Specialist Agents
├── skills/                  # 37 Skill Folders
├── rules/                   # Global Rules
├── scripts/                 # Master Runtime Scripts
├── prompts/                 # Prompt Resources
├── .shared/                 # Shared Assets
├── copilot-instructions.md  # Workspace Instructions
└── README_COPILOT_DAILY.md  # Operational Guide
```

---

## 🤖 Agents (20)

Specialist AI personas for different domains.

| Agent                    | Focus                      | Skills Used                                              |
| ------------------------ | -------------------------- | -------------------------------------------------------- |
| `orchestrator`           | Multi-agent coordination   | parallel-agents, behavioral-modes, plan-writing         |
| `project-planner`        | Discovery, task planning   | app-builder, plan-writing, brainstorming                 |
| `frontend-specialist`    | Web UI/UX                  | nextjs-react-expert, web-design-guidelines, tailwind-patterns, frontend-design |
| `backend-specialist`     | API, business logic        | api-patterns, nodejs-best-practices, python-patterns, database-design |
| `database-architect`     | Schema, SQL                | database-design                                          |
| `mobile-developer`       | iOS, Android, RN           | mobile-design                                            |
| `game-developer`         | Game logic, mechanics      | game-development                                         |
| `devops-engineer`        | CI/CD, operations          | deployment-procedures, server-management                 |
| `security-auditor`       | Security compliance        | vulnerability-scanner, red-team-tactics, api-patterns   |
| `penetration-tester`     | Offensive security         | vulnerability-scanner, red-team-tactics                  |
| `test-engineer`          | Testing strategies         | testing-patterns, tdd-workflow, webapp-testing          |
| `debugger`               | Root cause analysis        | systematic-debugging                                     |
| `performance-optimizer`  | Speed, Web Vitals          | performance-profiling                                    |
| `seo-specialist`         | Ranking, visibility        | seo-fundamentals, geo-fundamentals                       |
| `documentation-writer`   | Manuals, docs              | documentation-templates                                  |
| `product-manager`        | Requirements, user stories | plan-writing, brainstorming                              |
| `product-owner`          | Strategy, backlog, MVP     | plan-writing, brainstorming                              |
| `qa-automation-engineer` | E2E testing, CI pipelines  | webapp-testing, testing-patterns, lint-and-validate     |
| `code-archaeologist`     | Legacy code, refactoring   | clean-code, code-review-checklist                        |
| `explorer-agent`         | Codebase analysis          | architecture, plan-writing, systematic-debugging         |

---

## 🧩 Skills (37)

Modular knowledge domains that agents can load on-demand, based on task context.

### Frontend & UI

| Skill                   | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `react-best-practices`  | React and Next.js performance optimization (`nextjs-react-expert`)    |
| `web-design-guidelines` | Web UI audit for accessibility, UX, and performance                   |
| `tailwind-patterns`     | Tailwind CSS v4 patterns                                              |
| `frontend-design`       | UI/UX patterns and design systems                                     |

### Backend & API

| Skill                   | Description                    |
| ----------------------- | ------------------------------ |
| `api-patterns`          | REST, GraphQL, tRPC            |
| `nodejs-best-practices` | Node.js architecture and patterns |
| `python-patterns`       | Python standards and API patterns |
| `mcp-builder`           | MCP server/tool design patterns |

### Database

| Skill             | Description                 |
| ----------------- | --------------------------- |
| `database-design` | Schema design and optimization |

### Cloud & Infrastructure

| Skill                   | Description               |
| ----------------------- | ------------------------- |
| `deployment-procedures` | CI/CD and deployment workflows |
| `server-management`     | Infrastructure operations |

### Testing & Quality

| Skill                   | Description              |
| ----------------------- | ------------------------ |
| `testing-patterns`      | Unit/integration test strategy |
| `webapp-testing`        | E2E and Playwright audit |
| `tdd-workflow`          | Test-driven development  |
| `code-review-checklist` | Code review standards    |
| `lint-and-validate`     | Linting and static validation |

### Security

| Skill                   | Description              |
| ----------------------- | ------------------------ |
| `vulnerability-scanner` | Security auditing, OWASP |
| `red-team-tactics`      | Offensive security       |

### Architecture & Planning

| Skill                 | Description                |
| --------------------- | -------------------------- |
| `app-builder`         | Full-stack app scaffolding |
| `architecture`        | System design patterns     |
| `plan-writing`        | Task planning, breakdown   |
| `brainstorming`       | Socratic discovery         |
| `intelligent-routing` | Automatic agent routing    |

### Mobile

| Skill           | Description           |
| --------------- | --------------------- |
| `mobile-design` | Mobile UI/UX patterns |

### Game Development

| Skill              | Description           |
| ------------------ | --------------------- |
| `game-development` | Game logic, mechanics |

### SEO & Growth

| Skill              | Description                   |
| ------------------ | ----------------------------- |
| `seo-fundamentals` | SEO, E-E-A-T, Core Web Vitals |
| `geo-fundamentals` | GenAI optimization            |

### Shell/CLI

| Skill                | Description               |
| -------------------- | ------------------------- |
| `bash-linux`         | Linux commands, scripting |
| `powershell-windows` | Windows PowerShell        |

### Other

| Skill                     | Description               |
| ------------------------- | ------------------------- |
| `clean-code`              | Coding standards (global) |
| `behavioral-modes`        | Agent behavior modes      |
| `parallel-agents`         | Multi-agent patterns      |
| `documentation-templates` | Documentation patterns    |
| `i18n-localization`       | Internationalization      |
| `performance-profiling`   | Web performance profiling |
| `systematic-debugging`    | Structured debugging      |
| `rust-pro`                | Rust development patterns |

> Note: `.github/skills/doc.md` is documentation, not a skill folder.

---

## 🔄 Workflows (0)

`.github/workflows` is not present in the current workspace.

| Command | Description |
| ------- | ----------- |
| N/A     | No workflow markdown files under `.github/workflows` |

---

## 🎯 Skill Loading Protocol

```plaintext
User Request → Skill Description Match → Load SKILL.md
                                            ↓
                                    Read references/
                                            ↓
                                    Read scripts/
```

### Skill Structure

```plaintext
skill-name/
├── SKILL.md           # (Required) Metadata & instructions
├── scripts/           # (Optional) Python/Bash scripts
├── references/        # (Optional) Templates, docs
└── assets/            # (Optional) Images, logos
```

### Enhanced Skills (with scripts/references)

| Skill                    | Files | Coverage                            |
| ------------------------ | ----- | ----------------------------------- |
| `nextjs-react-expert`    | 14    | React/Next.js performance patterns  |
| `app-builder`            | 20    | Full-stack scaffolding              |

---

## 🧪 Scripts (4)

Master runtime scripts in `.github/scripts`.

### Master Scripts

| Script               | Purpose                                 | When to Use              |
| -------------------- | --------------------------------------- | ------------------------ |
| `checklist.py`       | Priority-based validation (Core checks) | Development, pre-commit  |
| `verify_all.py`      | Comprehensive verification (All checks) | Pre-deployment, releases |
| `session_manager.py` | Session and workspace runtime state     | Session operations       |
| `auto_preview.py`    | Preview lifecycle helper                | Local preview management |

### Usage

```bash
# Quick validation during development
python .github/scripts/checklist.py .

# Full verification before deployment
python .github/scripts/verify_all.py .

# Session state
python .github/scripts/session_manager.py info
python .github/scripts/session_manager.py status
python .github/scripts/session_manager.py preview-status
```

---

## 📊 Statistics

| Metric              | Value                         |
| ------------------- | ----------------------------- |
| **Total Agents**    | 20                            |
| **Total Skills**    | 37                            |
| **Total Workflows** | 0                             |
| **Total Scripts**   | 4 (master) + 16 (skill-level) |
| **Coverage**        | Runtime scoped to `.github`   |

---

## 🔗 Quick Reference

| Need     | Agent                 | Skills                                |
| -------- | --------------------- | ------------------------------------- |
| Web App  | `frontend-specialist` | react-best-practices, frontend-design |
| API      | `backend-specialist`  | api-patterns, nodejs-best-practices   |
| Mobile   | `mobile-developer`    | mobile-design                         |
| Database | `database-architect`  | database-design                       |
| Security | `security-auditor`    | vulnerability-scanner                 |
| Testing  | `test-engineer`       | testing-patterns, webapp-testing      |
| Debug    | `debugger`            | systematic-debugging                  |
| Plan     | `project-planner`     | brainstorming, plan-writing           |
