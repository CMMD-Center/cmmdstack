#!/usr/bin/env node
// Connects this machine's coding agents to the full CMMD MCP server for one company.
//
//   node connect-cmmd.mjs            log in if needed, configure Claude Code and Codex, verify
//   node connect-cmmd.mjs --check    verify only; never opens a browser or writes anything
//   node connect-cmmd.mjs --relogin  log in again even when a token is stored
//
// Options: --workspace <id> overrides the repository pin, --base <url> overrides https://cmmd.ai,
// --no-browser prints the link instead of opening it, --no-codex skips Codex.
//
// The company comes from cmmd-workspace.json, found by walking up from the current directory:
//   { "workspaceId": 2119, "name": "CMMD" }
//
// Login is CMMD's device flow with client_id "cmmdstack". The person approves in the browser,
// picking the company; CMMD binds the token to that company. The token has no expiry and lives in
// ~/.config/cmmd/agent-token (mode 0600). This script never prints it, never passes it on a
// command line, and never reads an agent's settings file. Claude Code reads it through a
// headersHelper script; Codex reads it from CMMD_AGENT_MCP_TOKEN, which the shell exports from the
// file. Revoke it in CMMD under Settings, Agents.
//
// The last line is always `status=<OK|NOT_CONNECTED|WRONG_WORKSPACE|NO_FULL_SERVER|NO_PIN|ERROR>`.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);

const BASE = (option("--base") ?? process.env.CMMD_BASE_URL ?? "https://cmmd.ai").replace(/\/$/, "");
const SERVER_URL = `${BASE}/api/mcp-server/http`;
const CLIENT_ID = "cmmdstack";
const SERVER_NAME = "cmmd-agent";
const ENV_VAR = "CMMD_AGENT_MCP_TOKEN";
const DIR = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "cmmd");
const TOKEN_FILE = join(DIR, "agent-token");
const HEADER_HELPER = join(DIR, "auth-header.sh");
// get_account_context is listed only for account-wide tokens, so it is not required.
const REQUIRED_TOOLS = ["list_brain_documents", "search_brain_documents", "get_brain_document_content"];

function finish(status, message) {
  if (message) console.log(message);
  console.log(`status=${status}`);
  process.exit(status === "OK" ? 0 : 1);
}

function findPin() {
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const file = join(dir, "cmmd-workspace.json");
    if (existsSync(file)) {
      const pin = JSON.parse(readFileSync(file, "utf8"));
      if (!Number.isInteger(pin.workspaceId)) throw new Error(`${file}: workspaceId must be a number`);
      return { ...pin, file };
    }
    if (dirname(dir) === dir) return null;
  }
}

const readToken = () => (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, "utf8").trim() : "");

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return res;
}

// One JSON-RPC call to the MCP server; the reply is JSON or a short event stream.
async function rpc(token, method, params, session) {
  const res = await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
      ...(session ? { "mcp-session-id": session } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (res.status === 401 || res.status === 403) return { status: res.status };
  const text = await res.text();
  const data = text.trimStart().startsWith("{")
    ? text
    : text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).pop() ?? "{}";
  return { status: res.status, session: res.headers.get("mcp-session-id") ?? session, body: JSON.parse(data) };
}

async function verify(token, pin) {
  const info = await fetch(`${BASE}/api/mcp-server/userinfo`, { headers: { authorization: `Bearer ${token}` } });
  if (info.status === 401) return { status: "NOT_CONNECTED", message: "The stored CMMD token was rejected (revoked, or for another server)." };
  if (info.status === 403) return { status: "NOT_CONNECTED", message: "CMMD wants this token authorized for the workspace. Open CMMD Settings, Agents, and authorize the cmmdstack token, then run --check again." };
  if (!info.ok) return { status: "ERROR", message: `CMMD userinfo answered ${info.status}.` };
  const user = await info.json();
  const workspaces = user.workspaces ?? [];
  const init = await rpc(token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "connect-cmmd", version: "1" } });
  if (init.status !== 200) return { status: "ERROR", message: `The MCP server answered ${init.status} to initialize.` };

  // A company-bound token sees one workspace. An account-wide token (what CMMD issued before it
  // bound cmmdstack logins) sees all of them and works in the person's default one, which is fine
  // only when the default is this repository's company.
  let ws = workspaces.length === 1 ? workspaces[0] : null;
  let note = "";
  if (!ws) {
    const ctx = await rpc(token, "tools/call", { name: "get_account_context", arguments: {} }, init.session);
    const active = JSON.parse(ctx.body?.result?.content?.[0]?.text ?? "{}");
    ws = workspaces.find((w) => w.id === active.activeWorkspaceId) ?? null;
    note = " The token is account-wide; it reads this company because it is your default.";
    if (!ws) return { status: "WRONG_WORKSPACE", message: "The token is account-wide and CMMD did not report its workspace. Run again with --relogin." };
  }
  if (pin && ws.id !== pin.workspaceId) {
    return { status: "WRONG_WORKSPACE", message: `The token reads workspace ${ws.id} (${ws.name}); this repository needs ${pin.workspaceId} (${pin.name ?? "see cmmd-workspace.json"}). Run again with --relogin and pick that company in the browser.` };
  }
  const list = await rpc(token, "tools/list", {}, init.session);
  const names = new Set((list.body?.result?.tools ?? []).map((t) => t.name));
  const missing = REQUIRED_TOOLS.filter((t) => !names.has(t));
  if (missing.length) return { status: "NO_FULL_SERVER", message: `Connected, but these tools are missing: ${missing.join(", ")}.` };
  return { status: "OK", message: `Connected to CMMD as ${user.email} for workspace ${ws.id} (${ws.name}), ${names.size} tools, Brain readable.${note}` };
}

function openBrowser(url) {
  const cmd = platform() === "darwin" ? "open" : platform() === "win32" ? "explorer" : "xdg-open";
  spawnSync(cmd, [url], { stdio: "ignore" });
}

async function login(pin) {
  const start = await post("/api/mcp-server/oauth/device", { client_id: CLIENT_ID, scope: "read write" });
  if (!start.ok) throw new Error(`CMMD refused to start a login (${start.status}).`);
  const device = await start.json();
  const link = `${device.verification_uri_complete}${pin ? `&workspace=${pin.workspaceId}` : ""}`;
  console.log(`Approve this agent login in CMMD${pin ? ` for ${pin.name ?? `workspace ${pin.workspaceId}`}` : ""}:`);
  console.log(`  ${link}`);
  console.log(`  code ${device.user_code}, valid for ${Math.round(device.expires_in / 60)} minutes`);
  if (!flag("--no-browser")) openBrowser(link);

  let interval = device.interval ?? 5;
  const deadline = Date.now() + device.expires_in * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval * 1000));
    const res = await post("/api/mcp-server/oauth/token", {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: device.device_code,
      client_id: CLIENT_ID,
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.access_token) {
      mkdirSync(DIR, { recursive: true, mode: 0o700 });
      writeFileSync(TOKEN_FILE, `${body.access_token}\n`, { mode: 0o600 });
      chmodSync(TOKEN_FILE, 0o600);
      return;
    }
    if (body.error === "slow_down") interval += 5;
    else if (body.error !== "authorization_pending") throw new Error(`Login ended: ${body.error ?? res.status}.`);
  }
  throw new Error("The login code expired before it was approved.");
}

function configureClaude() {
  writeFileSync(HEADER_HELPER, `#!/bin/sh\n# Written by cmmdstack connect-cmmd. Prints the CMMD agent header for Claude Code.\nprintf '{"Authorization":"Bearer %s"}' "$(cat '${TOKEN_FILE}')"\n`, { mode: 0o700 });
  chmodSync(HEADER_HELPER, 0o700);
  if (spawnSync("claude", ["--version"], { stdio: "ignore" }).status !== 0) return "Claude Code not found; skipped.";
  for (const scope of ["local", "project", "user"]) spawnSync("claude", ["mcp", "remove", SERVER_NAME, "-s", scope], { stdio: "ignore" });
  const config = JSON.stringify({ type: "http", url: SERVER_URL, headersHelper: HEADER_HELPER });
  const added = spawnSync("claude", ["mcp", "add-json", "-s", "user", SERVER_NAME, config], { encoding: "utf8" });
  if (added.status !== 0) throw new Error(`claude mcp add-json failed: ${(added.stderr || added.stdout).split("\n")[0]}`);
  return "Claude Code: cmmd-agent added for every project. Restart open sessions to load it.";
}

function exportLine() {
  const line = `export ${ENV_VAR}="$(cat '${TOKEN_FILE}' 2>/dev/null)" # cmmdstack connect-cmmd`;
  for (const rc of [".zshrc", ".bashrc"].map((f) => join(homedir(), f)).filter(existsSync)) {
    if (!readFileSync(rc, "utf8").includes("# cmmdstack connect-cmmd")) appendFileSync(rc, `\n${line}\n`);
  }
}

function configureCodex() {
  if (flag("--no-codex")) return "Codex: skipped.";
  if (spawnSync("codex", ["--version"], { stdio: "ignore" }).status !== 0) return "Codex not found; skipped.";
  exportLine();
  spawnSync("codex", ["mcp", "remove", SERVER_NAME], { stdio: "ignore" });
  const added = spawnSync("codex", ["mcp", "add", SERVER_NAME, "--url", SERVER_URL, "--bearer-token-env-var", ENV_VAR], { encoding: "utf8" });
  if (added.status !== 0) throw new Error(`codex mcp add failed: ${(added.stderr || added.stdout).split("\n")[0]}`);
  return `Codex: cmmd-agent added; it reads ${ENV_VAR}, which new shells export from the token file.`;
}

try {
  const pinned = findPin();
  const override = option("--workspace");
  const pin = override ? { workspaceId: Number(override), name: undefined } : pinned;
  if (!pin && flag("--check")) finish("NO_PIN", "No cmmd-workspace.json above this directory, so the company is not known.");

  let token = readToken();
  if (flag("--check")) {
    if (!token) finish("NOT_CONNECTED", "No CMMD agent token on this machine. Run connect-cmmd without --check.");
    const result = await verify(token, pin);
    finish(result.status, result.message);
  }

  if (!token || flag("--relogin") || (await verify(token, pin)).status !== "OK") {
    await login(pin);
    token = readToken();
  }
  console.log(configureClaude());
  console.log(configureCodex());
  const result = await verify(token, pin);
  finish(result.status, result.message);
} catch (error) {
  finish("ERROR", `connect-cmmd: ${error.message}`);
}
