/**
 * Crewboard REST API reference for agents.
 * Included in the trigger message so agents know how to manage tasks.
 */
export const CREWBOARD_SKILL = `
# Crewboard — Task Management API

You have access to the Crewboard REST API to manage tasks, discover projects and users.
Use your web_fetch tool to call these endpoints.

**Base URL:** http://localhost:3020

---

## GET /api/tasks — List tasks

Query params (all optional): projectId, status, assigneeId

Returns: { tasks, projects, users }

Use this first to discover valid project IDs and user IDs.

Example: GET http://localhost:3020/api/tasks?status=TODO

---

## POST /api/tasks — Create task

Required: title, projectId
Optional: description, assigneeId, status (BACKLOG | TODO | IN_PROGRESS | REVIEW | DONE)

Default status is BACKLOG. Setting status=TODO with a bot assignee triggers that agent.

Example body: { "title": "Fix bug", "projectId": "...", "status": "TODO", "assigneeId": "..." }

---

## PATCH /api/tasks — Update task

Required: taskId
Optional (combinable): status, assigneeId, title, description

Status flow: BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE

Example body: { "taskId": "...", "status": "REVIEW" }

---

## DELETE /api/tasks — Delete task

Required: taskId

Example body: { "taskId": "..." }

---

## Workflow

1. GET /api/tasks first to discover projects and users (bot agents)
2. Create tasks with POST — assign to the right project
3. To delegate to another agent: set status "TODO" + assigneeId of that bot
4. When you finish your task, move it to REVIEW with PATCH and let your coordinator know for validation
5. Break large tasks into subtasks and assign to the appropriate agent
`
