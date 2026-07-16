# Informe de muestra piloto Capital y Central

Fecha: `2026-07-16`
Marco: `RUE_2026_2026-07-16`
Semilla de reemplazo: `20260716`

## Decision

- El piloto queda limitado a **Capital y Central**.
- Al retirar Alto Parana quedan **55 escuelas**, con un error estimado de **12.64%** bajo el criterio 95%, p=0,5 y correccion por poblacion finita.
- El minimo teorico para N=640 es **n=84**; por tanto, 55 no cumple el limite de 10%.
- Se conservan esas 55 escuelas y se seleccionan **31 reemplazos**: 5 de Capital y 26 de Central.
- La muestra final mantiene **n=86** y un error estimado de **9.84%**.
- La cobertura territorial alcanza **20 de 20 distritos**, mediante 2 intercambios dentro del mismo estrato.
- Las 31 escuelas de Alto Parana dejan de marcarse como piloto vigente, pero sus formularios, evidencias y auditoria deben conservarse como historicos.

## Distribucion

| Departamento | Zona | Grupo de matricula | Marco | Retenidas | Reemplazos | Muestra final |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| CAPITAL | URBANA | ALTA(>500) | 35 | 4 | 1 | 5 |
| CAPITAL | URBANA | BAJA(<100) | 18 | 2 | 0 | 2 |
| CAPITAL | URBANA | MEDIA(100-500) | 62 | 4 | 4 | 8 |
| CENTRAL | RURAL | ALTA(>500) | 24 | 2 | 1 | 3 |
| CENTRAL | RURAL | BAJA(<100) | 16 | 1 | 1 | 2 |
| CENTRAL | RURAL | MEDIA(100-500) | 73 | 6 | 4 | 10 |
| CENTRAL | URBANA | ALTA(>500) | 183 | 16 | 9 | 25 |
| CENTRAL | URBANA | BAJA(<100) | 35 | 2 | 3 | 5 |
| CENTRAL | URBANA | MEDIA(100-500) | 194 | 18 | 8 | 26 |

## Metodo

La asignacion departamental es proporcional al marco elegible: Capital 15 y Central 71. Dentro de cada departamento se completa la muestra en los estratos `Zona x Grupo de matricula`, respetando las escuelas ya seleccionadas. Los reemplazos se eligen sin reposicion mediante ranking SHA-256 con semilla fija `20260716`. Como control territorial, se exige al menos una escuela por distrito y cualquier ajuste se realiza dentro del mismo estrato. Esto hace que la seleccion sea reproducible sin publicar contactos ni otros datos personales.

## Fuentes

- Padron MEC: `ListadoMECversionNUEVA16julio2026.xlsx`.
- Muestra historica: `escuelas_muestra_final.xlsx`.
- Huella de codigos de la muestra final: `c065513e0a3079e5e6437bd672ad0abe70192e8a42d7ccdac1f125e36760c79d`.
