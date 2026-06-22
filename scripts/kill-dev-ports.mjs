import { execFileSync, execSync } from "node:child_process";

const PORTS = [3000, 5000];
const MAX_ATTEMPTS = 5;

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* busy wait — predev must finish before dev starts */
  }
}

function listListeningPids(port) {
  if (process.platform !== "win32") {
    try {
      const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return out
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((pid) => /^\d+$/.test(pid));
    } catch {
      return [];
    }
  }

  try {
    const out = execFileSync("netstat", ["-ano"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      if (!line.includes(`:${port}`)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts.at(-1);
      if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (process.platform === "win32") {
      execFileSync(
        "powershell",
        ["-NoProfile", "-Command", `Stop-Process -Id ${pid} -Force -ErrorAction Stop`],
        { stdio: "ignore", timeout: 5_000 },
      );
    } else {
      execFileSync("kill", ["-9", pid], { stdio: "ignore" });
    }
    console.log(`Killed PID ${pid}`);
    return true;
  } catch {
    return false;
  }
}

function portIsFree(port) {
  return listListeningPids(port).length === 0;
}

for (const port of PORTS) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const pids = listListeningPids(port);
    if (pids.length === 0) break;

    for (const pid of pids) killPid(pid);

    if (portIsFree(port)) {
      console.log(`Freed port ${port}`);
      break;
    }

    if (attempt === MAX_ATTEMPTS) {
      console.warn(`Port ${port} still in use after ${MAX_ATTEMPTS} attempts`);
    } else {
      sleep(500);
    }
  }
}

sleep(300);
