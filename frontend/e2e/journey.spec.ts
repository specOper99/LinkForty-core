import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("changeme");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
}

test.describe("operator journey", () => {
  test("create link → short URL → QR → analytics → webhook test → simulate", async ({
    page,
  }) => {
    await login(page);

    // Create link
    await page.goto("/links/new");
    await page.getByLabel("Original URL").fill("https://example.com/journey");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("Journey link");
    await page.getByLabel("Custom short code").fill("journey");
    await page.getByRole("button", { name: "Create link" }).click();

    await expect(page).toHaveURL(/\/links\/[0-9a-f-]{36}/i);
    await expect(page.getByRole("heading", { name: "Journey link" })).toBeVisible();

    // Redirect / short URL visible (via SHORTLINK_BASE_URL or CORE_URL)
    const shortLink = page.locator('a[href*="/journey"]').first();
    await expect(shortLink).toBeVisible();
    await expect(shortLink).toHaveAttribute("href", /\/journey$/);

    // QR via BFF proxy (not Core origin)
    const qr = page.getByRole("img", { name: "Link QR code" });
    await expect(qr).toBeVisible();
    const qrSrc = await qr.getAttribute("src");
    expect(qrSrc).toMatch(/^\/api\/core\/api\/links\//);

    // Per-link analytics
    await expect(
      page.getByRole("heading", { name: /Link analytics/i }),
    ).toBeVisible();
    await expect(page.getByText("Total clicks")).toBeVisible();

    // Webhook test delivery
    await page.goto("/webhooks");
    await expect(page.getByRole("heading", { name: "Webhooks" })).toBeVisible();
    await page.getByRole("link", { name: "Ops hook" }).click();
    await expect(page.getByRole("heading", { name: "Ops hook" })).toBeVisible();
    await page.getByRole("button", { name: "Send test delivery" }).click();
    await expect(page.getByText("Test delivery accepted.")).toBeVisible();

    // Simulate click
    await page.goto("/debug");
    await expect(page.getByRole("heading", { name: "Debug" })).toBeVisible();
    const linkSelect = page.locator("#linkId");
    const optionLabels = await linkSelect.locator("option").allTextContents();
    const journeyOption = optionLabels.find((t) => /Journey link/i.test(t));
    expect(journeyOption).toBeTruthy();
    await linkSelect.selectOption({ label: journeyOption! });
    await page.getByRole("button", { name: "Simulate" }).click();
    await expect(page.locator("pre").filter({ hasText: "redirectUrl" })).toBeVisible();
    await expect(page.locator("pre").filter({ hasText: "apps.apple.com" })).toBeVisible();
  });
});
