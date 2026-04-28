# CIALPA — Checklist de Despliegue a Producción

Seguir estos pasos **en orden**. Cada paso tiene una casilla de verificación.

---

## PASO 1 — Preparar el proyecto Google Apps Script

- [ ] Abrir el Spreadsheet de CIALPA:
      https://docs.google.com/spreadsheets/d/1HYjRYqV3XGId3HnYiCpCiJCogoqGheC2SmyPQFS-fCg
- [ ] Ir a **Extensiones → Apps Script**.
- [ ] En el editor de GAS, verificar que existan los 5 archivos:
      `Code.gs`, `auth.gs`, `sheets.gs`, `audit.gs`, `setup.gs`
- [ ] Si alguno falta, copiarlo desde `06_APP/gas/` (pegar el contenido en un nuevo archivo GAS).

---

## PASO 2 — Desplegar el GAS como Web App

- [ ] En el editor de GAS: **Implementar → Nueva implementación**.
- [ ] Configuración:
      - Tipo: **Aplicación web**
      - Descripción: `CIALPA v2.0`
      - Ejecutar como: **Yo (tu cuenta de Google)**
      - Quién tiene acceso: **Cualquier persona**
- [ ] Hacer clic en **Implementar**.
- [ ] **Copiar la URL** que aparece (tiene el formato
      `https://script.google.com/macros/s/AKfycb.../exec`).
- [ ] Pegar esa URL aquí para registrarla: `_______________________________________`

---

## PASO 3 — Actualizar config.js con la URL real

- [ ] Abrir `06_APP/assets/js/config.js`.
- [ ] Reemplazar el valor de `GAS_URL`:

```js
// ANTES:
GAS_URL: 'YOUR_GAS_WEB_APP_URL',

// DESPUÉS (pegar la URL del PASO 2):
GAS_URL: 'https://script.google.com/macros/s/TU_URL_REAL/exec',
```

- [ ] Si ya tenés la URL real del formulario MEC, reemplazar también `FORM_URL`:

```js
// ANTES:
// (en el sheet CONFIG, clave FORM_URL, valor demo.mec.gov.py/...)

// ACTUALIZAR en Google Sheets → hoja "config" → fila FORM_URL → columna valor
```

  > **Nota:** `FORM_URL` se gestiona desde el Spreadsheet (hoja `config`, clave `FORM_URL`),
  > no en config.js. Actualízala allí una vez que el MEC confirme la URL de producción.

---

## PASO 4 — Inicializar la base de datos (ejecutar UNA SOLA VEZ)

- [ ] En el editor de GAS, abrir `setup.gs`.
- [ ] Ejecutar la función **`initAll()`**:
      - Crea las 9 hojas con encabezados.
      - Crea el usuario admin (contraseña: `cialpa2025`).
      - Carga la configuración inicial y los catálogos.
- [ ] Verificar en el Spreadsheet que se crearon las hojas:
      `escuelas_seleccionadas`, `usuarios`, `encuestadores`, `sesiones`,
      `eventos`, `incidencias`, `config`, `auditoria`, `catalogos`.
- [ ] **Cambiar la contraseña del admin** desde la app (módulo Configuración)
      o directamente en la hoja `usuarios`.

---

## PASO 5 — Importar la lista de escuelas

- [ ] En el Spreadsheet, crear una hoja nueva llamada exactamente **`IMPORT_TEMP`**.
- [ ] Abrir el archivo:
      `03_DATOS/Inventarios_Escuelas/listado_relevamiento_infraestructura_escuelas_paraguay.txt`
- [ ] Copiar **todo el contenido** (incluido el encabezado, fila 1) y pegarlo en `IMPORT_TEMP`
      comenzando en la celda A1.
      - En Excel/Sheets: pegar con **Ctrl+Shift+V → Solo valores** para que respete tabulaciones.
- [ ] En el editor de GAS, ejecutar **`importEscuelas()`**.
- [ ] Verificar el mensaje de confirmación (cantidad de escuelas insertadas).
- [ ] Eliminar o vaciar la hoja `IMPORT_TEMP`.

---

## PASO 6 — Configurar el repositorio GitHub Pages

- [ ] Verificar acceso al repositorio: https://github.com/censoescuelaspy/CIALPAappencuesta
- [ ] Asegurarse de que la rama `main` tenga habilitado GitHub Pages
      (Settings → Pages → Branch: `main` / raíz `/`).
- [ ] Desde `06_APP/`, confirmar que estos archivos existen antes de hacer push:
      - `index.html`
      - `assets/js/config.js` (con la URL real del GAS)
      - `assets/img/logo.png`
      - `assets/img/favicon.png`
      - `assets/css/`, `assets/js/` (todos los módulos)

---

## PASO 7 — Push a GitHub Pages

```bash
cd "g:/Mi unidad/CIALPA/06_APP"
git init           # solo si aún no es repositorio
git remote add origin https://github.com/censoescuelaspy/CIALPAappencuesta.git
git add .
git commit -m "deploy: CIALPA v2.0 produccion"
git push -u origin main
```

- [ ] Esperar 1-2 minutos y abrir:
      https://censoescuelaspy.github.io/CIALPAappencuesta/
- [ ] Verificar que la pantalla de login aparece (sin el aviso de modo demo).

---

## PASO 8 — Pruebas de aceptación post-despliegue

- [ ] Login con `admin` / nueva contraseña → accede al dashboard.
- [ ] Módulo **Mapa**: carga el mapa y muestra marcadores de escuelas.
- [ ] Módulo **Encuesta**: seleccionar una escuela → iniciar jornada → abrir formulario MEC.
- [ ] Módulo **Estadísticas**: gráficos cargan sin errores.
- [ ] Módulo **Auditoría**: se registran las acciones.
- [ ] Probar con un usuario `encuestador` (crearlo primero desde Administración).
- [ ] Probar en móvil (pantalla 375px): layout responsive OK.

---

## Pendientes bloqueados (requieren confirmación externa)

| Item | Bloqueado por |
|------|---------------|
| `GAS_URL` real en `config.js` | Despliegue del PASO 2 |
| `FORM_URL` de producción MEC | MEC debe confirmar la URL del RUE en producción |
| Coordenadas lat/lng de escuelas | Geocodificación pendiente (campo vacío en TXT) |
| Encuestadores en hoja `encuestadores` | Alta manual o importación posterior |

---

*Última actualización: 2026-04-27*
