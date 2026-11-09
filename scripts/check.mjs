#!/usr/bin/env node
// Fails when a skill, its Codex prompt, a relative link, or a manifest version is out of line.
// Run with --fix to write missing Codex prompts.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const fix = process.argv.includes("--fix");
const errors = [];
const skillsDir = join(root, "skills");
const promptsDir = join(root, ".codex-plugin", "prompts");

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  let key = null;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      out[key] = kv[2].replace(/^["']|["']$/g, "");
    } else if (key && /^\s+\S/.test(line)) {
      out[key] = `${out[key] === ">-" ? "" : out[key] + " "}${line.trim()}`;
    }
  }
  return out;
}

const skills = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory()).sort();
for (const name of skills) {
  const file = join(skillsDir, name, "SKILL.md");
  if (!existsSync(file)) {
    errors.push(`skills/${name}: no SKILL.md`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  const fm = frontmatter(text);
  if (!fm) errors.push(`skills/${name}/SKILL.md: no frontmatter`);
  else {
    if (fm.name !== name) errors.push(`skills/${name}/SKILL.md: name is "${fm.name}", expected "${name}"`);
    if (!fm.description) errors.push(`skills/${name}/SKILL.md: no description`);
  }

  const prompt = join(promptsDir, `${name}.md`);
  if (!existsSync(prompt)) {
    if (fix && fm?.description) {
      const summary = fm.description.split(/(?<=\.)\s/)[0].replace(/\.$/, "");
      writeFileSync(
        prompt,
        `---\nname: ${name}\ndescription: ${JSON.stringify(summary.charAt(0).toLowerCase() + summary.slice(1))}\ndisable-model-invocation: true\n---\n\nInvoke the \`${name}\` skill and follow it.\n`,
      );
    } else errors.push(`.codex-plugin/prompts/${name}.md: missing (run with --fix)`);
  }
}

const readme = readFileSync(join(root, "README.md"), "utf8");
for (const name of skills) {
  if (!name.startsWith("principle-") && !readme.includes(`\`${name}\``)) {
    errors.push(`README.md: skill ${name} is missing from the Skills table`);
  }
}

for (const p of readdirSync(promptsDir)) {
  const name = p.replace(/\.md$/, "");
  if (!skills.includes(name)) errors.push(`.codex-plugin/prompts/${p}: no skill named ${name}`);
}

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n === ".git" || n === "corpus") continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith(".md")) out.push(p);
  }
  return out;
}
for (const file of walk(root)) {
  const raw = readFileSync(file, "utf8");
  raw.split("\n").forEach((line, i) => {
    if (/[–—]/.test(line)) {
      errors.push(`${file.slice(root.length + 1)}:${i + 1}: em or en dash; use a period or a comma`);
    }
  });
  const text = raw.replace(/```[\s\S]*?```/g, "");
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = target.split("#")[0];
    if (path && !existsSync(resolve(dirname(file), path))) {
      errors.push(`${file.slice(root.length + 1)}: broken link ${target}`);
    }
  }
}

// A CMMD agent token in any tracked file would publish it. connect-cmmd keeps tokens in
// ~/.config/cmmd; nothing in this repo may hold one.
function walkAll(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n === ".git") continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walkAll(p, out);
    else out.push(p);
  }
  return out;
}
for (const file of walkAll(root)) {
  if (/\.(png|pdf|jpg|woff2?)$/.test(file)) continue;
  if (/cmmd_pat_[0-9a-f]{8}/.test(readFileSync(file, "utf8"))) {
    errors.push(`${file.slice(root.length + 1)}: contains a CMMD agent token; remove it and revoke it in CMMD`);
  }
}

// Codex reads prompt frontmatter as YAML: an unquoted value with ": " in it does not parse.
for (const p of readdirSync(promptsDir)) {
  const fm = readFileSync(join(promptsDir, p), "utf8").match(/^---\n([\s\S]*?)\n---/);
  for (const line of fm ? fm[1].split("\n") : []) {
    const value = line.match(/^[a-z-]+:\s+(.*)$/)?.[1] ?? "";
    if (!/^["']/.test(value) && /: |\s#/.test(value)) {
      errors.push(`.codex-plugin/prompts/${p}: unquoted value "${value.slice(0, 40)}..." is not valid YAML; quote it`);
    }
  }
}

// Muse lists every skill by hand.
const muse = JSON.parse(readFileSync(join(root, ".muse-plugin/plugin.json"), "utf8"));
const museIds = new Set((muse.capabilities?.skills ?? []).map((s) => s.id));
for (const name of skills) if (!museIds.has(name)) errors.push(`.muse-plugin/plugin.json: skill ${name} is missing`);
for (const id of museIds) if (!skills.includes(id)) errors.push(`.muse-plugin/plugin.json: lists ${id}, which has no skill`);

// Each skill's Models section repeats its role defaults from models.json.
const models = JSON.parse(readFileSync(join(root, "models.json"), "utf8"));
for (const { role, models: tier, skill } of models.roles) {
  const resolved = [models.tiers[tier]].flat().map((m) => `\`${m}\``).join(", ");
  const text = readFileSync(join(skillsDir, skill, "SKILL.md"), "utf8");
  if (!text.includes(`- ${role}: ${resolved}`)) {
    errors.push(`skills/${skill}/SKILL.md: Models line for "${role}" must read "- ${role}: ${resolved}" (models.json)`);
  }
}

const versions = [".claude-plugin/plugin.json", ".codex-plugin/plugin.json", ".github/plugin/plugin.json", ".muse-plugin/plugin.json"]
  .filter((f) => existsSync(join(root, f)))
  .map((f) => [f, JSON.parse(readFileSync(join(root, f), "utf8")).version]);
if (new Set(versions.map(([, v]) => v)).size > 1) {
  errors.push(`manifest versions differ: ${versions.map(([f, v]) => `${f}=${v}`).join(", ")}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`ok: ${skills.length} skills, versions ${versions[0]?.[1]}`);
