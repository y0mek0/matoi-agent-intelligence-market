import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const stateDir = path.join(root, "qa", "artifacts");
const stateFile = path.join(stateDir, "watch-state.json");
const once = process.argv.includes("--once");
const intervalMs = Number(process.env.AIM_WATCH_INTERVAL_MS || 60_000);
const trackedRoots = ["src", "docs", "tests", "qa", "scripts"];
const trackedFiles = ["package.json", "next.config.ts", "vitest.config.ts", "playwright.config.ts", "README.md"];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "artifacts"].includes(entry.name)) return [];
      return walk(full);
    }
    if (/\.(ts|tsx|js|mjs|css|md|json)$/.test(entry.name)) return [full];
    return [];
  });
}

function fingerprint() {
  const hash = crypto.createHash("sha256");
  for (const file of [...trackedFiles.map((f) => path.join(root, f)), ...trackedRoots.flatMap((dir) => walk(path.join(root, dir)))].sort()) {
    if (!fs.existsSync(file)) continue;
    hash.update(path.relative(root, file));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest("hex");
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return {}; }
}

function saveState(state) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function run(command) {
  const result = spawnSync(command, { cwd: root, shell: true, encoding: "utf8", timeout: 300_000 });
  return { command, status: result.status, stdout: result.stdout.slice(-4000), stderr: result.stderr.slice(-4000) };
}

function check() {
  const current = fingerprint();
  const previous = loadState();
  if (previous.hash === current && previous.lastStatus === "pass") {
    if (!once) console.log(`[monitor] unchanged ok ${new Date().toISOString()}`);
    return;
  }
  const runs = [run("npm run lint"), run("npm run test"), run("npm run build")];
  const ok = runs.every((item) => item.status === 0);
  const report = { time: new Date().toISOString(), hash: current, lastStatus: ok ? "pass" : "fail", runs };
  saveState(report);
  const md = [
    `# Watch report`,
    ``,
    `Status: ${ok ? "pass" : "fail"}`,
    `Time: ${report.time}`,
    ``,
    ...runs.map((item) => `## ${item.command}\n\nExit: ${item.status}\n\n\`\`\`text\n${(item.stdout || item.stderr || "").trim()}\n\`\`\``),
  ].join("\n");
  fs.writeFileSync(path.join(stateDir, "watch-report.md"), md);
  console.log(`[monitor] ${ok ? "pass" : "fail"} ${report.time}`);
  if (!ok && once) process.exitCode = 1;
}

check();
if (!once) setInterval(check, intervalMs);
