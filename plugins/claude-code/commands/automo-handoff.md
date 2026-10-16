---
name: automo-handoff
description: Hand the current plan to an Automo Build builder subagent on a project. Args (optional): project name, then a short label.
---

Use the `automo-build` MCP server. Resolve the project with `automo_search_projects` (ask which one if the hint is missing or ambiguous), then package this conversation into one self-contained brief: goal in a sentence, the context the builder needs (file paths and short excerpts, decisions already made), acceptance in a few bullets, and what is out of scope. Under 1,500 words; the builder has its own copy of the project and cannot see this machine.

Confirm the project and a one-line summary with the person, then call `automo_build` with convergence "auto" unless they asked to review the work first. Report the session handle and its link; do not poll unless asked.
