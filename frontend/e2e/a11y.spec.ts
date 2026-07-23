import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("changeme");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
}

test.describe("a11y", () => {
  test("login page has no critical axe violations", async ({ page }) => {
    await page.goto("/login");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test("authenticated shell pages pass axe serious+", async ({ page }) => {
    await login(page);

    for (const path of ["/", "/links", "/webhooks", "/debug", "/settings"]) {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        critical,
        `${path}: ${JSON.stringify(critical, null, 2)}`,
      ).toEqual([]);
    }
  });

  test("links list renders mocked Core data", async ({ page }) => {
    await login(page);
    await page.goto("/links");
    await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();
    await expect(page.getByRole("link", { name: "demo" })).toBeVisible();
  });
});
