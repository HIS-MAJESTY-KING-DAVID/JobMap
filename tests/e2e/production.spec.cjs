const { test, expect } = require("@playwright/test");
const { injectAxe, getViolations } = require("axe-playwright");

async function auditAccessibility(page, label) {
  await injectAxe(page);
  const violations = await getViolations(page, null, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
  });
  if (violations.length) {
    console.log(
      `${label} accessibility violations:`,
      JSON.stringify(violations, null, 2),
    );
  }
  expect(violations, `${label} should have no WCAG A/AA violations`).toEqual(
    [],
  );
}

test.describe("JobMap production browser flows", () => {
  test("public Cameroon discovery shell is usable", async ({ page }) => {
    await page.goto("/?audit=public", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/JobMap/);
    await expect(
      page.getByRole("button", { name: /Cameroon Local/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Global Remote/i }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Search title, company, or skill"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /SAVE SEARCH/i }),
    ).toBeVisible();
    await auditAccessibility(page, "public discovery");
  });

  test("remote mode exposes the safe swipe path", async ({ page }) => {
    await page.goto("/?audit=remote", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Global Remote/i }).click();
    await expect(page.getByText(/Global Remote/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Swipe/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Saved/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tracker/i })).toBeVisible();
    await auditAccessibility(page, "remote discovery");
  });

  test("Saved view has a recoverable empty state", async ({ page }) => {
    await page.goto("/?audit=saved", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Saved/i }).click();
    await expect(
      page.getByText(/Saved openings|No saved openings yet/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Discover/i })).toBeVisible();
    await auditAccessibility(page, "saved view");
  });

  test("mobile navigation remains reachable", async ({ page }) => {
    await page.goto("/?audit=mobile", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /Discover/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Profile/i })).toBeVisible();
    await page.getByRole("button", { name: /Profile/i }).click();
    await expect(page.getByText(/Profile/i).first()).toBeVisible();
    await auditAccessibility(page, "mobile profile");
  });
});
