# Historial de instrucciones CIALPA

Ultima actualizacion: 2026-07-16 09:44 America/Asuncion

Este archivo conserva decisiones de trabajo relevantes y sanitizadas. No incluye credenciales, tokens, datos personales ni transcripciones completas.

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
- Commit y push de `v2.6.208` autorizados expresamente para publicar la correccion.

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
