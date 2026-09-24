import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { createApp } from "../src/index";
import { isLocalAuthEnabled, type Env } from "../src/lib/auth";

describe("DV Hub API", () => {
  let db: Database.Database;
  let env: Env["Bindings"];
  let app: ReturnType<typeof createApp>;
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "dv-hub-test-"));
    const dbPath = join(dir, "test.db");

    // Apply the real migrations + seed via the project's own migration script.
    execFileSync(
      "node",
      [join(process.cwd(), "scripts", "init-db.js"), dbPath],
      {
        stdio: "ignore",
      },
    );

    db = new Database(dbPath);
    env = {
      DB: db,
      TELEGRAM_BOT_TOKEN: "",
      TELEGRAM_BOT_USERNAME: "dv_hub_auth_bot",
      TELEGRAM_WEBHOOK_SECRET: "",
      RESEND_API_KEY: "",
      RESEND_FROM_EMAIL: "",
      LOCAL_AUTH_ENABLED: false,
    };
    app = createApp(env);
  });

  afterAll(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  // Hono's app.request injects bindings as the third argument.
  const request = (path: string, init?: RequestInit) =>
    app.request(path, init, env);

  it("serves the HTML shell at /", async () => {
    const res = await request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("DV Hub");
  });

  it("returns dashboard data", async () => {
    const res = await request("/api/dashboard");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("topics");
    expect(body).toHaveProperty("materials");
    expect(body).toHaveProperty("rooms");
    expect(body).toHaveProperty("publications");
  });

  it("returns the topics list", async () => {
    const res = await request("/api/topics");
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("accepts a public idea submission", async () => {
    const res = await request("/api/submit-idea", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Test idea" }),
    });
    expect(res.status).toBe(200);
  });

  it("blocks an unauthenticated POST to /api/materials", async () => {
    const res = await request("/api/materials", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("blocks unauthenticated profile access", async () => {
    const res = await request("/api/profile");
    expect(res.status).toBe(401);
  });

  it("does not expose local auth by default", async () => {
    const res = await request("/auth/dev-login", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("allows local auth only when explicitly enabled", async () => {
    const res = await app.request(
      "/auth/dev-login",
      { method: "POST" },
      { ...env, LOCAL_AUTH_ENABLED: true },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("session=");
  });
});

describe("local auth environment guard", () => {
  it("requires both the development environment and the explicit flag", () => {
    expect(
      isLocalAuthEnabled({
        NODE_ENV: "development",
        LOCAL_AUTH_ENABLED: "true",
      }),
    ).toBe(true);
    expect(isLocalAuthEnabled({ LOCAL_AUTH_ENABLED: "true" })).toBe(false);
    expect(
      isLocalAuthEnabled({
        NODE_ENV: "production",
        LOCAL_AUTH_ENABLED: "true",
      }),
    ).toBe(false);
  });
});
