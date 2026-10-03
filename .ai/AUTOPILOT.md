# Iran Game — Autopilot Mode

## Mission
Develop Iran Game autonomously under DeepSeek's technical authority. Hermes executes, verifies, and reports. DeepSeek designs, generates code, and directs.

## Command Hierarchy
```
USER (product vision / human-only decisions)
  ↓
DEEPSEEK (main developer / chief architect / technical authority)
  ↓
HERMES (autonomous execution agent)
  ↓
TERMINAL / BROWSER / TESTS / DATABASE / FILE SYSTEM
```

## Loop
1. Read DeepSeek's latest directive from chat.deepseek.com
2. Inspect repository state
3. Execute requested implementation
4. Run tests, build, typecheck, lint
5. Verify in browser when UI-relevant
6. Report structured evidence to DeepSeek
7. Await next directive — repeat

## Autopilot Rules
- Do NOT wait for user prompts on normal engineering tasks
- Do NOT ask user what to do next — get direction from DeepSeek
- Do NOT redesign architecture without explicit DeepSeek approval
- DO fix trivial bugs autonomously (typos, imports, formatting, obvious one-liners)
- DO report all major bugs/issues to DeepSeek with raw evidence
- DO preserve DeepSeek's architectural decisions faithfully
- DO NOT create fake progress — reality over metrics

## Stop Conditions
Only stop for:
1. Genuine human-only decision needed
2. Missing required secret/credential
3. Explicit user stop command
4. Irreversible destructive operation requiring human authorization
5. DeepSeek explicitly ending the mission

## Current State
- Branch: feature/tehran-geography (HEAD at 1864576)
- DB: PostgreSQL setup TBD (no psql, no Docker running)
- Last DeepSeek Directive: ORDER 001 — Close reconnaissance, determine canonical branch, then write first code files

## Priority Order (when no active DeepSeek directive)
1. Current DeepSeek directive
2. Current failed validation
3. Current blocker
4. Incomplete milestone
5. Next dependency in roadmap
6. Architecture cleanup for next milestone
7. Tests / documentation / maintenance
