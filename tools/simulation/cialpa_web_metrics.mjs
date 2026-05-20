#!/usr/bin/env node
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'metrics');

const VIEWPORTS = {
  desktop: {
    label: 'Escritorio',
    viewport: { width: 1366, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
  },
  tablet: {
    label: 'Tablet',
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: false,
  },
  mobile: {
    label: 'Movil',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  },
};

function printHelp() {
  console.log(`
CIALPA web metrics

Uso:
  node tools/simulation/cialpa_web_metrics.mjs [opciones]

Opciones:
  --url=URL              URL de la app web. Default: APP_CONFIG.PUBLIC_URL.
  --viewport=NOMBRE     desktop, tablet, mobile o all. Default: all.
  --timeout-ms=N        Timeout de navegacion. Default: 90000.
  --wait-ms=N           Espera posterior a load/networkidle. Default: 3000.
  --output-dir=RUTA     Carpeta de salida. Default: tools/simulation/metrics.
  --cache-bust          Agrega parametro de tiempo a la URL medida.
  --no-service-worker   Bloquea Service Worker para medir carga directa.
  --help                Muestra esta ayuda.

Salida:
  - JSON completo con eventos, recursos y estado DOM.
  - Markdown resumido para lectura operativa.
`);
}

function parseArgs(argv) {
  const args = {
    url: process.env.CIALPA_APP_URL || '',
    viewport: process.env.CIALPA_METRICS_VIEWPORT || 'all',
    timeoutMs: Number(process.env.CIALPA_METRICS_TIMEOUT_MS || 90000),
    waitMs: Number(process.env.CIALPA_METRICS_WAIT_MS || 3000),
    outputDir: process.env.CIALPA_METRICS_OUTPUT_DIR || DEFAULT_OUTPUT_DIR,
    cacheBust: false,
    noServiceWorker: false,
    help: false,
  };

  for (const rawArg of argv) {
    const arg = rawArg.trim();
    if (!arg) continue;
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    if (arg === '--cache-bust') {
      args.cacheBust = true;
      continue;
    }
    if (arg === '--no-service-worker' || arg === '--no-sw') {
      args.noServiceWorker = true;
      continue;
    }
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) {
      throw new Error(`Opcion no reconocida: ${arg}`);
    }
    const [, key, value] = match;
    if (key === 'url') args.url = value;
    else if (key === 'viewport') args.viewport = value;
    else if (key === 'timeout-ms') args.timeoutMs = Number(value);
    else if (key === 'wait-ms') args.waitMs = Number(value);
    else if (key === 'output-dir') args.outputDir = value;
    else throw new Error(`Opcion no reconocida: --${key}`);
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error('--timeout-ms debe ser un numero positivo');
  }
  if (!Number.isFinite(args.waitMs) || args.waitMs < 0) {
    throw new Error('--wait-ms debe ser un numero positivo o cero');
  }
  if (args.viewport !== 'all' && !VIEWPORTS[args.viewport]) {
    throw new Error('--viewport debe ser desktop, tablet, mobile o all');
  }
  return args;
}

function matchConfigString(source, key) {
  const re = new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`);
  return source.match(re)?.[1] || '';
}

async function readAppConfig() {
  const configPath = path.join(ROOT_DIR, 'assets', 'js', 'config.js');
  const source = await fs.readFile(configPath, 'utf8');
  return {
    path: configPath,
    version: matchConfigString(source, 'VERSION'),
    editionLabel: matchConfigString(source, 'EDITION_LABEL'),
    publicUrl: matchConfigString(source, 'PUBLIC_URL'),
    gasUrl: matchConfigString(source, 'GAS_URL'),
  };
}

function addMetricParam(rawUrl, enabled) {
  if (!enabled) return rawUrl;
  const url = new URL(rawUrl);
  url.searchParams.set('_metrics', String(Date.now()));
  return url.toString();
}

function roundMs(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

function bytesToHuman(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
}

function cleanUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    for (const sensitive of ['token', 'password', 'pass', 'pwd', 'auth']) {
      if (url.searchParams.has(sensitive)) url.searchParams.set(sensitive, '[redacted]');
    }
    return url.toString();
  } catch (error) {
    return rawUrl;
  }
}

function statusBucket(status) {
  if (!status) return 'sin_status';
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500 && status < 600) return '5xx';
  return 'otro';
}

function groupCount(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || 'sin_dato';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function summarizeNetwork(events) {
  const completed = events.filter(item => item.status);
  const failed = events.filter(item => item.failed);
  const totalResponseBodyBytes = events.reduce((sum, item) => sum + (item.sizes?.responseBodySize || 0), 0);
  const totalTransferBytes = events.reduce((sum, item) => sum + (item.sizes?.responseHeadersSize || 0) + (item.sizes?.responseBodySize || 0), 0);
  const statusBuckets = groupCount(events, item => item.failed ? 'fallidas' : statusBucket(item.status));
  const byResourceType = groupCount(events, item => item.resourceType);
  const slowest = [...completed]
    .filter(item => Number.isFinite(item.durationMs))
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 12)
    .map(item => ({
      url: cleanUrl(item.url),
      method: item.method,
      resourceType: item.resourceType,
      status: item.status,
      durationMs: item.durationMs,
      fromServiceWorker: Boolean(item.fromServiceWorker),
      responseBodyBytes: item.sizes?.responseBodySize || 0,
    }));
  const largest = [...completed]
    .sort((a, b) => (b.sizes?.responseBodySize || 0) - (a.sizes?.responseBodySize || 0))
    .slice(0, 12)
    .map(item => ({
      url: cleanUrl(item.url),
      resourceType: item.resourceType,
      status: item.status,
      durationMs: item.durationMs,
      responseBodyBytes: item.sizes?.responseBodySize || 0,
    }));
  const issues = events
    .filter(item => item.failed || (item.status && item.status >= 400))
    .map(item => ({
      url: cleanUrl(item.url),
      method: item.method,
      resourceType: item.resourceType,
      status: item.status || null,
      failure: item.failure || null,
      durationMs: item.durationMs || null,
    }));
  return {
    total: events.length,
    completed: completed.length,
    failed: failed.length,
    statusBuckets,
    byResourceType,
    totalResponseBodyBytes,
    totalTransferBytes,
    totalResponseBodyHuman: bytesToHuman(totalResponseBodyBytes),
    totalTransferHuman: bytesToHuman(totalTransferBytes),
    slowest,
    largest,
    issues,
  };
}

async function collectPageState(page) {
  return page.evaluate(async () => {
    const round = value => Number.isFinite(value) ? Math.round(value) : null;
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    const navigation = navigationEntry ? {
      type: navigationEntry.type,
      startTime: round(navigationEntry.startTime),
      redirectTimeMs: round(navigationEntry.redirectEnd - navigationEntry.redirectStart),
      dnsMs: round(navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart),
      connectMs: round(navigationEntry.connectEnd - navigationEntry.connectStart),
      requestMs: round(navigationEntry.responseStart - navigationEntry.requestStart),
      responseMs: round(navigationEntry.responseEnd - navigationEntry.responseStart),
      ttfbMs: round(navigationEntry.responseStart - navigationEntry.requestStart),
      domInteractiveMs: round(navigationEntry.domInteractive),
      domContentLoadedMs: round(navigationEntry.domContentLoadedEventEnd),
      loadMs: round(navigationEntry.loadEventEnd),
      durationMs: round(navigationEntry.duration),
      transferSize: navigationEntry.transferSize || 0,
      encodedBodySize: navigationEntry.encodedBodySize || 0,
      decodedBodySize: navigationEntry.decodedBodySize || 0,
    } : null;

    const paints = {};
    for (const entry of performance.getEntriesByType('paint')) {
      paints[entry.name] = round(entry.startTime);
    }

    const resources = performance.getEntriesByType('resource').map(entry => ({
      name: entry.name,
      initiatorType: entry.initiatorType || 'other',
      durationMs: round(entry.duration),
      startTimeMs: round(entry.startTime),
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
    }));
    const resourceByType = {};
    for (const resource of resources) {
      const type = resource.initiatorType || 'other';
      if (!resourceByType[type]) {
        resourceByType[type] = {
          count: 0,
          transferSize: 0,
          encodedBodySize: 0,
          decodedBodySize: 0,
          maxDurationMs: 0,
        };
      }
      resourceByType[type].count += 1;
      resourceByType[type].transferSize += resource.transferSize || 0;
      resourceByType[type].encodedBodySize += resource.encodedBodySize || 0;
      resourceByType[type].decodedBodySize += resource.decodedBodySize || 0;
      resourceByType[type].maxDurationMs = Math.max(resourceByType[type].maxDurationMs, resource.durationMs || 0);
    }

    const slowResources = [...resources]
      .sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))
      .slice(0, 12);

    const visibleModuleIds = [...document.querySelectorAll('.module-panel--active')]
      .map(el => el.id)
      .filter(Boolean);
    const appVersionTexts = [...document.querySelectorAll('.app-version')]
      .map(el => (el.textContent || '').trim())
      .filter(Boolean);
    const bodyText = document.body?.innerText || '';

    const dom = {
      title: document.title,
      url: location.href,
      bodyTextLength: bodyText.length,
      modulePanels: document.querySelectorAll('.module-panel').length,
      activeModules: visibleModuleIds,
      scripts: document.scripts.length,
      stylesheets: document.styleSheets.length,
      images: document.images.length,
      canvases: document.querySelectorAll('canvas').length,
      buttons: document.querySelectorAll('button').length,
      inputs: document.querySelectorAll('input, textarea').length,
      appVersionTexts,
      loginVisible: Boolean(document.querySelector('#login-screen, .login-screen, [data-login-screen]')),
    };

    const serviceWorker = {
      supported: 'serviceWorker' in navigator,
      controller: false,
      registrations: [],
      error: null,
    };
    if (serviceWorker.supported) {
      serviceWorker.controller = Boolean(navigator.serviceWorker.controller);
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        serviceWorker.registrations = registrations.map(reg => ({
          scope: reg.scope,
          active: reg.active?.state || null,
          installing: reg.installing?.state || null,
          waiting: reg.waiting?.state || null,
        }));
      } catch (error) {
        serviceWorker.error = error.message;
      }
    }

    let cacheKeys = [];
    try {
      if ('caches' in window) cacheKeys = await caches.keys();
    } catch (error) {
      cacheKeys = [`ERROR: ${error.message}`];
    }

    const storage = {
      localStorageKeys: [],
      sessionStorageKeys: [],
    };
    try {
      storage.localStorageKeys = Object.keys(localStorage).sort();
    } catch (error) {
      storage.localStorageKeys = [`ERROR: ${error.message}`];
    }
    try {
      storage.sessionStorageKeys = Object.keys(sessionStorage).sort();
    } catch (error) {
      storage.sessionStorageKeys = [`ERROR: ${error.message}`];
    }

    const connection = navigator.connection ? {
      effectiveType: navigator.connection.effectiveType || null,
      downlink: navigator.connection.downlink || null,
      rtt: navigator.connection.rtt || null,
      saveData: Boolean(navigator.connection.saveData),
    } : null;

    return {
      navigation,
      paints,
      resources: {
        total: resources.length,
        byInitiatorType: resourceByType,
        slowest: slowResources,
      },
      dom,
      serviceWorker,
      cacheKeys,
      storage,
      connection,
    };
  });
}

async function measureViewport(browser, targetUrl, viewportName, viewportConfig, args) {
  const context = await browser.newContext({
    ...viewportConfig,
    serviceWorkers: args.noServiceWorker ? 'block' : 'allow',
  });
  const page = await context.newPage();
  const networkEvents = [];
  const requestRecords = new Map();
  const eventTasks = [];
  const consoleMessages = [];
  const pageErrors = [];
  let requestId = 0;

  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });
  page.on('pageerror', error => {
    pageErrors.push({
      name: error.name,
      message: error.message,
      stack: error.stack || '',
    });
  });
  page.on('request', request => {
    const record = {
      id: ++requestId,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      startedAt: new Date().toISOString(),
      startedAtNodeMs: performance.now(),
      status: null,
      durationMs: null,
      fromServiceWorker: false,
      failed: false,
      failure: null,
      sizes: null,
    };
    requestRecords.set(request, record);
    networkEvents.push(record);
  });
  page.on('response', response => {
    const request = response.request();
    const record = requestRecords.get(request);
    if (!record) return;
    record.status = response.status();
    record.fromServiceWorker = response.fromServiceWorker();
  });
  page.on('requestfailed', request => {
    const record = requestRecords.get(request);
    if (!record) return;
    record.failed = true;
    record.failure = request.failure()?.errorText || 'request failed';
    record.durationMs = roundMs(performance.now() - record.startedAtNodeMs);
  });
  page.on('requestfinished', request => {
    const record = requestRecords.get(request);
    if (!record) return;
    const task = (async () => {
      record.durationMs = roundMs(performance.now() - record.startedAtNodeMs);
      try {
        record.sizes = await request.sizes();
      } catch (error) {
        record.sizes = null;
      }
    })();
    eventTasks.push(task);
  });

  const startedAt = new Date().toISOString();
  const navigationStartNodeMs = performance.now();
  let gotoStatus = null;
  let gotoError = null;
  let loadStateError = null;
  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: args.timeoutMs,
    });
    gotoStatus = response?.status() || null;
    await page.waitForLoadState('load', { timeout: Math.min(args.timeoutMs, 30000) }).catch(error => {
      loadStateError = `load: ${error.message}`;
    });
    await page.waitForLoadState('networkidle', { timeout: Math.min(args.timeoutMs, 15000) }).catch(error => {
      loadStateError = loadStateError || `networkidle: ${error.message}`;
    });
    if (args.waitMs > 0) await page.waitForTimeout(args.waitMs);
  } catch (error) {
    gotoError = error.message;
  }

  await Promise.allSettled(eventTasks);
  const endedAt = new Date().toISOString();
  const state = await collectPageState(page).catch(error => ({ error: error.message }));
  await context.close();

  const consoleSummary = {
    total: consoleMessages.length,
    byType: groupCount(consoleMessages, item => item.type),
    errors: consoleMessages.filter(item => item.type === 'error'),
    warnings: consoleMessages.filter(item => item.type === 'warning'),
  };
  const networkSummary = summarizeNetwork(networkEvents);

  return {
    viewport: {
      name: viewportName,
      label: viewportConfig.label,
      width: viewportConfig.viewport.width,
      height: viewportConfig.viewport.height,
      deviceScaleFactor: viewportConfig.deviceScaleFactor,
      hasTouch: viewportConfig.hasTouch,
      isMobile: viewportConfig.isMobile,
    },
    url: targetUrl,
    startedAt,
    endedAt,
    elapsedNodeMs: roundMs(performance.now() - navigationStartNodeMs),
    gotoStatus,
    gotoError,
    loadStateError,
    pageState: state,
    networkSummary,
    consoleSummary,
    pageErrors,
  };
}

function metricValue(result, key) {
  const navigation = result.pageState?.navigation;
  const paints = result.pageState?.paints || {};
  if (key === 'ttfb') return navigation?.ttfbMs ?? null;
  if (key === 'dcl') return navigation?.domContentLoadedMs ?? null;
  if (key === 'load') return navigation?.loadMs ?? null;
  if (key === 'fcp') return paints['first-contentful-paint'] ?? null;
  return null;
}

function msText(value) {
  return Number.isFinite(value) ? `${value} ms` : 's/d';
}

function markdownTableRow(cells) {
  return `| ${cells.map(cell => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# Metricas web CIALPA - ${report.startedAt}`);
  lines.push('');
  lines.push(`- URL medida: ${report.targetUrl}`);
  lines.push(`- Version config local: ${report.config.version || 's/d'}`);
  lines.push(`- Service Worker: ${report.options.noServiceWorker ? 'bloqueado para la prueba' : 'permitido'}`);
  lines.push(`- Cache-buster: ${report.options.cacheBust ? 'si' : 'no'}`);
  lines.push('');
  lines.push('## Resumen por vista');
  lines.push('');
  lines.push(markdownTableRow(['Vista', 'Viewport', 'HTTP', 'FCP', 'DOMContentLoaded', 'Load', 'Requests', 'Fallidas', '4xx/5xx', 'Consola error/warn', 'SW']));
  lines.push(markdownTableRow(['---', '---', '---:', '---:', '---:', '---:', '---:', '---:', '---:', '---:', '---']));
  for (const result of report.results) {
    const badStatus = (result.networkSummary.statusBuckets['4xx'] || 0) + (result.networkSummary.statusBuckets['5xx'] || 0);
    const swState = result.pageState?.serviceWorker?.supported
      ? `${result.pageState.serviceWorker.controller ? 'controla' : 'sin control'} / ${result.pageState.serviceWorker.registrations?.length || 0} reg.`
      : 'no soportado';
    lines.push(markdownTableRow([
      result.viewport.label,
      `${result.viewport.width}x${result.viewport.height}`,
      result.gotoStatus || result.gotoError || 's/d',
      msText(metricValue(result, 'fcp')),
      msText(metricValue(result, 'dcl')),
      msText(metricValue(result, 'load')),
      result.networkSummary.total,
      result.networkSummary.failed,
      badStatus,
      `${result.consoleSummary.errors.length}/${result.consoleSummary.warnings.length}`,
      swState,
    ]));
  }

  lines.push('');
  lines.push('## Recursos y red');
  for (const result of report.results) {
    lines.push('');
    lines.push(`### ${result.viewport.label}`);
    lines.push('');
    lines.push(`- Transferencia estimada: ${result.networkSummary.totalTransferHuman} (${result.networkSummary.totalTransferBytes} bytes).`);
    lines.push(`- Cuerpo de respuestas: ${result.networkSummary.totalResponseBodyHuman} (${result.networkSummary.totalResponseBodyBytes} bytes).`);
    lines.push(`- Requests por tipo: ${Object.entries(result.networkSummary.byResourceType).map(([key, value]) => `${key}: ${value}`).join(', ') || 's/d'}.`);
    if (result.networkSummary.issues.length) {
      lines.push(`- Requests con problema: ${result.networkSummary.issues.length}.`);
      for (const issue of result.networkSummary.issues.slice(0, 5)) {
        lines.push(`  - ${issue.status || issue.failure || 'fallida'} ${issue.resourceType} ${issue.url}`);
      }
    } else {
      lines.push('- Requests con problema: 0.');
    }
    if (result.consoleSummary.errors.length || result.consoleSummary.warnings.length) {
      lines.push(`- Consola: ${result.consoleSummary.errors.length} errores y ${result.consoleSummary.warnings.length} advertencias.`);
      for (const message of [...result.consoleSummary.errors, ...result.consoleSummary.warnings].slice(0, 5)) {
        lines.push(`  - [${message.type}] ${message.text}`);
      }
    } else {
      lines.push('- Consola sin errores ni advertencias.');
    }
  }

  lines.push('');
  lines.push('## Requests mas lentas');
  for (const result of report.results) {
    lines.push('');
    lines.push(`### ${result.viewport.label}`);
    lines.push('');
    const slowest = result.networkSummary.slowest.slice(0, 8);
    if (!slowest.length) {
      lines.push('- s/d');
      continue;
    }
    for (const item of slowest) {
      lines.push(`- ${item.durationMs} ms | ${item.status} | ${item.resourceType} | ${item.url}`);
    }
  }

  lines.push('');
  lines.push('## Recursos mas pesados');
  for (const result of report.results) {
    lines.push('');
    lines.push(`### ${result.viewport.label}`);
    lines.push('');
    const largest = result.networkSummary.largest.slice(0, 8);
    if (!largest.length) {
      lines.push('- s/d');
      continue;
    }
    for (const item of largest) {
      lines.push(`- ${bytesToHuman(item.responseBodyBytes)} | ${item.status} | ${item.resourceType} | ${item.url}`);
    }
  }

  lines.push('');
  lines.push('## Estado DOM y PWA');
  for (const result of report.results) {
    const dom = result.pageState?.dom || {};
    const sw = result.pageState?.serviceWorker || {};
    lines.push('');
    lines.push(`### ${result.viewport.label}`);
    lines.push('');
    lines.push(`- Titulo: ${dom.title || 's/d'}.`);
    lines.push(`- Modulos activos: ${(dom.activeModules || []).join(', ') || 's/d'}.`);
    lines.push(`- Version visible: ${(dom.appVersionTexts || []).join(', ') || 's/d'}.`);
    lines.push(`- DOM: ${dom.buttons || 0} botones, ${dom.inputs || 0} campos, ${dom.canvases || 0} canvas, ${dom.images || 0} imagenes.`);
    lines.push(`- Service Worker: ${sw.supported ? `${sw.controller ? 'controlando' : 'registrado/sin controlar'}; registros ${sw.registrations?.length || 0}` : 'no soportado'}.`);
    lines.push(`- Caches: ${(result.pageState?.cacheKeys || []).join(', ') || 'sin caches visibles'}.`);
  }

  return `${lines.join('\n')}\n`;
}

function printConsoleSummary(report) {
  console.log(`Metricas generadas para ${report.targetUrl}`);
  for (const result of report.results) {
    const badStatus = (result.networkSummary.statusBuckets['4xx'] || 0) + (result.networkSummary.statusBuckets['5xx'] || 0);
    const errors = result.consoleSummary.errors.length;
    const warnings = result.consoleSummary.warnings.length;
    console.log([
      `- ${result.viewport.label}`,
      `FCP ${msText(metricValue(result, 'fcp'))}`,
      `DCL ${msText(metricValue(result, 'dcl'))}`,
      `Load ${msText(metricValue(result, 'load'))}`,
      `${result.networkSummary.total} req`,
      `${result.networkSummary.failed} fallidas`,
      `${badStatus} HTTP 4xx/5xx`,
      `${errors}/${warnings} consola error/warn`,
    ].join(' | '));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const config = await readAppConfig();
  const baseUrl = args.url || config.publicUrl;
  if (!baseUrl) {
    throw new Error('No se encontro URL. Use --url=URL o configure APP_CONFIG.PUBLIC_URL.');
  }
  const targetUrl = addMetricParam(baseUrl, args.cacheBust);
  const viewportNames = args.viewport === 'all' ? Object.keys(VIEWPORTS) : [args.viewport];
  const startedAt = new Date().toISOString();
  const timestamp = startedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

  await fs.mkdir(args.outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewportName of viewportNames) {
      const result = await measureViewport(browser, targetUrl, viewportName, VIEWPORTS[viewportName], args);
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  const report = {
    schemaVersion: 1,
    generatedBy: 'tools/simulation/cialpa_web_metrics.mjs',
    startedAt,
    endedAt: new Date().toISOString(),
    targetUrl,
    config,
    options: {
      viewport: args.viewport,
      timeoutMs: args.timeoutMs,
      waitMs: args.waitMs,
      cacheBust: args.cacheBust,
      noServiceWorker: args.noServiceWorker,
    },
    results,
  };

  const jsonPath = path.join(args.outputDir, `web-metrics-${timestamp}.json`);
  const mdPath = path.join(args.outputDir, `web-metrics-${timestamp}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(mdPath, renderMarkdown(report), 'utf8');

  printConsoleSummary(report);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Resumen: ${mdPath}`);
}

main().catch(error => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
