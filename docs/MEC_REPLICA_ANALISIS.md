# Analisis para replica del cuestionario MEC en CIALPA

Fecha: 2026-05-08

## Objetivo

Reconstruir dentro de CIALPA una version funcionalmente equivalente del cuestionario web MEC/RUE de infraestructura educativa, usando como fuente principal el `manual/MANUAL_ENCUESTADOR_CIALPA.md` y las capturas reales ubicadas en `manual/assets/image1.PNG` a `manual/assets/image54.png`.

La meta no es solamente abrir el sistema MEC, sino capturar los datos en CIALPA con mayor estabilidad, validaciones propias, guardado parcial y posterior exportacion/migracion hacia MEC o hacia el formato que MEC acepte.

## Estado actual de la app

La app publicada actualmente es una consola operativa de campo:

- login CIALPA;
- mapa/listado de escuelas;
- seleccion de local escolar;
- inicio/cierre de relevamiento;
- medicion de tiempos por modulo;
- incidencias;
- manual integrado;
- apertura de una app/formulario externo.

El archivo `assets/js/survey.js` aun modela el cuestionario MEC solo como control de tiempos. No contiene los campos reales del formulario. Por tanto, para replicar MEC se requiere una nueva capa de captura tecnica.

## Fuentes revisadas

- `manual/MANUAL_ENCUESTADOR_CIALPA.md`
- `MANUAL_ENCUESTADOR_CIALPA.md`
- `manual/assets/image1.PNG` a `manual/assets/image54.png`
- `assets/js/survey.js`
- `index.html`

Las capturas confirman que el formulario MEC usa un patron visual de acordeones, secciones numeradas, radios, inputs pequenos para cantidades/dimensiones, tablas repetibles y botones para agregar registros por modulo.

## Modulos MEC a replicar

1. Acceso RUE
2. Pantalla principal / estructura de modulos
3. General
4. Servicios
5. Electricidad
6. Bloques y Plantas
7. Areas de Recreacion
8. Aula
9. Dependencias
10. Laboratorio
11. Taller
12. Sanitarios
13. Control de calidad y cierre

La pantalla principal MEC muestra acordeones:

- General
- Servicios
- Electricidad
- Bloques y Plantas
- Areas de Recreacion
- Aula
- Dependencias
- Laboratorio
- Taller
- Sanitarios

Los modulos con varios registros muestran contador, por ejemplo `Aula (1)`, `Sanitarios (2)`.

## Inventario funcional por modulo

### General

Campos y bloques principales:

- coordenadas: latitud, longitud, altitud;
- identificacion precargada: codigo de local, departamento, distrito, localidad;
- direccion y numero;
- nombre del director;
- instituciones asociadas;
- via de acceso: asfalto, adoquinado, empedrado, camino de tierra;
- cercado perimetral: presencia completa/incompleta/no;
- tipo de cercado: muralla, verjas, tejido, alambrado;
- areas exteriores: escenario, mastil, camineros, rampas;
- desague pluvial: canalizado, cielo abierto, no;
- seguridad: CCTV, detectores, pulsadores, luces de emergencia, extintores, sistema hidraulico.

Reglas:

- coordenadas deben estar dentro de Paraguay: latitud -19 a -28, longitud -54 a -63;
- si no hay cercado, saltar tipo de cercado;
- si hay elementos de seguridad, registrar cantidades y estado cuando aplique.

### Servicios

Campos:

- tiene agua: si/no;
- fuente principal: ESSAP, Junta de Saneamiento, red privada/comunitaria, pozo artesiano, pozo con bomba, pozo sin bomba, manantial, tajamar/rio/arroyo, lluvia, aguatero, otra;
- potencia HP si la fuente es pozo con bomba;
- cuenta con bano/instalaciones sanitarias: si/no;
- desague sanitario: cloaca, camara septica y pozo ciego, pozo ciego, superficie/zanja/arroyo/rio, letrina ventilada, letrina comun, letrina sin techo/puerta, otro;
- internet: si/no;
- tipo de conexion: fibra, ADSL, movil, satelital u otro.

Reglas:

- si no tiene agua, saltar detalle de fuente;
- si la fuente es pozo con bomba, HP debe ser obligatorio;
- si no hay sanitarios, saltar tipo de desague.

### Electricidad

Campos:

- tiene energia electrica;
- provision: ANDE, generador privado, otro;
- tiene medidor;
- tiene acometida;
- cantidad de acometidas;
- estado de acometida;
- tipo de instalacion: trifasica/monofasica;
- tablero principal;
- estado y capacidad del tablero principal;
- tablero seccional;
- cantidad y estado de tableros seccionales;
- puesta a tierra;
- potencia maxima disponible;
- potencia instalada;
- potencia requerida;
- frecuencia de cortes.

Reglas:

- si no tiene energia, saltar el resto del modulo y pasar a Bloques y Plantas.

### Bloques y Plantas

Modulo repetible por combinacion bloque-planta.

Campos:

- numero de bloque;
- planta/nivel;
- rampas en el bloque: cumple INTN, no cumple, no;
- galeria: si/no, largo, ancho;
- dimensiones del bloque: largo, ancho;
- tablero seccional del bloque: si/no, estado, capacidad;
- tipo de alimentacion electrica;
- instalacion electrica del bloque;
- cortes electricos propios del bloque;
- tabla de dependencias por tipo: aulas, direccion, secretaria, biblioteca, laboratorio/taller, salon multiuso, sala de profesores, area recreativa con techo, sanitarios.

Reglas:

- debe existir al menos un bloque-planta;
- si el local tiene un solo edificio de una planta, registrar Bloque 1 / Planta Baja;
- la cantidad de sanitarios declarada debe coincidir con modulo Sanitarios.

### Areas de Recreacion

Modulo repetible.

Campos:

- nombre del area;
- largo y ancho en metros;
- iluminacion exterior: funciona, no funciona, no;
- tiene techo;
- material del techo;
- estado del techo;
- material del piso;
- estado del piso;
- rampas de acceso.

Reglas:

- si no tiene techo, saltar material y estado del techo;
- dimensiones obligatorias.

### Aula

Modulo repetible, uno por aula.

Campos:

- bloque;
- planta;
- numero de aula;
- largo y ancho en metros;
- situacion: en uso, sin uso, en construccion;
- techo: material y defectos segun material;
- pared: material y defectos segun material;
- piso: material y estado;
- ventanas, puertas, instalacion electrica, iluminacion y observaciones segun capturas.

Reglas de techo:

- Losa H.A.: fisuras, huecos, goteras/humedad;
- Material ceramico: defectos en vigas/tirantes, tejuelones sin apoyo, piezas rotas, tirantes de distintas dimensiones, deslizamientos, goteras/humedad;
- Chapa termoacustica, zinc o fibrocemento: corrosion, chapas rotas, goteras/humedad;
- Paja con estructura de madera: saltar a pared.

Reglas de pared:

- Ladrillo: fisuras/grietas, desaplomado, revoque, desprendimiento, humedad;
- Madera: maderas rotas;
- Otro: saltar a piso.

### Dependencias

Modulo repetible para espacios que no son aulas, laboratorios, talleres ni sanitarios.

Campos:

- bloque;
- planta;
- nombre/tipo: direccion, secretaria, biblioteca, sala de profesores, cocina, deposito, etc.;
- largo/ancho;
- situacion;
- techo, pared y piso con las mismas reglas del modulo Aula;
- ventanas, puertas e instalaciones segun capturas.

Reglas:

- si esta en construccion, saltar datos estructurales.

### Laboratorio

Modulo repetible.

Campos:

- nombre/tipo de laboratorio;
- largo/ancho;
- situacion;
- techo, pared y piso con reglas de Aula;
- ventanas, puertas e instalaciones;
- observaciones para mesadas, piletas o instalaciones especiales.

Reglas:

- si esta en construccion, saltar al siguiente espacio.

### Taller

Modulo repetible.

Campos:

- nombre/tipo de taller;
- largo/ancho;
- situacion;
- techo, pared y piso con reglas de Aula;
- ventanas, puertas e instalaciones.

Reglas:

- mismas reglas de techo/pared/piso que Aula.

### Sanitarios

Modulo repetible, dimensiones en centimetros.

Campos:

- largo y ancho en cm;
- uso diferenciado: solo hombres, solo mujeres, indistinto;
- espacio accesible para discapacidad;
- ofrece educacion inicial;
- sanitarios incorporados a aulas de educacion inicial;
- divisorias internas;
- cantidad de boxes;
- estado de puertas de boxes;
- tipo y cantidad de artefactos: inodoro, mingitorio ceramica, mingitorio material, letrina, excusado municipal, lavatorio, ducha;
- estado de artefactos por tipo: bueno, regular, malo;
- perdidas o filtraciones: desague, agua corriente, no;
- techo, pared y piso con reglas de Aula.

Reglas:

- dimensiones son en cm, no metros;
- si no hay divisorias, saltar cantidad de boxes;
- si no ofrece educacion inicial, saltar sanitario dentro de aulas iniciales;
- la cantidad de sanitarios debe coincidir con Bloques y Plantas.

## Modelo de implementacion recomendado

### Fase 1: Esquema de cuestionario

Crear un esquema declarativo en JSON/JS con:

- modulos;
- secciones;
- campos;
- tipo de control: texto, numero, radio, select, checkbox, tabla, repetible;
- opciones;
- obligatoriedad;
- reglas de salto;
- unidades: m, cm, m2, HP, A, kVA;
- referencias a capturas del manual.

Este esquema debe ser la base para renderizar la interfaz, validar y exportar.

### Fase 2: Motor de formulario CIALPA

Construir un modulo nuevo, por ejemplo:

- `assets/js/mec-schema.js`
- `assets/js/mec-form.js`
- `assets/css/mec-form.css`

El motor debe soportar:

- acordeones como MEC;
- subformularios repetibles;
- guardado parcial local;
- autoguardado;
- validacion por modulo;
- reglas de salto;
- resumen de pendientes;
- control de calidad final.

### Fase 3: Persistencia

Agregar tablas/hojas para:

- `mec_respuestas`;
- `mec_registros_repetibles`;
- `mec_eventos_autoguardado`;
- `mec_exportaciones`;
- `mec_adjuntos` si se agregan evidencias.

### Fase 4: Migracion al MEC

Primero exportar datos en formato estructurado:

- JSON maestro;
- CSV/Excel plano por modulo;
- formato de importacion si MEC lo provee.

La carga automatizada directa al sitio MEC debe tratarse como ultima opcion, porque dependeria de permisos, sesion, captcha, cambios de interfaz y estabilidad del sistema externo.

## Riesgos y decisiones pendientes

- El manual describe muy bien el flujo, pero algunas capturas contienen campos adicionales no transcritos completamente, especialmente en ventanas, puertas e instalaciones.
- Las imagenes `image20.png` a `image23.png` pesan menos de 300 bytes; parecen placeholders o capturas corruptas. Hay que revisar si existen versiones originales mejores.
- Para una replica exacta, falta comparar contra el sistema MEC en vivo con una sesion valida.
- La migracion hacia MEC requiere definir canal: API/importador oficial, planilla normalizada, o robot de carga asistida.

## Proximo paso tecnico

Construir el primer prototipo del modulo `General` y `Servicios` dentro de CIALPA usando esquema declarativo, con guardado parcial local. Luego replicar Electricidad y los modulos repetibles.
