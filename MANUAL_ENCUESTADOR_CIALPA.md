---
title: "Manual del Encuestador"
subtitle: "Relevamiento de Infraestructura Educativa, CIALPA"
version: "4.0 operativa"
date: "2026-04-28"
format: "markdown"
audience: "Encuestadores, supervisores, coordinadores de campo y soporte técnico"
---

# Manual del Encuestador

**Relevamiento de Infraestructura Educativa, CIALPA**  
**Versión 4.0 operativa, 2026**  
**Uso previsto:** prepiloto, piloto y encuesta grande.  
**Formato:** Markdown para visualización dentro de la app web y para control de versiones en repositorio.

> **Idea central del manual:** la app web CIALPA no sustituye el cuestionario técnico externo del MEC/RUE/Apps. La app web funciona como consola operativa de campo, permite seleccionar la escuela, abrir el aplicativo externo cuando está instalado en el dispositivo, registrar el inicio y cierre del relevamiento, medir tiempos totales y por módulo, documentar incidencias, ordenar la jornada y entregar información útil para supervisión, cronogramas y control de calidad.

## Tabla de contenido operativa

1. Propósito del manual y alcance de la app web CIALPA.
2. Diferencia entre app web CIALPA y aplicativo externo de encuesta.
3. Roles, responsabilidades y flujo general de trabajo.
4. Preparación antes de salir a campo.
5. Acceso a la app web CIALPA.
6. Reconocimiento de escuelas asignadas.
7. Inicio de jornada y llegada al local escolar.
8. Apertura del aplicativo externo con el botón **Aplicar encuesta**.
9. Medición del tiempo total y del tiempo por módulos.
10. Registro de incidencias, reprogramaciones y evidencias.
11. Cierre del relevamiento y control de consistencia.
12. Supervisión, seguimiento y uso de los datos operativos.
13. Guía detallada del cuestionario externo, según el documento técnico del instrumento.
14. Preguntas frecuentes y glosario.

---

## 1. Propósito del manual y alcance de la app web CIALPA

Este manual establece el procedimiento operativo que debe seguir el encuestador para usar la app web CIALPA durante el relevamiento de infraestructura educativa. La finalidad es asegurar que cada visita a una escuela quede registrada con trazabilidad mínima, tiempos confiables, estado de avance, incidencias documentadas y cierre verificable.

La app web CIALPA debe usarse en tres momentos:

1. **Antes de iniciar el cuestionario externo**, para seleccionar la escuela correcta, verificar los datos de identificación, iniciar la sesión de relevamiento y registrar la llegada.
2. **Durante el relevamiento**, para medir el tiempo por módulo, registrar eventos relevantes, documentar incidencias, anotar interrupciones y dejar evidencia operativa de lo realizado.
3. **Al finalizar**, para cerrar la sesión, consignar el folio o identificador del último registro del aplicativo externo, registrar observaciones finales y dejar constancia del estado del relevamiento.

El objetivo operativo no es solo completar el cuestionario. También se busca producir información para:

- planificar rutas y cronogramas;
- estimar duración real de levantamiento por tipo de escuela;
- detectar módulos complejos o de mayor tiempo;
- identificar problemas de acceso, conectividad, permisos o coordinación;
- comparar desempeño entre equipos, zonas y jornadas;
- estimar cargas de trabajo para la encuesta grande;
- apoyar decisiones de supervisión y reasignación de visitas.

---

## 2. Diferencia entre app web CIALPA y aplicativo externo de encuesta

La operación utiliza dos herramientas complementarias:

| Herramienta | Función principal | Quién controla la herramienta | Qué datos registra |
|---|---|---|---|
| **App web CIALPA** | Gestión operativa del trabajo de campo | Equipo CIALPA | Escuela asignada, usuario, estado, inicio, cierre, tiempos, módulos, GPS, incidencias, observaciones, folio externo |
| **Aplicativo externo de encuesta** | Captura técnica del cuestionario de infraestructura | MEC/RUE/Apps u otro proveedor externo | Respuestas del instrumento técnico sobre infraestructura, servicios, aulas, sanitarios, dependencias y demás módulos |

La app web CIALPA puede abrir o intentar abrir el aplicativo externo mediante el botón **Aplicar encuesta**, siempre que el dispositivo y la configuración lo permitan. Sin embargo, la app web no controla internamente ese aplicativo externo. Por ese motivo, el encuestador debe volver a la app web CIALPA al terminar cada módulo o al cerrar el cuestionario, para registrar el avance y dejar evidencia de finalización.

> **Regla operativa:** ningún relevamiento debe cerrarse en CIALPA si no se completó el cierre en el aplicativo externo o, en su defecto, si no se registró claramente el motivo de cierre parcial, interrupción o reprogramación.

---

## 3. Roles, responsabilidades y flujo general de trabajo

### 3.1 Roles principales

| Rol | Responsabilidad operativa |
|---|---|
| **Encuestador** | Ejecuta la visita, abre la encuesta externa, registra tiempos, módulos, incidencias, cierre y observaciones. |
| **Supervisor** | Monitorea avance, valida cierres, revisa incidencias, autoriza revisitas y verifica consistencia operativa. |
| **Coordinador de campo** | Organiza equipos, cronogramas, asignaciones, rutas, prioridades y comunicación institucional. |
| **Soporte técnico** | Atiende problemas de acceso, carga de escuelas, apertura del aplicativo externo, conectividad y sincronización. |
| **Administrador** | Configura usuarios, parámetros del sistema, URL o esquema de apertura externa, hojas de datos y catálogos. |

### 3.2 Flujo estándar de una visita

1. Ingresar a la app web CIALPA.
2. Verificar usuario, rol y escuela asignada.
3. Confirmar que la escuela figura en la lista y en el mapa.
4. Iniciar la jornada si corresponde.
5. Seleccionar la escuela.
6. Registrar llegada al local escolar.
7. Presionar **Aplicar encuesta**.
8. Confirmar el inicio de la sesión de relevamiento.
9. Abrir el aplicativo externo.
10. Completar el cuestionario técnico externo.
11. Registrar tiempos por módulo en CIALPA, cuando sea posible.
12. Registrar incidencias, interrupciones o eventos relevantes.
13. Cerrar la encuesta externa.
14. Volver a CIALPA.
15. Registrar folio externo, último registro o identificador disponible.
16. Cerrar el relevamiento en CIALPA.
17. Verificar que el estado de la escuela cambie a **Finalizada**, **Parcial** o **Con incidencia**, según corresponda.

---

## 4. Preparación antes de salir a campo

### 4.1 Verificación del dispositivo

Antes de la salida, el encuestador debe confirmar:

- batería cargada;
- cargador y batería externa disponibles;
- navegador actualizado;
- permisos de ubicación activados;
- acceso a internet probado;
- aplicativo externo instalado;
- credenciales del aplicativo externo disponibles;
- credenciales de la app web CIALPA disponibles;
- cámara funcional;
- espacio libre suficiente para fotos o evidencias;
- fecha y hora del dispositivo correctamente configuradas.

### 4.2 Materiales mínimos

- dispositivo móvil, tableta o notebook;
- cinta métrica;
- bolígrafo y libreta de respaldo;
- credencial o nota institucional;
- lista de escuelas asignadas;
- contacto del supervisor;
- contacto del responsable de la institución educativa;
- elementos de seguridad personal, si el operativo lo requiere.

### 4.3 Validación de escuelas asignadas

El encuestador debe revisar en la app web que cada escuela asignada tenga, como mínimo:

| Dato | Uso operativo |
|---|---|
| Código de local | Identificador único para evitar duplicaciones. |
| Nombre del local escolar | Verificación con responsable institucional. |
| Departamento y distrito | Control de ruta y agregación estadística. |
| Coordenadas | Navegación, mapa y control de llegada. |
| Estado | Priorización de visitas pendientes, parciales o con incidencia. |
| Encuestador o equipo asignado | Responsabilidad operativa. |

Si una escuela no aparece en la lista, aparece duplicada o tiene datos incompatibles, no debe corregirse informalmente en campo. Debe reportarse al supervisor o al administrador de datos para su corrección en la hoja maestra.

---

## 5. Acceso a la app web CIALPA

### 5.1 Ingreso

1. Abrir el enlace oficial de la app web CIALPA.
2. Ingresar usuario y contraseña.
3. Presionar **Ingresar**.
4. Verificar que aparezcan las pestañas correspondientes al rol asignado.
5. Confirmar que el nombre de usuario visible sea correcto.

### 5.2 Problemas frecuentes de acceso

| Situación | Acción recomendada |
|---|---|
| Credenciales inválidas | Verificar mayúsculas, minúsculas y usuario. Si persiste, contactar soporte. |
| La app no carga | Verificar conexión, recargar la página, probar otro navegador. |
| No aparecen escuelas | Actualizar datos, revisar filtros, cerrar sesión y volver a ingresar. Si persiste, reportar. |
| Usuario sin permisos | Contactar al administrador para revisar rol y asignación. |

### 5.3 Cierre de sesión

Al terminar la jornada o cuando el dispositivo quede sin supervisión, debe cerrarse sesión. Esto reduce el riesgo de registros asignados a un usuario incorrecto.

---

## 6. Reconocimiento de escuelas asignadas

La app web debe mostrar las escuelas por lista y, cuando existan coordenadas válidas, también por mapa. El encuestador debe usar ambos recursos:

- **lista**, para buscar por código, nombre, departamento, distrito o estado;
- **mapa**, para validar ubicación, cercanía, ruta y agrupación territorial;
- **panel de detalle**, para confirmar datos operativos antes de iniciar.

### 6.1 Revisión de datos de escuela

Antes de iniciar la encuesta, validar:

1. código de local;
2. nombre del local escolar;
3. departamento;
4. distrito;
5. localidad o dirección de referencia;
6. coordenadas;
7. equipo o encuestador asignado;
8. estado actual del relevamiento.

### 6.2 Estados operativos

| Estado | Significado | Acción del encuestador |
|---|---|---|
| **Pendiente** | Aún no se inició el relevamiento. | Puede iniciar visita y encuesta. |
| **En curso** | Existe una sesión activa. | Revisar si corresponde al mismo encuestador o a otra persona. |
| **Parcial** | Se inició pero no se completó todo. | Continuar solo con autorización o instrucción del supervisor. |
| **Finalizada** | Relevamiento cerrado. | No reabrir salvo instrucción expresa. |
| **Con incidencia** | Hubo problema operativo o técnico. | Revisar observación y coordinar solución. |
| **Reprogramada** | Requiere nueva visita. | Cumplir fecha y motivo indicado. |

---

## 7. Inicio de jornada y llegada al local escolar

### 7.1 Inicio de jornada

La jornada permite medir la carga diaria real de trabajo. Debe iniciarse cuando el equipo comienza sus actividades de campo, no cuando ya terminó la primera encuesta.

Registrar, cuando la app lo solicite:

- fecha;
- hora de inicio;
- encuestador;
- zona o ruta;
- vehículo o medio de traslado, si aplica;
- observaciones de salida;
- supervisor responsable.

### 7.2 Llegada al local

Al llegar a la escuela:

1. seleccionar la escuela correcta;
2. confirmar ubicación;
3. registrar llegada;
4. permitir captura de GPS, si el navegador lo solicita;
5. registrar observación si la ubicación difiere del punto del mapa;
6. confirmar contacto con director, encargado o responsable institucional.

### 7.3 Casos especiales al llegar

| Caso | Registro esperado |
|---|---|
| Escuela cerrada | Registrar incidencia, foto externa si corresponde, hora de llegada y propuesta de revisita. |
| No está el responsable | Registrar incidencia y coordinar nuevo horario. |
| Escuela no coincide con el punto del mapa | Registrar coordenadas observadas y observación. |
| Rechazo a la encuesta | Registrar incidencia crítica y avisar al supervisor. |
| Riesgo de seguridad | Suspender la visita y comunicar al supervisor. |

---

## 8. Apertura del aplicativo externo con el botón Aplicar encuesta

El botón **Aplicar encuesta** debe usarse para iniciar el flujo del cuestionario técnico externo. Según la configuración del sistema y del dispositivo, el botón puede:

- abrir una URL del formulario;
- abrir una app instalada mediante esquema personalizado;
- abrir una intención de Android;
- mostrar instrucciones si la apertura automática no es posible.

### 8.1 Procedimiento estándar

1. Seleccionar escuela en CIALPA.
2. Presionar **Aplicar encuesta**.
3. Revisar el mensaje de confirmación.
4. Presionar **Iniciar relevamiento**.
5. Esperar que CIALPA registre la hora de inicio.
6. Abrir el aplicativo externo cuando el dispositivo lo solicite.
7. Completar el cuestionario técnico.
8. Volver a CIALPA para registrar pausas, módulos o cierre.

### 8.2 Qué hacer si la app externa no abre

| Problema | Acción |
|---|---|
| El dispositivo no reconoce el enlace | Abrir manualmente la app externa instalada. Registrar observación. |
| Se abre el navegador, pero no la app | Verificar configuración del dispositivo y reportar a soporte. |
| La app externa pide credenciales | Ingresarlas según instrucción recibida. Si falla, registrar incidencia técnica. |
| El formulario no muestra la escuela | No continuar con otra escuela. Reportar al supervisor. |
| La app externa se cierra | Volver a abrir, registrar incidencia si hay pérdida de datos. |

> **Importante:** si el cuestionario se completa manualmente en la app externa, igual debe registrarse el inicio y cierre en CIALPA. CIALPA mide el tiempo operativo y documenta la trazabilidad de la visita.

---

## 9. Medición del tiempo total y del tiempo por módulos

La medición de tiempo es una función crítica de la app web CIALPA. Permite estimar duración real del relevamiento y planificar la encuesta grande.

### 9.1 Tiempo total

El tiempo total se mide entre:

- **inicio de relevamiento en CIALPA**, antes o al momento de abrir el aplicativo externo;
- **cierre de relevamiento en CIALPA**, después de completar el último registro del cuestionario externo o al declarar cierre parcial.

La duración registrada no debe ser editada manualmente por el encuestador. Si hubo pausas largas, interrupciones o problemas, deben documentarse en observaciones.

### 9.2 Tiempo por módulos

Cuando el relevamiento sea complejo, el encuestador debe registrar el inicio y cierre de módulos. Esta medición permite identificar módulos críticos.

Módulos sugeridos para control de tiempo:

| Módulo operativo CIALPA | Correspondencia con el cuestionario |
|---|---|
| Identificación y coordenadas | Módulo General, datos de local |
| Exteriores y cercado | General, cercado, áreas exteriores, seguridad |
| Servicios básicos | Agua, saneamiento, internet |
| Electricidad | Energía, acometida, tableros, potencias |
| Bloques y plantas | Registro de bloques, niveles y dependencias |
| Áreas de recreación | Patios, canchas, galerías y espacios abiertos |
| Aulas | Relevamiento individual de aulas |
| Dependencias | Dirección, secretaría, biblioteca, cocina, sala de profesores y otros |
| Laboratorios y talleres | Laboratorio, taller o espacios técnicos |
| Sanitarios | Baños, boxes, artefactos, accesibilidad y estado |
| Evidencias y revisión final | Fotos, observaciones, consistencia y cierre |

### 9.3 Reglas para registrar módulos

- Iniciar un módulo cuando se comienza efectivamente su relevamiento.
- Cerrar el módulo al terminar la captura o revisión de ese bloque de preguntas.
- No dejar módulos abiertos al cerrar el relevamiento.
- Registrar observación si el módulo se interrumpió.
- Si se trabaja en paralelo con otro miembro del equipo, aclarar en observaciones qué parte fue realizada por cada persona.

### 9.4 Interpretación de tiempos

Los tiempos obtenidos se usarán para estimar:

- duración promedio por escuela;
- duración por tamaño o complejidad del local;
- duración por departamento o distrito;
- módulos de mayor carga;
- necesidades de personal;
- número de visitas por jornada;
- planificación del cronograma de la encuesta grande.

---

## 10. Registro de incidencias, reprogramaciones y evidencias

### 10.1 Cuándo registrar una incidencia

Debe registrarse incidencia cuando ocurra cualquier situación que afecte el relevamiento, por ejemplo:

- escuela cerrada;
- responsable ausente;
- negativa o postergación;
- falta de conectividad;
- error del aplicativo externo;
- imposibilidad de abrir la app externa;
- GPS no disponible;
- ubicación incorrecta;
- datos de escuela no reconocidos;
- problemas de seguridad;
- daños estructurales graves que requieren aviso inmediato;
- interrupción por lluvia, corte de energía u otro evento.

### 10.2 Clasificación sugerida

| Tipo | Ejemplos |
|---|---|
| Operativa | Responsable ausente, escuela cerrada, horario incompatible. |
| Técnica | Error de app, problemas de login, sincronización fallida. |
| Geográfica | Coordenadas incorrectas, ruta inaccesible, ubicación dudosa. |
| Institucional | Negativa, falta de autorización, solicitud de nota oficial. |
| Seguridad | Riesgo físico, conflicto, condiciones climáticas extremas. |
| Calidad de datos | Duplicidad, código incorrecto, escuela no encontrada. |

### 10.3 Reprogramación

Toda reprogramación debe indicar:

- motivo;
- fecha tentativa;
- responsable contactado;
- medio de contacto;
- autorización del supervisor, si corresponde;
- observación breve y objetiva.

### 10.4 Evidencias

Las evidencias pueden ser fotografías, capturas de pantalla, observaciones, registros de GPS o folios externos. Deben ser pertinentes y respetar las reglas institucionales de privacidad.

---

## 11. Cierre del relevamiento y control de consistencia

### 11.1 Cierre normal

Al terminar el cuestionario externo:

1. volver a CIALPA;
2. revisar módulos abiertos;
3. cerrar módulos pendientes;
4. registrar folio externo o identificador disponible;
5. registrar último registro externo, si el aplicativo lo muestra;
6. confirmar si el relevamiento fue completo;
7. registrar observaciones finales;
8. presionar **Finalizar relevamiento**;
9. verificar que la escuela cambie de estado.

### 11.2 Cierre parcial

Debe usarse cierre parcial si:

- no se pudo completar todo el cuestionario;
- faltaron dependencias, aulas o sanitarios;
- se perdió conectividad o acceso;
- el responsable solicitó continuar otro día;
- hubo interrupción justificada.

El cierre parcial debe incluir módulo pendiente, motivo, tiempo acumulado y propuesta de continuidad.

### 11.3 Control mínimo antes de finalizar

| Verificación | Criterio |
|---|---|
| Escuela correcta | Código y nombre coinciden con la asignación. |
| Inicio registrado | Existe hora de inicio en CIALPA. |
| Aplicativo externo usado | Se abrió o se registró motivo de apertura manual. |
| Módulos cerrados | No quedan módulos abiertos sin explicación. |
| Folio externo | Se registra si el aplicativo lo genera. |
| Último registro externo | Se registra si está disponible. |
| Incidencias | Se cargaron las incidencias ocurridas. |
| Observación final | Describe cierre completo, parcial o reprogramado. |
| Estado actualizado | La escuela cambia a estado final coherente. |

---

## 12. Supervisión, seguimiento y uso de los datos operativos

Los datos registrados en CIALPA permiten construir indicadores de gestión de campo:

| Indicador | Uso |
|---|---|
| Escuelas pendientes, en curso, finalizadas y con incidencia | Seguimiento general del operativo. |
| Tiempo promedio por escuela | Planificación de cargas de trabajo. |
| Tiempo promedio por módulo | Identificación de secciones complejas. |
| Incidencias por tipo | Mejora logística y técnica. |
| Relevamientos por encuestador | Seguimiento de productividad. |
| Duración por departamento o distrito | Ajuste de cronogramas territoriales. |
| Escuelas reprogramadas | Gestión de revisitas. |
| Cierres parciales | Control de riesgo de datos incompletos. |

El supervisor debe revisar diariamente:

- sesiones abiertas sin cierre;
- escuelas marcadas como finalizadas sin folio externo;
- cierres parciales sin explicación;
- tiempos extremadamente bajos o altos;
- incidencias críticas;
- duplicaciones o cambios inesperados de estado;
- escuelas sin coordenadas o con coordenadas fuera de rango.

---

## 13. Guía detallada del cuestionario externo

La siguiente sección incorpora y adapta el contenido técnico del manual del instrumento externo. Se conserva la lógica de módulos, campos, reglas de salto, criterios de medición y control de calidad. Esta parte debe ser usada cuando el encuestador ya está dentro del aplicativo externo de encuesta.



*Pantalla principal del sistema , módulos del cuestionario en línea*

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Este manual explica, pantalla por pantalla,
cómo completar el cuestionario en línea para el Relevamiento de
Infraestructura Educativa. Cada sección incluye capturas del sistema,
descripción de los campos y reglas de salto.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **CONTENIDO**

| **1**  | **Introducción y objetivo**                             |
|--------|---------------------------------------------------------|
| **2**  | **Acceso al sistema**                                   |
| **3**  | **Pantalla principal , estructura de módulos**          |
| **4**  | **MÓDULO GENERAL**                                      |
| 4.1    | Coordenadas geográficas e identificación del local      |
| 4.2    | Instituciones asociadas                                 |
| 4.3    | Vía de acceso al local escolar                          |
| 4.4    | Cercado perimetral                                      |
| 4.5    | Áreas exteriores (escenario, mástil, camineros, rampas) |
| 4.6    | Desagüe pluvíal                                         |
| 4.7    | Seguridad y emergencias                                 |
| **5**  | **MÓDULO SERVICIOS**                                    |
| 5.1    | Abastecimiento de agua                                  |
| 5.2    | Servicio sanitario , tipo de desagüe                    |
| 5.3    | Servicio de internet                                    |
| **6**  | **MÓDULO ELECTRICIDAD**                                 |
| **7**  | **MÓDULO BLOQUES Y PLANTAS**                            |
| **8**  | **MÓDULO AREAS DE RECREACION**                          |
| **9**  | **MÓDULO AULAS**                                        |
| **10** | **MÓDULO DEPENDENCIAS**                                 |
| **11** | **MÓDULO LABORATORIO**                                  |
| **12** | **MÓDULO TALLER**                                       |
| **13** | **MÓDULO SANITARIOS**                                   |
| **14** | **Control de calidad y cierre**                         |
| **15** | **Preguntas frecuentes y glosario**                     |

# **1. INTRODUCCION Y OBJETIVO**

El Relevamiento de Infraestructura Educativa tiene como objetivo
documentar, de forma sistemática y estandarizada, las condiciones
físicas de los locales escolares de Paraguay: edificios, aulas,
servicios básicos, equipamiento y sistemas de seguridad. La información
recopilada sera la base para la planificación de inversiones y políticas
del sector educativo.

El cuestionario en línea esta organizado en módulos expandibles
(acordeon). Cada módulo agrupa preguntas relacionadas. Algunos campos se
habilitan o se saltan automáticamente según las respuestas prevías:
estas reglas se indican a lo largo del manual con cajas de color
naranja.

## **Equipo necesario en campo**

> • Dispositivo con navegador web actualizado (celular, tablet o PC).
>
> • Conexión a internet estable , el sistema funciona offline y
> sincroniza luego.
>
> • Cinta métrica: para dimensiónes de aulas, sanitarios y áreas de
> recreación.
>
> • GPS o aplicacion de mapas para verificar o corregir coordenadas.
>
> • Camara fotográfica o celular para registrar evidencias visuales.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>IMPORTANTE:</strong> Complete TODOS los campos obligatorios
antes de guardar. El sistema bloquea el avance si hay campos requeridos
vacíos. Los campos marcados con (*) en este manual son obligatorios.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **2. ACCESO AL SISTEMA , RUE (Registro Unico del Estudíante)**

El cuestionario se carga a través del sistema RUE del Ministerio de
Educación y Ciencias (MEC) de Paraguay. Para ingresar, acceda a la
página web del RUE y complete el formulario de acceso con sus datos
personales.

<img src="assets/image1.PNG"
style="width:4.5in;height:2.13083in" />

*Figura 0 , Pantalla de acceso al sistema RUE (Ministerio de Educación y
Ciencias)*

**Pasos para ingresar al sistema**

> • 1. Tipo de Documento: seleccione 'Cédula de Identidad' (opción por
> defecto).
>
> • 2. Nacionalidad: seleccione 'Paraguaya' (opción por defecto).
>
> • 3. N° Documento: ingrese su número de cédula de identidad SIN puntos
> ni guiones.
>
> • 4. Contraseña: ingrese la contraseña asignada por su coordinador.
>
> • 5. Ingresar como: campo opciónal , dejelo en blanco o seleccione el
> rol indicado por su supervisor.
>
> • 6. CAPTCHA: copie el código de letras que aparece en la imagen en el
> campo 'Escriba el texto aqui'.
>
> • Si el código es difícil de leer, haga clic en 'Actualizar código'
> para obtener uno nuevo.
>
> • 7. Haga clic en el boton 'Ingresar' para acceder al sistema.

| **Campo / Pregunta**  | **Descripción y guía de respuesta**                                                                                                       | **Req.** |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **Tipo de Documento** | Cédula de Identidad (valor por defecto). No modificar salvo indicacion del supervisor.                                                    | **Si**   |
| **Nacionalidad**      | Paraguaya (valor por defecto). Modificar solo si corresponde.                                                                             | **Si**   |
| **N° Documento**      | Su número de cédula de identidad paraguaya, sin espacios ni puntos.                                                                       | **Si**   |
| **Contraseña**        | Asignada en la capacitacion inicial. Si la olvido, use 'Recuperar Contraseña'.                                                            | **Si**   |
| **Ingresar como**     | Campo opciónal. Dejelo en blanco o seleccione el perfil indicado por su coordinador.                                                      | No       |
| **CAPTCHA (imagen)**  | Escriba exactamente las letras que aparecen en la imagen. Es sensible a mayusculas. Si no puede leerlo, haga clic en 'Actualizar código'. | **Si**   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>ATENCION:</strong> Si olvido su contraseña, haga clic en el
enlace 'Recuperar Contraseña' al pie del formulario de acceso. El
sistema envíara instrucciones a su correo electrónico registrado. Si no
recuerda el correo, comuníquese con su coordinador de campo.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>CONSEJO:</strong> El sistema RUE requiere conexión a internet
para iniciar sesion. Una vez dentro, puede trabajar con conectividad
limitada; sincronice los datos al final de cada jornada.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **3. PANTALLA PRINCIPAL , ESTRUCTURA DE MÓDULOS**

Al abrir el formulario de un local escolar vera la pantalla principal.
En la franja superior aparecen los datos pre-cargados del
establecimiento (departamento, distrito, código, nombre y dirección).
Debajo se presentan los módulos en forma de acordeon: haga clic en
cualquier módulo para expandirlo y responder sus preguntas.

<img src="assets/image2.png"
style="width:4in;height:3.97495in" />

*Figura 1 , Pantalla principal con los módulos del cuestionario*

Los módulos disponibles son:

| **Módulo**              | **Que se registra**                                                       |
|-------------------------|---------------------------------------------------------------------------|
| **General**             | Ubicacion GPS, identificación del local, cercado, exteriores y seguridad. |
| **Servicios**           | Agua potable, saneamiento, vía de acceso e internet.                      |
| **Electricidad**        | Suministro electrico, tipo de acometida, tableros y potencias.            |
| **Bloques y Plantas**   | Estructura edilicia: bloques, niveles, instalación eléctrica por bloque.  |
| **Áreas de Recreación** | Patios, canchas y cualquier espacio de esparcimiento.                     |
| **Aula**                | Relevamiento individual de cada aula: materiales, estado y dotacion.      |
| **Dependencias**        | Dirección, secretaria, biblioteca, sala de profesores, cocina, etc.       |
| **Laboratorio**         | Laboratorios de ciencias, computacion u otros.                            |
| **Taller**              | Talleres técnicos, de arte u oficios.                                     |
| **Sanitarios**          | Baños: dimensiónes, artefactos, estado y accesibilidad.                   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>CONSEJO:</strong> Los módulos que muestran un número entre
parentesis , por ej. «Bloques y Plantas (1)» , ya tienen al menos un
registro cargado. Haga clic para expandirlos y revisar o agregar
información.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **4. MÓDULO GENERAL**

El módulo General es el primero que debe completarse. Agrupa cuatro
grandes bloques: (1) ubicación geografica e identificación del local,
(2) cercado perimetral, (3) caracteristicas de las áreas exteriores y
(4) sistemas de seguridad contra incendio y emergencias.

## **4.1 Coordenadas geográficas e identificación del local**

Al expandir «General» vera la sección de coordenadas y la ficha de
identificación. La mayoria de los campos estan pre-cargados desde el
sistema; verifiquelos y corrija si hay errores.

<img src="assets/image3.png"
style="width:4in;height:3.97495in" />

*Figura 2 , Seccion de coordenadas GPS y datos de identificación del
local*

<img src="assets/image4.png"
style="width:4in;height:3.97495in" />

*Figura 3 , Ficha de identificación pre-cargada*

| **Campo / Pregunta**                    | **Descripción y guía de respuesta**                                                                                                                                                                               | **Req.** |
|-----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **Latitud / Longitud**                  | El sistema intenta obtenerlas automáticamente por GPS del dispositivo. Si aparece error de mapa, abra Google Maps, coloque el marcador sobre la escuela y copie las coordenadas. Precision de ±20 m es aceptable. | **Si**   |
| **Coordenada Z (altitud)**              | Altitud en metros sobre el nivel del mar. Puede dejarse en blanco si el GPS no la provee.                                                                                                                         | No       |
| **Codigo de local**                     | Pre-cargado. NO modificar: es el identificador unico del establecimiento.                                                                                                                                         | **Si**   |
| **Departamento / Distrito / Localidad** | Pre-cargados. Si son incorrectos, notifique al coordinador antes de continuar.                                                                                                                                    | **Si**   |
| **Dirección y N°**                      | Completar o corregir in situ (calle principal y número o referencia).                                                                                                                                             | **Si**   |
| **Nombre del Director**                 | Completar con el nombre completo del director/a vigente.                                                                                                                                                          | **Si**   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>IMPORTANTE:</strong> Rango valido para Paraguay: Latitud
entre -19 y -28 | Longitud entre -54 y -63. Si las coordenadas caen
fuera de este rango, el sistema lo advertira.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **4.2 Instituciones asociadas**

<img src="assets/image5.png"
style="width:4in;height:3.97495in" />

*Figura 4 , Instituciones que comparten el local escolar*

Indique si el predio es compartido con otras instituciones
(municipalidad, iglesia, INDI, organizacion comunitaria, etc.). Si hay
mas de una, registrelas todas. Si el local no comparte instalaciónes,
deje el campo en blanco o marque 'Ninguna'.

## **4.3 Vía de acceso al local escolar**

<img src="assets/image6.png"
style="width:4in;height:3.97495in" />

*Figura 5 , Tipo de vía principal de acceso*

Seleccione el tipo de superficie que predomina en el tramo final de
acceso:

> • Asfalto , pavimento liso y continuo.
>
> • Adoquinado , bloques rectangulares de hormigon o piedra.
>
> • Empedrado , piedras irregulares o canto rodado.
>
> • Camino de tierra , sin pavimentar, puede ser mejorado o no.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>IMPORTANTE:</strong> Marque UNA sola opción: la
correspondiente al tramo mas largo o predominante del recorrido final
hasta la entrada del local.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **4.4 Cercado perimetral**

<img src="assets/image7.png"
style="width:4in;height:3.97495in" />

*Figura 6 , Presencia del cercado perimetral*

<img src="assets/image8.png"
style="width:4in;height:3.97495in" />

*Figura 7 , Tipo de cercado perimetral*

| **Campo / Pregunta**          | **Descripción y guía de respuesta**                                                                                                                                                           | **Req.** |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **4.1 Presencia del cercado** | Si , Completo: el cercado rodea todo el perimetro sin interrupciones. Si , Incompleto: existe pero tiene sectores abiertos o deteriorados. No: el local no tiene ninguna delimitacion física. | **Si**   |
| **4.2 Tipo de cercado**       | Muralla (muro solido de ladrillo/hormigon) \| Verjas de hierro \| Tejido (alambre tejido tipo ciclón) \| Alambrado (alambres lisos o de puas). Solo si respondio 'Si' en 4.1.                 | No       |

| **SALTO:** Si respondio «No» → pase a Seccion 5 , Áreas Exteriores |
|--------------------------------------------------------------------|

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>CONSEJO:</strong> Si el cercado es incompleto, anote en
Observaciones el porcentaje estimado cubierto y el sector que falta (ej.
'frente sin cercar, aprox. 40%').</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **4.5 Áreas exteriores del local escolar**

Recorra el predio y verifique la presencia de cada elemento exterior
antes de responder. Si tiene dudas sobre algun termino, consulte el
Glosario al final de este manual.

<img src="assets/image9.png"
style="width:3.8in;height:3.7762in" />

*Figura 8 , Escenario / tarima exterior*

<img src="assets/image10.png"
style="width:3.8in;height:3.7762in" />

*Figura 9 , Mástil con plataforma de izamiento*

<img src="assets/image11.png"
style="width:3.8in;height:3.7762in" />

*Figura 10 , Camineros (sendas peatonales internas)*

<img src="assets/image12.png"
style="width:3.8in;height:3.7762in" />

*Figura 11 , Rampas de acceso para personas con discapacidad*

| **Campo / Pregunta**                          | **Descripción y guía de respuesta**                                                                                                                                                                     | **Req.** |
|-----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **5.1 Escenario**                             | Tarima o plataforma elevada al aire libre, usada para actos escolares. No confundir con el salon de actos interior.                                                                                     | **Si**   |
| **5.2 Mástil / plataforma de izamiento**      | Estructura (mástil o poste) con base o plataforma para izar la bandera nacional.                                                                                                                        | **Si**   |
| **5.3 Camineros**                             | Sendas pavimentadas o semi-pavimentadas dentro del predio que conectan edificios, entradas o sectores. Simples veredas de tierra no califican.                                                          | **Si**   |
| **5.4 Rampas para personas con discapacidad** | Si , Cumple norma INTN: ancho minimo 1,20 m, pendiente max. 8%, superficie antideslizante y pasamanos a ambos lados. Si , No cumple: existe rampa pero no cumple algun criterio INTN. No: no hay rampa. | **Si**   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> La norma INTN de accesibilidad exige: ancho ≥
1,20 m , pendiente ≤ 8% (1 cm de desnivel cada 12 cm de longitud) ,
superficie antideslizante , pasamanos continuos a ambos lados a 0,90 m y
0,75 m de altura.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **4.6 Desagüe pluvíal**

<img src="assets/image13.png"
style="width:3.8in;height:3.7762in" />

*Figura 12 , Sistema de desagüe de aguas de lluvía*

Observe como escurren las aguas de lluvía en el predio:

> • Si , Canalizado: conducido por cañerías, canales con tapa o bocas de
> tormenta.
>
> • Si , Cielo abierto: escurre por zanjas o canales descubiertos.
>
> • No: el agua no tiene conducción; escurre libremente por el terreno o
> se acumula.

## **4.7 Sistemas de seguridad y emergencia**

Recorra el local con el director o responsable. Verifique visualmente
cada sistema y anote la cantidad de elementos presentes.

<img src="assets/image14.png"
style="width:3.8in;height:3.7762in" />

*Figura 13 , Cámaras de vigilancia CCTV*

<img src="assets/image15.png"
style="width:3.8in;height:3.7762in" />

*Figura 14 , Detectores de humo y/o calor*

<img src="assets/image16.png"
style="width:3.8in;height:3.7762in" />

*Figura 15 , Pulsadores de emergencia*

<img src="assets/image17.png"
style="width:3.8in;height:3.7762in" />

*Figura 16 , Luces de emergencia*

<img src="assets/image18.png"
style="width:3.8in;height:3.7762in" />

*Figura 17 , Extintores contra incendio*

<img src="assets/image19.png"
style="width:3.8in;height:3.7762in" />

*Figura 18 , Sistema hidráulico (sprinklers / mangueras)*

| **Campo / Pregunta**                   | **Descripción y guía de respuesta**                                                                                           | **Req.** |
|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|----------|
| **Vigilancia CCTV**                    | Si: indique la cantidad de cámaras instaladas y si estan en funcionamiento. No: el local no cuenta con cámaras.               | No       |
| **Detectores de humo / calor**         | Dispositivos en cielorrasos que activan una alarma al detectar humo o calor excesivo. Indique cantidad.                       | No       |
| **Pulsadores de emergencia**           | Botones manuales (generalmente rojos) para activar la alarma. Indique cantidad.                                               | No       |
| **Luces de emergencia**                | Luminarias autonomas que se activan ante corte de suministro electrico. Indique cantidad.                                     | No       |
| **Extintores**                         | Indique cantidad. Verifique si la etiqueta de control (carga y fecha de vencimiento) esta vigente y anotelo en Observaciones. | No       |
| **Sistema hidráulico contra incendio** | Redes de tuberias con rociadores (sprinklers) o mangueras conectadas a reservorios. Menos frecuente en escuelas pequeñas.     | No       |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>CONSEJO:</strong> Si algun extintor tiene la carga vencida o
falta la etiqueta de control, registrelo en el campo Observaciones del
módulo General.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **5. MÓDULO SERVICIOS BÁSICOS**

Registra los tres servicios básicos del local: abastecimiento de agua,
tipo de desagüe sanitario y conectividad a internet.

## **5.1 Abastecimiento de agua**

<img src="assets/image20.png"
style="width:4in;height:4in" />

*Figura 19 , Fuente de abastecimiento de agua potable*

Primero indique si el local cuenta con agua (Si / No).

| **SALTO:** Si respondio «No» → pase a Seccion 5.2 , Servicio sanitario |
|------------------------------------------------------------------------|

Si marco Si, identifique la fuente principal de provision:

> • ESSAP (ex CORPOSANA) , red pública urbana.
>
> • Junta de Saneamiento (SENASA) , red comunitaria rural.
>
> • Prestador / red privada o comunitaria.
>
> • Pozo artesiano (sin bomba mecánica).
>
> • Pozo con bomba , registre la potencia en HP.
>
> • Pozo sin bomba , extraccion manual.
>
> • Manantial o naciente de agua.
>
> • Tajamar, rio o arroyo.
>
> • Recoleccion de agua de lluvía.
>
> • Aguatero (camion cisterna).
>
> • Otra fuente , especifique.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>IMPORTANTE:</strong> Cuando la fuente es 'pozo con bomba',
registre obligatoriamente la potencia de la bomba en HP (horse power).
Consulte la placa del equipo o pregunte al encargado de
mantenimiento.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **5.2 Servicio sanitario , tipo de desagüe**

<img src="assets/image21.png"
style="width:4in;height:4in" />

*Figura 20 , Tipo de desagüe de las instalaciónes sanitarias*

Primero confirme si el local cuenta con baño e instalaciónes sanitarias
(Si / No). Si hay baños, indique hacia donde desagua:

> • Red de alcantarillado sanitario (cloaca pública).
>
> • Camara septica y pozo ciego.
>
> • Pozo ciego solo, sin cámara septica.
>
> • Superficie de tierra, hoyo abierto, zanja, arroyo o rio.
>
> • Letrina ventilada de hoyo seco (con tubo de ventilacion).
>
> • Letrina comun de hoyo seco (con losa, techo, paredes y puerta).
>
> • Letrina comun sin techo o sin puerta.
>
> • Otro , especifique.

## **5.3 Servicio de internet**

<img src="assets/image21.png"
style="width:4in;height:4in" />

*Figura 21 , Acceso a internet del local escolar*

Indique si el local tiene acceso a internet (Si / No) y el tipo de
conexión (fibra óptica, ADSL, móvil 4G/3G, satelital, etc.). Pregunte al
director si la conexión funciona de manera estable.

# **6. MÓDULO ELECTRICIDAD**

Relevamiento de la instalación eléctrica general del local. Comprende la
presencia de energía, tipo y estado de acometida, tableros, potencias
contratadas/instaladas/requeridas y frecuencia de cortes.

<img src="assets/image20.png"
style="width:3.8in;height:3.8in" />

*Figura 22 , Presencia y provision de energía eléctrica*

<img src="assets/image20.png"
style="width:3.8in;height:3.8in" />

*Figura 23 , Tipo y estado de la acometida eléctrica*

<img src="assets/image22.png"
style="width:3.8in;height:1.45432in" />

*Figura 24 , Potencia máxima disponible (contratada)*

<img src="assets/image23.png"
style="width:3.8in;height:1.45432in" />

*Figura 25 , Potencia instalada en equipos*

<img src="assets/image23.png"
style="width:3.8in;height:1.45432in" />

*Figura 26 , Potencia requerida por el local*

<img src="assets/image20.png"
style="width:3.8in;height:3.8in" />

*Figura 27 , Frecuencia de cortes eléctricos*

| **Campo / Pregunta**                  | **Descripción y guía de respuesta**                                                                                                  | **Req.** |
|---------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|----------|
| **3.1 Tiene energía eléctrica**       | Si / No. Si responde No, pase directamente al módulo Bloques y Plantas.                                                              | **Si**   |
| **3.2 Provision**                     | ANDE (red pública) / Generador privado / Otro (especificar).                                                                         | **Si**   |
| **3.3 Tiene medidor**                 | Si / No. El medidor (o contador) registra el consumo electrico.                                                                      | **Si**   |
| **3.4 Tiene acometida**               | Si (indique cantidad de acometidas) / No.                                                                                            | **Si**   |
| **3.5 Estado de la acometida**        | Bueno (sin danos visibles) / Regular (danos menores) / Malo (danos graves). Registre el estado por cada acometida si hay mas de una. | No       |
| **3.6 Tipo de instalación**           | Trifásica (tres cables de fase + neutro, para grandes cargas) / Monofásica (un cable de fase + neutro, instalación doméstica comun). | **Si**   |
| **3.7 Tablero principal**             | Si / No. Es el tablero donde llega la acometida y se distribuye al resto del local.                                                  | **Si**   |
| **3.8 Estado del tablero principal**  | Bueno / Regular / Malo. Agregue la capacidad del térmico general en Amperios (A).                                                    | No       |
| **3.9 Tablero secciónal**             | Si (indique cantidad) / No. Tableros secundarios que alimentan sectores o bloques.                                                   | **Si**   |
| **3.10 Estado del tablero secciónal** | Bueno / Regular / Malo por cada tablero.                                                                                             | No       |
| **3.11 Puesta a tierra**              | Si / No. Sistema de seguridad que conduce corrientes de falla hacia la tierra.                                                       | **Si**   |
| **Potencia máxima disponible**        | kVA contratados con ANDE o el proveedor. Consulte la factura o al director.                                                          | No       |
| **Potencia instalada**                | kVA de todos los equipos eléctricos instalados (aires acondicionados, computadoras, cocina, etc.).                                   | No       |
| **Potencia requerida**                | kVA que el local necesita para funcionar adecuadamente según su demanda real.                                                        | No       |
| **Frecuencia de cortes**              | Nunca / Raramente (menos de 1 vez al mes) / Mensual / Semanal / Diario.                                                              | **Si**   |

| **SALTO:** Si respondio «No (sin energía)» → pase a Módulo Bloques y Plantas , sección 7 |
|------------------------------------------------------------------------------------------|

# **7. MÓDULO BLOQUES Y PLANTAS**

Un «Bloque» es cada cuerpo constructivo independiente dentro del predio
escolar. Una «Planta» (o nivel) es cada piso del bloque: PB = Planta
Baja, P1 = Primer Piso, P2 = Segundo Piso, etc. Cada combinacion
bloque-planta se registra por separado.

<img src="assets/image24.png"
style="width:4.2in;height:4.1737in" />

*Figura 28 , Lista de bloques y boton 'Agregar Bloque-Planta'*

<img src="assets/image25.png"
style="width:4.2in;height:4.1737in" />

*Figura 29 , Detalle del bloque: rampas, galeria y dimensiónes*

<img src="assets/image26.png"
style="width:4.2in;height:4.1737in" />

*Figura 30 , Detalle del bloque: instalación eléctrica y lista de
dependencias*

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>CONSEJO:</strong> Para agregar un bloque haga clic en el
boton verde «Agregar Bloque-Planta» y complete el número de bloque y
planta. Si el local tiene un solo edificio de una sola planta, registre
unicamente «Bloque 1 , Planta Baja».</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Campo / Pregunta**                 | **Descripción y guía de respuesta**                                                                                                                                                                                                                  | **Req.** |
|--------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **Rampas en el bloque**              | Si , Cumple norma INTN / Si , No cumple / No. Igual criterio que las rampas exteriores (ver sección 4.5).                                                                                                                                            | **Si**   |
| **Galeria**                          | Si el bloque tiene corredor cubierto (galeria), marque Si e ingrese Largo (m) y Ancho (m) del pasillo.                                                                                                                                               | **Si**   |
| **Dimensiones del bloque**           | Perimetro total del bloque: Largo (m) y Ancho (m). Mida la huella del bloque en planta. Si tiene forma irregular, mida el rectángulo envolvente.                                                                                                     | **Si**   |
| **Tablero secciónal en el bloque**   | Si / No. Si Si, indique el estado (Bueno / Regular / Malo) y la capacidad en A.                                                                                                                                                                      | **Si**   |
| **Tipo de alimentacion eléctrica**   | Embutido (cables ocultos en la pared) / Adosado externo (canaletas visibles) / Aereo (cables colgados) / Subterraneo (cables bajo tierra).                                                                                                           | **Si**   |
| **Instalación eléctrica del bloque** | Como esta tendido el cableado interno: electroductos embutidos / canaletas o bandejas externas / cables externos sueltos / electroductos externos.                                                                                                   | **Si**   |
| **Cortes eléctricos en el bloque**   | Si el bloque sufre cortes recurrentes por problemas eléctricos propios (no por la red general). Si / No.                                                                                                                                             | **Si**   |
| **Dependencias del bloque**          | Tabla con la cantidad de cada tipo de dependencia: aulas, dirección, secretaria, biblioteca, laboratorio/taller, salon multiuso, sala de profesores, area recreativa con techo, sanitarios. Indique cuantas estan en uso, sin uso o en construcción. | **Si**   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> El campo 'Area Construida' surge de los planos
del local y puede completarse en la etapa de digitalizacion en oficina.
No es obligatorio en campo.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **8. MÓDULO AREAS DE RECREACION**

Registre cada area de recreación por separado: patio central, cancha de
futbol, cancha de basquet, plaza, area verde, etc. Haga clic en «Agregar
Area de Recreación» y asigne un nombre descriptivo a cada una.

<img src="assets/image27.png"
style="width:4.2in;height:4.1737in" />

*Figura 31 , Lista de áreas de recreación y boton para agregar*

<img src="assets/image28.png"
style="width:4.2in;height:4.1737in" />

*Figura 32 , Detalle del area: dimensiónes, techo e iluminación*

<img src="assets/image29.png"
style="width:4.2in;height:4.1737in" />

*Figura 33 , Detalle del area: piso, estado y rampas de acceso*

| **Campo / Pregunta**      | **Descripción y guía de respuesta**                                                                                                      | **Req.** |
|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **Nombre del area**       | Use un nombre claro y especifico. Ej.: 'Patio central', 'Cancha de futbol', 'Galeria de recreo'. Evite nombres genéricos como 'Area 1'.  | **Si**   |
| **Largo (m) / Ancho (m)** | Dimensiones en metros. Si el area es irregular, mida el rectángulo que la contiene.                                                      | **Si**   |
| **Iluminacion exterior**  | Si (funciona) / Si (no funciona) / No. Verifique si las luminarias estan operativas.                                                     | **Si**   |
| **Tiene techo**           | Si (el area tiene cubierta) / No (espacio abierto). Si tiene techo, complete material y estado.                                          | **Si**   |
| **Material del techo**    | Losa H°A° / Chapa termoacustica / Cerámica (teja) / Zinc / Fibrocemento / Paja / Otro.                                                   | No       |
| **Estado del techo**      | Bueno (sin defectos visibles) / Regular (defectos menores) / Malo (defectos graves que requieren intervencion urgente).                  | No       |
| **Material del piso**     | Baldosa (layota, granito, cerámica o calcarea) / Ladrillo / Cemento alisado (carpeta) / Tierra / Otro (especificar).                     | **Si**   |
| **Estado del piso**       | Sin roturas , Completo con roturas (indique m2 afectados) , Incompleto (indique m2 afectados) , Con hundimientos (indique m2 afectados). | **Si**   |
| **Rampas de acceso**      | Si , Cumple norma INTN / Si , No cumple / No. Aplica el mismo criterio que en las rampas exteriores.                                     | **Si**   |

# **9. MÓDULO AULAS**

Es el módulo mas extenso. Cada aula se registra individualmente con
información sobre sus dimensiónes, situación, materiales y estado de
techo, paredes, piso, ventanas, puertas, instalación eléctrica e
iluminación.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>IMPORTANTE:</strong> Registre CADA aula por separado. Solo
puede agrupar si se trata de aulas estructuralmente identicas en el
mismo bloque y misma planta. En caso de duda, registre por separado.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<img src="assets/image30.png"
style="width:4.2in;height:4.1737in" />

*Figura 34 , Aula: dimensiónes (largo y ancho) y situación actual*

<img src="assets/image31.png"
style="width:4.2in;height:4.1737in" />

*Figura 35 , Aula: material de techo y defectos según tipo de cubierta*

<img src="assets/image32.png"
style="width:4.2in;height:4.1737in" />

*Figura 36 , Aula: material y defectos de pared*

<img src="assets/image33.png"
style="width:4.2in;height:4.1737in" />

*Figura 37 , Aula: piso, ventanas y puertas*

<img src="assets/image34.png"
style="width:4.2in;height:4.1737in" />

*Figura 38 , Aula: instalación eléctrica, iluminación y observaciones*

**Identificación y dimensiónes**

| **Campo / Pregunta**             | **Descripción y guía de respuesta**                                                                                   | **Req.** |
|----------------------------------|-----------------------------------------------------------------------------------------------------------------------|----------|
| **Bloque / Planta / N° de aula** | Identifique exactamente en que bloque, planta y número de aula se encuentra.                                          | **Si**   |
| **Largo (m) y Ancho (m)**        | Mida con cinta métrica desde el interior de pared a pared. Registre en metros con un decimal (ej.: 7,5).              | **Si**   |
| **2.1 Situación actual**         | En uso (clases activas) / Sin uso (indique motivo: abandono, reparacion, etc.) / En construcción (aun no habilitada). | **Si**   |

**Techo , reglas de salto según material**

Primero marque el material predominante (pregunta 3.1), luego siga el
salto indicado:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Losa H°A° → responda 3.2 (fisuras), 3.3
(huecos) y 3.11 (goteras/humedad)</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Material ceramico (teja/tejuelon/tejuelita) →
responda 3.4 a 3.8 y 3.11</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Chapa termoacustica / Zinc / Fibrocemento →
responda 3.9 (corrosion), 3.10 (chapas rotas) y 3.11</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Paja con estructura de madera → pase
directamente a la sección PARED (4.x)</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Campo / Pregunta**                      | **Descripción y guía de respuesta**                                                         | **Req.** |
|-------------------------------------------|---------------------------------------------------------------------------------------------|----------|
| **3.2 Fisuras en losa**                   | Grietas en la superficie de la losa. Si: indique m2 afectados.                              | No       |
| **3.3 Huecos en losa**                    | Perforaciones o hundimientos en la losa. Si: indique m2.                                    | No       |
| **3.4 Defectos en vigas o tirantes**      | Roturas, putrefaccion o doblamiento. Si: marque viga o tirante e indique cantidad afectada. | No       |
| **3.5 Tejuelones sin apoyo**              | Piezas que no descansan correctamente sobre el tirante. Si: m2.                             | No       |
| **3.6 Tejuelones o tejuelitas rotos**     | Piezas cerámicas fracturadas. Si: m2.                                                       | No       |
| **3.7 Tirantes de distintas dimensiónes** | Indica reparaciones no estandarizadas. Si: indique cantidad.                                | No       |
| **3.8 Deslizamientos del techo**          | Partes que se corrieron de su posición (vigas, chapas, tejuelones). Si: m2.                 | No       |
| **3.9 Corrosion en estructura metálica**  | Oxido visible en vigas o estructura de chapa. Si: m2.                                       | No       |
| **3.10 Chapas rotas**                     | Chapas perforadas, dobladas o faltantes. Si: m2.                                            | No       |
| **3.11 Goteras o humedad en techo**       | Manchas, aureolas o filtraciones visibles. Si: m2.                                          | No       |

**Pared , reglas de salto según material**

| **Campo / Pregunta**                  | **Descripción y guía de respuesta**                                                                                                       | **Req.** |
|---------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **4.1 Material de pared**             | Ladrillo (con o sin revoque) / Madera / Otro (especificar). Si Ladrillo: responda 4.2 a 4.6. Si Madera: pase a 4.7. Si Otro: pase a Piso. | **Si**   |
| **4.2 Fisuras o grietas**             | Grietas en paredes de ladrillo. Si: m2.                                                                                                   | No       |
| **4.3 Desaplomado (pared inclinada)** | Pared con inclinacion visible respecto a la vertical. Si / No.                                                                            | No       |
| **4.4 Tiene revoque**                 | Capa de mortero o yeso sobre el ladrillo. Si / No (m2 sin revoque).                                                                       | No       |
| **4.5 Desprendimiento de revoque**    | Caida o separacion del revoque. Si: m2.                                                                                                   | No       |
| **4.6 Manchas de humedad en pared**   | Manchas de humedad por filtracion o capilaridad. Si: m2.                                                                                  | No       |
| **4.7 Maderas rotas en pared**        | Solo si la pared es de madera: tablones rotos o faltantes. Si: m2.                                                                        | No       |

**Piso**

| **Campo / Pregunta**      | **Descripción y guía de respuesta**                                                                                 | **Req.** |
|---------------------------|---------------------------------------------------------------------------------------------------------------------|----------|
| **5.1 Material del piso** | Baldosa (layota, granito, cerámica, calcarea) / Ladrillo / Cemento alisado o carpeta / Tierra / Otro (especificar). | **Si**   |
| **Estado del piso**       | Sin roturas , Completo con roturas (m2) , Incompleto (m2) , Con hundimientos (m2) , Otro (especifique y m2).        | **Si**   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>CONSEJO:</strong> Para estimar m2 afectados: multiplique
Largo × Ancho de la zona danada. Para zonas irregulares, estime por
comparacion con el area total del piso.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **10. MÓDULO DEPENDENCIAS**

Las «Dependencias» son todos los espacios del bloque que no son aulas,
laboratorios, talleres ni sanitarios: Dirección, Secretaria, Biblioteca,
Sala de Profesores, Salon Multiuso, Depósito/Almacen, Cocina/Comedor,
Sala de primeros auxilios, etc. Registre cada una por separado.

<img src="assets/image35.png"
style="width:4.2in;height:4.1737in" />

*Figura 39 , Dependencia: nombre, dimensiónes y situación*

<img src="assets/image36.png"
style="width:4.2in;height:4.1737in" />

*Figura 40 , Dependencia: material y estado del techo*

<img src="assets/image37.png"
style="width:4.2in;height:4.1737in" />

*Figura 41 , Dependencia: paredes y piso*

<img src="assets/image38.png"
style="width:4.2in;height:4.1737in" />

*Figura 42 , Dependencia: ventanas, puertas e instalaciónes*

| **Campo / Pregunta**         | **Descripción y guía de respuesta**                                                                                                       | **Req.** |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **Bloque / Planta / Nombre** | Especifique el nombre exacto de la dependencia: 'Dirección', 'Secretaria', 'Biblioteca', 'Sala de profesores', 'Cocina', 'Depósito', etc. | **Si**   |
| **Largo (m) / Ancho (m)**    | Dimensiones interiores en metros con un decimal.                                                                                          | **Si**   |
| **Situación**                | En uso / Sin uso (especifique motivo) / En construcción. Si esta En Construccion, pase a la siguiente dependencia.                        | **Si**   |
| **Techo, Pared, Piso**       | Mismos campos y reglas de salto que el Módulo Aulas (ver sección 9).                                                                      | **Si**   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Si la 'Situación' es 'En construcción', el
sistema saltara automáticamente al siguiente espacio , no necesita
completar los datos estructurales.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **11. MÓDULO LABORATORIO**

Registre cada laboratorio por separado: Laboratorio de Ciencias
(química, biologia, física), Laboratorio de Informatica / Sala de
cómputo, etc. Especifique el nombre o tipo en el campo correspondiente.

<img src="assets/image39.png"
style="width:4.2in;height:4.1737in" />

*Figura 43 , Laboratorio: nombre, dimensiónes y situación*

<img src="assets/image40.png"
style="width:4.2in;height:4.1737in" />

*Figura 44 , Laboratorio: material y estado del techo*

<img src="assets/image41.png"
style="width:4.2in;height:4.1737in" />

*Figura 45 , Laboratorio: paredes y piso*

<img src="assets/image42.png"
style="width:4.2in;height:4.1737in" />

*Figura 46 , Laboratorio: ventanas, puertas e instalaciónes*

Los campos de techo, pared y piso son identicos a los del módulo Aulas.
Aplican exactamente los mismos saltos según material (ver sección 9).
Adicionalmente, registre si el laboratorio cuenta con mesadas, piletas o
instalaciónes especiales en el campo Observaciones.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Si el laboratorio esta 'En Construccion', el
sistema pasara automáticamente al próximo espacio.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **12. MÓDULO TALLER**

Registre talleres técnicos, de artes o de oficios por separado.
Ejemplos: Taller de Electricidad, Taller de Carpinteria, Taller de
Costura, Taller de Mecanica, Sala de Música, etc.

<img src="assets/image43.png"
style="width:4.2in;height:4.1737in" />

*Figura 47 , Taller: nombre, dimensiónes y situación*

<img src="assets/image44.png"
style="width:4.2in;height:4.1737in" />

*Figura 48 , Taller: material y estado del techo*

<img src="assets/image45.png"
style="width:4.2in;height:4.1737in" />

*Figura 49 , Taller: paredes y piso*

<img src="assets/image46.png"
style="width:4.2in;height:4.1737in" />

*Figura 50 , Taller: ventanas, puertas e instalaciónes*

Reglas de salto para paredes del taller:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Ladrillo → responda preguntas 4.2 a 4.6
(fisuras, desaplomado, revoque, humedad)</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Madera → pase directamente a pregunta 4.7
(maderas rotas)</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>NOTA:</strong> Otro → pase directamente a la sección Piso
(5.x)</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **13. MÓDULO SANITARIOS**

Registre CADA bloque de sanitarios por separado utilizando el boton
'Agregar Sanitario'. La cantidad de sanitarios registrada aqui debe
coincidir exactamente con la indicada en la tabla de dependencias del
módulo Bloques y Plantas.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>ATENCION:</strong> ATENCION con las unidades: las dimensiónes
del sanitario se ingresan en CENTÍMETROS (cm), no en metros. Un
sanitario tipico mide entre 200 y 400 cm de largo.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<img src="assets/image47.png"
style="width:4.2in;height:4.1737in" />

*Figura 51 , Sanitario: dimensiónes (en cm), uso diferenciado y espacio
para discapacidad*

<img src="assets/image48.png"
style="width:4.2in;height:4.1737in" />

*Figura 52 , Sanitario: divisorias, boxes y artefactos*

<img src="assets/image49.png"
style="width:4.2in;height:4.1737in" />

*Figura 53 , Sanitario: estado de artefactos y filtraciones*

<img src="assets/image50.png"
style="width:4.2in;height:4.1737in" />

*Figura 54 , Sanitario 1: techo, paredes y piso*

<img src="assets/image51.png"
style="width:4.2in;height:4.1737in" />

*Figura 55 , Sanitario 2: dimensiónes y uso*

<img src="assets/image52.png"
style="width:4.2in;height:4.1737in" />

*Figura 56 , Sanitario 2: artefactos y estado*

<img src="assets/image53.png"
style="width:4.2in;height:4.1737in" />

*Figura 57 , Sanitario 2: techo*

<img src="assets/image54.png"
style="width:4.2in;height:4.1737in" />

*Figura 58 , Sanitario 2: paredes y piso*

| **Campo / Pregunta**                        | **Descripción y guía de respuesta**                                                                                                                                     | **Req.** |
|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| **Largo (cm) / Ancho (cm)**                 | Dimensiones interiores en CENTÍMETROS. Mida desde pared interior a pared interior.                                                                                      | **Si**   |
| **2.1 Uso diferenciado**                    | Solo hombres / Solo mujeres / Indistinto (unisex). Observe los símbolos de la puerta o pregunte al director.                                                            | **Si**   |
| **2.2 Espacio accesible para discapacidad** | Si: existe una cabina con espacio suficiente para silla de ruedas (minimo 1,50 x 1,50 m) y barras de apoyo. No: no hay espacio adaptado.                                | **Si**   |
| **2.3 Ofrece Educación Inicial**            | Si el local escolar brinda servicios de educacion inicial (jardin de infantes).                                                                                         | **Si**   |
| **2.4 Sanitarios en aulas de Ed. Inicial**  | Si los baños estan incorporados dentro de las aulas del nivel inicial (sanitario dentro del aula). Solo si respondio Si en 2.3.                                         | No       |
| **3.1 Divisorias internas (boxes)**         | Si: el sanitario tiene cabinas individuales separadas por muros o tabiques. No: es un espacio abierto sin separaciones.                                                 | **Si**   |
| **3.2 Cantidad de boxes**                   | Cuente cada cabina individual. Solo si respondio Si en 3.1.                                                                                                             | No       |
| **3.4 Estado de las puertas de los boxes**  | Mayormente completos (cierran bien, sin partes faltantes graves) / Mayormente incompletos (partes rotas o faltantes que afectan la privacidad) / No tiene puertas.      | **Si**   |
| **4.1 Tipo y cantidad de artefactos**       | Cuente cada artefacto: Inodoro / Mingitorio de cerámica / Mingitorio de material (concreto) / Letrina comun / Excusado tipo municipal / Lavatorio / Ducha.              | **Si**   |
| **4.2 Estado de los artefactos**            | Para cada tipo: Bueno (funciona correctamente) / Regular (funciona con defectos menores) / Malo (no funciona o defectos graves). Ingrese la cantidad en cada categoria. | **Si**   |
| **4.3 Perdidas o filtraciones**             | Si: marque si ocurren en el desagüe (caños de salida) o en el agua corriente (caños de alimentacion). No: no hay pérdidas visibles.                                     | **Si**   |
| **Techo (5.x), Pared (6.x), Piso (7.x)**    | Mismos campos y reglas de salto que el Módulo Aulas (ver sección 9). El techo del sanitario suele ser losa o chapa.                                                     | **Si**   |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>IMPORTANTE:</strong> Si hay sanitarios incorporados a las
aulas de Educación Inicial, registrelos tambien en este módulo como un
sanitario adicional.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **14. CONTROL DE CALIDAD Y CIERRE**

Antes de guardar y sincronizar el formulario, verifique esta lista.
Marque cada casilla una vez confirmado el punto.

|     | **Item de verificacion**             | **Que debe confirmarse**                                                              |
|-----|--------------------------------------|---------------------------------------------------------------------------------------|
| ☐   | **Identificación completa**          | Codigo de local, departamento, distrito, dirección y director registrados.            |
| ☐   | **Coordenadas válidas**              | Latitud entre -19 y -28. Longitud entre -54 y -63. Sin errores de mapa pendientes.    |
| ☐   | **Módulo General completo**          | Exteriores, desagüe y todos los sistemas de seguridad respondidos.                    |
| ☐   | **Servicios completos**              | Agua, saneamiento e internet registrados con sus detalles.                            |
| ☐   | **Electricidad completa**            | Acometida, tableros, potencias y frecuencia de cortes registrados.                    |
| ☐   | **Al menos un bloque registrado**    | Con dimensiónes, instalación eléctrica y tabla de dependencias completa.              |
| ☐   | **Todas las aulas registradas**      | Cada aula individualmente con techo, pared, piso y situación.                         |
| ☐   | **Sanitarios = cantidad en Bloques** | El número de sanitarios registrados coincide con el indicado en Bloques y Plantas.    |
| ☐   | **Laboratorios y Talleres**          | Registrados si el local los tiene. Si no tiene, no es necesario agregar.              |
| ☐   | **Consistencia entre módulos**       | Los datos son coherentes: por ej., si hay energía, la acometida no puede estar vacia. |
| ☐   | **Sincronización exitosa**           | El icono de sincronización quedo en verde. El formulario fue envíado al servidor.     |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>IMPORTANTE:</strong> Despues de sincronizar, revise que el
local aparezca marcado como 'Completado' en la lista de asignaciones.
Contacte al supervisor si el estado no cambia después de varios
minutos.</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# **15. PREGUNTAS FRECUENTES Y GLOSARIO**

**El GPS no obtiene coordenadas o el mapa da error**

Abra Google Maps en su celular, desplace el marcador sobre la ubicación
exacta del edificio principal y copie las coordenadas que aparecen en la
parte inferior de la pantalla. Precision de ±20 m es aceptable. Anote en
Observaciones que las coordenadas fueron ingresadas manualmente.

**La escuela se niega a ser relevada**

Intente coordinar una segúnda visita en otro horario o día. Si la
negativa persiste, registre el intento en el sistema y comuníqueselo al
coordinador de campo antes de cerrar el formulario.

**No tengo internet en campo**

El sistema funciona en modo offline. Complete el formulario con
normalidad: los datos se guardan en el dispositivo y se envían
automáticamente cuando se recupere la conexión. Sincronice siempre al
final del día.

**No puedo completar todo en una sola visita**

Guarde el progreso al terminar la visita (boton 'Guardar'). El sistema
conserva los datos. Coordine una segúnda visita para completar los
módulos faltantes.

**Como mido los m2 afectados por un defecto**

Estime la zona danada como un rectángulo: Largo (m) × Ancho (m). Para
formas irregulares, dibuje un rectángulo imaginario que contenga la zona
y reste las partes no afectadas. No necesita ser exacto: una estimación
visual es suficiente.

**El local esta cerrado el día de la visita**

Fotografie el exterior, complete los datos visibles desde fuera
(fachada, cercado, tipo de construcción) y anote en Observaciones que el
local estaba cerrado con la fecha y hora de la visita. Coordine una
segúnda visita con el coordinador.

**Encuentro danos estructurales graves**

Documente con fotografías detalladas desde distintos ángulos. Registre
la descripcion en Observaciones y notifique de inmedíato al supervisor
del distrito para que active el protocolo de emergencia.

**El sistema no me deja avanzar**

Hay campos obligatorios vacíos o con datos invalidos. Revise que no haya
mensajes de error en rojo dentro del módulo actual. Los errores mas
comunes son: coordenadas fuera de rango, campos numericos vacíos y
respuestas en blanco en preguntas obligatorias.

## **Glosario de términos técnicos**

| **Termino**                     | **Definición**                                                                                                                                                               |
|---------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Acometida**                   | Conexión entre la red eléctrica pública (ANDE u otro proveedor) y el tablero principal del local escolar.                                                                    |
| **Bloque**                      | Cuerpo constructivo independiente dentro del predio escolar. Un local puede tener uno o varios bloques.                                                                      |
| **Box / Cabina**                | Espacio individual dentro del bloque sanitario, delimitado por muros o tabiques.                                                                                             |
| **Carpeta de cemento**          | Piso de cemento alisado, sin revestimiento adicional.                                                                                                                        |
| **Dependencia**                 | Espacio del bloque distinto al aula: dirección, secretaria, biblioteca, depósito, cocina, sala de profesores, salon multiuso, etc.                                           |
| **Desaplomado**                 | Pared con inclinacion visible respecto a la vertical, que indica deformacion estructural.                                                                                    |
| **H°A° (Hormigón Armado)**      | Concreto reforzado con armadura metálica (hierro). Una 'losa de H°A°' es un techo plano de concreto armado.                                                                  |
| **Huella del bloque**           | Contorno o proyección del bloque en el suelo, visto desde arriba (planta).                                                                                                   |
| **Pandeo**                      | Deformacion de la losa hacia abajo por sobrecarga, defecto constructivo o falla de la estructura de soporte.                                                                 |
| **Planta / Nivel**              | Cada piso del bloque. PB = Planta Baja (planta a nivel del suelo), P1 = Primer Piso, P2 = Segundo Piso, etc.                                                                 |
| **Revoque**                     | Capa de mortero, yeso o material similar que recubre la pared de ladrillo para darle terminación.                                                                            |
| **Tablero principal**           | Tablero electrico donde llega la acometida y desde donde se distribuye la corriente al resto del local.                                                                      |
| **Tablero secciónal**           | Tablero electrico secundario que alimenta una zona, bloque o planta especifica.                                                                                              |
| **Tejuelon / Tejuelita**        | Piezas cerámicas planas usadas como cubierta en techos inclinados, apoyadas sobre tirantes de madera.                                                                        |
| **Tirante**                     | Elemento horizontal de madera o metalico que conforma la estructura de soporte de un techo inclinado.                                                                        |
| **Norma INTN de accesibilidad** | Estándar paraguayo que exige en rampas: ancho minimo 1,20 m, pendiente máxima 8%, superficie antideslizante y pasamanos continuos a ambos lados a 0,90 m y 0,75 m de altura. |

*CIALPA · Relevamiento de Infraestructura Educativa · Manual del
Encuestador v3.0 · 2026  
Documento de uso interno , no distribuir sin autorizacion*




---

## 16. Checklist rápido para el encuestador

Antes de iniciar:

- [ ] El dispositivo tiene batería suficiente.
- [ ] La app externa está instalada.
- [ ] La app web CIALPA abre correctamente.
- [ ] El usuario puede iniciar sesión.
- [ ] Las escuelas asignadas aparecen en la lista.
- [ ] El mapa muestra la escuela, si tiene coordenadas.
- [ ] El supervisor confirmó la ruta.
- [ ] Se tiene contacto del responsable escolar.
- [ ] Se cuenta con cinta métrica y elementos de respaldo.

Durante el relevamiento:

- [ ] Se registró llegada.
- [ ] Se inició relevamiento en CIALPA.
- [ ] Se abrió el aplicativo externo.
- [ ] Se registraron módulos o pausas relevantes.
- [ ] Se registraron incidencias.
- [ ] Se documentaron observaciones críticas.

Al cerrar:

- [ ] El aplicativo externo fue cerrado o quedó registrado el motivo de cierre parcial.
- [ ] Se registró folio externo o último registro disponible.
- [ ] No quedaron módulos abiertos.
- [ ] El cierre se marcó como completo, parcial o con incidencia.
- [ ] El estado de la escuela quedó actualizado.
- [ ] El supervisor fue notificado si hubo problema.

---

## 17. Reglas de calidad para la encuesta grande

Para escalar desde el prepiloto y piloto hacia la encuesta grande, deben cumplirse estas reglas:

1. **Trazabilidad completa:** toda escuela visitada debe tener inicio, cierre y estado.
2. **Unicidad:** una misma escuela no debe tener dos sesiones finales contradictorias.
3. **Consistencia temporal:** la hora de cierre debe ser posterior a la hora de inicio.
4. **Coherencia de estado:** una escuela finalizada no debe tener módulos críticos abiertos.
5. **Evidencia mínima:** todo cierre parcial o incidencia crítica debe tener observación.
6. **Control de folio:** cuando el aplicativo externo genere identificador, debe registrarse.
7. **Validación diaria:** el supervisor debe revisar sesiones abiertas e incidencias al cierre de cada jornada.
8. **Corrección centralizada:** errores de escuelas, códigos o coordenadas deben corregirse en la base maestra, no manualmente en dispositivos aislados.

---

## 18. Mensajes modelo para observaciones de campo

### Escuela cerrada

> Se llegó al local escolar a las HH:MM. El local se encontró cerrado y no fue posible contactar al responsable institucional. Se informa al supervisor para reprogramación.

### Responsable ausente

> Se llegó al local escolar a las HH:MM. El responsable institucional no se encontraba disponible. Se coordinó tentativa de nueva visita para FECHA/HORA.

### Apertura manual del aplicativo externo

> El botón Aplicar encuesta no abrió automáticamente el aplicativo externo. Se procedió a abrirlo manualmente desde el dispositivo. El relevamiento continuó normalmente.

### Cierre parcial

> El relevamiento quedó parcial por MOTIVO. Se completaron los módulos X, Y y Z. Quedaron pendientes los módulos A y B. Se solicita reprogramación.

### Datos de escuela inconsistentes

> El código o nombre del local escolar mostrado en CIALPA no coincide plenamente con la identificación observada en campo. Se adjunta observación para revisión del supervisor.

---

## 19. Cierre documental

Este manual debe mantenerse versionado junto con la app web. Cualquier cambio en el aplicativo externo, en las reglas de campo, en la estructura de módulos o en la hoja maestra de escuelas debe reflejarse en una nueva versión del manual.

**CIALPA, Relevamiento de Infraestructura Educativa, Manual del Encuestador v4.0, 2026.**
