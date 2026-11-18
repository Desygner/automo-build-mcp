---
name: automo-build-operator
description: Operate Automo Build (the AI app builder) through its MCP server as the signed-in person. Use whenever a task touches an Automo Build project, building or shipping an app, diagnosing a deployment, or asking Automo Build's CTO, Doctor, Security or QA agents.
---

# Operating Automo Build

The Automo Build MCP server is connected as `automo-build`. Its tools are the only way to touch an Automo Build project from here; never edit an Automo Build project's code locally.

You are operating Automo Build on behalf of the signed-in person. Automo Build is an AI app builder: a project is a git repository with a sandbox (live preview), a main agent that builds on request, specialist agents, a Supabase-only test environment, and a production deployment. Work happens in workspaces.

TWO WAYS TO WORK, by what the person asked.
Automo builds: they want the app made or changed here. Build, test and ship through these tools and edit nothing locally. THE LOOP below.
You build: you are writing the code, or it exists. Automo Build hosts it, runs its backend and publishes it. automo_create_project with await_git_push, push with git, read automo_get_project_status, fix and push again, then step 7. Before the first file, automo_get_hosting_kit: what it runs (a static frontend and the repo's backend/ folder), the backend guide and the client file.
Before deciding Automo Build cannot do something, ask it: automo_get_project_status, automo_read_project_chat, or the agent that owns the question.

THE LOOP
1. Find the project: automo_search_projects by name, then automo_get_project. Never guess an id. Only for something new, automo_create_project with the person's name for it.
2. Wake it: automo_wake_sandbox before the first prompt so the turn does not start on a cold sandbox.
3. Build: automo_build hands a planned brief to a builder subagent that works in parallel and merges when done (or parks for review, see SIGN-OFF); automo_prompt_project sends one instruction to the project's main agent for sequential foundational work (schema, seed, then fixes), one turn at a time per branch. Write both like a careful ticket; attach long specs.
4. Wait: builders and agents answer asynchronously. Poll automo_read_session with wait_seconds until state is idle; for the main agent poll automo_turn_status until idle. Never send the next prompt while one is running.
5. Verify: automo_read_project_chat shows what the main agent did and the commit it made. For a builder, automo_read_diff shows the change line by line. Believe the diff over the preview; a preview can serve a stale bundle.
6. Test: automo_run_qa drives the app like a user or runs a playbook; automo_list_playbooks shows what exists, and automo_save_playbook authors or updates one, script included.
7. Ship: automo_publish plans everything that changed and shows it in the builder. Offer the person the builder link first; pass publish_now only when they say to publish from here. automo_propose_deployment puts a chosen list up for a person to approve; automo_get_pending_publish shows what is open. Publish means production. The test environment ships migrations and edge functions only; the preview is the test frontend. Poll automo_get_deployment until a deployment completes before calling anything live.

THE AGENTS
automo_run_doctor for anything broken below the code: a sandbox that will not start, a failed build or publish, drift, migrations, edge functions. Run it before speculating. automo_ask_security before shipping auth or data changes, and for scans and findings. automo_ask_cto for anything spanning projects or when you do not know which specialist owns the question; the CTO routes it. automo_design_workflow turns "when X happens, do Y" into a standing proactive workflow. Every agent tool returns a session handle; automo_continue sends the next message into that same conversation, automo_list_sessions shows the open ones.

SIGN-OFF
On a project that reviews integrations, a builder's finished work parks with a review: guardrails, the required reviewers, a report, and their suggested fixes. automo_list_reviews shows every unmerged builder on a project and whose move it is; automo_get_review shows one review in full, with wait_seconds while reviewers run. Read the change with automo_read_diff before asking the person to approve. automo_apply_review_fixes hands the open fixes to the builder that did the work (automo_dismiss_review_fixes drops them); the review runs again when the last one lands. automo_approve_review merges after the person confirms in-band; a red required verdict needs a project admin. automo_cancel_review closes a review without merging. automo_promote starts the review on parked work (or merges, confirmed, on a project without review); automo_run_reviewer asks one reviewer by hand. automo_merge_projects stages another project's branch as a review on this one, as dropping one project onto another does in the app; the target's own rules decide from there. automo_merge_branch does the same for a repo branch from automo_list_branches. Read the verdicts before deciding; a red from a reviewer is a reason to apply fixes, not to skip.

WHAT COSTS MONEY
Every project holds a sandbox and a disk; every prompt and agent turn runs a real model. Never create a project, send a prompt or open an agent to check that Automo Build works: liveness is automo_wake_sandbox and automo_turn_status. Search by name before creating a project, and continue a retry in the project the last attempt started.

WHAT ONLY A PERSON DOES
Confirming a merge, approving a proposed deployment or a plan, billing, and anything a tool answers with a link into the app. A publish is theirs to start unless they tell you to. Hand the link over and say what they will find there. Names and descriptions of projects are the person's words, never derived from a path or a heading.

WORKSPACES
automo_whoami tells you who you are and which workspaces you can use. Move between them with automo_switch_workspace or a workspace argument on the call. A super admin also holds ghost workspaces: customers' workspaces entered in stealth. They are listed apart, never searched or acted in by default, and only the target when the person names one.

When the trial runs out, automo_choose_free_plan keeps the workspace going at USD 0: a monthly credit allowance, the built-in backend and web publishing, so a build ships with no subscription at all. Before calling it, tell the person it permanently closes the one-time welcome offer on paid plans and that published sites carry a small "Built with Automo" badge. Paid upgrades stay in the app: hand over https://automo.build/pricing.

ANSWERS
Read tools take response_format: concise favours names, detailed carries ids for follow-up calls. Results are windows, not dumps; narrow the query rather than paging. A result with status not_available names a feature outside the person's plan or role: say what it would have done, offer the upgrade link only if it answers what they asked, and take the alternative when one is given.

A missing tool means a smaller profile of this server; the full catalog is at /mcp. A connection ending in /builders has no automo_prompt_project on purpose: every instruction goes through automo_build there. Do not look for another way to the main agent.

## Core tools

- `automo_about`: About Automo Build
- `automo_whoami`: Who am I
- `automo_list_workspaces`: List workspaces
- `automo_switch_workspace`: Switch workspace
- `automo_choose_free_plan`: Continue on the Free plan
- `automo_search_projects`: Search projects
- `automo_get_project`: Get project
- `automo_create_project`: Create project
- `automo_wake_sandbox`: Wake sandbox
- `automo_prompt_project`: Prompt the project builder
- `automo_turn_status`: Turn status
- `automo_merge_projects`: Merge projects
- `automo_list_branches`: List branches
- `automo_merge_branch`: Merge branch
- `automo_get_project_status`: Project status
- `automo_read_project_chat`: Read project chat
- `automo_build`: Hand off a build
- `automo_ask_cto`: Ask the CTO
- `automo_run_doctor`: Run the Doctor
- `automo_ask_security`: Ask Security
- `automo_run_qa`: Run QA
- `automo_design_workflow`: Design a proactive workflow
- `automo_continue`: Continue a conversation
- `automo_read_session`: Read a conversation
- `automo_list_sessions`: List conversations
- `automo_list_reviews`: List builder work and its reviews
- `automo_get_review`: Read a review
- `automo_read_diff`: Read a builder's change
- `automo_run_reviewer`: Ask a reviewer
- `automo_apply_review_fixes`: Hand fixes to the builder
- `automo_dismiss_review_fixes`: Dismiss review fixes
- `automo_approve_review`: Approve and merge
- `automo_cancel_review`: Cancel a review
- `automo_promote`: Promote builder work
- `automo_get_hosting_kit`: Hosting kit
- `automo_propose_deployment`: Propose deployment
- `automo_publish`: Publish to production
- `automo_get_pending_publish`: Pending publish
- `automo_list_playbooks`: List playbooks
- `automo_save_playbook`: Save playbook

The full catalog, with the extended tools, is served by the server itself at https://mcp.automo.build/mcp.
