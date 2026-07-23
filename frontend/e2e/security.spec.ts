import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("changeme");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
}

test.describe("security", () => {
  test("unauthenticated users redirected to login", async ({ page }) => {
    await page.goto("/links");
    await expect(page).toHaveURL(/\/login/);
  });

  test("browser never calls Core origin directly", async ({ page, baseURL }) => {
    const dashOrigin = new URL(baseURL || "http://127.0.0.1:3012").origin;
    const coreHits: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (!url.startsWith("http")) return;
      const origin = new URL(url).origin;
      if (origin !== dashOrigin && !url.startsWith("data:")) {
        coreHits.push(url);
      }
    });

    await login(page);
    for (const path of ["/", "/links", "/webhooks", "/debug", "/settings"]) {
      await page.goto(path);
    }
    expect(coreHits, coreHits.join("\n")).toEqual([]);
  });

  test("BFF rejects disallowed Core paths", async ({ request, page }) => {
    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const blocked = await request.get("/api/core/etc/passwd", {
      headers: { cookie: cookieHeader },
    });
    expect(blocked.status()).toBe(403);

    const openProxy = await request.get("/api/core/api/admin/secrets", {
      headers: { cookie: cookieHeader },
    });
    expect(openProxy.status()).toBe(403);
  });

  test("BFF strips client userId and requires auth", async ({ request, page }) => {
    const unauth = await request.get("/api/core/api/links", {
      maxRedirects: 0,
    });
    expect([401, 302, 303, 307]).toContain(unauth.status());

    await login(page);
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const allowed = await request.get("/api/core/api/links?userId=spoofed-id", {
      headers: { cookie: cookieHeader },
    });
    expect(allowed.status()).toBe(200);
    const body = await allowed.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("login page does not expose Core host", async ({ page }) => {
    await page.goto("/login");
    const html = await page.content();
    expect(html).not.toMatch(/127\.0\.0\.1:\d{4}/);
    expect(html).not.toContain("CORE_URL");
  });

  test("security response headers present", async ({ request }) => {
    const res = await request.get("/login");
    expect(res.headers()["x-frame-options"]?.toLowerCase()).toBe("deny");
    expect(res.headers()["x-content-type-options"]?.toLowerCase()).toBe(
      "nosniff",
    );
  });

  test("live WS upgrade rejects unauthenticated clients", async ({
    baseURL,
  }) => {
    const origin = baseURL || "http://127.0.0.1:3012";
    const wsUrl = origin.replace(/^http/, "ws") + "/api/debug/live";
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error("WS connect timed out (expected close/error)"));
      }, 5000);
      ws.onopen = () => {
        clearTimeout(timer);
        ws.close();
        reject(new Error("Unauthenticated WS should not open"));
      };
      ws.onerror = () => {
        clearTimeout(timer);
        resolve();
      };
      ws.onclose = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  });
});
