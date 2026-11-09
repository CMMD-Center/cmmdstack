#!/usr/bin/env node
// Connects this machine's coding agents to the full CMMD MCP server for one company.
//
//   node connect-cmmd.mjs            log in if needed, configure Claude Code and Codex, verify
//   node connect-cmmd.mjs --check    verify only; never opens a browser or writes anything
//   node connect-cmmd.mjs --relogin  log in again even when a token is stored
//
// Options: --workspace <id> overrides the repository pin, --base <url> overrides https://cmmd.ai
// (cmmd.ai hosts and localhost only, unless --allow-host),
// --no-browser prints the link instead of opening it, --no-codex skips Codex.
//
// The company comes from cmmd-workspace.json, found by walking up from the current directory:
//   { "workspaceId": 2119, "name": "CMMD" }
//
// Login is CMMD's device flow with client_id "cmmdstack". The person approves in the browser,
// picking the company; CMMD binds the token to that company. The token has no expiry and lives in
// ~/.config/cmmd/agent-token (mode 0600). This script never prints it, never passes it on a
// command line, and never reads an agent's settings file. Claude Code reads it through a
// headersHelper script; Codex reads it from CMMD_AGENT_MCP_TOKEN, which a `codex` shell function sets
// from the file for that process only. Revoke it in CMMD under Settings, Agents.
//
// On OK it prints `workspace_id=<id>`, which agents pass on every cmmd-agent tool call. The last line
// is always `status=<OK|NOT_CONNECTED|WRONG_WORKSPACE|NO_FULL_SERVER|NO_PIN|ERROR>`.
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);

const BASE = new URL(option("--base") ?? process.env.CMMD_BASE_URL ?? "https://cmmd.ai").origin;
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE);
const KNOWN = BASE === "https://cmmd.ai" || /^https:\/\/[a-z0-9-]+\.cmmd\.ai$/.test(BASE);
if (!KNOWN && !LOCAL && !flag("--allow-host")) {
  console.log(`connect-cmmd: ${BASE} is not cmmd.ai or localhost; pass --allow-host to use it anyway.`);
  console.log("status=ERROR");
  process.exit(1);
}
if (!BASE.startsWith("https://") && !LOCAL) {
  console.log(`connect-cmmd: ${BASE} is not https; refusing to send a CMMD login there.`);
  console.log("status=ERROR");
  process.exit(1);
}
const SERVER_URL = `${BASE}/api/mcp-server/http`;
// The Forge path: the same token, the board tools that claim a card, comment on it and link a PR.
// CMMD refuses those writes anywhere else ("requires an authenticated Forge MCP session").
const FORGE_URL = `${BASE}/api/mcp-server/forge/message`;
const FORGE_NAME = "cmmd-forge";
const CLIENT_ID = "cmmdstack";
const SERVER_NAME = "cmmd-agent";
const ENV_VAR = "CMMD_AGENT_MCP_TOKEN";
const DIR = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "cmmd");
const TOKEN_FILE = join(DIR, "agent-token");
const ORIGIN_FILE = join(DIR, "agent-token.origin");
const HEADER_HELPER = join(DIR, "auth-header.sh");
// get_account_context is listed only for account-wide tokens, so it is not required.
const REQUIRED_TOOLS = ["search_strategy", "manage_rock", "search_brain_documents", "get_brain_document_content"];

// Text from a repository file or the server, safe to print: no control characters.
const clean = (value) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "");

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

// The token is only ever sent to the site that issued it. A different --base gets no token, so a
// typo or a hostile CMMD_BASE_URL cannot collect it.
function readToken() {
  if (!existsSync(TOKEN_FILE)) return "";
  const origin = existsSync(ORIGIN_FILE) ? readFileSync(ORIGIN_FILE, "utf8").trim() : "https://cmmd.ai";
  return origin === BASE ? readFileSync(TOKEN_FILE, "utf8").trim() : "";
}

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    redirect: "error",
  });
  return res;
}

// One JSON-RPC call to the MCP server; the reply is JSON or a short event stream.
async function rpc(token, method, params, session, url = SERVER_URL) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
      ...(session ? { "mcp-session-id": session } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    redirect: "error",
  });
  if (res.status === 401 || res.status === 403) return { status: res.status };
  const text = await res.text();
  const data = text.trimStart().startsWith("{")
    ? text
    : text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5)).pop() ?? "{}";
  return { status: res.status, session: res.headers.get("mcp-session-id") ?? session, body: JSON.parse(data) };
}

async function verify(token, pin) {
  const info = await fetch(`${BASE}/api/mcp-server/userinfo`, { headers: { authorization: `Bearer ${token}` }, redirect: "error" });
  if (info.status === 401) return { status: "NOT_CONNECTED", message: "The stored CMMD token was rejected (revoked, or for another server)." };
  if (info.status === 403) return { status: "NOT_CONNECTED", message: "CMMD wants this token authorized for the workspace. Open CMMD Settings, Agents, and authorize the cmmdstack token, then run --check again." };
  if (!info.ok) return { status: "ERROR", message: `CMMD userinfo answered ${info.status}.` };
  const user = await info.json();
  const workspaces = user.workspaces ?? [];
  const init = await rpc(token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "connect-cmmd", version: "1" } });
  if (init.status !== 200) return { status: "ERROR", message: `The MCP server answered ${init.status} to initialize.` };

  // A company-bound token sees one workspace and must be the pinned one. An account-wide token sees
  // every workspace the person belongs to; the full server runs a tool call in the workspace its
  // workspace_id argument names, after checking membership. So an account-wide token is fine when
  // the person belongs to the pinned workspace and agents pass workspace_id on every call.
  const bound = workspaces.length === 1;
  const ws = pin ? workspaces.find((w) => w.id === pin.workspaceId) : workspaces[0];
  if (!ws || (bound && pin && workspaces[0].id !== pin.workspaceId)) {
    const seen = workspaces.map((w) => `${w.id} (${clean(w.name)})`).join(", ");
    return { status: "WRONG_WORKSPACE", message: `This token cannot reach workspace ${pin?.workspaceId}; it reaches ${seen || "nothing"}. Run again with --relogin and pick that workspace, or ask its admin to add you.` };
  }
  let note = "";
  if (!bound) {
    const probe = await rpc(token, "tools/call", { name: "list_brain_documents", arguments: { limit: 1, workspace_id: ws.id } }, init.session);
    if (probe.status !== 200 || probe.body?.error || probe.body?.result?.isError) {
      return { status: "NOT_CONNECTED", message: `CMMD would not run a call in workspace ${ws.id} with this token. Authorize the token for it in CMMD Settings, Agents.` };
    }
    note = ` The token is account-wide, so pass workspace_id ${ws.id} on every cmmd-agent call.`;
  }
  const list = await rpc(token, "tools/list", {}, init.session);
  const names = new Set((list.body?.result?.tools ?? []).map((t) => t.name));
  const missing = REQUIRED_TOOLS.filter((t) => !names.has(t));
  if (missing.length) return { status: "NO_FULL_SERVER", message: `Connected, but these tools are missing: ${missing.join(", ")}.` };
  const forgeInit = await rpc(token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "connect-cmmd", version: "1" } }, undefined, FORGE_URL);
  const forgeList = await rpc(token, "tools/list", {}, forgeInit.session, FORGE_URL);
  const forgeTools = new Set((forgeList.body?.result?.tools ?? []).map((t) => t.name));
  if (!forgeTools.has("forge_claim_task") || !forgeTools.has("link_task_pull_request")) {
    return { status: "NO_FULL_SERVER", message: "Connected, but the Forge path does not offer forge_claim_task and link_task_pull_request." };
  }
  console.log(`workspace_id=${ws.id}`);
  return { status: "OK", message: `Connected to CMMD as ${clean(user.email)} for workspace ${ws.id} (${clean(ws.name)}), ${names.size} tools, Brain readable, board writes on the Forge path.${note}` };
}

function openBrowser(url) {
  const cmd = platform() === "darwin" ? "open" : platform() === "win32" ? "explorer" : "xdg-open";
  spawnSync(cmd, [url], { stdio: "ignore" });
}

async function login(pin) {
  const start = await post("/api/mcp-server/oauth/device", { client_id: CLIENT_ID, scope: "read write" });
  if (!start.ok) throw new Error(`CMMD refused to start a login (${start.status}).`);
  const device = await start.json();
  if (new URL(device.verification_uri_complete).origin !== BASE) {
    throw new Error(`CMMD sent a login link for another site (${new URL(device.verification_uri_complete).origin}); not opening it.`);
  }
  const link = `${device.verification_uri_complete}${pin ? `&workspace=${pin.workspaceId}` : ""}`;
  console.log(`Approve this agent login in CMMD${pin ? ` for workspace ${pin.workspaceId} (named "${clean(pin.name) || "unnamed"}" in cmmd-workspace.json)` : ""}:`);
  console.log(`  ${link}`);
  console.log(`  code ${device.user_code}, valid for ${Math.round(device.expires_in / 60)} minutes`);
  if (!flag("--no-browser")) openBrowser(link);

  // Ten seconds keeps under CMMD's per-IP limit on servers older than its device-poll bucket.
  let interval = Math.max(device.interval ?? 5, 10);
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
      writeFileSync(ORIGIN_FILE, `${BASE}\n`, { mode: 0o600 });
      return;
    }
    if (body.error === "slow_down") interval += 5;
    else if (res.status === 429 || body.error === "rate_limit_exceeded") {
      // Older CMMD servers allow fewer polls a minute than the interval they advertise. Wait out
      // the window and poll slower; the code stays valid.
      await new Promise((r) => setTimeout(r, 60_000));
      interval = Math.max(interval, 10);
    } else if (body.error !== "authorization_pending") throw new Error(`Login ended: ${body.error ?? res.status}.`);
  }
  throw new Error("The login code expired before it was approved.");
}

function configureClaude() {
  writeFileSync(HEADER_HELPER, `#!/bin/sh\n# Written by cmmdstack connect-cmmd. Prints the CMMD agent header for Claude Code.\nprintf '{"Authorization":"Bearer %s"}' "$(cat "$(dirname "$0")/agent-token")"\n`, { mode: 0o700 });
  chmodSync(HEADER_HELPER, 0o700);
  if (spawnSync("claude", ["--version"], { stdio: "ignore" }).status !== 0) return "Claude Code not found; skipped.";
  for (const [name, url] of [[SERVER_NAME, SERVER_URL], [FORGE_NAME, FORGE_URL]]) {
    for (const scope of ["local", "project", "user"]) spawnSync("claude", ["mcp", "remove", name, "-s", scope], { stdio: "ignore" });
    const config = JSON.stringify({ type: "http", url, headersHelper: HEADER_HELPER });
    const added = spawnSync("claude", ["mcp", "add-json", "-s", "user", name, config], { encoding: "utf8" });
    if (added.status !== 0) throw new Error(`claude mcp add-json ${name} failed: ${(added.stderr || added.stdout).split("\n")[0]}`);
  }
  return `Claude Code: ${SERVER_NAME} and ${FORGE_NAME} added for every project. Restart open sessions to load them.`;
}

// Single-quote a value for sh: ' becomes '\''.
const shq = (value) => `'${value.replaceAll("'", "'\\''")}'`;

// Codex reads the token from an environment variable. Exporting it in every shell would show it to
// every child process, so only a codex shell function sets it, for that process alone.
function exportLine() {
  const line = `codex() { ${ENV_VAR}="$(cat ${shq(TOKEN_FILE)} 2>/dev/null)" command codex "$@"; } # cmmdstack connect-cmmd`;
  for (const rc of [".zshrc", ".bashrc"].map((f) => join(homedir(), f)).filter(existsSync)) {
    if (!readFileSync(rc, "utf8").includes("# cmmdstack connect-cmmd")) appendFileSync(rc, `\n${line}\n`);
  }
}

function configureCodex() {
  if (flag("--no-codex")) return "Codex: skipped.";
  if (spawnSync("codex", ["--version"], { stdio: "ignore" }).status !== 0) return "Codex not found; skipped.";
  exportLine();
  for (const [name, url] of [[SERVER_NAME, SERVER_URL], [FORGE_NAME, FORGE_URL]]) {
    spawnSync("codex", ["mcp", "remove", name], { stdio: "ignore" });
    const added = spawnSync("codex", ["mcp", "add", name, "--url", url, "--bearer-token-env-var", ENV_VAR], { encoding: "utf8" });
    if (added.status !== 0) throw new Error(`codex mcp add ${name} failed: ${(added.stderr || added.stdout).split("\n")[0]}`);
  }
  return `Codex: ${SERVER_NAME} and ${FORGE_NAME} added. Start Codex from a new terminal; the codex shell function hands it ${ENV_VAR}.`;
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

  const before = token ? await verify(token, pin) : { status: "NOT_CONNECTED" };
  if (!token || flag("--relogin") || before.status === "NOT_CONNECTED" || before.status === "WRONG_WORKSPACE") {
    await login(pin);
    token = readToken();
    const after = await verify(token, pin);
    if (after.status === "WRONG_WORKSPACE") {
      // Never wire agents to another company's data. Drop the token; the person logs in again.
      rmSync(TOKEN_FILE, { force: true });
      rmSync(ORIGIN_FILE, { force: true });
      finish(after.status, `${after.message} The new token was deleted and no agent was changed. Revoke it in CMMD Settings, Agents.`);
    }
    if (after.status !== "OK" && after.status !== "NO_FULL_SERVER") finish(after.status, after.message);
  } else if (before.status !== "OK" && before.status !== "NO_FULL_SERVER") {
    // The company check did not pass (a network error, say). Change nothing.
    finish(before.status, before.message);
  }
  console.log(configureClaude());
  console.log(configureCodex());
  const result = await verify(token, pin);
  finish(result.status, result.message);
} catch (error) {
  finish("ERROR", `connect-cmmd: ${error.message}`);
}
