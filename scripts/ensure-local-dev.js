#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(projectRoot, "data");
const envPath = join(projectRoot, ".env");
const lockPath = join(dataDir, ".opencode-startup.lock");
const installStampPath = join(
  projectRoot,
  "node_modules",
  ".package-lock.sha256",
);
const logPath = join(dataDir, "dev-server.log");
const env = { ...process.env };
let healthUrl;

mkdirSync(dataDir, { recursive: true });

function readEnvFile(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2");
        return [key, value];
      }),
  );
}

function configureEnvironment() {
  if (!existsSync(envPath)) {
    copyFileSync(join(projectRoot, ".env.example"), envPath);
    console.log("Created .env from .env.example");
  }

  const envText = readFileSync(envPath, "utf8");
  const localDefaults = {
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    LOCAL_AUTH_ENABLED: "true",
  };
  const missingDefaults = Object.entries(localDefaults).filter(
    ([key]) => !new RegExp(`^${key}=`, "m").test(envText),
  );
  if (missingDefaults.length > 0) {
    appendFileSync(
      envPath,
      `\n${missingDefaults.map(([key, value]) => `${key}=${value}`).join("\n")}\n`,
    );
  }
  chmodSync(envPath, 0o600);

  Object.assign(env, readEnvFile(envPath));
  const host = env.HOST || "127.0.0.1";
  const port = env.PORT || "8787";
  healthUrl = `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}/health`;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with ${result.status}`,
    );
  }
}

async function healthy() {
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.service === "dv-hub";
  } catch {
    return false;
  }
}

async function waitForHealth(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await healthy()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function acquireLock() {
  try {
    const fd = openSync(lockPath, "wx");
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;

    const owner = Number(readFileSync(lockPath, "utf8"));
    try {
      process.kill(owner, 0);
      return false;
    } catch {
      rmSync(lockPath, { force: true });
      return acquireLock();
    }
  }
}

configureEnvironment();

if (!acquireLock()) {
  if (await waitForHealth(120_000)) process.exit(0);
  throw new Error("another local bootstrap did not make dv-hub healthy");
}

try {
  const packageLock = readFileSync(join(projectRoot, "package-lock.json"));
  const lockHash = createHash("sha256").update(packageLock).digest("hex");
  const installedHash = existsSync(installStampPath)
    ? readFileSync(installStampPath, "utf8").trim()
    : "";

  if (
    !existsSync(join(projectRoot, "node_modules")) ||
    installedHash !== lockHash
  ) {
    run("npm", ["ci"]);
    writeFileSync(installStampPath, `${lockHash}\n`);
  }

  run("npm", ["run", "db:migrate:local"]);

  if (!(await healthy())) {
    const logFd = openSync(logPath, "a");
    const child = spawn("npm", ["run", "dev"], {
      cwd: projectRoot,
      detached: true,
      env,
      stdio: ["ignore", logFd, logFd],
    });
    child.unref();
    closeSync(logFd);
  }

  if (!(await waitForHealth(30_000))) {
    throw new Error(`dv-hub did not become healthy; inspect ${logPath}`);
  }

  console.log(`DV Hub is ready at ${healthUrl.replace("/health", "")}`);
} finally {
  rmSync(lockPath, { force: true });
}
