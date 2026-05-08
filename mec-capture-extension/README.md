# CIALPA Captura MEC

Prueba de factibilidad para capturar, con consentimiento del encuestador, cambios realizados dentro de la app demo RUE/MEC.

## Hallazgos de la prueba

- La URL `https://demo.mec.gov.py/demo_rue/infraestructuras_fiscalizaciones_v3/index` redirige a `/demo_rue/login` si no hay sesión.
- El servidor devuelve `X-Frame-Options: SAMEORIGIN`, por lo que no se puede embeber la app del MEC dentro de la app CIALPA con un iframe.
- La alternativa viable sin modificar la app del MEC es una extensión de navegador instalada por el encuestador.

## Instalación

1. Abrir Chrome o Edge.
2. Ir a `chrome://extensions`.
3. Activar `Modo desarrollador`.
4. Cargar esta carpeta con `Cargar descomprimida`.
5. Entrar a `https://demo.mec.gov.py/demo_rue/login`.
6. Abrir el icono de la extensión y verificar que aparezcan eventos.

## Seguridad

La prueba excluye campos sensibles por nombre o tipo:

- passwords
- captcha
- tokens CSRF/autenticidad
- campos ocultos

Los eventos se guardan localmente en la extensión. Si se configura un endpoint, también se envían por `POST` como JSON.

## Tiempos capturados

Cada evento incluye:

- contexto CIALPA cuando la jornada se abre desde `mec-jornada.html`;
- `pageSessionId`: identificador de la visita al formulario.
- `pageLoadedAt`: momento de carga de la página.
- `elapsedMs`: milisegundos desde la carga hasta el cambio.
- `firstInteractionElapsedMs`: tiempo hasta la primera interacción.
- `sequence`: orden de captura dentro de la página.

## Tipos de evento emitidos

- `page_ready`: la página del MEC se cargó y se contó la cantidad de campos visibles.
- `context_set`: la URL traía contexto CIALPA codificado y se asoció a la pestaña.
- `field_captured` con `eventType=change`: cambio en select, radio, checkbox.
- `field_captured` con `eventType=input`: tipeo en text/number/date/textarea.
- `field_captured` con `eventType=blur`: el campo perdió foco, incluye `timeOnFieldMs`.
- `button_clicked`: click en `button`, `input[type=button]`, `[data-action]` o `a[role=button]` (sirve para detectar Siguiente, Guardar, Cancelar, etc.).
- `form_submitted`: se envió un formulario, incluye `capturedFieldCount` para estimar duración total.

## Migración del receptor Apps Script

El receptor agrega tres columnas nuevas: `time_on_field_ms`, `button_label`, `button_action`. La hoja `captura_mec_eventos` se crea sólo la primera vez. Si ya existía una hoja con cabeceras viejas, borrarla o renombrarla antes del próximo `doPost` para que el receptor la regenere con la nueva estructura.

## Siguiente prueba requerida

Entrar con un usuario real del MEC y navegar al formulario de infraestructura. La extensión debería capturar los cambios en `select`, `radio`, `checkbox`, `input` y `textarea` siempre que los campos existan en el DOM de la página.
