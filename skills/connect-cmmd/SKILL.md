---
name: connect-cmmd
description: Connect this machine's coding agents to the full CMMD MCP server for the repository's company, with a browser login that never expires, and check the connection. Use for /connect-cmmd, when cmmd-agent tools are missing or answer 401, when ask-zack reports BLOCKED, or when setting up a new machine.
---

# Connect CMMD

Agents reach CMMD (Brain, tasks, projects) through the `cmmd-agent` MCP server. This skill sets it up
with one browser approval and checks it. Run the script; do not configure the server by hand.

The script is [`scripts/connect-cmmd.mjs`](scripts/connect-cmmd.mjs), beside this file. In a repository
that vendors cmmdstack it is `.agents/skills/connect-cmmd/scripts/connect-cmmd.mjs`.

## Which company

The repository names its company in `cmmd-workspace.json` at its root:

```json
{ "workspaceId": 2119, "name": "CMMD" }
```

A repository without that file gets `status=NO_PIN`. Ask the user which CMMD workspace the repository
belongs to, then commit the file. Do not guess the id.

## Steps

1. **Check.** Run `node <script> --check` from the repository. The last line is the status.
2. **On `OK`,** stop. Say which account and workspace the script reported.
3. **On anything else,** run `node <script>` without `--check`. It prints a CMMD link and a code and
   opens the browser. Tell the user to approve it there and to pick the company the repository names.
   The script waits for the approval, stores the token, configures Claude Code and Codex, and checks
   again. Run it in the foreground; it finishes when the user approves or the code expires after
   15 minutes.
4. **Restart.** Claude Code and Codex load MCP servers at startup. Tell the user to restart open
   sessions, then run `--check` again in the new session.

| Status | Meaning | Next step |
|---|---|---|
| `OK` | Connected to the full server for the right company | None |
| `NOT_CONNECTED` | No token, a revoked token, or the workspace needs the token authorized | Run without `--check`; if it repeats, the user authorizes the token in CMMD Settings, Agents |
| `WRONG_WORKSPACE` | The token reads another company | `node <script> --relogin`, and the user picks the right company |
| `NO_FULL_SERVER` | Connected, but Brain tools are missing | Run without `--check`; it replaces the server entry with the full server |
| `NO_PIN` | No `cmmd-workspace.json` | Ask the user for the workspace and commit the file |
| `ERROR` | Network or CLI failure | Report the line before it |

## What it writes

- `~/.config/cmmd/agent-token`, mode 0600. The token has no expiry. The user revokes it in CMMD.
- `~/.config/cmmd/auth-header.sh`, which Claude Code runs to read the token at connect time.
- A user-scope `cmmd-agent` entry for Claude Code that points at that helper, after removing any
  older `cmmd-agent` entry in local, project or user scope.
- A `cmmd-agent` entry for Codex that reads `CMMD_AGENT_MCP_TOKEN`, and one line in `~/.zshrc` and
  `~/.bashrc` that exports it from the token file. Codex started outside a login shell does not see
  it; start Codex from a terminal. `--no-codex` skips this.

## Rules

- Never print, echo, paste or log the token. Never read `~/.config/cmmd/agent-token`, an agent's
  settings file or `.env` to look at it. The script handles the token; you handle the status line.
- Never put the token on a command line or in a committed file, including `.mcp.json`.
- Never approve the login for the user. The browser step is theirs.
- The server is `https://cmmd.ai/api/mcp-server/http`, the full server. The Forge connector at
  `/api/mcp-server/forge` is a smaller tool set for claude.ai and cannot read Brain documents.
