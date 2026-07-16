import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const MODULES = [
  'inicio',
  'arquitectura',
  'mapa',
  'atlas',
  'registro',
  'jornada',
  'encuestadores',
  'incidencias',
  'comentarios',
  'cuestionario-inicial',
  'planificacion',
  'ubicacion',
  'configuracion',
  'estadisticas',
  'infraestructura',
];

const SERIOUS_IMPACT = new Set(['serious', 'critical']);

async function forceLocalDemo(page) {
  await page.route('**/assets/js/config.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const demoSource = source
      .replace(/GAS_URL:\s*'[^']*'/, "GAS_URL: ''")
      .replace(/GAS_FALLBACK_URL:\s*'[^']*'/, "GAS_FALLBACK_URL: ''");
    await route.fulfill({ response, body: demoSource });
  });
}

async function loginAsDemoAdmin(page) {
  await page.goto('./?ui_audit=1', { waitUntil: 'domcontentloaded' });
  await page.locator('#login-usuario').fill('admin');
  await page.locator('#login-password').fill('admin123');
  await page.locator('#login-form button[type="submit"]').click();
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.locator('#sidebar-nav .nav-item[data-module]')).toHaveCount(MODULES.length);
}

async function moduleSnapshot(page, moduleId, outputDir) {
  await page.evaluate(id => AppController.showModule(id), moduleId);
  const panel = page.locator(`#module-${moduleId}`);
  await expect(panel).toBeVisible();
  await page.waitForTimeout(moduleId === 'mapa' || moduleId === 'atlas' ? 1200 : 450);

  const layout = await page.evaluate(id => {
    const panelElement = document.getElementById(`module-${id}`);
    const appHeader = document.getElementById('app-header');
    const headerRect = appHeader?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const candidates = [...document.querySelectorAll('body *')]
      .filter(element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0
          && rect.height > 0
          && style.position !== 'fixed'
          && (rect.right > viewportWidth + 2 || rect.left < -2);
      })
      .slice(0, 20)
      .map(element => ({
        tag: element.tagName.toLowerCase(),
        id: element.id || '',
        className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));
    return {
      bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - viewportWidth,
      panelOverflow: panelElement ? panelElement.scrollWidth - panelElement.clientWidth : null,
      appHeader: appHeader ? {
        background: getComputedStyle(appHeader).backgroundColor,
        display: getComputedStyle(appHeader).display,
        top: Math.round(headerRect.top),
        bottom: Math.round(headerRect.bottom),
        width: Math.round(headerRect.width),
      } : null,
      overflowingElements: candidates,
    };
  }, moduleId);

  const axe = await new AxeBuilder({ page })
    .include(`#module-${moduleId}`)
    .analyze();
  const seriousViolations = axe.violations
    .filter(violation => SERIOUS_IMPACT.has(violation.impact))
    .map(violation => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.length,
      targets: violation.nodes.slice(0, 8).map(node => node.target),
    }));
  const violations = axe.violations.map(violation => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.length,
    targets: violation.nodes.slice(0, 8).map(node => node.target),
  }));

  await page.screenshot({
    path: path.join(outputDir, `${moduleId}.png`),
    animations: 'disabled',
  });

  return {
    moduleId,
    layout,
    violations,
    seriousViolations,
    allViolationCount: axe.violations.length,
  };
}

test.describe('CIALPA integral UI audit', () => {
  test('audits the admin workflow in local demo mode', async ({ page }, testInfo) => {
    test.setTimeout(300000);
    const outputDir = testInfo.outputPath('screens');
    await mkdir(outputDir, { recursive: true });

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('requestfailed', request => {
      failedRequests.push({ url: request.url(), error: request.failure()?.errorText || '' });
    });

    await forceLocalDemo(page);
    await loginAsDemoAdmin(page);

    const results = [];
    for (const moduleId of MODULES) {
      results.push(await moduleSnapshot(page, moduleId, outputDir));
    }

    const report = {
      project: testInfo.project.name,
      viewport: testInfo.project.use.viewport,
      generatedAt: new Date().toISOString(),
      consoleErrors,
      pageErrors,
      failedRequests,
      modules: results,
    };
    await writeFile(testInfo.outputPath('ui-audit.json'), JSON.stringify(report, null, 2), 'utf8');

    expect(pageErrors, JSON.stringify(pageErrors, null, 2)).toEqual([]);
  });

  test('verifies filters, active controls and admin access', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Functional interaction audit runs once on desktop.');
    test.setTimeout(120000);
    await forceLocalDemo(page);
    await loginAsDemoAdmin(page);

    const exactCacheIsolation = await page.evaluate(async () => {
      await CialpaLocalStore.rememberApi('uiAuditRoster', 'GET', {}, { status: 'ok', data: ['legacy'] });
      const exact = await CialpaLocalStore.getApiExact('uiAuditRoster', { client_frame_version: 'RUE_2026_2026-07-16' });
      const offlineFallback = await CialpaLocalStore.getApi('uiAuditRoster', { client_frame_version: 'RUE_2026_2026-07-16' });
      return { exact: Boolean(exact), offlineFallback: offlineFallback?.response?.data?.[0] || '' };
    });
    expect(exactCacheIsolation).toEqual({ exact: false, offlineFallback: 'legacy' });

    await expect(page.locator('#inicio-final')).toHaveText('1');
    await expect(page.locator('#inicio-avance')).toHaveText('20%');

    await page.evaluate(() => AppController.showModule('mapa'));
    const routesButton = page.locator('#map-routes-btn');
    await expect(routesButton).toHaveAttribute('aria-pressed', 'true');
    const activeRouteColor = await routesButton.evaluate(element => getComputedStyle(element).backgroundColor);
    await routesButton.click();
    await expect(routesButton).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => routesButton.evaluate(element => getComputedStyle(element).backgroundColor))
      .not.toBe(activeRouteColor);
    await routesButton.click();
    await expect(routesButton).toHaveAttribute('aria-pressed', 'true');

    const perimetersButton = page.locator('#map-perimeters-btn');
    await expect(perimetersButton).toHaveAttribute('aria-pressed', 'true');
    await perimetersButton.click();
    await expect(perimetersButton).toHaveAttribute('aria-pressed', 'false');
    await perimetersButton.click();
    await expect(perimetersButton).toHaveAttribute('aria-pressed', 'true');

    await page.evaluate(() => {
      APP_CONFIG.PILOT_2026.sampleSize = 2;
      const rows = MapModule.getEscuelas().map((school, index) => ({
        ...school,
        en_muestra_piloto: index < 2 ? 'true' : 'false',
        muestra_piloto: index < 2 ? 'piloto' : '',
        orden_muestra_piloto: index < 2 ? String(index + 1) : '',
      }));
      MapModule.loadMarkers(rows);
      MapModule.populateFilterButtons();
    });
    await expect(page.locator('#map-count-total')).toHaveText('5');

    const pilotButton = page.locator('[data-choice-target="filter-piloto"][data-choice-value="true"]');
    const pilotQuickButton = page.locator('#map-pilot-filter-btn');
    await pilotQuickButton.click();
    await expect(page.locator('#filter-piloto')).toHaveValue('true');
    await expect(pilotButton).toHaveAttribute('aria-pressed', 'true');
    await expect(pilotQuickButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#map-count-total')).toHaveText('2');
    await expect(page.locator('#map-count-summary')).toContainText('Vista filtrada: 2/5 escuelas');
    await page.locator('#map-filter-clear').click();
    await expect(page.locator('#filter-piloto')).toHaveValue('');
    await expect(pilotButton).toHaveAttribute('aria-pressed', 'false');
    await expect(pilotQuickButton).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#map-count-total')).toHaveText('5');

    await page.evaluate(() => AppController.showModule('encuestadores'));
    await page.locator('#module-encuestadores .page-header button[onclick="AdminModule.openNewEncuestador()"]')
      .click();
    await expect(page.locator('#modal-encuestador')).toBeVisible();
    const adminRoleButton = page.locator('[data-choice-target="enc-rol"][data-choice-value="admin"]');
    await adminRoleButton.click();
    await expect(page.locator('#enc-rol')).toHaveValue('admin');
    await expect(adminRoleButton).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Cancelar' }).click();

    await page.evaluate(() => MapModule.startGuidedRegister('ESC_DEMO_CIALPA'));
    await expect(page.locator('#module-registro')).toBeVisible();
    await expect(page.locator('#guided-register-root .guided-register')).toBeVisible();
  });
});
