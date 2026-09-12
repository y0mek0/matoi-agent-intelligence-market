import { execSync } from "node:child_process";
import fs from "node:fs";

try { fs.rmSync(".next/lock", { force: true }); } catch {}
try { fs.rmSync(".next/dev/lock", { force: true }); } catch {}

if (process.platform === "win32") {
  try {
    execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :3100') do taskkill /PID %a /F`, { shell: "cmd.exe", stdio: "ignore" });
  } catch {}
} else {
  try { execSync("lsof -ti tcp:3100 | xargs -r kill -9", { stdio: "ignore" }); } catch {}
}
