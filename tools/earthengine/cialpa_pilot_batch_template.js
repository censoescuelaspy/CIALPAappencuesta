// CIALPA - plantilla de referencia para la muestra piloto vigente.
//
// No pegar este archivo directamente en Earth Engine: la lista de escuelas se
// genera desde la muestra privada Capital/Central para evitar conservar una
// copia desactualizada con las instituciones reemplazadas de Alto Parana.
//
// Desde la raiz de la app ejecute:
//
// node tools/earthengine/build_pilot_imagery_worklist.mjs \
//   --input="tools/simulation/private-output/muestra_piloto_capital_central.csv"
//
// node tools/earthengine/generate_pilot_earthengine_batch.mjs \
//   --source=nicfi --buffer=100 --start=0 --limit=25 --create-tasks=true \
//   --out="tools/earthengine/output/CIALPA_MUESTRA_CAPITAL_CENTRAL_NICFI_100M.js"
//
// El archivo generado contiene las 86 escuelas vigentes, comprueba el acceso a
// la coleccion antes de crear tareas y exporta un circulo de 100 m por escuela.
// Para los lotes siguientes cambie EXPORT_START_INDEX a 25, 50 y 75.
//
// El fondo SATELLITE del visor de Earth Engine no es un ee.Image exportable.
// NICFI si es exportable cuando la cuenta tiene permiso, pero su pixel nativo
// es de 4.77 m y su licencia limita uso y redistribucion.

print('Genere el script privado indicado en los comentarios de esta plantilla.');
