/**
 * CIALPA - Manual operativo del encuestador.
 * Visor contextual y enlaces al documento completo.
 */

const ManualModule = (() => {
  'use strict';

  const SECTIONS = [
    { id: 'flujo', title: '1. Recorrido completo' },
    { id: 'preparacion', title: '2. Antes de salir' },
    { id: 'escuela', title: '3. Elegir la escuela' },
    { id: 'ubicacion', title: '4. Ubicacion y base mapa' },
    { id: 'perimetro', title: '5. Perimetro del predio' },
    { id: 'bloques', title: '6. Bloques y pisos' },
    { id: 'ambientes', title: '7. Aulas y espacios' },
    { id: 'sanitarios', title: '8. Sanitarios' },
    { id: 'servicios', title: '9. Servicios y exteriores' },
    { id: 'danos', title: '10. Danos y fallas' },
    { id: 'fotos', title: '11. Fotos y evidencias' },
    { id: 'guardado', title: '12. Guardado y conexion' },
    { id: 'cierre', title: '13. Revision y cierre' },
    { id: 'problemas', title: '14. Problemas frecuentes' },
  ];

  const STEP_SECTIONS = {
    escuela: 'escuela',
    predio: 'perimetro',
    bloques: 'bloques',
    ambientes: 'ambientes',
    sanitarios: 'sanitarios',
    exteriores: 'servicios',
    cierre: 'cierre',
  };

  let _isOpen = false;

  function toggle() {
    _isOpen ? close() : open();
  }

  function open(sectionId = 'flujo') {
    const modal = document.getElementById('modal-manual');
    if (!modal) return;
    const searchInput = document.getElementById('manual-search');
    if (searchInput?.value) {
      searchInput.value = '';
      search('');
    }
    modal.classList.add('modal--visible');
    _isOpen = true;
    requestAnimationFrame(() => scrollToSection(_validSection(sectionId)));
  }

  function close() {
    const modal = document.getElementById('modal-manual');
    if (!modal) return;
    modal.classList.remove('modal--visible');
    _isOpen = false;
  }

  function scrollToSection(sectionId) {
    const id = _validSection(sectionId);
    const el = document.getElementById(`manual-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      _highlightNav(id);
    }
  }

  function _searchText(value = '') {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function sectionForContext(stepId = '', text = '') {
    const normalized = _searchText(text);
    if (/foto|evidencia|camara|drive/.test(normalized)) return 'fotos';
    if (/sin conexion|offline|sincron|guardar|sheets/.test(normalized)) return 'guardado';
    if (/dano|falla|fisura|humedad|rotura|riesgo/.test(normalized)) return 'danos';
    if (/agua|desague|inodoro|lavamanos|sanitario/.test(normalized)) return 'sanitarios';
    if (/electric|acometida|tablero|puesta a tierra|tanque|pozo/.test(normalized)) return 'servicios';
    return STEP_SECTIONS[String(stepId || '').toLowerCase()] || 'flujo';
  }

  function openContext(stepId = '', text = '') {
    open(sectionForContext(stepId, text));
  }

  function _validSection(sectionId) {
    const requested = String(sectionId || '').replace(/^manual-section-/, '');
    return SECTIONS.some(section => section.id === requested) ? requested : 'flujo';
  }

  function _highlightNav(sectionId) {
    document.querySelectorAll('.manual-nav__item').forEach(item => {
      const active = item.dataset.section === sectionId;
      item.classList.toggle('active', active);
      item.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }

  function search(query) {
    const q = _searchText(query).trim();
    const container = document.getElementById('manual-content');
    if (!container) return;
    container.querySelectorAll('.manual-section').forEach(section => {
      section.hidden = Boolean(q && !_searchText(section.textContent).includes(q));
    });
  }

  function renderModal() {
    if (document.getElementById('modal-manual')) return;
    const modal = document.createElement('div');
    modal.id = 'modal-manual';
    modal.className = 'modal modal--manual';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'manual-dialog-title');
    modal.innerHTML = `
      <div class="modal__overlay" onclick="ManualModule.close()"></div>
      <div class="modal__panel modal__panel--drawer">
        <div class="modal__header">
          <h2 id="manual-dialog-title">Manual del encuestador</h2>
          <div class="manual-header-actions">
            <input id="manual-search" type="search" class="form-control form-control-sm"
              aria-label="Buscar en el manual" placeholder="Buscar..." oninput="ManualModule.search(this.value)">
            <a href="manual/index.html" target="_blank" rel="noopener" class="btn btn-sm btn-outline">Version imprimible</a>
            <button class="modal__close" type="button" onclick="ManualModule.close()" aria-label="Cerrar manual">&times;</button>
          </div>
        </div>
        <div class="modal__body manual-modal-body">
          <nav class="manual-nav" aria-label="Capitulos del manual">
            <ul>
              ${SECTIONS.map(section => `
                <li class="manual-nav__item" data-section="${section.id}"
                    onclick="ManualModule.scrollToSection('${section.id}')">
                  ${section.title}
                </li>`).join('')}
            </ul>
          </nav>
          <div id="manual-content" class="manual-content">
            ${_buildContent()}
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.manual-content')?.addEventListener('scroll', _onContentScroll);
  }

  function _onContentScroll() {
    const content = document.getElementById('manual-content');
    if (!content) return;
    const contentTop = content.getBoundingClientRect().top;
    let current = 'flujo';
    content.querySelectorAll('.manual-section:not([hidden])').forEach(section => {
      if (section.getBoundingClientRect().top <= contentTop + 80) {
        current = section.id.replace('manual-section-', '');
      }
    });
    _highlightNav(current);
  }

  function _buildContent() {
    return SECTIONS.map(section => `
      <section class="manual-section" id="manual-section-${section.id}">
        <h3>${section.title}</h3>
        ${_getSectionContent(section.id)}
        <p class="manual-section__document-link"><a href="manual/index.html#${section.id}" target="_blank" rel="noopener">Abrir este capitulo en el documento completo</a></p>
      </section>`).join('<hr>');
  }

  function _getSectionContent(id) {
    const contents = {
      flujo: `
        <ol class="manual-checklist">
          <li>Inicie sesion y revise su jornada.</li>
          <li>Elija la escuela en Mapa e inicie o continue el registro.</li>
          <li>Confirme identidad, coordenadas y base mapa.</li>
          <li>Dibuje y confirme el perimetro del predio.</li>
          <li>Cargue bloques, pisos, aulas, otros espacios y sanitarios.</li>
          <li>Ubique conexiones de electricidad, agua, desague y exteriores.</li>
          <li>Registre danos, fallas, observaciones y fotos donde correspondan.</li>
          <li>Revise pendientes, sincronice y finalice.</li>
        </ol>
        <p><strong>Alcance:</strong> registre ubicacion, tipo, cantidad, medidas y relacion espacial. Los danos y fallas se conservan; no invente una calificacion general si no puede verificarla.</p>`,
      preparacion: `
        <ul>
          <li>Dispositivo cargado, cargador o bateria externa y navegador actualizado.</li>
          <li>Permisos de ubicacion y camara habilitados.</li>
          <li>Cinta metrica o medidor laser, libreta y contacto del supervisor.</li>
          <li>App abierta antes de perder conectividad y escuelas asignadas visibles.</li>
        </ul>
        <p>Pruebe el acceso, el mapa y una foto antes de salir. No comparta su usuario ni deje una sesion abierta en un dispositivo ajeno.</p>`,
      escuela: `
        <ol>
          <li>Abra <strong>Mapa</strong> y use los filtros necesarios.</li>
          <li>Seleccione el marcador correcto por codigo y nombre.</li>
          <li>Pulse <strong>Iniciar/continuar registro</strong>.</li>
          <li>Confirme departamento, distrito, localidad y coordenadas.</li>
        </ol>
        <p>Si el local no coincide, vuelva al mapa. No continúe un plano bajo el codigo de otra escuela.</p>`,
      ubicacion: `
        <ol>
          <li>Pulse <strong>Usar coordenadas MEC</strong>.</li>
          <li>Active la imagen disponible: alta resolucion, satelite, calles o catastro.</li>
          <li>Mueva, acerque o gire la base hasta reconocer el predio.</li>
          <li>Pulse <strong>Guardar base</strong> cuando la referencia sea correcta.</li>
        </ol>
        <p>Una imagen de alta resolucion se ofrece solo si existe para esa escuela. Si falla, la app mantiene la satelital estable como respaldo.</p>`,
      perimetro: `
        <ol>
          <li>Pulse <strong>Dibujar perimetro</strong> o seleccione el ya guardado.</li>
          <li>En un perimetro existente, pulse <strong>Editar perimetro</strong>.</li>
          <li>Use <strong>Mover completo</strong> para trasladar el poligono sin deformarlo.</li>
          <li>Use <strong>Ajustar vertices</strong> para arrastrar los puntos numerados.</li>
          <li>Agregue o quite vertices solo cuando la forma lo requiera.</li>
          <li>Pulse <strong>Guardar cambios</strong>; use <strong>Cancelar</strong> para restaurar la forma anterior.</li>
        </ol>
        <p>La app calcula longitud de lados, perimetro y area a partir de las coordenadas. El contorno es una referencia de relevamiento, no reemplaza una mensura catastral.</p>`,
      bloques: `
        <ol>
          <li>Cree un bloque y registre largo, ancho, denominacion y cantidad de pisos.</li>
          <li>Arrastrelo dentro del perimetro y girelo para coincidir con la implantacion.</li>
          <li>Agregue cada piso registrable y confirme sus medidas.</li>
          <li>Registre circulacion, pilares y componentes electricos visibles cuando correspondan.</li>
          <li>Guarde el bloque antes de iniciar otro.</li>
        </ol>`,
      ambientes: `
        <ol>
          <li>Indique cuantas aulas o espacios existen en el piso activo.</li>
          <li>Cree cada ambiente, ubique su forma y registre largo y ancho.</li>
          <li>Seleccione su tipo: aula, direccion, biblioteca, comedor, deposito u otro.</li>
          <li>Ubique puertas, ventanas, tomas, luces, ventiladores, aires y tableros visibles.</li>
          <li>Confirme cada ambiente antes de pasar al siguiente.</li>
        </ol>
        <p>Las medidas deben representar el espacio observado. Use la ficha para corregir datos y el plano para posicionar.</p>`,
      sanitarios: `
        <ol>
          <li>Indique si el bloque o piso tiene sanitario.</li>
          <li>Ubique el ambiente y registre largo, ancho, uso y destino.</li>
          <li>Registre disponibilidad y origen de agua.</li>
          <li>Registre el tipo de desague o descarga verificable.</li>
          <li>Ubique puertas, ventanas, cabinas, inodoros, lavamanos, duchas y urinarios.</li>
          <li>Confirme la ficha y documente danos o fallas visibles.</li>
        </ol>`,
      servicios: `
        <p>Ubique los elementos donde realmente se observan y registre tipo, medidas y relacion con el bloque o predio.</p>
        <ul>
          <li><strong>Electricidad:</strong> acometida, medidor, tablero, protecciones, puesta a tierra, tomas y luminarias.</li>
          <li><strong>Agua:</strong> conexion, medidor, tanque, pozo, bomba y puntos de abastecimiento.</li>
          <li><strong>Desague:</strong> red, camara, pozo ciego, registros y descargas visibles.</li>
          <li><strong>Exteriores:</strong> accesos, veredas, patios, galerias, canchas, cercos y otros elementos relevantes.</li>
        </ul>`,
      danos: `
        <p>Los danos y fallas <strong>deben registrarse</strong>. Ubique el marcador en el elemento afectado y describa el hallazgo sin diagnosticar causas que no pudo comprobar.</p>
        <ul>
          <li>Indique elemento, ubicacion, tipo de dano o falla y extension aproximada.</li>
          <li>Adjunte una foto de contexto y otra de detalle cuando sea util.</li>
          <li>Registre riesgo inmediato solo si existe una condicion observable.</li>
          <li>No use el campo para opiniones generales de calidad.</li>
        </ul>`,
      fotos: `
        <ul>
          <li>Tome primero una vista general y luego el detalle.</li>
          <li>Evite rostros, documentos personales y contenido ajeno al relevamiento.</li>
          <li>Asocie cada foto al ambiente u objeto correcto antes de continuar.</li>
          <li>Revise el contador: puede quedar pendiente de Drive mientras no haya conexion.</li>
        </ul>`,
      guardado: `
        <p>El borrador se conserva localmente durante la carga. Cuando hay conexion, la app intenta sincronizar con Sheets y subir evidencias a Drive.</p>
        <ol>
          <li>Si aparece <strong>Sin conexion</strong>, continue sin cerrar el navegador.</li>
          <li>Al recuperar señal, pulse sincronizar y espere la confirmacion.</li>
          <li>No borre datos del navegador ni reinstale la app con cargas pendientes.</li>
          <li>Antes de finalizar, revise que no queden fotos ni borradores pendientes.</li>
        </ol>`,
      cierre: `
        <ol>
          <li>Abra <strong>Revision y salida</strong>.</li>
          <li>Recorra la lista de pendientes y vuelva al elemento indicado para corregirlo.</li>
          <li>Confirme que identidad, perimetro, bloques, ambientes, sanitarios y exteriores correspondan.</li>
          <li>Sincronice borrador y fotos.</li>
          <li>Finalice completo; use cierre parcial solo con motivo y pendiente claramente registrado.</li>
          <li>Vuelva al mapa y compruebe el nuevo estado de la escuela.</li>
        </ol>`,
      problemas: `
        <h4>No aparece una escuela</h4><p>Limpie filtros, actualice el padrón y confirme su asignacion. Si sigue ausente, registre una solicitud.</p>
        <h4>No se ve alta resolucion</h4><p>No todas las escuelas tienen imagen local. Use satelite estable y no detenga el relevamiento.</p>
        <h4>No puedo mover el perimetro</h4><p>Seleccione el contorno, pulse Editar perimetro y active Mover completo o Ajustar vertices.</p>
        <h4>La app dice sin conexion</h4><p>La carga queda local. No borre el navegador; recupere señal y sincronice.</p>
        <h4>El registro finalizado no muestra datos</h4><p>No cree otro. Vuelva al mapa, abra Ver/editar y reporte al supervisor si el borrador no se restaura.</p>`,
    };
    return contents[id] || '<p>Consulte el documento completo del manual.</p>';
  }

  return {
    toggle,
    open,
    openContext,
    close,
    scrollToSection,
    sectionForContext,
    search,
    renderModal,
    SECTIONS,
  };
})();
