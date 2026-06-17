import { test, expect } from "@playwright/test";

test.describe("Smoke conferência / login", () => {
  test("página de login exibe formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("ERP SABOR DA TERRA")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByLabel("Digite seu usuario")).toBeVisible();
    await expect(page.getByLabel("Digite sua senha")).toBeVisible();
  });

  test("rota de conferência sem sessão redireciona para login", async ({ page }) => {
    await page.goto("/conference");
    await expect(page).toHaveURL(/\/login/);
  });
});
