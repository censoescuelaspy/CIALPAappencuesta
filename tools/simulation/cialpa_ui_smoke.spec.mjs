import { expect, test } from '@playwright/test';

const user = process.env.CIALPA_USER || '';
const password = process.env.CIALPA_PASSWORD || '';

test.describe('CIALPA UI smoke', () => {
  test.skip(!user || !password, 'Defina CIALPA_USER y CIALPA_PASSWORD para ejecutar login real.');

  test('abre app, inicia sesion y llega al registro guiado', async ({ page }) => {
    await page.goto('./?sim_ui=1', { waitUntil: 'networkidle' });

    await page.getByLabel(/usuario/i).fill(user);
    await page.getByLabel(/contrase/i).fill(password);
    await page.getByRole('button', { name: /iniciar|ingresar|entrar/i }).click();

    await expect(page.getByText(/registro guiado/i)).toBeVisible();
    await expect(page.getByText(/plano vivo|escuela/i)).toBeVisible();
  });
});
