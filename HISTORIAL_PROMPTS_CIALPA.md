# Historial de instrucciones CIALPA

Ultima actualizacion: 2026-07-17 06:02 America/Asuncion

Este archivo conserva decisiones de trabajo relevantes y sanitizadas. No incluye credenciales, tokens, datos personales ni transcripciones completas.

## 2026-07-17 - Version visible, imagenes de 100 m y movimiento de sanitarios

### Instruccion interpretada
- Explicar y corregir por que la app publica seguia mostrando la misma version.
- Entregar codigo de Earth Engine para descargar imagenes alrededor de cada escuela de la muestra vigente, usando un radio de `100 m`.
- Reducir a la mitad el grosor de paredes de aulas y sanitarios y corregir el movimiento de un sanitario colocado dentro de un aula.

### Decisiones
- Distinguir la satelital Google usada como visualizacion de una coleccion `ee.ImageCollection` realmente exportable.
- Sustituir la lista anterior del ejemplo por la muestra Capital/Central vigente y crear lotes controlados con preflight obligatorio.
- Mantener el movimiento fino de artefactos, pero hacer que el primer arrastre sobre un artefacto no seleccionado mueva el sanitario completo.
- No iniciar tareas ni afirmar que existen imagenes nuevas mientras fallen el acceso NICFI, la cuota del proyecto y la validacion de licencia.

### Resultado
- Version local alineada como `v2.6.211`; al diagnosticar, GitHub Pages aun entregaba `v2.6.208` porque `v2.6.210` no habia sido publicada.
- Codigo NICFI y variante Sentinel-2 generados para `86` escuelas con nombres y coordenadas validas: `15` Capital y `71` Central, radio circular de `100 m` y tandas de `25`.
- Espesores de pared reducidos a la mitad y arrastre del sanitario padre corregido cuando el gesto empieza sobre un inodoro u otro artefacto.
- Validacion estatica aprobada, dry-run sin tareas y prueba Playwright del sanitario repetida `3/3`; la exportacion real sigue detenida por permiso NICFI y modo restringido de `rapy-415107`.

## 2026-07-16 - Manual de campo, perímetro editable e imágenes escolares de 100 m

### Instrucción interpretada
- Retirar cuatro pestañas señaladas, agregar un manual paso a paso para encuestadores y vincular ayudas `(i)` del cuestionario con sus capítulos.
- Facilitar el movimiento y ajuste de perímetros existentes.
- Preparar el código y la cadena de incorporación de imágenes Earth Engine en radios de `100 m` para todas las escuelas posibles.

### Decisiones
- Ocultar los accesos operativos de módulos retirados sin borrar datos ni romper rutas administrativas históricas.
- Mantener el perímetro protegido por defecto y separar claramente movimiento completo de edición de vértices, con guardar, cancelar y deshacer.
- Usar un índice JSON por escuela para imágenes finitas y conservar la satelital estable como respaldo.
- Procesar Earth Engine en lotes controlados y no iniciar tareas mientras fallen cuota, acceso a NICFI o confirmación de licencia.

### Resultado
- Manual integrado, documento imprimible, ayudas contextuales y paquete offline preparados en `v2.6.210`.
- Flujo reproducible generado para `5.016` escuelas con coordenadas de un total de `5.448`; `432` quedan sin exportación hasta corregir ubicación.
- Pruebas focalizadas y auditoría integral aprobadas en escritorio, tableta y móvil para menú, manual, ayudas, perímetro, imagen por índice y recursos offline.
- Preflight detenido sin exportaciones por modo restringido de `rapy-415107` y falta de acceso a la colección NICFI.
- No se realizó commit, push, deployment ni publicación de imágenes.

## 2026-07-16 - Simulacion integral y correccion de regresiones

### Instruccion interpretada
- Ejecutar varias simulaciones para verificar la app completa, corregir fallas reproducibles y dejar evidencia proporcional al riesgo.

### Decisiones
- Usar modo demo y datos sinteticos para no contaminar registros productivos.
- Comparar el padron local, el catalogo publico, las pestanas oficiales y el diagnostico del backend antes de evaluar filtros y conteos.
- Ampliar la auditoria de `15` elementos del menu a las `20` vistas reales y cubrir roles, cuentas demo, persistencia, exportacion, mapa completo, Atlas, cuestionario y PWA offline.
- Convertir en aserciones los hallazgos de accesibilidad, desbordes, errores de consola, solicitudes inesperadas y solapamientos.

### Resultado
- Padron exacto `5448/5016`, muestra exacta `86`, y simulaciones demo de hasta `1000` respuestas sobre los `18` departamentos.
- Se corrigieron el recorrido incompleto de auditoria geografica, el alcance y las rutas de los comandos de prueba, cache obsoleto del cuestionario, etiquetas y contraste, y dos defectos de la barra movil del Registro guiado.
- Version local `2.6.209`: tres barridos responsive de las `20` vistas y `10/10` escenarios funcionales de escritorio aprobados, sin errores, violaciones Axe, desbordes ni solapamientos.
- La app publica permanece en `2.6.208`; no se hizo commit, push, deployment ni escritura productiva.
- Queda pendiente una prueba autenticada real con credenciales de ensayo para altas, cierres y sincronizacion GAS por rol.

## 2026-07-16 - Recuperacion del filtro de muestra del mapa

### Instruccion interpretada
- Explicar y corregir por que el mapa dejo de permitir una vista confiable de las escuelas de la muestra piloto.

### Decisiones y resultado
- Confirmar primero que la hoja oficial conserva `5448` escuelas, `86` codigos piloto y coincidencia exacta entre ambas pestanas.
- Separar el cache del listado por la version del marco MEC para evitar reutilizar la muestra anterior durante 24 horas.
- Incorporar un acceso directo `Solo muestra (86)`, con estado activo visible y recarga automatica cuando el conteo no coincide.
- Endurecer la prueba funcional para validar el cambio efectivo del total mostrado por el mapa.
- Corregir `Limpiar` para vaciar los filtros ocultos y conservar el ultimo listado unicamente como respaldo offline.
- Validacion real: `5448` escuelas pasan a `86` al activar la muestra; pruebas responsive y de accesibilidad aprobadas.
- `v2.6.208` publicada en `origin/main` con commit funcional `8f42f22`; GitHub Pages y la prueba funcional publica quedaron aprobados.

## 2026-07-16 - Piloto Capital y Central y revision integral

### Instruccion interpretada
- Restringir el piloto a Capital y Central.
- Sustituir las instituciones de Alto Parana cuando la muestra reducida no alcance la representatividad prevista.
- Reevaluar e implementar mejoras integrales de estilo, formato, accesibilidad y funcionalidad.
- Instalar las dependencias locales necesarias.

### Decisiones
- Mantener las `55` instituciones historicas que siguen dentro del nuevo dominio.
- Agregar `31` reemplazos de Capital y Central para conservar `n=86`, error maximo estimado menor a `10 %` y cobertura de los `20` distritos.
- Actualizar la hoja oficial con respaldo y hoja de control ocultos.
- Mantener danos y fallas, y comunicar el alcance de captura arquitectonica, electrica, desague y agua.
- Usar iconos Lucide empaquetados localmente y pruebas Playwright/Axe reproducibles.
- Hacer commit y push solo despues de la instruccion expresa de publicacion recibida en el cierre.

### Archivos y servicios afectados
- Script e informe de la muestra Capital/Central.
- Libro Excel operativo de la muestra.
- Hoja oficial `muestra_piloto_def` y sus respaldos de control.
- Frontend, estilos, service worker, configuracion y pruebas UI de CIALPA.

### Resultado
- Muestra final: `86` escuelas, `15` Capital y `71` Central; `0` Alto Parana.
- Interfaz `v2.6.207` preparada y publicada en `origin/main` con alcance piloto visible, controles activos, mejor uso movil y correcciones de accesibilidad.
- Validaciones automatizadas y apertura real del XLSX completadas; los `15` modulos registran cero violaciones Axe, errores y desbordes en escritorio, tableta y movil.
- La seleccion se reprodujo nuevamente desde los Excel fuente con el mismo digest de codigos y sin campos personales de contacto.

### Cierre
- Commit y push autorizados para `v2.6.207`.
- Verificacion HTTP con cache-busting prevista despues de que GitHub Pages termine el despliegue.
