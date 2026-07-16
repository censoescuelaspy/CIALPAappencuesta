# Informe de migracion del padron MEC 2026

Fecha de corte: `2026-07-16`
Version preparada: `2.6.206`
Marco: `RUE_2026_2026-07-16`

## Resultado ejecutivo

- El nuevo archivo contiene **5448 codigos locales validos y unicos**.
- Frente al indice de la app (5462), incorpora **33 altas** y **47 bajas**; el saldo es **-14**.
- Hay **5016** escuelas con coordenadas validas y **432** sin un par completo.
- Los **86 codigos** de la muestra piloto permanecen en el nuevo marco.
- Cambiaron **79** matriculas, **25** nombres y **3** estratos dentro de la muestra.

## Decision sobre la muestra piloto

Se conserva la seleccion historica de 86 escuelas porque todas siguen vigentes y ya existen registros de campo asociados. No se realiza un nuevo sorteo. Los ponderadores se recalibran contra el marco RUE 2026 y los valores originales quedan en columnas separadas.

El marco piloto con coordenadas pasa de `N=972` a `N=983`. Con 95% de confianza, error 10%, `p=0,5` y correccion por poblacion finita, el objetivo sigue siendo `n=88`. La muestra realizada es 86; si el operativo requiere completar el tamano teorico, deben seleccionarse dos reservas adicionales en Central mediante una decision metodologica separada.

| Departamento | Marco 2026 con coordenadas | Muestra retenida |
| --- | ---: | ---: |
| ALTO PARANA | 343 | 31 |
| CAPITAL | 115 | 10 |
| CENTRAL | 525 | 45 |

### Cambios de estrato

- `1015024`: RURAL , MEDIA(100-500) -> RURAL , BAJA(<100) (matricula 103 -> 99).
- `12047`: URBANA , MEDIA(100-500) -> URBANA , BAJA(<100) (matricula 101 -> 93).
- `1109202`: URBANA , ALTA(>500) -> URBANA , MEDIA(100-500) (matricula 710 -> 414).

## Resguardo de datos

- El libro de migracion y el payload de Sheets contienen contactos y quedan en una salida privada ignorada por Git.
- El JSON publico conserva solo codigo, nombre y territorio; no publica responsables, telefonos ni correos.
- Los formularios, cierres, usuarios, auditoria y evidencias no se reemplazan: se vinculan por codigo local.
- Los codigos que salen del marco no deben contar como padron vigente, pero sus registros historicos deben seguir accesibles para administracion.

## Aplicacion del cambio

- La hoja oficial conserva su mismo identificador y ahora expone `listado_ini` con 5448 escuelas y `muestra_piloto_def` con 86 escuelas.
- Las pestañas anteriores se conservaron ocultas como respaldo `legacy_2025_20260716`.
- El backend publico verifico el nuevo marco desde `official_sheet` sin reemplazar las 128 filas operativas existentes.
- GAS version 41 contiene la compatibilidad para consultar registros historicos fuera del padron, pero requiere un deployment desde la cuenta propietaria: los redeploys hechos con la cuenta editora devuelven HTTP 403 pese a declarar acceso anonimo.

## Fuentes

- Nueva nomina MEC: `ListadoMECversionNUEVA16julio2026.xlsx`.
- Muestra piloto historica: `escuelas_muestra_final.xlsx`.
- Comparacion de la app: `assets/data/r01-schools-public.json` antes de esta migracion.
