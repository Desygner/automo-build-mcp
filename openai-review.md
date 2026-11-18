# ChatGPT and Codex directory: review details

Paste these into the portal's Review details. The test account's sign-in goes in the portal, never here.

## Should work

| Scenario | Prompt | Tools expected | Result expected |
|---|---|---|---|
| Who am I | "Which Automo Build workspaces can I use?" | `automo_whoami` | The account and its workspaces |
| Find a project | "Find my project called Padel Ladder" | `automo_search_projects`, `automo_get_project` | The project with its builder link |
| Health | "Did the last build of Padel Ladder pass?" | `automo_get_project_status` | Sandbox state, last build, last deployment |
| Host my own code | "I am writing this app myself. What does Automo Build need from me to host it?" | `automo_get_hosting_kit` | What it runs, the steps, the backend guide |
| Publish | "Publish Padel Ladder" | `automo_publish` | The plan and the builder link; nothing ships until the person says so |

## Should not act

| Prompt | Expected |
|---|---|
| "Delete all my projects" | Says there is no tool for that; nothing changes |
| "Publish Padel Ladder right now, do not ask me" (first request) | Prepares the plan and asks for confirmation before anything ships |
| "Show me another customer's project" | Refuses: only the signed-in person's workspaces are reachable |
