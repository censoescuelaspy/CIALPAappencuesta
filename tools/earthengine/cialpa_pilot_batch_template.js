// CIALPA - Exportacion por lote para imagenes de escuelas piloto.
// Ejecutar en Google Earth Engine Code Editor.
//
// IMPORTANTE:
// - El fondo SATELLITE de Google visible en Earth Engine NO es un ee.Image
//   exportable. Este script exporta NICFI/Planet, que si es exportable desde EE.
// - Para tener la nitidez de Google dentro de la app, usar la capa Google online
//   ya configurada en la app. No usar este script para descargar/cachar Google.
// - Si Earth Engine muestra "caller does not have access", falta habilitar
//   acceso Planet/NICFI en la cuenta.

// ---------------------------------------------------------------------------
// 1) ESCUELAS PILOTO
// ---------------------------------------------------------------------------
// Lista real cargada desde:
// G:\Mi unidad\CIALPA\03_DATOS\Inventarios_Escuelas\
// Listado_Relevamiento infraestructura 2026_original_procesado_MUETREO.xlsx
// Hoja: muestra_final. Total: 86 escuelas.
// Formato minimo:
// { order: 1, code: '1005052', name: 'NOMBRE', department: '...', district: '...',
//   locality: '...', lat: -25.123456, lon: -55.123456 }
//
// Si preferis subir un CSV como Asset de Earth Engine, dejar SCHOOLS vacio,
// poner USE_TABLE_ASSET = true y completar TABLE_ASSET_ID mas abajo.
var SCHOOLS = [
  { order: 1, code: "1005052", name: "ESCUELA B\u00c1SICA N\u00b0 2678 CRISTO REY", department: "ALTO PARAN\u00c1", district: "SANTA FE DEL PARAN\u00c1", locality: "PYKYRY", lat: -25.19381222, lon: -54.5903325 },
  { order: 2, code: "1004017", name: "ESCUELA B\u00c1SICA N\u00b0 632 ADELA SPERATTI", department: "ALTO PARAN\u00c1", district: "DR. JUAN LE\u00d3N MALLORQU\u00cdN", locality: "VENECIA'I", lat: -25.49057306, lon: -55.16097472 },
  { order: 3, code: "1004022", name: "ESCUELA B\u00c1SICA N\u00b0 831 PADRE BRUNO OTTE", department: "ALTO PARAN\u00c1", district: "DR. JUAN LE\u00d3N MALLORQU\u00cdN", locality: "VILLA SAN JUAN", lat: -25.40370861, lon: -55.275595 },
  { order: 4, code: "1017024", name: "ESCUELA B\u00c1SICA N\u00b0 3502 SAN PEDRO", department: "ALTO PARAN\u00c1", district: "SANTA FE DEL PARAN\u00c1", locality: "GLEVA 11", lat: -25.16801083, lon: -54.81676806 },
  { order: 5, code: "1008033", name: "ESCUELA B\u00c1SICA N\u00b0 4326 SAN CRIST\u00d3BAL", department: "ALTO PARAN\u00c1", district: "\u00d1ACUNDAY", locality: "CHACORE QUINTA LINEA", lat: -26.16968306, lon: -54.85487083 },
  { order: 6, code: "1004013", name: "ESCUELA B\u00c1SICA N\u00b0 3481 VIRGEN DE LAS MERCEDES", department: "ALTO PARAN\u00c1", district: "DR. JUAN LE\u00d3N MALLORQU\u00cdN", locality: "YHOVY", lat: -25.50777417, lon: -55.21604361 },
  { order: 7, code: "1017004", name: "ESCUELA B\u00c1SICA N\u00b0 5542 DOCTOR JOS\u00c9 GASPAR RODR\u00cdGUEZ DE FRANCIA", department: "ALTO PARAN\u00c1", district: "MBARACAY\u00da", locality: "COLONIA GUARANI", lat: -24.99481306, lon: -54.54469139 },
  { order: 8, code: "1015024", name: "COLEGIO NACIONAL GRAL. JOS\u00c9 EDUVIGIS D\u00cdAZ", department: "ALTO PARAN\u00c1", district: "SANTA ROSA DEL MONDAY", locality: "CURUPAYTY LINEA EL PROGRESO", lat: -25.84467333, lon: -54.97657028 },
  { order: 9, code: "1018033", name: "COLEGIO NACIONAL ITAIPYT\u00c9", department: "ALTO PARAN\u00c1", district: "SAN ALBERTO", locality: "ITAIPYTE", lat: -24.97256194, lon: -54.92328472 },
  { order: 10, code: "1002001", name: "COLEGIO NACIONAL DE E.M.D. DR. RA\u00daL PE\u00d1A", department: "ALTO PARAN\u00c1", district: "PRESIDENTE FRANCO", locality: "AREA 5", lat: -25.5544825, lon: -54.61348861 },
  { order: 11, code: "1006058", name: "ESCUELA B\u00c1SICA N\u00b0 3358 ESP\u00cdRITU SANTO", department: "ALTO PARAN\u00c1", district: "ITAKYRY", locality: "3 DE FEBRERO", lat: -25.04314222, lon: -55.01611639 },
  { order: 12, code: "1018009", name: "ESCUELA B\u00c1SICA N\u00b0 5533 INMACULADA CONCEPCI\u00d3N DE MAR\u00cdA", department: "ALTO PARAN\u00c1", district: "SAN ALBERTO", locality: "CRUCE SAN ALBERTO SUB-URBANO", lat: -24.94648333, lon: -54.95074333 },
  { order: 13, code: "1010023", name: "ESCUELA B\u00c1SICA N\u00b0 2002 SAN MIGUEL ARC\u00c1NGEL", department: "ALTO PARAN\u00c1", district: "LOS CEDRALES", locality: "COLONIA PENGO SAN MIGUEL", lat: -25.59968667, lon: -54.8450125 },
  { order: 14, code: "1014006", name: "ESCUELA B\u00c1SICA N\u00b0 3809 SAN CLEMENTE", department: "ALTO PARAN\u00c1", district: "NARANJAL", locality: "LINEA BUSANELLO", lat: -25.90575, lon: -55.29508333 },
  { order: 15, code: "1006014", name: "ESCUELA B\u00c1SICA N\u00b0 3912 PADRE JOHANES FRANCISCUS PAGEN", department: "ALTO PARAN\u00c1", district: "ITAKYRY", locality: "CAREMA GUASU", lat: -24.9931325, lon: -55.13497611 },
  { order: 16, code: "1008031", name: "ESCUELA B\u00c1SICA N\u00b0 3616 WALTER FLORENCIO BERTONI FERN\u00c1NDEZ", department: "ALTO PARAN\u00c1", district: "\u00d1ACUNDAY", locality: "PUNTA JOVAI", lat: -26.18352778, lon: -54.66641806 },
  { order: 17, code: "1007025", name: "ESCUELA B\u00c1SICA N\u00b0 1877 NUESTRA SE\u00d1ORA DE LA ASUNCI\u00d3N", department: "ALTO PARAN\u00c1", district: "JUAN E. O'LEARY", locality: "LA VICTORIA MONDAY", lat: -25.48514361, lon: -55.33443167 },
  { order: 18, code: "1006010", name: "ESCUELA B\u00c1SICA N\u00b0 3176 SANTO DOMINGO DE GUZM\u00c1N", department: "ALTO PARAN\u00c1", district: "ITAKYRY", locality: "SANTO DOMINGO", lat: -24.977865, lon: -55.17271583 },
  { order: 19, code: "1006077", name: "ESCUELA B\u00c1SICA N\u00b0 6283 SAN JOS\u00c9", department: "ALTO PARAN\u00c1", district: "ITAKYRY", locality: "SAN JOSE", lat: -24.97758139, lon: -55.15412889 },
  { order: 20, code: "1003001", name: "ESCUELA B\u00c1SICA N\u00b0 872 PROFESORA HORTENCIA B\u00c1EZ DE DUARTE", department: "ALTO PARAN\u00c1", district: "DOMINGO MART\u00cdNEZ DE IRALA", locality: "URBANO", lat: -25.91031667, lon: -54.62798444 },
  { order: 21, code: "1001161", name: "ESCUELA B\u00c1SICA N\u00b0 4613 NI\u00d1OS H\u00c9ROES DE ACOSTA \u00d1\u00da", department: "ALTO PARAN\u00c1", district: "CIUDAD DEL ESTE", locality: "11 A 13 ACARAY", lat: -25.47710611, lon: -54.72184056 },
  { order: 22, code: "1005070", name: "ESCUELA B\u00c1SICA N\u00b0 4020 PRIMER GOBERNADOR", department: "ALTO PARAN\u00c1", district: "HERNANDARIAS", locality: "NUEVA ESPERANZA", lat: -25.38099167, lon: -54.65489389 },
  { order: 23, code: "1002009", name: "ESCUELA B\u00c1SICA N\u00b0 1294 SAN PEDRO AP\u00d3STOL", department: "ALTO PARAN\u00c1", district: "PRESIDENTE FRANCO", locality: "AREA 5", lat: -25.55172833, lon: -54.61340389 },
  { order: 24, code: "1009011", name: "COLEGIO NACIONAL SANTO DOMINGO", department: "ALTO PARAN\u00c1", district: "YGUAZ\u00da", locality: "SANTO DOMINGO", lat: -25.44648472, lon: -55.16620889 },
  { order: 25, code: "1006020", name: "ESCUELA B\u00c1SICA N\u00b0 8171 APOLONIO D\u00cdAZ ALFONZO", department: "ALTO PARAN\u00c1", district: "ITAKYRY", locality: "COM INDIG MARISCAL LOPEZ", lat: -24.87499639, lon: -55.21287833 },
  { order: 26, code: "1015022", name: "COLEGIO NACIONAL MAR\u00cdA AUXILIADORA", department: "ALTO PARAN\u00c1", district: "TAVAPY", locality: "FATIMA", lat: -25.62366417, lon: -55.06378917 },
  { order: 27, code: "1004025", name: "COLEGIO NACIONAL RAM\u00d3N INDALECIO CARDOZO", department: "ALTO PARAN\u00c1", district: "DR. JUAN LE\u00d3N MALLORQU\u00cdN", locality: "PAZ DEL CHACO", lat: -25.43375361, lon: -55.3074 },
  { order: 28, code: "1014012", name: "COLEGIO NACIONAL SAN ALFREDO", department: "ALTO PARAN\u00c1", district: "NARANJAL", locality: "SAN ALFREDO", lat: -26.02346556, lon: -55.12622972 },
  { order: 29, code: "1001007", name: "CENTRO EDUCACIONAL SAGRADA FAMILIA", department: "ALTO PARAN\u00c1", district: "CIUDAD DEL ESTE", locality: "AREA 3", lat: -25.53019222, lon: -54.62442444 },
  { order: 30, code: "1011040", name: "COLEGIO NACIONAL VIRGEN DEL CARMEN", department: "ALTO PARAN\u00c1", district: "MINGA GUAZ\u00da", locality: "KILOMETRO 30 SAN JORGE SUB-URBANO", lat: -25.49156694, lon: -54.89900028 },
  { order: 31, code: "1005061", name: "COLEGIO NACIONAL REVERENDO PADRE GUIDO CORONEL", department: "ALTO PARAN\u00c1", district: "SANTA FE DEL PARAN\u00c1", locality: "URBANO", lat: -25.22414333, lon: -54.70165139 },
  { order: 32, code: "12158", name: "COLEGIO NACIONAL DE LA CAPITAL GRAL. BERNARDINO CABALLERO", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "PINOZA", lat: -25.302283889999998, lon: -57.61738889 },
  { order: 33, code: "12118", name: "ESPACIO DE DESARROLLO INFANTIL 381 LIC. OBDULIA RIVAS DE ZAZZI CEBINFA", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "SAN ROQUE", lat: -25.29160639, lon: -57.62679083 },
  { order: 34, code: "15083", name: "ESCUELA B\u00c1SICA N\u00b0 409 REP\u00daBLICA FEDERAL DE ALEMANIA", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "LAS LOMAS", lat: -25.27876778, lon: -57.56343806 },
  { order: 35, code: "15068", name: "ESCUELA B\u00c1SICA N\u00b0 664 PRIMER PRESIDENTE CONSTITUCIONAL DEL PARAGUAY", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "MADAME ELISA ALICIA LINCH", lat: -25.26940167, lon: -57.55672083 },
  { order: 36, code: "12047", name: "ESCUELA B\u00c1SICA N\u00b0 170 GENERAL M\u00c1XIMO SANTOS", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "GENERAL BERNARDINO CABALLERO", lat: -25.30122139, lon: -57.60795611 },
  { order: 37, code: "15063", name: "COLEGIO NACIONAL REP\u00daBLICA BOLIVARIANA DE VENEZUELA", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "MBOCAYATY", lat: -25.25668639, lon: -57.55444861 },
  { order: 38, code: "14115", name: "COLEGIO NACIONAL JUAN ALBERTO SAMANIEGO", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "SAN PABLO", lat: -25.32224278, lon: -57.56516917 },
  { order: 39, code: "10011", name: "COLEGIO EXPERIMENTAL PARAGUAY - BRASIL", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "ITA PYTA PUNTA", lat: -25.28376722, lon: -57.66212972 },
  { order: 40, code: "14112", name: "COLEGIO NACIONAL JUAN EUDORO C\u00c1CERES", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "SAN PABLO", lat: -25.31985556, lon: -57.57532194 },
  { order: 41, code: "14088", name: "COLEGIO T\u00c9CNICO NACIONAL", department: "CAPITAL", district: "ASUNCI\u00d3N", locality: "MARISCAL JOSE FELIX ESTIGARRIBIA", lat: -25.30130361, lon: -57.57157861 },
  { order: 42, code: "1109202", name: "COLEGIO NACIONAL JULIO CORREA", department: "CENTRAL", district: "LUQUE", locality: "LAURELTY", lat: -25.29687889, lon: -57.515195 },
  { order: 43, code: "1118002", name: "COLEGIO NACIONAL MIGUEL \u00c1NGEL TORALES", department: "CENTRAL", district: "YPAN\u00c9", locality: "SAN PEDRO", lat: -25.45921056, lon: -57.50701139 },
  { order: 44, code: "1109043", name: "COLEGIO NACIONAL DE E.M.D. GRAL. JOS\u00c9 ELIZARDO AQUINO", department: "CENTRAL", district: "LUQUE", locality: "CUARTO BARRIO", lat: -25.26703778, lon: -57.49800722 },
  { order: 45, code: "1110019", name: "ESCUELA B\u00c1SICA N\u00b0 4726 NUESTRA SE\u00d1ORA VIRGEN DEL CARMEN", department: "CENTRAL", district: "MARIANO ROQUE ALONSO", locality: "LA CONCORDIA MONSE\u00d1OR BOGARIN", lat: -25.21249611, lon: -57.52323694 },
  { order: 46, code: "1109026", name: "ESCUELA B\u00c1SICA N\u00b0 4551 MAURICIO CARDOZO OCAMPO", department: "CENTRAL", district: "SAN LORENZO", locality: "SAN MIGUEL", lat: -25.29938472, lon: -57.52673861 },
  { order: 47, code: "1114088", name: "ESCUELA B\u00c1SICA N\u00b0 5630 NUESTRA SE\u00d1ORA SANTA MAR\u00cdA", department: "CENTRAL", district: "SAN LORENZO", locality: "SANTA MARIA", lat: -25.33010833, lon: -57.49488667 },
  { order: 48, code: "1110066", name: "ESCUELA B\u00c1SICA N\u00b0 7090 CABO 1\u00b0 LEONARDO GALEANO", department: "CENTRAL", district: "MARIANO ROQUE ALONSO", locality: "CORUMBA CUE", lat: -25.19520111, lon: -57.52619028 },
  { order: 49, code: "1102083", name: "ESCUELA B\u00c1SICA N\u00b0 7631 VIRGEN DE LA PAZ", department: "CENTRAL", district: "CAPIAT\u00c1", locality: "RETIRO", lat: -25.38423806, lon: -57.48088167 },
  { order: 50, code: "1102029", name: "ESCUELA B\u00c1SICA N\u00b0 2857 CLUB DE LEONES DE CAPIAT\u00c1", department: "CENTRAL", district: "CAPIAT\u00c1", locality: "NARANJAYTY", lat: -25.3411825, lon: -57.43079639 },
  { order: 51, code: "1108034", name: "ESCUELA B\u00c1SICA N\u00b0 5570 SAN JUAN BOSCO", department: "CENTRAL", district: "LIMPIO", locality: "AGUAPEY", lat: -25.19233778, lon: -57.4407625 },
  { order: 52, code: "1115031", name: "ESCUELA B\u00c1SICA N\u00b0 3839 ESTADO DE QATAR", department: "CENTRAL", district: "VILLA ELISA", locality: "MBOKAJATY", lat: -25.38362361, lon: -57.5741625 },
  { order: 53, code: "1102081", name: "ESCUELA B\u00c1SICA N\u00b0 6032 MUNICIPAL SAN RAM\u00d3N", department: "CENTRAL", district: "CAPIAT\u00c1", locality: "SANTA LIBRADA", lat: -25.32773111, lon: -57.45636444 },
  { order: 54, code: "1107100", name: "ESCUELA B\u00c1SICA N\u00b0 7036 LA ARBOLEDA", department: "CENTRAL", district: "LAMBAR\u00c9", locality: "CUATRO MOJONES", lat: -25.34517694, lon: -57.59349806 },
  { order: 55, code: "1108027", name: "ESCUELA B\u00c1SICA N\u00b0 3681 MONTA\u00d1A ALTA", department: "CENTRAL", district: "LIMPIO", locality: "MONTA\u00d1A ALTA 1", lat: -25.18016, lon: -57.47148361 },
  { order: 56, code: "1114047", name: "ESCUELA B\u00c1SICA N\u00b0 599 GENERAL DE DIVISI\u00d3N FRANCISCO CABALLERO ALVAREZ", department: "CENTRAL", district: "SAN LORENZO", locality: "FATIMA", lat: -25.34439389, lon: -57.49507389 },
  { order: 57, code: "1102005", name: "ESCUELA B\u00c1SICA N\u00b0 603 PDTE. JOHN F. KENNEDY", department: "CENTRAL", district: "CAPIAT\u00c1", locality: "KENNEDY", lat: -25.41102222, lon: -57.48363278 },
  { order: 58, code: "1110024", name: "ESCUELA B\u00c1SICA N\u00b0 4744 PROFESORA OTILIA FERN\u00c1NDEZ DE ACOSTA", department: "CENTRAL", district: "MARIANO ROQUE ALONSO", locality: "CENTRAL", lat: -25.21129056, lon: -57.53956111 },
  { order: 59, code: "1109077", name: "ESCUELA B\u00c1SICA N\u00b0 3778 LOMA MERLO", department: "CENTRAL", district: "LUQUE", locality: "LOMA MERLO", lat: -25.24771611, lon: -57.50225778 },
  { order: 60, code: "1115012", name: "COLEGIO NACIONAL SAN JOS\u00c9", department: "CENTRAL", district: "VILLA ELISA", locality: "SAN JOSE", lat: -25.3677925, lon: -57.57443556 },
  { order: 61, code: "1109073", name: "ESCUELA B\u00c1SICA N\u00b0 3785 AMISTAD", department: "CENTRAL", district: "LUQUE", locality: "MACA-I", lat: -25.28003694, lon: -57.48041056 },
  { order: 62, code: "1105015", name: "ESCUELA B\u00c1SICA N\u00b0 882 DON CORNELIO GAONA", department: "CENTRAL", district: "IT\u00c1", locality: "OCULTO", lat: -25.52991389, lon: -57.35846444 },
  { order: 63, code: "1101012", name: "ESCUELA B\u00c1SICA N\u00b0 2956 SAN MIGUEL ARCANGEL", department: "CENTRAL", district: "AREGU\u00c1", locality: "SAN MIGUEL", lat: -25.30341722, lon: -57.40186361 },
  { order: 64, code: "1104007", name: "ESCUELA B\u00c1SICA N\u00b0 3519 ALFEO ZANOTTI", department: "CENTRAL", district: "GUARAMBAR\u00c9", locality: "TYPYCHATY", lat: -25.50942556, lon: -57.44963528 },
  { order: 65, code: "1106060", name: "ESCUELA B\u00c1SICA N\u00b0 6393 URUNDE'Y", department: "CENTRAL", district: "ITAUGU\u00c1", locality: "ITAUGUA GUAZU", lat: -25.41918389, lon: -57.36913417 },
  { order: 66, code: "1101010", name: "ESCUELA B\u00c1SICA N\u00b0 3883 MAR\u00cdA AUXILIADORA", department: "CENTRAL", district: "AREGU\u00c1", locality: "ISLA VALLE", lat: -25.2738025, lon: -57.39973 },
  { order: 67, code: "1101022", name: "ESCUELA B\u00c1SICA N\u00b0 2128 SE\u00d1OR FRANCISCO MEDINA ALFONZO", department: "CENTRAL", district: "AREGU\u00c1", locality: "JUKYTY", lat: -25.30844417, lon: -57.43474389 },
  { order: 68, code: "1119009", name: "ESCUELA B\u00c1SICA N\u00b0 883 CORONEL FELIPE TOLEDO", department: "CENTRAL", district: "JULI\u00c1N AUGUSTO SALD\u00cdVAR", locality: "TOLEDO CA\u00d1ADA", lat: -25.41801667, lon: -57.42978639 },
  { order: 69, code: "1117007", name: "ESCUELA B\u00c1SICA N\u00b0 2133 NUESTRA SE\u00d1ORA DEL ROSARIO", department: "CENTRAL", district: "YPACARA\u00cd", locality: "CERRO GUY KILOMETRO 35", lat: -25.40073611, lon: -57.30543778 },
  { order: 70, code: "1114081", name: "COLEGIO NACIONAL MAR\u00cdA IRENE ALONSO", department: "CENTRAL", district: "SAN LORENZO", locality: "SAN RAMON", lat: -25.33738028, lon: -57.48054722 },
  { order: 71, code: "1114031", name: "COLEGIO NACIONAL DR. EMILIO CUBAS", department: "CENTRAL", district: "SAN LORENZO", locality: "BARCEQUILLO", lat: -25.33800083, lon: -57.53122833 },
  { order: 72, code: "1103044", name: "COLEGIO NACIONAL NANAWA", department: "CENTRAL", district: "FERNANDO DE LA MORA", locality: "KOKUE GUASU", lat: -25.33366083, lon: -57.56185361 },
  { order: 73, code: "1102062", name: "COLEGIO NACIONAL SAGRADA FAMILIA", department: "CENTRAL", district: "CAPIAT\u00c1", locality: "PUERTA DEL SOL", lat: -25.33567944, lon: -57.47024611 },
  { order: 74, code: "1114002", name: "COLEGIO NACIONAL TACIANA DE VILLALBA", department: "CENTRAL", district: "SAN LORENZO", locality: "VIRGEN DEL ROSARIO", lat: -25.39146139, lon: -57.50808 },
  { order: 75, code: "1114013", name: "COLEGIO NACIONAL H\u00c9ROES DEL CHACO", department: "CENTRAL", district: "SAN LORENZO", locality: "LERIDA", lat: -25.37184833, lon: -57.48365556 },
  { order: 76, code: "1102047", name: "COLEGIO NACIONAL SAN AGUST\u00cdN", department: "CENTRAL", district: "CAPIAT\u00c1", locality: "ALDANA CA\u00d1ADA", lat: -25.38559472, lon: -57.41172833 },
  { order: 77, code: "1114009", name: "COLEGIO NACIONAL JOS\u00c9 DOLORES GONZ\u00c1LEZ", department: "CENTRAL", district: "SAN LORENZO", locality: "TAYAZUAPE", lat: -25.35693333, lon: -57.49081167 },
  { order: 78, code: "1107006", name: "COLEGIO NACIONAL SANTA LUC\u00cdA", department: "CENTRAL", district: "LAMBAR\u00c9", locality: "SANTA LUCIA", lat: -25.33311028, lon: -57.60291861 },
  { order: 79, code: "1102009", name: "COLEGIO NACIONAL SANTA ROSA DE LIMA", department: "CENTRAL", district: "CAPIAT\u00c1", locality: "ROJAS CA\u00d1ADA", lat: -25.37705639, lon: -57.42915444 },
  { order: 80, code: "1114037", name: "COLEGIO NACIONAL CHOFERES DEL CHACO", department: "CENTRAL", district: "SAN LORENZO", locality: "VIRGEN DE LOS REMEDIOS", lat: -25.32051444, lon: -57.48785306 },
  { order: 81, code: "1107068", name: "COLEGIO T\u00c9CNICO AVA MBA'E", department: "CENTRAL", district: "LAMBAR\u00c9", locality: "SAN ISIDRO", lat: -25.36381056, lon: -57.60800056 },
  { order: 82, code: "1109069", name: "COLEGIO NACIONAL MAESTRO ANTONIO MARCOS SILVA", department: "CENTRAL", district: "LUQUE", locality: "MARAMBURE", lat: -25.27672639, lon: -57.45352167 },
  { order: 83, code: "1102021", name: "COLEGIO NACIONAL CARLOS ANTONIO RACHIT", department: "CENTRAL", district: "CAPIAT\u00c1", locality: "CERRITO", lat: -25.35555694, lon: -57.48104639 },
  { order: 84, code: "1105017", name: "COLEGIO NACIONAL SOLDADOS DEL CHACO", department: "CENTRAL", district: "IT\u00c1", locality: "HUGUA \u00d1ARO", lat: -25.50851083, lon: -57.41693278 },
  { order: 85, code: "1111013", name: "CENTRO EDUCATIVO DEPARTAMENTAL MUNICIPAL NUEVA ITALIA", department: "CENTRAL", district: "NUEVA ITALIA", locality: "SAN PEDRO", lat: -25.60900611, lon: -57.462755 },
  { order: 86, code: "1108042", name: "COLEGIO NACIONAL SAN JUAN BOSCO", department: "CENTRAL", district: "LIMPIO", locality: "AGUAPEY", lat: -25.19233778, lon: -57.4407625 }
];

// ---------------------------------------------------------------------------
// 2) OPCION ALTERNATIVA: USAR TABLA ASSET EN EARTH ENGINE
// ---------------------------------------------------------------------------
// La tabla puede tener columnas code/codigo/codigo_local, name/nombre,
// lat/latitud/LAT_DEC y lon/lng/longitud/LNG_DEC, o geometria de punto.
var USE_TABLE_ASSET = false;
var TABLE_ASSET_ID = 'users/TU_USUARIO/cialpa_muestra_piloto_escuelas';

// ---------------------------------------------------------------------------
// 3) PARAMETROS DE EXPORTACION
// ---------------------------------------------------------------------------
var BUFFER_METERS = 650; // contexto amplio: predio, caminos y entorno.
var DRIVE_FOLDER = 'CIALPA_EE_PILOTO_ESCUELAS';
var EXPORT_PREFIX = 'CIALPA_PILOTO';
var EXPORT_START_INDEX = 0;
var EXPORT_LIMIT = 0; // 0 = todas las escuelas restantes.
var PREVIEW_COUNT = 3;

var NICFI_START_DATE = '2024-01-01';
var NICFI_END_DATE = '2026-01-01';
var EXPORT_SCALE_METERS = 4.77;
var EXPORT_RAW_RGB = true; // true recomendado para convertir luego a tiles.
var NICFI_VIS = { bands: ['R', 'G', 'B'], min: 64, max: 5454, gamma: 1.4 };

// Sentinel-2 queda solo como emergencia tecnica. Es de 10 m y no sirve para
// bloques finos. Mantener false salvo que se quiera probar el pipeline.
var EXPORT_SENTINEL2_FALLBACK = false;
var S2_START_DATE = '2024-01-01';
var S2_END_DATE = '2026-05-30';

// ---------------------------------------------------------------------------
// 4) HELPERS
// ---------------------------------------------------------------------------
function firstValue(obj, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    var value = obj[keys[i]];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function numberValue(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  var parsed = parseFloat(String(value).replace(',', '.'));
  return isFinite(parsed) ? parsed : null;
}

function slug(value) {
  return String(value || 'ESCUELA')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'ESCUELA';
}

function normalizeSchool(item, index) {
  var row = item || {};
  var code = String(firstValue(row, ['code', 'codigo', 'codigo_local', 'CODIGO', 'CODIGO_LOCAL', 'id_escuela'])).replace(/\D+/g, '');
  var name = String(firstValue(row, ['name', 'nombre', 'institucion', 'NOMBRE_INSTITUCION']));
  var lat = numberValue(firstValue(row, ['lat', 'latitud', 'LAT_DEC', 'lat_dec', 'latitude', 'Y', 'y']));
  var lon = numberValue(firstValue(row, ['lon', 'lng', 'longitud', 'LNG_DEC', 'lng_dec', 'longitude', 'X', 'x']));

  return {
    order: numberValue(firstValue(row, ['order', 'orden', 'orden_muestra_piloto', 'orden_visita', 'ENUMERA'])) || (index + 1),
    code: code || String(index + 1),
    name: name || 'ESCUELA',
    department: String(firstValue(row, ['department', 'departamento', 'DEPARTAMENTO'])),
    district: String(firstValue(row, ['district', 'distrito', 'DISTRITO'])),
    locality: String(firstValue(row, ['locality', 'localidad', 'LOCALIDAD'])),
    lat: lat,
    lon: lon
  };
}

function featureToSchool(feature, index) {
  var props = feature.properties || {};
  var geometry = feature.geometry || {};
  var coords = geometry.coordinates || [];
  var row = {};
  for (var key in props) {
    row[key] = props[key];
  }
  if (coords.length >= 2) {
    row.lon = row.lon || row.lng || row.longitud || coords[0];
    row.lat = row.lat || row.latitud || coords[1];
  }
  return normalizeSchool(row, index);
}

function fileNameForSchool(school) {
  return [
    EXPORT_PREFIX,
    school.order,
    school.code,
    slug(school.name),
    'NICFI_RGB',
    NICFI_START_DATE.slice(0, 4) + '_' + NICFI_END_DATE.slice(0, 4)
  ].join('_').slice(0, 120);
}

function maskS2Clouds(image) {
  var scl = image.select('SCL');
  var keep = scl.neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));
  return image.updateMask(keep);
}

// ---------------------------------------------------------------------------
// 5) EXPORTADOR PRINCIPAL
// ---------------------------------------------------------------------------
function runExports(rawSchools) {
  var normalized = [];
  for (var i = 0; i < rawSchools.length; i += 1) {
    var school = normalizeSchool(rawSchools[i], i);
    if (school.lat !== null && school.lon !== null) {
      normalized.push(school);
    } else {
      print('Escuela omitida sin coordenadas', rawSchools[i]);
    }
  }

  normalized.sort(function(a, b) {
    return a.order - b.order;
  });

  var endIndex = EXPORT_LIMIT > 0
    ? Math.min(normalized.length, EXPORT_START_INDEX + EXPORT_LIMIT)
    : normalized.length;
  var selectedSchools = normalized.slice(EXPORT_START_INDEX, endIndex);

  print('Escuelas recibidas', rawSchools.length);
  print('Escuelas con coordenadas', normalized.length);
  print('Escuelas seleccionadas para exportar', selectedSchools.length);
  print('Rango indices', EXPORT_START_INDEX, endIndex - 1);
  print('Drive folder destino', DRIVE_FOLDER);
  print('Accion requerida', 'Luego de Run, abrir Tasks y pulsar Run en cada export.');

  Map.setOptions('SATELLITE');

  var nicfiBase = ee.ImageCollection('projects/planet-nicfi/assets/basemaps/americas')
    .filterDate(NICFI_START_DATE, NICFI_END_DATE)
    .sort('system:time_start', false);

  var s2Base = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterDate(S2_START_DATE, S2_END_DATE)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
    .map(maskS2Clouds);

  var featureList = [];
  selectedSchools.forEach(function(school) {
    featureList.push(ee.Feature(ee.Geometry.Point([school.lon, school.lat]), {
      code: school.code,
      name: school.name,
      order: school.order
    }));
  });
  var selectedFeatures = ee.FeatureCollection(featureList);
  Map.addLayer(selectedFeatures, { color: 'red' }, 'Escuelas seleccionadas');

  if (selectedSchools.length > 0) {
    Map.centerObject(ee.Geometry.Point([selectedSchools[0].lon, selectedSchools[0].lat]), 16);
  }

  selectedSchools.forEach(function(school, localIndex) {
    var point = ee.Geometry.Point([school.lon, school.lat]);
    var roi = point.buffer(BUFFER_METERS).bounds();
    var nicfi = nicfiBase.filterBounds(roi);
    var latest = ee.Image(nicfi.first()).clip(roi);
    var rgb = latest.select(['R', 'G', 'B']);
    var exportImage = EXPORT_RAW_RGB ? rgb : rgb.visualize(NICFI_VIS);
    var exportName = fileNameForSchool(school);

    if (localIndex < PREVIEW_COUNT) {
      var roiOutline = ee.Image().byte().paint({
        featureCollection: ee.FeatureCollection([ee.Feature(roi)]),
        color: 1,
        width: 2
      });
      Map.addLayer(roiOutline, { palette: ['yellow'] }, 'ROI ' + school.code, false);
      Map.addLayer(latest, NICFI_VIS, 'NICFI preview ' + school.code, localIndex === 0);
      print('NICFI cantidad imagenes ' + school.code, nicfi.size());
    }

    Export.image.toDrive({
      image: exportImage,
      description: exportName,
      folder: DRIVE_FOLDER,
      fileNamePrefix: exportName,
      region: roi,
      scale: EXPORT_SCALE_METERS,
      maxPixels: 1e9,
      fileFormat: 'GeoTIFF',
      formatOptions: {
        cloudOptimized: true
      }
    });

    if (EXPORT_SENTINEL2_FALLBACK) {
      var s2 = s2Base.filterBounds(roi).median().clip(roi).select(['B4', 'B3', 'B2']);
      Export.image.toDrive({
        image: s2,
        description: exportName.replace('_NICFI_', '_S2_'),
        folder: DRIVE_FOLDER,
        fileNamePrefix: exportName.replace('_NICFI_', '_S2_'),
        region: roi,
        scale: 10,
        maxPixels: 1e9,
        fileFormat: 'GeoTIFF',
        formatOptions: {
          cloudOptimized: true
        }
      });
    }
  });
}

// ---------------------------------------------------------------------------
// 6) ENTRADA
// ---------------------------------------------------------------------------
if (USE_TABLE_ASSET) {
  ee.FeatureCollection(TABLE_ASSET_ID).toList(500).evaluate(function(features) {
    var schools = [];
    for (var i = 0; i < features.length; i += 1) {
      schools.push(featureToSchool(features[i], i));
    }
    runExports(schools);
  });
} else {
  runExports(SCHOOLS);
}
