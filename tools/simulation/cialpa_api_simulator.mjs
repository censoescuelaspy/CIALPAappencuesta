#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const DEFAULT_CONCURRENCY = 1;
const DEFAULT_COUNT = 1;
const DEFAULT_DELAY_MS = 750;
const DEFAULT_TIMEOUT_MS = 30000;

function parseArgs(argv) {
  const args = {
    write: false,
    listSchools: false,
    useFirstSchool: false,
    count: DEFAULT_COUNT,
    concurrency: DEFAULT_CONCURRENCY,
    delayMs: DEFAULT_DELAY_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    config: 'assets/js/config.js',
  };

  for (const raw of argv) {
    if (raw === '--write') args.write = true;
    else if (raw === '--list-schools') args.listSchools = true;
    else if (raw === '--use-first-school') args.useFirstSchool = true;
    else if (raw === '--help' || raw === '-h') args.help = true;
    else if (raw.startsWith('--school=')) args.school = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--gas-url=')) args.gasUrl = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--user=')) args.user = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--password=')) args.password = raw.split('=').slice(1).join('=');
    else if (raw.startsWith('--count=')) args.count = toPositiveInt(raw.split('=')[1], DEFAULT_COUNT);
    else if (raw.startsWith('--concurrency=')) args.concurrency = toPositiveInt(raw.split('=')[1], DEFAULT_CONCURRENCY);
    else if (raw.startsWith('--delay-ms=')) args.delayMs = toPositiveInt(raw.split('=')[1], DEFAULT_DELAY_MS);
    else if (raw.startsWith('--timeout-ms=')) args.timeoutMs = toPositiveInt(raw.split('=')[1], DEFAULT_TIMEOUT_MS);
    else if (raw.startsWith('--config=')) args.config = raw.split('=').slice(1).join('=');
    else throw new Error(`Argumento no reconocido: ${raw}`);
  }

  args.user = args.user || process.env.CIALPA_USER || '';
  args.password = args.password || process.env.CIALPA_PASSWORD || '';
  args.gasUrl = args.gasUrl || process.env.CIALPA_GAS_URL || '';
  args.school = args.school || process.env.CIALPA_SIM_SCHOOL || '';
  args.runId = process.env.CIALPA_SIM_RUN_ID || compactTimestamp();
  return args;
}

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function compactTimestamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function printHelp() {
  console.log(`
CIALPA API simulator

Uso:
  node tools/simulation/cialpa_api_simulator.mjs --list-schools
  node tools/simulation/cialpa_api_simulator.mjs --write --school=CODIGO_O_ID --count=3

Variables recomendadas:
  CIALPA_USER       Usuario de la app
  CIALPA_PASSWORD   Password de la app
  CIALPA_GAS_URL    Opcional; si falta, se lee de assets/js/config.js

Opciones:
  --list-schools      Login + getEscuelas, sin escritura
  --write             Habilita guardarBorradorMec en Sheets
  --school=ID         Escuela objetivo por id_escuela o codigo_local
  --use-first-school  Usa la primera escuela real retornada por getEscuelas
  --count=N           Cantidad de borradores simulados, por defecto 1
  --concurrency=N     Concurrencia, por defecto 1; usar bajo con Apps Script
  --delay-ms=N        Pausa entre escrituras por worker, por defecto 750
  --gas-url=URL       Sobrescribe la URL GAS
  --config=PATH       Archivo config.js desde donde leer GAS_URL y VERSION
`);
}

async function readAppConfig(configPath) {
  const text = await readFile(resolve(configPath), 'utf8');
  const gasUrl = /GAS_URL:\s*['"]([^'"]+)['"]/.exec(text)?.[1] || '';
  const version = /VERSION:\s*['"]([^'"]+)['"]/.exec(text)?.[1] || '';
  const spreadsheetUrl = /SPREADSHEET_URL:\s*['"]([^'"]+)['"]/.exec(text)?.[1] || '';
  return { gasUrl, version, spreadsheetUrl };
}

async function gasCall({ gasUrl, action, token = '', method = 'POST', data = {}, timeoutMs }) {
  const payload = { action, ...data };
  if (token) payload.token = token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    let response;
    if (method === 'GET') {
      const url = `${gasUrl}?${new URLSearchParams(payload).toString()}`;
      response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    } else {
      response = await fetch(gasUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }

    const elapsedMs = Math.round(performance.now() - started);
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Respuesta no JSON (${response.status}): ${text.slice(0, 180)}`);
    }
    return { response, json, elapsedMs };
  } finally {
    clearTimeout(timeout);
  }
}

function requireCredentials(args) {
  if (!args.user || !args.password) {
    throw new Error('Faltan CIALPA_USER/CIALPA_PASSWORD o --user/--password.');
  }
}

function realSchools(rows) {
  return (Array.isArray(rows) ? rows : []).filter(row => {
    const id = String(row.id_escuela || '').trim();
    const code = String(row.codigo_local || '').trim();
    return id || code;
  });
}

function findSchool(rows, wanted, useFirstSchool) {
  const schools = realSchools(rows);
  if (useFirstSchool) return schools[0] || null;
  const key = String(wanted || '').trim().toLowerCase();
  if (!key) return null;
  return schools.find(row =>
    String(row.id_escuela || '').trim().toLowerCase() === key ||
    String(row.codigo_local || '').trim().toLowerCase() === key
  ) || null;
}

function buildDraftPayload({ school, index, runId, appVersion, usuario }) {
  const sample = String(index + 1).padStart(3, '0');
  const codigo = String(school.codigo_local || school.id_escuela || `SIM-${sample}`);
  const blockId = `sim_block_${runId}_${sample}`;
  const floorId = `sim_floor_${runId}_${sample}`;
  const classroomId = `sim_classroom_${runId}_${sample}`;
  const sanitaryId = `sim_sanitary_${runId}_${sample}`;
  const siteElementId = `sim_site_${runId}_${sample}`;
  const now = new Date().toISOString();

  const values = {
    __simulation: true,
    __simulationRunId: runId,
    __savedAt: now,
    __selectedSchool: {
      id_escuela: school.id_escuela || codigo,
      codigo_local: codigo,
      nombre: school.nombre || `Escuela simulada ${codigo}`,
    },
    general: {
      codigo_local: codigo,
      nombre_institucion: school.nombre || `Escuela simulada ${codigo}`,
      departamento: school.departamento || '',
      distrito: school.distrito || '',
      localidad: school.localidad || '',
      responsable_relevamiento: usuario,
      observacion: `Carga simulada ${runId}-${sample}`,
    },
    __blocks: [{
      id: blockId,
      bloque_codigo: `SIM-B${sample}`,
      estado_bloque: 'Operativo',
      cantidad_plantas: '1',
      largo_m: '12',
      ancho_m: '8',
      superficie_m2: '96',
      perimetro_m: '40',
      bloque_observacion: `Bloque simulado ${sample}`,
      floors: [{
        id: floorId,
        name: 'Piso 1',
        largo_m: '12',
        ancho_m: '8',
        estado: 'Operativo',
      }],
    }],
    __classrooms: [{
      id: classroomId,
      blockId,
      floor: 'Piso 1',
      name: `Aula simulada ${sample}`,
      estado: 'Operativa',
      length: '6',
      width: '5',
      caracteristicas: 'Ambiente generado por simulador API.',
      objects: [
        { id: `${classroomId}_room`, type: 'room', x: 72, y: 92, w: 170, h: 120 },
        { id: `${classroomId}_door`, type: 'door', x: 92, y: 204, w: 42, h: 8, ficha: { codigo: 'Pta SIM', estado: 'Bueno' } },
        { id: `${classroomId}_window`, type: 'window', x: 124, y: 92, w: 64, h: 8, ficha: { codigo: 'Vtna SIM', estado: 'Bueno' } },
      ],
    }],
    __sanitaries: [{
      id: sanitaryId,
      bloque: `SIM-B${sample}`,
      planta: 'Piso 1',
      codigo: `Sanitario simulado ${sample}`,
      estado: 'Bueno',
      largo_m: '3',
      ancho_m: '2',
      inodoros: '1',
      lavamanos: '1',
      agua: 'Si',
      desague: 'Red cloacal',
      observacion: 'Sanitario generado por simulador API.',
      objects: [{ id: `${sanitaryId}_room`, type: 'sanitary-room', x: 280, y: 96, w: 90, h: 70 }],
    }],
    __siteElements: [{
      id: siteElementId,
      type: 'water_tank',
      label: 'Tanque simulado',
      ficha: { estado: 'Bueno', capacidad_litros: '500', observacion: 'Elemento generado por simulador API.' },
      position: { xRatio: 0.72, yRatio: 0.32, wRatio: 0.08, hRatio: 0.08 },
    }],
  };

  return {
    clientMutationId: `SIM-MEC-${runId}-${codigo}-${sample}`,
    id_escuela: school.id_escuela || codigo,
    codigo_local: codigo,
    nombre_escuela: school.nombre || `Escuela simulada ${codigo}`,
    usuario_cliente: usuario,
    estado_borrador: 'simulado',
    motivo: `simulacion_api_${runId}`,
    app_version: appVersion || '',
    schema_version: 'simulator-v1',
    counts: {
      blocks: 1,
      floors: 1,
      classrooms: 1,
      otherSpaces: 0,
      sanitaries: 1,
      siteElements: 1,
      evidence: 0,
    },
    resumen: {
      simulation: true,
      runId,
      sample,
      school: codigo,
      baseMapConfirmed: false,
      generatedAt: now,
    },
    values,
    evidenceIndex: [],
  };
}

async function runLimited(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function consume() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, consume);
  await Promise.all(workers);
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const appConfig = await readAppConfig(args.config);
  const gasUrl = args.gasUrl || appConfig.gasUrl;
  if (!gasUrl) throw new Error('No se encontro GAS_URL. Use --gas-url o CIALPA_GAS_URL.');
  requireCredentials(args);

  console.log(`[cialpa-sim] GAS: ${gasUrl}`);
  console.log(`[cialpa-sim] App version: ${appConfig.version || '(desconocida)'}`);
  console.log(`[cialpa-sim] Usuario: ${args.user}`);
  console.log(`[cialpa-sim] Modo: ${args.write ? 'ESCRITURA' : 'solo lectura / dry-run'}`);

  const login = await gasCall({
    gasUrl,
    action: 'login',
    data: { usuario: args.user, password: args.password },
    timeoutMs: args.timeoutMs,
  });
  if (login.json.status !== 'ok') {
    throw new Error(`Login fallo: ${login.json.message || JSON.stringify(login.json)}`);
  }
  const token = login.json.data?.token;
  if (!token) throw new Error('Login ok, pero no llego token.');
  console.log(`[cialpa-sim] Login OK (${login.elapsedMs} ms), rol: ${login.json.data?.rol || '?'}`);

  const escuelas = await gasCall({
    gasUrl,
    action: 'getEscuelas',
    token,
    method: 'GET',
    data: {},
    timeoutMs: args.timeoutMs,
  });
  if (escuelas.json.status !== 'ok') {
    throw new Error(`getEscuelas fallo: ${escuelas.json.message || JSON.stringify(escuelas.json)}`);
  }
  const schools = realSchools(escuelas.json.data);
  console.log(`[cialpa-sim] getEscuelas OK (${escuelas.elapsedMs} ms), escuelas: ${schools.length}`);

  if (args.listSchools || !args.write) {
    schools.slice(0, 12).forEach((school, index) => {
      console.log(`${String(index + 1).padStart(2, '0')}. ${school.codigo_local || school.id_escuela} | ${school.nombre || '(sin nombre)'}`);
    });
    if (!args.write) {
      console.log('[cialpa-sim] Dry-run terminado. Agregue --write --school=CODIGO para guardar borradores simulados.');
      return;
    }
  }

  const school = findSchool(schools, args.school, args.useFirstSchool);
  if (!school) {
    throw new Error('No se encontro escuela objetivo. Use --school=CODIGO/ID o --use-first-school.');
  }
  console.log(`[cialpa-sim] Escuela objetivo: ${school.codigo_local || school.id_escuela} | ${school.nombre || '(sin nombre)'}`);
  console.log(`[cialpa-sim] Run ID: ${args.runId}`);

  const payloads = Array.from({ length: args.count }, (_, index) =>
    buildDraftPayload({
      school,
      index,
      runId: args.runId,
      appVersion: appConfig.version,
      usuario: args.user,
    })
  );

  let ok = 0;
  let failed = 0;
  const results = await runLimited(payloads, args.concurrency, async (payload, index) => {
    if (index > 0 && args.delayMs > 0) await sleep(args.delayMs);
    const result = await gasCall({
      gasUrl,
      action: 'guardarBorradorMec',
      token,
      data: payload,
      timeoutMs: args.timeoutMs,
    });
    if (result.json.status === 'ok') {
      ok += 1;
      console.log(`[cialpa-sim] OK ${index + 1}/${payloads.length}: ${result.json.data?.id_borrador || payload.clientMutationId} (${result.elapsedMs} ms)`);
    } else {
      failed += 1;
      console.log(`[cialpa-sim] ERROR ${index + 1}/${payloads.length}: ${result.json.message || JSON.stringify(result.json)} (${result.elapsedMs} ms)`);
    }
    return result;
  });

  const elapsed = results.reduce((sum, item) => sum + (item?.elapsedMs || 0), 0);
  console.log(`[cialpa-sim] Finalizado. OK=${ok}, errores=${failed}, latencia acumulada=${elapsed} ms`);
  if (appConfig.spreadsheetUrl) console.log(`[cialpa-sim] Verificar hoja mec_borradores: ${appConfig.spreadsheetUrl}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(`[cialpa-sim] ${error.message}`);
  process.exitCode = 1;
});
