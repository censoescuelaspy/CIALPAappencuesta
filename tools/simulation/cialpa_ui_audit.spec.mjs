import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SIDEBAR_MODULES = [
  'inicio',
  'arquitectura',
  'mapa',
  'atlas',
  'registro',
  'manual',
  'jornada',
  'encuestadores',
  'incidencias',
  'planificacion',
  'configuracion',
  'estadisticas',
];

const AUDIT_MODULES = [
  'inicio',
  'arquitectura',
  'mapa',
  'atlas',
  'registro',
  'encuesta',
  'mec',
  'plano',
  'jornada',
  'encuestadores',
  'incidencias',
  'comentarios',
  'manual',
  'cuestionario-inicial',
  'planificacion',
  'ubicacion',
  'configuracion',
  'auditoria',
  'estadisticas',
  'infraestructura',
];

const ROLE_SIDEBAR_COUNTS = {
  admin: 12,
  supervisor: 10,
  encuestador: 7,
};

const SERIOUS_IMPACT = new Set(['serious', 'critical']);

async function forceLocalDemo(page, options = {}) {
  await page.route('**/assets/js/config.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    let demoSource = source
      .replace(/GAS_URL:\s*'[^']*'/, "GAS_URL: ''")
      .replace(/GAS_FALLBACK_URL:\s*'[^']*'/, "GAS_FALLBACK_URL: ''");
    if (options.highresIndexPayload) {
      const encoded = Buffer.from(JSON.stringify(options.highresIndexPayload), 'utf8').toString('base64');
      demoSource = demoSource.replace(
        /PLAN_BASEMAP_HIGHRES_INDEX_URL:\s*'[^']*'/,
        `PLAN_BASEMAP_HIGHRES_INDEX_URL: 'data:application/json;base64,${encoded}'`,
      );
    }
    await route.fulfill({ response, body: demoSource });
  });
}

async function submitDemoLogin(page, user, password, role) {
  await page.locator('#login-usuario').fill(user);
  await page.locator('#login-password').fill(password);
  await page.locator('#login-form button[type="submit"]').click();
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.locator('#sidebar-nav .nav-item[data-module]')).toHaveCount(ROLE_SIDEBAR_COUNTS[role]);
  await expect(page.locator('.user-bar__role')).toContainText(role === 'admin' ? 'Admin' : role === 'supervisor' ? 'Supervisor' : 'Encuestador');
}

async function loginAsDemoAdmin(page) {
  await page.goto('./?ui_audit=1', { waitUntil: 'domcontentloaded' });
  await submitDemoLogin(page, 'admin', 'admin123', 'admin');
}

async function returnToLogin(page) {
  await page.evaluate(async () => {
    await Auth.logout();
    AppController.showLoginScreen();
  });
  await expect(page.locator('#login-screen')).toBeVisible();
}

async function moduleSnapshot(page, moduleId, outputDir) {
  await page.evaluate(id => AppController.showModule(id), moduleId);
  const panel = page.locator(`#module-${moduleId}`);
  await expect(panel).toBeVisible();
  await page.waitForTimeout(['mapa', 'atlas', 'registro', 'mec', 'plano'].includes(moduleId) ? 1400 : 450);

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
    const guidedNavButtons = id === 'registro'
      ? [...panelElement.querySelectorAll('.guided-floating-nav button')]
        .filter(button => {
          const rect = button.getBoundingClientRect();
          return !button.hidden && rect.width > 0 && rect.height > 0;
        })
        .map(button => ({
          action: button.dataset.guidedAction || button.textContent.trim(),
          rect: button.getBoundingClientRect(),
        }))
      : [];
    const guidedNavButtonOverlaps = [];
    for (let leftIndex = 0; leftIndex < guidedNavButtons.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < guidedNavButtons.length; rightIndex += 1) {
        const left = guidedNavButtons[leftIndex];
        const right = guidedNavButtons[rightIndex];
        const overlapWidth = Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left);
        const overlapHeight = Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top);
        if (overlapWidth > 1 && overlapHeight > 1) {
          guidedNavButtonOverlaps.push({ left: left.action, right: right.action });
        }
      }
    }
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
      guidedNavButtonOverlaps,
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
  test('shows the surveyor manual and contextual help without retired menu tabs', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await forceLocalDemo(page);
    await loginAsDemoAdmin(page);

    for (const moduleId of ['comentarios', 'cuestionario-inicial', 'ubicacion', 'infraestructura']) {
      await expect(page.locator(`#sidebar-nav .nav-item[data-module="${moduleId}"]`)).toHaveCount(0);
    }
    const manualNav = page.locator('#sidebar-nav .nav-item[data-module="manual"]');
    await expect(manualNav).toHaveCount(1);
    await expect(manualNav).toContainText('Manual del encuestador');
    expect(await page.evaluate(() => ({
      damage: ManualModule.sectionForContext('', 'Daño visible'),
      drainage: ManualModule.sectionForContext('', 'Conexión de desagüe'),
      offline: ManualModule.sectionForContext('', 'Sin conexión'),
    }))).toEqual({ damage: 'danos', drainage: 'sanitarios', offline: 'guardado' });

    await page.evaluate(() => AppController.showModule('manual'));
    await expect(page.locator('#module-manual')).toBeVisible();
    await page.getByRole('button', { name: 'Comenzar el manual' }).click();
    await expect(page.locator('#modal-manual')).toBeVisible();
    await expect(page.locator('#manual-section-flujo')).toBeVisible();
    await page.evaluate(() => {
      const input = document.getElementById('manual-search');
      input.value = 'desagüe';
      ManualModule.search(input.value);
    });
    await expect(page.locator('#manual-section-sanitarios')).toBeVisible();
    await page.locator('#modal-manual .modal__close').click();

    await page.evaluate(() => {
      MapModule.loadMarkers([{
        id_escuela: 'ESC_DEMO_CIALPA',
        codigo: '0000001',
        codigo_local: '0000001',
        nombre: 'Escuela de prueba del manual',
        departamento: 'CENTRAL',
        distrito: 'SAN LORENZO',
        latitud: -25.3,
        longitud: -57.6,
        estado: 'Pendiente',
      }]);
      MapModule.startGuidedRegister('ESC_DEMO_CIALPA');
    });
    await expect(page.locator('#module-registro')).toBeVisible();
    const contextualHelp = page.locator('#guided-register-root .guided-info-note').first();
    await expect(contextualHelp).toBeVisible();
    await contextualHelp.locator('summary').click();
    await expect(contextualHelp.getByRole('button', { name: 'Ver en el manual' })).toBeVisible();
    await contextualHelp.getByRole('button', { name: 'Ver en el manual' }).click();
    await expect(page.locator('#modal-manual')).toBeVisible();
    await expect(page.locator('#modal-manual .manual-nav__item[aria-current="true"]')).toHaveCount(1);
    await expect(page.locator('#manual-search')).toHaveValue('');
    await expect(page.locator('#modal-manual .manual-section[hidden]')).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath(`manual-context-${testInfo.project.name}.png`),
      animations: 'disabled',
    });
    await page.locator('#modal-manual .modal__close').click();

    await page.goto('./manual/index.html#perimetro', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText(/Manual del encuestador/i);
    await expect(page.locator('#perimetro')).toBeVisible();
    await expect(page.getByRole('button', { name: /Imprimir manual/i })).toBeVisible();
  });

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
    for (const moduleId of AUDIT_MODULES) {
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

    const seriousViolations = results.flatMap(result => result.seriousViolations.map(violation => ({
      moduleId: result.moduleId,
      ...violation,
    })));
    const unexpectedFailedRequests = failedRequests.filter(request => !(
      request.error === 'net::ERR_ABORTED'
      && /tile\.openstreetmap\.org/i.test(request.url)
    ));
    const layoutFailures = results
      .filter(result => result.layout.bodyOverflow > 2
        || result.layout.panelOverflow > 2
        || result.layout.guidedNavButtonOverlaps.length)
      .map(result => ({ moduleId: result.moduleId, layout: result.layout }));
    expect(pageErrors, JSON.stringify(pageErrors, null, 2)).toEqual([]);
    expect(consoleErrors, JSON.stringify(consoleErrors, null, 2)).toEqual([]);
    expect(unexpectedFailedRequests, JSON.stringify(unexpectedFailedRequests, null, 2)).toEqual([]);
    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
    expect(layoutFailures, JSON.stringify(layoutFailures, null, 2)).toEqual([]);
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

    await page.evaluate(() => AppController.showModule('registro'));
    await expect(page.locator('[data-guided-finish-pending]')).toBeHidden();
    await expect(page.locator('[data-guided-finish-complete]')).toBeHidden();

    await page.evaluate(() => MapModule.startGuidedRegister('ESC_DEMO_CIALPA'));
    await expect(page.locator('#module-registro')).toBeVisible();
    await expect(page.locator('#guided-register-root .guided-register')).toBeVisible();
    await expect(page.locator('[data-guided-finish-pending]')).toBeVisible();
    await expect(page.locator('[data-guided-finish-complete]')).toBeHidden();
  });

  test('edits an existing perimeter and renders a per-school high-resolution image', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const testImageUrl = 'assets/img/logo.png';
    const highresIndexPayload = {
      schema: 'cialpa_highres_school_index_v1',
      count: 1,
      sources: {
        ESC_DEMO_CIALPA: {
          active: true,
          label: 'Imagen 100 m',
          imageUrl: testImageUrl,
          bounds: {
            west: -57.601,
            south: -25.301,
            east: -57.599,
            north: -25.299,
          },
          attribution: 'Imagen de prueba local',
        },
      },
    };
    await forceLocalDemo(page, { highresIndexPayload });
    await loginAsDemoAdmin(page);

    await page.evaluate(() => {
      MapModule.loadMarkers([{
        id_escuela: 'ESC_DEMO_CIALPA',
        codigo: '0000001',
        codigo_local: '0000001',
        nombre: 'Escuela de prueba cartografica',
        departamento: 'CENTRAL',
        distrito: 'SAN LORENZO',
        latitud: -25.3,
        longitud: -57.6,
        estado: 'Pendiente',
      }]);
      MapModule.startGuidedRegister('ESC_DEMO_CIALPA');
    });
    await expect(page.locator('#module-registro')).toBeVisible();
    await expect(page.locator('#guided-register-root .guided-register')).toBeVisible();
    await page.waitForFunction(() => typeof MecFormModule !== 'undefined');

    const boundaryId = await page.evaluate(() => {
      MecFormModule.updateGuidedSchoolIdentity({
        codigo_local: 'ESC_DEMO_CIALPA',
        latitud: '-25.300000',
        longitud: '-57.600000',
      }, { skipRemoteSync: true });
      const boundary = MecFormModule.ensurePropertyBoundary({ guided: true });
      MecFormModule.savePropertyBoundaryEdit(boundary.id);
      MecFormModule.selectPlanItem(`site::${boundary.id}`);
      return boundary.id;
    });

    const editor = page.locator('[data-property-boundary-state]');
    await expect(editor).toHaveAttribute('data-property-boundary-state', 'fixed');
    await expect(editor.getByRole('button', { name: 'Editar perimetro' })).toBeVisible();

    await editor.getByRole('button', { name: 'Editar perimetro' }).click();
    await expect(editor).toHaveAttribute('data-property-boundary-state', 'editing');
    await expect(editor).toHaveAttribute('data-property-boundary-tool', 'move');
    await expect(editor.getByRole('button', { name: 'Mover completo' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#module-registro [data-school-plan-canvas]')).toHaveClass(/school-plan__canvas--property-move/);

    await editor.getByRole('button', { name: 'Ajustar vertices' }).click();
    await expect(editor).toHaveAttribute('data-property-boundary-tool', 'vertices');
    await expect(editor.getByRole('button', { name: 'Ajustar vertices' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#module-registro [data-school-plan-canvas]')).toHaveClass(/school-plan__canvas--property-vertices/);
    await page.evaluate(id => MecFormModule.addPlanSiteElementVertex(id), boundaryId);
    expect(await page.evaluate(() => MecFormModule.selectPlanItem('school-marker'))).toBe(false);
    await expect(editor).toHaveAttribute('data-property-boundary-state', 'editing');
    await expect(editor).toHaveAttribute('data-property-boundary-tool', 'vertices');
    await editor.getByRole('button', { name: 'Cancelar' }).click();
    await expect(editor).toHaveAttribute('data-property-boundary-state', 'fixed');

    await editor.getByRole('button', { name: 'Editar perimetro' }).click();
    await editor.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(editor).toHaveAttribute('data-property-boundary-state', 'fixed');

    const activatedHighresState = await page.evaluate(async () => {
      await MecFormModule.refreshPlanBaseMapHighresIndex();
      MecFormModule.setPlanBaseMapValue('lat', -25.3);
      MecFormModule.setPlanBaseMapValue('lng', -57.6);
      MecFormModule.setPlanBaseMapSource('highres');
      return MecFormModule.getPlanBaseMapState();
    });
    await writeFile(testInfo.outputPath('highres-activation.json'), JSON.stringify(activatedHighresState, null, 2), 'utf8');
    expect(activatedHighresState.highresAvailable).toBe(true);
    expect(activatedHighresState.source).toBe('highres');

    const highresImage = page.locator('#module-registro img[data-plan-basemap-source="highres"]');
    await expect(highresImage).toHaveCount(1);
    const highresDiagnostic = await highresImage.evaluate(image => ({
      src: image.getAttribute('src'),
      currentSrc: image.currentSrc,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      display: getComputedStyle(image).display,
      outerHTML: image.outerHTML,
      planBaseMap: MecFormModule.getPlanBaseMapState(),
      selectedSchool: MecFormModule.getSelectedSchool(),
    }));
    await writeFile(testInfo.outputPath('highres-image.json'), JSON.stringify(highresDiagnostic, null, 2), 'utf8');
    await expect.poll(() => highresImage.evaluate(image => ({
      loaded: image.complete && image.naturalWidth > 0,
      width: Math.round(image.getBoundingClientRect().width),
      height: Math.round(image.getBoundingClientRect().height),
    }))).toMatchObject({ loaded: true });
    await expect(page.locator('#module-registro img[data-plan-basemap-source="satellite"]').first()).toBeAttached();

    await page.locator('#guided-school-plan-root').screenshot({
      path: testInfo.outputPath(`perimeter-highres-${testInfo.project.name}.png`),
      animations: 'disabled',
    });
  });

  test('uses thinner walls and moves a sanitary nested in a classroom', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Detailed pointer geometry runs once on desktop.');
    test.setTimeout(120000);
    await forceLocalDemo(page);
    await loginAsDemoAdmin(page);

    await page.evaluate(() => {
      MapModule.loadMarkers([{
        id_escuela: 'ESC_PLAN_NESTED',
        codigo: '0000002',
        codigo_local: '0000002',
        nombre: 'Escuela de prueba de plano',
        departamento: 'CENTRAL',
        distrito: 'SAN LORENZO',
        latitud: -25.3,
        longitud: -57.6,
        estado: 'Pendiente',
      }]);
      MapModule.startGuidedRegister('ESC_PLAN_NESTED');
    });
    await page.waitForFunction(() => typeof MecFormModule !== 'undefined');

    const ids = await page.evaluate(() => {
      MecFormModule.updateGuidedSchoolIdentity({
        codigo_local: 'ESC_PLAN_NESTED',
        latitud: '-25.300000',
        longitud: '-57.600000',
      }, { skipRemoteSync: true });
      MecFormModule.newBlock();
      let values = MecFormModule.buildFinalDeliveryPackage().values;
      const blockId = values.__blocks.at(-1).id;
      MecFormModule.addPlanFloor(blockId);
      MecFormModule.newPlanClassroom();
      values = MecFormModule.buildFinalDeliveryPackage().values;
      const roomId = values.__classrooms.at(-1).id;
      MecFormModule.selectPlanItem(`room::${roomId}`);
      MecFormModule.resizeSelectedPlanItem('both', 1.65);
      MecFormModule.addPlanSanitary();
      values = MecFormModule.buildFinalDeliveryPackage().values;
      const sanitaryId = values.__sanitaries.at(-1).id;
      MecFormModule.addSanitaryFixture(sanitaryId, 'toilet');
      values = MecFormModule.buildFinalDeliveryPackage().values;
      const sanitary = values.__sanitaries.find(item => item.id === sanitaryId);
      const fixtureId = sanitary.objects.find(object => object.type === 'toilet').id;

      MecFormModule.renderSchoolPlan();
      let snapshot = MecFormModule.getPlanInteractionSnapshot();
      const roomArea = snapshot.areas.find(area => area.id === `room::${roomId}` && area.type === 'room');
      const sanitaryArea = snapshot.areas.find(area => area.id === `sanitary::${sanitaryId}` && area.type === 'sanitary');
      MecFormModule.selectPlanItem(`sanitary::${sanitaryId}`);
      MecFormModule.nudgeSelectedPlanItem(
        roomArea.x + roomArea.w / 2 - sanitaryArea.x - sanitaryArea.w / 2,
        roomArea.y + roomArea.h / 2 - sanitaryArea.y - sanitaryArea.h / 2,
      );
      MecFormModule.selectPlanItem(`room::${roomId}`);
      snapshot = MecFormModule.getPlanInteractionSnapshot();
      return { blockId, roomId, sanitaryId, fixtureId, snapshot };
    });

    await page.waitForTimeout(220);
    await page.evaluate(() => {
      MecFormModule.closePlanBlockFicha();
      MecFormModule.closePlanFloorFicha();
      MecFormModule.closeSanitaryObjectFicha();
      MecFormModule.renderSchoolPlan();
    });

    const roomArea = ids.snapshot.areas.find(area => area.id === `room::${ids.roomId}` && area.type === 'room');
    const sanitaryArea = ids.snapshot.areas.find(area => area.id === `sanitary::${ids.sanitaryId}` && area.type === 'sanitary');
    const fixtureArea = ids.snapshot.areas.find(area => area.id === `sanitary::${ids.sanitaryId}::${ids.fixtureId}`);
    expect(ids.snapshot.wallThickness).toEqual({
      plan: 2.5,
      roomSketch: 4,
      selectedRoomSketch: 5,
      context: 3.5,
      sanitarySketch: 1.5,
    });
    expect(roomArea).toBeTruthy();
    expect(sanitaryArea).toBeTruthy();
    expect(fixtureArea).toBeTruthy();
    expect(
      sanitaryArea.x < roomArea.x + roomArea.w &&
      sanitaryArea.x + sanitaryArea.w > roomArea.x &&
      sanitaryArea.y < roomArea.y + roomArea.h &&
      sanitaryArea.y + sanitaryArea.h > roomArea.y,
    ).toBe(true);

    const before = await page.evaluate(sanitaryId => {
      const item = MecFormModule.buildFinalDeliveryPackage().values.__sanitaries.find(entry => entry.id === sanitaryId);
      const shell = item.objects.find(object => object.type === 'sanitary-room');
      return { x: shell.x, y: shell.y };
    }, ids.sanitaryId);

    const canvas = page.locator('#guided-school-plan-root [data-school-plan-canvas]').first();
    await canvas.scrollIntoViewIfNeeded();
    const canvasBox = await canvas.boundingBox();
    const canvasSize = await canvas.evaluate(element => ({ width: element.width, height: element.height }));
    expect(canvasBox).toBeTruthy();
    const startX = canvasBox.x + ((fixtureArea.x + fixtureArea.w / 2) / canvasSize.width) * canvasBox.width;
    const startY = canvasBox.y + ((fixtureArea.y + fixtureArea.h / 2) / canvasSize.height) * canvasBox.height;
    const deltaX = (32 / canvasSize.width) * canvasBox.width;
    const deltaY = (18 / canvasSize.height) * canvasBox.height;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);

    const after = await page.evaluate(sanitaryId => {
      const item = MecFormModule.buildFinalDeliveryPackage().values.__sanitaries.find(entry => entry.id === sanitaryId);
      const shell = item.objects.find(object => object.type === 'sanitary-room');
      return { x: shell.x, y: shell.y };
    }, ids.sanitaryId);
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(2);
    await page.locator('#guided-school-plan-root').screenshot({
      path: testInfo.outputPath('nested-sanitary-thin-walls.png'),
      animations: 'disabled',
    });
  });

  test('enforces role boundaries and first-access credentials', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Role audit runs once on desktop.');
    test.setTimeout(120000);
    await forceLocalDemo(page);
    await page.goto('./?role_audit=1', { waitUntil: 'domcontentloaded' });

    await page.locator('#login-usuario').fill('juan.perez');
    await page.locator('#login-password').fill('abcdef');
    await page.locator('#login-form button[type="submit"]').click();
    await expect(page.locator('#login-error')).toContainText(/num.rica de 6 d.gitos/i);

    await submitDemoLogin(page, 'juan.perez', '123456', 'encuestador');
    await expect(page.locator('#admin-alerts-btn')).toHaveCount(0);
    const surveyorAccess = await page.evaluate(() => ({
      own: Auth.canOperateSchool({ id_escuela: 'ESC_OWN', encuestador_asignado: 'juan.perez' }),
      other: Auth.canOperateSchool({ id_escuela: 'ESC_OTHER', encuestador_asignado: 'otro.usuario' }),
    }));
    expect(surveyorAccess).toEqual({ own: true, other: false });
    await page.evaluate(() => AppController.showModule('atlas'));
    await expect(page.locator('#module-inicio')).toBeVisible();
    await page.evaluate(() => AppController.showModule('registro'));
    await expect(page.locator('#module-registro')).toBeVisible();

    await returnToLogin(page);
    await submitDemoLogin(page, 'supervisor', 'sup123', 'supervisor');
    await page.evaluate(() => AppController.showModule('atlas'));
    await expect(page.locator('#module-atlas')).toBeVisible();
    await page.evaluate(() => AppController.showModule('configuracion'));
    await expect(page.locator('#module-inicio')).toBeVisible();

    await returnToLogin(page);
    await submitDemoLogin(page, 'admin', 'admin123', 'admin');
    await expect(page.locator('#admin-alerts-btn')).toBeVisible();
    await page.evaluate(() => AppController.showModule('auditoria'));
    await expect(page.locator('#module-auditoria')).toBeVisible();
  });

  test('supports demo account registration and password recovery', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Account lifecycle audit runs once on desktop.');
    test.setTimeout(120000);
    await forceLocalDemo(page);
    await page.goto('./?account_audit=1', { waitUntil: 'domcontentloaded' });
    const username = `prueba.ui.${Date.now()}`;
    const email = `${username}@example.test`;

    await page.locator('[data-auth-panel="register"]').click();
    await page.locator('#register-usuario').fill(username);
    await page.locator('#register-nombres').fill('Prueba');
    await page.locator('#register-apellidos').fill('Automatizada');
    await page.locator('#register-correo').fill(email);
    await page.locator('#register-password').fill('clave123');
    await page.locator('#register-password-confirm').fill('otra123');
    await page.locator('#register-form button[type="submit"]').click();
    await expect(page.locator('#login-error')).toContainText(/no coinciden/i);

    await page.locator('#register-password-confirm').fill('clave123');
    await page.locator('#register-form button[type="submit"]').click();
    await expect(page.locator('#app-shell')).toBeVisible();
    await expect(page.locator('#sidebar-nav .nav-item[data-module]')).toHaveCount(ROLE_SIDEBAR_COUNTS.encuestador);

    await returnToLogin(page);
    await page.locator('[data-auth-panel="recover"]').click();
    await page.locator('#recover-usuario').fill(username);
    await page.locator('#recover-correo').fill(email);
    await page.locator('#recover-password').fill('nueva456');
    await page.locator('#recover-password-confirm').fill('nueva456');
    await page.locator('#recover-form button[type="submit"]').click();
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#login-error')).toContainText(/actualizada/i);
    await submitDemoLogin(page, username, 'nueva456', 'encuestador');
  });

  test('restores a finalized school draft and keeps its local changes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Draft persistence audit runs once on desktop.');
    test.setTimeout(180000);
    await forceLocalDemo(page);
    await loginAsDemoAdmin(page);
    await page.evaluate(() => AppController.showModule('mapa'));
    await expect(page.locator('#map-count-total')).toHaveText('5');

    await page.evaluate(() => MapModule.startGuidedRegister('ESC_0011007'));
    await expect(page.locator('#guided-register-root .guided-register')).toBeVisible();
    const restored = await page.evaluate(() => {
      const draft = JSON.parse(localStorage.getItem('cialpa_mec_form_draft_v1') || '{}');
      const values = draft.values || {};
      return {
        code: values.__selectedSchool?.codigo_local || '',
        blocks: values.__blocks?.length || 0,
        classrooms: values.__classrooms?.length || 0,
        sanitaries: values.__sanitaries?.length || 0,
      };
    });
    expect(restored).toEqual({ code: '0011007', blocks: 3, classrooms: 7, sanitaries: 4 });

    await page.evaluate(() => {
      MecFormModule.updateGuidedSchoolIdentity({
        ...MecFormModule.getSelectedSchool(),
        direccion: 'Persistencia automatizada v2.6.211',
      }, { skipRemoteSync: true });
    });
    await page.evaluate(() => AppController.showModule('mapa'));
    await page.evaluate(() => MapModule.startGuidedRegister('ESC_0011007'));
    await expect(page.locator('#guided-register-root .guided-register')).toBeVisible();
    const reopened = await page.evaluate(() => {
      const draft = JSON.parse(localStorage.getItem('cialpa_mec_form_draft_v1') || '{}');
      return {
        code: draft.values?.__selectedSchool?.codigo_local || '',
        address: draft.values?.general?.direccion || '',
        blocks: draft.values?.__blocks?.length || 0,
      };
    });
    expect(reopened).toEqual({ code: '0011007', address: 'Persistencia automatizada v2.6.211', blocks: 3 });

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(page.url()).origin,
    });
    await page.evaluate(() => MecFormModule.exportJson());
    await expect(page.locator('.toast').filter({ hasText: /JSON copiado/i }).last()).toBeVisible();
    const exported = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
    expect(exported.values?.__selectedSchool?.codigo_local).toBe('0011007');
    expect(exported.values?.general?.direccion).toBe('Persistencia automatizada v2.6.211');

    const geometry = await page.evaluate(() => GeoMeasure.measurePolygon([
      { lat: -25.3, lng: -57.6 },
      { lat: -25.3, lng: -57.5999 },
      { lat: -25.2999, lng: -57.5999 },
      { lat: -25.2999, lng: -57.6 },
    ]));
    expect(geometry.valid).toBe(true);
    expect(geometry.sides).toHaveLength(4);
    expect(geometry.perimeter_m).toBeGreaterThan(35);
    expect(geometry.perimeter_m).toBeLessThan(50);
    expect(geometry.area_m2).toBeGreaterThan(90);
    expect(geometry.area_m2).toBeLessThan(140);
  });

  test('submits demo comments, incidents and admin user changes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Write-flow audit runs once on desktop.');
    test.setTimeout(120000);
    await forceLocalDemo(page);
    await loginAsDemoAdmin(page);

    const title = `Comentario automatizado ${Date.now()}`;
    await page.evaluate(() => AppController.showModule('comentarios'));
    await page.locator('[data-choice-target="feedback-categoria"][data-choice-value="error"]').click();
    await page.locator('[data-choice-target="feedback-prioridad"][data-choice-value="alta"]').click();
    await page.locator('#feedback-titulo').fill(title);
    await page.locator('#feedback-descripcion').fill('Prueba controlada del flujo de comentarios en modo demo.');
    await page.locator('#feedback-form button[type="submit"]').click();
    await expect(page.locator('#feedback-tbody')).toContainText(title);
    await expect(page.locator('#feedback-tbody')).toContainText(/pendiente/i);

    await page.evaluate(() => IncidenciasModule.openNew('ESC_DEMO_CIALPA'));
    await expect(page.locator('#modal-incidencia')).toBeVisible();
    await page.locator('[data-choice-target="inc-tipo"][data-choice-value^="Problema"]').click();
    await page.locator('#form-incidencia textarea[name="descripcion"]').fill('Incidencia automatizada sin escritura en produccion.');
    await page.getByRole('button', { name: 'Registrar Incidencia' }).click();
    await expect(page.locator('.toast--success').filter({ hasText: /incidencia registrada/i }).last()).toBeVisible();

    await page.evaluate(() => AppController.showModule('encuestadores'));
    await page.locator('#module-encuestadores .page-header button[onclick="AdminModule.openNewEncuestador()"]')
      .click();
    const form = page.locator('#form-encuestador');
    await form.locator('[name="usuario"]').fill(`enc.ui.${Date.now()}`);
    await form.locator('[name="nombres"]').fill('Encuestador');
    await form.locator('[name="apellidos"]').fill('Prueba');
    await form.locator('[name="password"]').fill('123456');
    await page.locator('[data-choice-target="enc-rol"][data-choice-value="supervisor"]').click();
    await page.locator('#modal-encuestador .modal__footer').getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('#modal-encuestador')).toBeHidden();
    await expect(page.locator('.toast--success').filter({ hasText: /encuestador creado/i }).last()).toBeVisible();
  });

  test('filters and navigates a synthetic 5448-school map', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Full-roster map audit runs once on desktop.');
    test.setTimeout(240000);
    await forceLocalDemo(page);
    await loginAsDemoAdmin(page);
    await page.evaluate(() => AppController.showModule('mapa'));
    await expect(page.locator('#map-count-total')).toHaveText('5');

    const loadResult = await page.evaluate(async () => {
      const payload = await fetch(`assets/data/r01-schools-public.json?full_roster_audit=${Date.now()}`).then(response => response.json());
      const departments = [...new Set(payload.schools.map(row => row[2]))].sort();
      let pilotOrder = 0;
      const states = ['pendiente', 'en_curso', 'finalizada', 'incidencia'];
      const zones = ['Urbana', 'Rural', 'Rural Remota'];
      const rows = payload.schools.map((row, index) => {
        const departmentIndex = departments.indexOf(row[2]);
        const eligiblePilot = row[2] === 'CAPITAL' || row[2] === 'CENTRAL';
        const isPilot = eligiblePilot && pilotOrder < 86;
        if (isPilot) pilotOrder += 1;
        return {
          id_escuela: `ESC_${row[0]}`,
          codigo_local: row[0],
          nombre: row[1],
          departamento: row[2],
          distrito: row[3],
          localidad: row[4],
          zona: zones[index % zones.length],
          estado_relevamiento: states[index % states.length],
          latitud: -27.25 + (departmentIndex % 6) * 1.35 + (index % 31) * 0.001,
          longitud: -61.7 + Math.floor(departmentIndex / 6) * 1.85 + (index % 37) * 0.001,
          en_muestra_piloto: isPilot ? 'true' : 'false',
          orden_muestra_piloto: isPilot ? String(pilotOrder) : '',
        };
      });
      APP_CONFIG.PILOT_2026.sampleSize = 86;
      const started = performance.now();
      MapModule.loadMarkers(rows);
      MapModule.populateFilterButtons();
      return {
        rows: rows.length,
        pilot: pilotOrder,
        capital: rows.filter(row => row.departamento === 'CAPITAL').length,
        durationMs: Math.round(performance.now() - started),
      };
    });
    expect(loadResult.rows).toBe(5448);
    expect(loadResult.pilot).toBe(86);
    expect(loadResult.capital).toBe(126);
    expect(loadResult.durationMs).toBeLessThan(30000);
    await expect(page.locator('#map-count-total')).toHaveText('5448');
    await expect(page.locator('#map-count-summary')).toContainText('Vista general: 5448 escuelas');
    const renderedItems = await page.locator('#map-school-list .map-list-item').count();
    expect(renderedItems).toBeGreaterThan(0);
    expect(renderedItems).toBeLessThanOrEqual(250);

    await page.locator('#map-pilot-filter-btn').click();
    await expect(page.locator('#map-count-total')).toHaveText('86');
    await page.locator('#map-filter-clear').click();
    await expect(page.locator('#map-count-total')).toHaveText('5448');

    await page.locator('#filter-departamento').selectOption('CAPITAL');
    await page.locator('#map-filter-apply').click();
    await expect(page.locator('#map-count-total')).toHaveText('126');
    await page.getByRole('button', { name: 'Escuela siguiente filtrada' }).click();
    await expect(page.locator('#map-jump-state')).toContainText('1/126');

    await page.locator('#map-filter-clear').click();
    await page.locator('#filter-search').fill('1701006');
    await page.locator('#map-filter-apply').click();
    await expect(page.locator('#map-count-total')).toHaveText('1');
  });

  test('renders and prepares the national map-only print view', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Atlas print audit runs once on desktop.');
    test.setTimeout(120000);
    await forceLocalDemo(page);
    await loginAsDemoAdmin(page);
    await page.evaluate(() => AppController.showModule('atlas'));
    await page.locator('[data-atlas-mode="choropleth"]').click();
    await expect(page.locator('#atlas-map .atlas-choropleth-svg')).toBeVisible();
    await expect(page.locator('#atlas-print-map-only-btn')).toBeVisible();
    await page.evaluate(() => {
      window.__atlasPrintCalls = 0;
      window.print = () => { window.__atlasPrintCalls += 1; };
    });
    await page.locator('#atlas-print-map-only-btn').click();
    await expect.poll(() => page.evaluate(() => window.__atlasPrintCalls)).toBeGreaterThan(0);
    await expect(page.locator('#atlas-print-root .atlas-print-page--map-only')).toHaveCount(1);
  });

  test('loads the public questionnaire roster through its safe fallback', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Public questionnaire audit runs once on desktop.');
    test.setTimeout(120000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`./cuestionario_inicial/?public_roster_audit=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#initial-school-hint')).toContainText('5448 escuelas', { timeout: 60000 });
    await expect(page.locator('#initial-school-options option')).toHaveCount(5448);
    await page.locator('#initial-school-search').fill('1701006');
    await page.locator('#initial-school-search').press('Tab');
    await expect(page.locator('[data-school-code]')).toHaveValue('1701006');
    await expect(page.locator('[name="nombre_escuela"]')).not.toHaveValue('');
    await expect(page.locator('[data-territory="departamento"]')).toHaveValue(/alto paraguay/i);
    expect(pageErrors).toEqual([]);
  });

  test('keeps the installed app shell usable offline', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chrome', 'Offline PWA audit runs once on desktop.');
    test.setTimeout(180000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`./?offline_audit=${Date.now()}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    }, null, { timeout: 60000 });
    if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
      await page.reload({ waitUntil: 'networkidle' });
    }
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 30000 });

    try {
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await expect(page.locator('#login-screen')).toBeVisible();
      await expect(page.locator('.app-version').first()).toHaveText('v2.6.211');
      const offlineState = await page.evaluate(() => ({
        online: navigator.onLine,
        leaflet: typeof window.L === 'object',
        lucide: typeof window.lucide === 'object',
        appController: typeof AppController === 'object',
      }));
      expect(offlineState).toEqual({ online: false, leaflet: true, lucide: true, appController: true });
      const offlineResources = await page.evaluate(async () => {
        const [indexResponse, manualResponse] = await Promise.all([
          fetch('assets/data/highres-school-index.json'),
          fetch('manual/index.html'),
        ]);
        const index = await indexResponse.json();
        const manual = await manualResponse.text();
        return {
          indexOk: indexResponse.ok,
          indexSchema: index.schema || '',
          manualOk: manualResponse.ok,
          manualHasTitle: /Manual del Encuestador/i.test(manual),
        };
      });
      expect(offlineResources).toEqual({
        indexOk: true,
        indexSchema: 'cialpa_highres_school_index_v1',
        manualOk: true,
        manualHasTitle: true,
      });
    } finally {
      await context.setOffline(false);
    }
    expect(pageErrors).toEqual([]);
  });
});
