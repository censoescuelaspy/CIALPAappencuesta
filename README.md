# CIALPA — Sistema de Relevamiento Escolar

**Versión 2.0.0** | Paraguay 2025

Sistema web para la gestión del relevamiento de infraestructura y condiciones de establecimientos educativos en Paraguay.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Pages (Frontend)                                │
│  HTML / CSS / JavaScript estático                       │
│  Leaflet + MarkerCluster + Chart.js                     │
└────────────────────┬────────────────────────────────────┘
                     │ fetch() JSON API
┌────────────────────▼────────────────────────────────────┐
│  Google Apps Script (Backend)                           │
│  doGet() / doPost() → Router → Servicios               │
│  Auth · Sheets · Audit                                  │
└────────────────────┬────────────────────────────────────┘
                     │ SpreadsheetApp
┌────────────────────▼────────────────────────────────────┐
│  Google Sheets (Base de datos)                          │
│  9 hojas: escuelas, usuarios, sesiones, etc.           │
└─────────────────────────────────────────────────────────┘
```

---

## Estructura del proyecto

```
06_APP/
├── index.html                     # SPA principal
├── assets/
│   ├── css/
│   │   └── app.css                # Estilos completos
│   ├── js/
│   │   ├── config.js              # Configuración centralizada
│   │   ├── api.js                 # Capa API (fetch → GAS)
│   │   ├── auth.js                # Autenticación y sesión
│   │   ├── map.js                 # Módulo Leaflet
│   │   ├── survey.js              # Módulo encuestas
│   │   ├── stats.js               # Panel estadístico
│   │   ├── admin.js               # Config y auditoría (admin)
│   │   ├── jornada.js             # Panel personal
│   │   ├── manual.js              # Manual de usuario
│   │   └── app.js                 # Controlador principal
│   └── img/
│       ├── logo.png               # Logo CIALPA (proveer)
│       └── favicon.png            # Favicon (proveer)
├── manual/
│   └── index.html                 # Manual completo standalone
├── gas/
│   ├── Code.gs                    # Entry point GAS
│   ├── auth.gs                    # Servicio autenticación
│   ├── sheets.gs                  # Servicio datos
│   ├── audit.gs                   # Servicio auditoría
│   └── setup.gs                   # Funciones de inicialización
└── README.md                      # Este archivo
```

---

## Guía de despliegue

### Paso 1: Crear Google Sheets

1. Ir a [sheets.google.com](https://sheets.google.com) y crear una nueva planilla.
2. Copiar el **ID** de la planilla desde la URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_AQUI/edit
   ```
3. Guardar el ID para usarlo en el Paso 2.

### Paso 2: Configurar Google Apps Script

1. Dentro de la planilla, ir a **Extensiones → Apps Script**.
2. Eliminar el código por defecto (`function myFunction() {}`).
3. Crear los archivos del script:
   - Renombrar `Code.gs` y pegar el contenido de `gas/Code.gs`.
   - Agregar nuevos archivos (`+`) con nombres `auth.gs`, `sheets.gs`, `audit.gs`, `setup.gs`.
   - Pegar el contenido correspondiente de cada archivo de la carpeta `gas/`.
4. En `Code.gs`, actualizar la constante con el ID de tu planilla:
   ```javascript
   const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';
   ```
5. Guardar el proyecto (Ctrl+S).

### Paso 3: Inicializar la base de datos

1. En el editor de Apps Script, ir al menú **Ejecutar → initAll**.
2. Autorizar los permisos solicitados (acceso a Google Sheets).
3. Esperar a que aparezca el mensaje de confirmación.
4. Verificar en la planilla que se crearon las 9 hojas.

> **Credenciales del admin por defecto:**
> - Usuario: `admin`
> - Contraseña: `cialpa2025`
> - **¡Cambiar inmediatamente después del primer login!**

### Paso 4: Desplegar como Web App

1. En el editor de Apps Script, ir a **Implementar → Nueva implementación**.
2. Configurar:
   - **Tipo**: Aplicación web
   - **Ejecutar como**: Yo (Tu cuenta Google)
   - **Acceso**: Cualquier usuario (Anyone)
3. Hacer clic en **Implementar**.
4. Copiar la **URL de la Web App** que aparece. Tiene el formato:
   ```
   https://script.google.com/macros/s/DEPLOYMENT_ID/exec
   ```

### Paso 5: Configurar el frontend

1. Abrir `assets/js/config.js`.
2. Reemplazar el valor de `GAS_URL`:
   ```javascript
   const APP_CONFIG = {
     GAS_URL: 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec',
     // ...
   };
   ```
3. Si tenés el logo de CIALPA, copiarlo a `assets/img/logo.png`.

### Paso 6: Publicar en GitHub Pages

```bash
# Clonar el repositorio
git clone https://github.com/censoescuelaspy/CIALPAappencuesta.git
cd CIALPAappencuesta

# Copiar todos los archivos de 06_APP/ al repositorio
cp -r /ruta/a/06_APP/* .

# Commit y push
git add .
git commit -m "feat: v2.0.0 complete application"
git push origin main
```

5. En los settings del repositorio → **Pages** → Source: `main` branch, folder: `/ (root)`.
6. La aplicación estará disponible en:
   ```
   https://censoescuelaspy.github.io/CIALPAappencuesta/
   ```

---

## Estructura de hojas de Google Sheets

### escuelas_seleccionadas
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id_escuela | Texto | ID único de la escuela |
| codigo_local | Texto | Código oficial MEC |
| nombre | Texto | Nombre del establecimiento |
| departamento | Texto | Departamento |
| distrito | Texto | Distrito |
| localidad | Texto | Localidad |
| zona | Texto | Urbana / Rural / Rural Remota |
| latitud | Número | Coordenada latitud |
| longitud | Número | Coordenada longitud |
| estado_relevamiento | Texto | pendiente / en_curso / finalizada / incidencia |
| encuestador_asignado | Texto | Usuario del encuestador asignado |
| fecha_ultimo_evento | Fecha | Última actualización |
| observaciones | Texto | Notas adicionales |

### usuarios
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id_usuario | Texto | ID único |
| usuario | Texto | Nombre de usuario (login) |
| password_hash | Texto | Hash SHA-256 de la contraseña |
| nombres | Texto | Nombres |
| apellidos | Texto | Apellidos |
| rol | Texto | admin / supervisor / encuestador |
| activo | Booleano | true / false |
| fecha_alta | Fecha | Fecha de creación |
| ultimo_acceso | Timestamp | Último login |
| token_actual | Texto | Token de sesión activo |

### sesiones_relevamiento
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id_sesion | Texto | ID único de la sesión |
| id_escuela | Texto | ID de la escuela |
| usuario | Texto | Usuario encuestador |
| fecha_inicio | Fecha | Fecha de inicio |
| hora_inicio | Tiempo | Hora de inicio |
| fecha_fin | Fecha | Fecha de cierre |
| hora_fin | Tiempo | Hora de cierre |
| duracion_minutos | Número | Duración calculada |
| estado | Texto | en_curso / finalizada / incidencia |
| observacion_cierre | Texto | Notas al cerrar |
| url_formulario_usada | URL | URL del formulario usado |

---

## Flujo de autenticación

```
Login (usuario + password)
  ↓
GAS: SHA-256(password) == password_hash en Sheets?
  ↓ Sí
Generar token = SHA-256(usuario:rol:timestamp:random)
Guardar token en columna token_actual de usuarios
Devolver token al frontend
  ↓
Frontend: guardar token en sessionStorage (expira 8h)
  ↓
Cada request: enviar token en el payload
  ↓
GAS: buscar token en usuarios → validar activo
  ↓ Válido
Procesar request
```

---

## Roles y permisos

| Módulo | Encuestador | Supervisor | Admin |
|--------|:-----------:|:----------:|:-----:|
| Inicio | ✓ | ✓ | ✓ |
| Mapa | ✓ | ✓ | ✓ |
| Aplicar Encuesta | ✓ | ✓ | ✓ |
| Manual | ✓ | ✓ | ✓ |
| Incidencias | ✓ (propias) | ✓ (todas) | ✓ |
| Mi Jornada | ✓ | ✓ | ✓ |
| Panel Estadístico | — | ✓ | ✓ |
| Configuración | — | — | ✓ |
| Auditoría | — | — | ✓ |

---

## Importar escuelas desde CSV

Para cargar el listado inicial de escuelas:

1. Preparar un CSV con las columnas exactas de la hoja `escuelas_seleccionadas`.
2. Las coordenadas (latitud, longitud) son necesarias para el mapa.
3. El estado inicial debe ser `pendiente` para todas las escuelas.
4. Importar el CSV a la hoja usando **Archivo → Importar** en Google Sheets.

**Ejemplo de fila:**
```
ESC_001,12345,Escuela Básica Nro 1 Prof. Juan Pérez,Central,Luque,Luque Centro,Urbana,-25.2695,-57.4861,pendiente,,,
```

---

## Consideraciones de seguridad

- Las contraseñas se almacenan como hashes SHA-256 (nunca en texto plano).
- Los tokens de sesión se regeneran en cada login.
- La sesión expira automáticamente a las 8 horas.
- Todos los endpoints validan el token antes de procesar.
- El log de auditoría registra todas las acciones sensibles.
- Google Apps Script maneja CORS automáticamente.

---

## Actualizar la Web App de GAS

Cada vez que modifiques el código de GAS:
1. En el editor: **Implementar → Administrar implementaciones**.
2. Seleccionar la implementación existente → **Editar** (ícono del lápiz).
3. En **Versión**, seleccionar **Nueva versión**.
4. Guardar y la URL permanece igual.

---

## Dependencias externas (CDN)

| Biblioteca | Versión | Uso |
|-----------|---------|-----|
| Leaflet | 1.9.4 | Mapa interactivo |
| Leaflet.markercluster | 1.5.3 | Agrupación de marcadores |
| Chart.js | 4.4.0 | Gráficos estadísticos |

Todas se cargan desde CDN en el `index.html`. No requieren instalación.

---

## Soporte

- **Email:** soporte@cialpa.gov.py
- **Repositorio:** https://github.com/censoescuelaspy/CIALPAappencuesta

---

*CIALPA — Relevamiento Escolar v2.0.0 · Paraguay 2025*
