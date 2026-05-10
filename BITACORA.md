# CIALPA — Bitácora de Implementación
**Relevamiento de Infraestructura Escolar — Paraguay 2026**
**Financiado por:** Banco Mundial

---

## Sesión de optimización del registro arquitectónico - 2026-05-10 - v2.5.32

### Enfoque corregido
- Se reemplaza el enfoque de auditoría visible por mejoras directas al funcionamiento del sistema de registro y construcción del plano.
- El objetivo de esta versión es acelerar la carga por partes: bloque, piso, aula, sanitario, aberturas, instalaciones y objetos internos.

### Cambios implementados
- Agregado un **Constructor del plano** contextual en la vista de plano general.
- Al seleccionar una pieza del plano, el panel ofrece acciones específicas:
  - bloque: abrir bloque, crear aula, crear sanitario;
  - aula: abrir aula, agregar puerta, ventana, toma, foco, daño o escalera;
  - sanitario: abrir sanitario, agregar cabina, inodoro, lavamanos, puerta o ventana;
  - objeto de aula: abrir ficha, abrir aula o eliminar.
- La selección del plano general ahora sincroniza automáticamente el bloque, piso, aula o sanitario activo.
- Las aulas y sanitarios pueden arrastrarse directamente dentro del plano general, no solo los bloques.
- Al mover un aula o sanitario desde el plano general, sus elementos internos se desplazan junto con el recinto para conservar la relación espacial.
- Los nuevos objetos agregados desde el plano general se insertan en ubicaciones iniciales coherentes dentro del aula o sanitario seleccionado.
- Version y cache actualizados a `v2.5.32`.

### Validaciones previstas
- `node --check assets/js/mec-form.js`
- `node --check assets/js/config.js`
- `git diff --check`
- Verificación HTTP de GitHub Pages para `index.html`, `config.js`, `mec-form.js`, `mec-form.css` y `sw.js`.

---

## Sesión de mejora arquitectónica - 2026-05-10 - v2.5.31

### Estado publicado
- App web: `https://censoescuelaspy.github.io/CIALPAappencuesta/?v=2.5.31`
- Rama publicada: `main`
- Commit principal: `f6a5bd4` - `feat: agregar auditor arquitectonico del plano`
- Commit de alineación: `41f94d5` - `chore: alinear comentario de version`
- Verificación en GitHub Pages: `index OK`, `config OK`, `mec-form OK`, `css OK`, `sw OK`

### Cambios implementados
- Agregado el **Auditor arquitectónico** dentro del plano general de escuela.
- Nuevo KPI **Calidad técnica** con puntaje `0-100`.
- Detección automática de omisiones críticas:
  - bloques sin dimensiones o sin ambientes asociados;
  - pisos con aulas pero sin sanitario;
  - aulas operativas sin puerta, ventana, toma, iluminación, medidas o geometría;
  - sanitarios sin puerta de acceso, inodoro, lavamanos, agua, medidas o recinto dibujado;
  - cabinas sin componentes, sin inodoro o con privacidad deficiente;
  - objetos en mal estado, sin funcionamiento, expuestos o con riesgo;
  - daños estructurales con prioridad alta, severa, urgente o de riesgo inmediato.
- Cada observación del auditor queda como botón seleccionable para localizar rápidamente el bloque, aula, sanitario u objeto observado en el plano.
- Agregados estilos responsivos para panel de auditoría, tarjetas de observaciones y barra de calidad.
- Corregido un `summary` duplicado en el panel de cabinas sanitarias.
- Versión y cache actualizados a `v2.5.31` en `config.js`, `index.html` y `sw.js`.

### Validaciones ejecutadas
- `node --check assets/js/mec-form.js`
- `node --check assets/js/config.js`
- `git diff --check`
- Verificación HTTP de GitHub Pages para `index.html`, `config.js`, `mec-form.js`, `mec-form.css` y `sw.js`.

### Próximos pasos recomendados
- Convertir las observaciones del auditor en checklist de cierre por escuela.
- Agregar exportación de auditoría a PDF/JSON junto con el plano.
- Incorporar reglas de dimensionamiento por tipo de ambiente y capacidad.
- Agregar modo "rutas y evacuación" con puertas, escaleras, accesibilidad y recorridos.
- Crear biblioteca de tipologías arquitectónicas para insertar aulas, sanitarios y bloques completos con configuraciones prearmadas.
- Agregar comparador entre relevamiento actual y versión anterior de la misma escuela.

---

## Sesión de Deploy — 2026-04-27 / 2026-04-28

### Objetivo
Llevar la aplicación web CIALPA v2.0 desde desarrollo local a producción completa:
frontend en GitHub Pages + backend Google Apps Script + base de datos Google Sheets.

---

## 1. Estado inicial

| Componente | Estado |
|---|---|
| Frontend (06_APP) | Código completo localmente, sin publicar |
| Backend GAS | Código completo localmente, sin subir al editor GAS |
| Google Sheets | Spreadsheet existente, hojas no creadas |
| GitHub Pages | Repo existente con versión anterior |
| Logo / favicon | Existente en 07_IMAGENES, no copiado a assets/ |

---

## 2. Acciones realizadas

### 2.1 Preparación de assets
- Creada carpeta `assets/img/`
- Copiado `07_IMAGENES/Logo_Branding/LOGO_CIALPA.png` → `assets/img/logo.png` y `favicon.png`

### 2.2 Mejoras al código GAS
- **`gas/setup.gs`**: agregada función `importEscuelas()` para carga masiva de escuelas desde hoja temporal `IMPORT_TEMP`
- **`gas/appsscript.json`**: creado con zona horaria `America/Asuncion`, runtime V8, acceso `ANYONE_ANONYMOUS`
- **`gas/.clasp.json`**: creado apuntando al Script ID del proyecto

### 2.3 Upload al proyecto Google Apps Script vía clasp
- Script ID: `1dQePnMTegZBIyN9SRYTAkPxDyBUiZejVi6WqXpv6_LrBAIVTir3ne4S2`
- Archivos subidos: `Code.gs`, `auth.gs`, `sheets.gs`, `audit.gs`, `setup.gs` (6 archivos total)
- Tool: clasp v3.3.0

### 2.4 Inicialización de la base de datos
- Se ejecutó `initAll()` desde el editor GAS (creó las 9 hojas con encabezados)
- Usuario admin insertado manualmente en hoja `usuarios`:
  - id_usuario: `USR_ADMIN_001`
  - usuario: `admin`
  - password_hash: SHA-256 de `cialpa2025`
  - rol: `admin`, activo: `true`

### 2.5 Correcciones CORS
- **Problema**: `Content-Type: application/json` en las llamadas POST disparaba un preflight CORS que GAS no maneja
- **Fix**: cambiado a `Content-Type: text/plain;charset=UTF-8` en `assets/js/api.js` — GAS parsea el JSON del body igualmente, el browser no envía preflight

### 2.6 Configuración del deployment GAS
- **Problema**: deployment original creado con acceso "Cualquier usuario de Google" (requiere auth)
- **Fix**: creado nuevo deployment con acceso "Cualquier persona" (anónimo)
- URL de producción final:
  `https://script.google.com/macros/s/AKfycbxmfkifnwz3WoaCzzTAmQO0TuvRwenmiJY3GSdEYqi564TtoCbEOTzD7CTgK4-vaOWKjQ/exec`

### 2.7 GitHub Pages
- Repo: `https://github.com/censoescuelaspy/CIALPAappencuesta`
- Rama: `main`, raíz `/`
- URL pública: `https://censoescuelaspy.github.io/CIALPAappencuesta/`
- Commits realizados:
  - `feat: CIALPA v2.0 — deploy completo a produccion`
  - `fix: remove temporary initSetup endpoint from Code.gs`
  - `fix: use text/plain Content-Type to avoid CORS preflight with GAS`
  - `fix: update GAS_URL to anonymous-access deployment`

### 2.8 `assets/js/config.js` — valores de producción
```javascript
GAS_URL: 'https://script.google.com/macros/s/AKfycbxmfkifnwz3WoaCzzTAmQO0TuvRwenmiJY3GSdEYqi564TtoCbEOTzD7CTgK4-vaOWKjQ/exec'
FORM_URL: (pendiente — URL del formulario MEC en producción)
```

---

## 3. Lecciones aprendidas / problemas resueltos

| Problema | Causa raíz | Solución |
|---|---|---|
| `initAll()` no creaba admin | `SpreadsheetApp.getUi()` falla en scripts standalone | Inserción manual en Spreadsheet |
| CORS preflight | `Content-Type: application/json` en fetch POST | Cambiar a `text/plain;charset=UTF-8` |
| Login bloqueado (403) | Deployment configurado con acceso restringido a Google | Nuevo deployment con acceso "Cualquier persona" |
| clasp no encontraba proyecto | clasp autenticado con cuenta diferente (`apoyomedicoips`) | Uso de Script ID directo en `.clasp.json` |

---

## 4. Estado final — 2026-04-28

| Componente | Estado | URL / Detalle |
|---|---|---|
| Frontend | **PRODUCCIÓN** | https://censoescuelaspy.github.io/CIALPAappencuesta/ |
| Backend GAS | **PRODUCCIÓN** | Deployment @7, acceso anónimo |
| Google Sheets | **OPERATIVO** | 9 hojas creadas, admin configurado |
| Login | **FUNCIONAL** | admin / cialpa2025 ✓ |

---

## 5. Pendientes post-deploy

| Tarea | Prioridad | Detalle |
|---|---|---|
| Cambiar contraseña admin | **CRÍTICA** | Cambiar `cialpa2025` desde módulo Configuración |
| Importar escuelas | Alta | Ejecutar `importEscuelas()` en GAS con datos del TXT |
| FORM_URL de producción | Alta | Confirmar URL real del formulario MEC/RUE con el MEC |
| Geocodificar escuelas | Media | Campo lat/lng vacío en datos actuales |
| Crear encuestadores | Media | Alta manual o importación desde módulo Admin |
| Catálogo de configuraciones | Baja | Revisar y ajustar valores en hoja `configuracion` |

---

## 6. Credenciales de acceso (producción)

| Recurso | Detalle |
|---|---|
| App web | https://censoescuelaspy.github.io/CIALPAappencuesta/ |
| Spreadsheet | https://docs.google.com/spreadsheets/d/1HYjRYqV3XGId3HnYiCpCiJCogoqGheC2SmyPQFS-fCg/edit |
| GAS Editor | https://script.google.com/u/0/home/projects/1dQePnMTegZBIyN9SRYTAkPxDyBUiZejVi6WqXpv6_LrBAIVTir3ne4S2/edit |
| GitHub repo | https://github.com/censoescuelaspy/CIALPAappencuesta |
| Admin inicial | usuario: `admin` / contraseña: `cialpa2025` (**cambiar inmediatamente**) |

---

*Bitácora generada: 2026-04-28*
