/**
 * CIALPA, Relevamiento Escolar
 * manual.js, visor rápido del Manual del Encuestador
 * Version: 2.2.0
 */

const ManualModule = (() => {
  'use strict';

  const SECTIONS = [
    { id: 'alcance', title: '1. Alcance operativo' },
    { id: 'flujo', title: '2. Flujo de trabajo' },
    { id: 'escuelas', title: '3. Escuelas asignadas' },
    { id: 'aplicar', title: '4. Aplicar encuesta externa' },
    { id: 'tiempos', title: '5. Medición de tiempos' },
    { id: 'modulos', title: '6. Control por módulos' },
    { id: 'incidencias', title: '7. Incidencias' },
    { id: 'cierre', title: '8. Cierre y folio externo' },
    { id: 'calidad', title: '9. Control de calidad' },
    { id: 'errores', title: '10. Errores frecuentes' },
  ];

  let _isOpen = false;

  function toggle() {
    _isOpen ? close() : open();
  }

  function open(sectionId = null) {
    const modal = document.getElementById('modal-manual');
    if (!modal) return;
    modal.classList.add('modal--visible');
    _isOpen = true;
    if (sectionId) scrollToSection(sectionId);
  }

  function close() {
    const modal = document.getElementById('modal-manual');
    if (!modal) return;
    modal.classList.remove('modal--visible');
    _isOpen = false;
  }

  function scrollToSection(sectionId) {
    const el = document.getElementById(`manual-section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      _highlightNav(sectionId);
    }
  }

  function _highlightNav(sectionId) {
    document.querySelectorAll('.manual-nav__item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });
  }

  function search(query) {
    const q = (query || '').trim().toLowerCase();
    const container = document.getElementById('manual-content');
    if (!container) return;
    container.querySelectorAll('.manual-section').forEach(section => {
      const text = section.textContent.toLowerCase();
      section.style.display = !q || text.includes(q) ? '' : 'none';
    });
  }

  function renderModal() {
    const existing = document.getElementById('modal-manual');
    if (existing) return;

    const modal = document.createElement('div');
    modal.id = 'modal-manual';
    modal.className = 'modal modal--manual';
    modal.innerHTML = `
      <div class="modal__overlay" onclick="ManualModule.close()"></div>
      <div class="modal__panel modal__panel--drawer">
        <div class="modal__header">
          <h2>Manual del Encuestador</h2>
          <div class="manual-header-actions">
            <input id="manual-search" type="text" class="form-control form-control-sm"
              placeholder="Buscar en el manual..." oninput="ManualModule.search(this.value)" />
            <a href="manual/index.html" target="_blank" class="btn btn-sm btn-outline">Ver manual completo</a>
            <a href="manual/MANUAL_ENCUESTADOR_CIALPA.md" target="_blank" class="btn btn-sm btn-outline">Ver Markdown</a>
            <button class="modal__close" onclick="ManualModule.close()">&times;</button>
          </div>
        </div>
        <div class="modal__body manual-modal-body">
          <nav class="manual-nav">
            <ul>
              ${SECTIONS.map(s => `
                <li class="manual-nav__item" data-section="${s.id}"
                    onclick="ManualModule.scrollToSection('${s.id}')">
                  ${s.title}
                </li>`).join('')}
            </ul>
          </nav>
          <div id="manual-content" class="manual-content">
            ${_buildContent()}
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    const content = modal.querySelector('.manual-content');
    if (content) content.addEventListener('scroll', _onContentScroll);
  }

  function _onContentScroll() {
    const sections = document.querySelectorAll('.manual-section');
    let current = null;
    sections.forEach(s => {
      const rect = s.getBoundingClientRect();
      if (rect.top < 200) current = s.id.replace('manual-section-', '');
    });
    if (current) _highlightNav(current);
  }

  function _buildContent() {
    return SECTIONS.map(s => `
      <section class="manual-section" id="manual-section-${s.id}">
        <h3>${s.title}</h3>
        ${_getSectionContent(s.id)}
      </section>`).join('<hr>');
  }

  function _getSectionContent(id) {
    const contents = {
      alcance: `
        <p>La app web CIALPA funciona como consola operativa de campo. No sustituye el cuestionario técnico externo del MEC/RUE/Apps. Su finalidad es seleccionar la escuela correcta, abrir o intentar abrir el aplicativo externo, registrar inicio y cierre del relevamiento, medir tiempos, documentar incidencias y producir información útil para supervisión, cronogramas y control de calidad.</p>
        <p><strong>Regla básica:</strong> todo relevamiento iniciado en CIALPA debe cerrarse en CIALPA, aunque el cuestionario técnico se haya completado en otra aplicación.</p>`,
      flujo: `
        <ol>
          <li>Inicie sesión en CIALPA.</li>
          <li>Verifique su escuela asignada.</li>
          <li>Registre la llegada al local escolar.</li>
          <li>Presione <strong>Aplicar encuesta</strong>.</li>
          <li>Complete el cuestionario en el aplicativo externo.</li>
          <li>Registre módulos, pausas o incidencias relevantes.</li>
          <li>Vuelva a CIALPA y cierre el relevamiento.</li>
          <li>Registre folio externo, último registro u observación final.</li>
        </ol>`,
      escuelas: `
        <p>Antes de iniciar, confirme código de local, nombre, departamento, distrito, coordenadas y estado operativo. Si la escuela no aparece, aparece duplicada o tiene datos incompatibles, reporte al supervisor. No cree registros informales ni seleccione otra escuela parecida.</p>
        <table class="manual-table">
          <tr><th>Estado</th><th>Acción esperada</th></tr>
          <tr><td>Pendiente</td><td>Puede iniciar visita.</td></tr>
          <tr><td>En curso</td><td>Verifique si corresponde a su sesión activa.</td></tr>
          <tr><td>Parcial</td><td>Continúe solo con instrucción del supervisor.</td></tr>
          <tr><td>Finalizada</td><td>No reabra salvo autorización.</td></tr>
          <tr><td>Con incidencia</td><td>Revise la observación y coordine solución.</td></tr>
        </table>`,
      aplicar: `
        <p>El botón <strong>Aplicar encuesta</strong> puede abrir una URL, una aplicación instalada o un esquema de Android, según la configuración del dispositivo. Si la apertura automática no funciona, abra manualmente el aplicativo externo y registre la observación.</p>
        <p><strong>Importante:</strong> CIALPA no puede leer automáticamente el cierre interno de la app externa. Por eso el encuestador debe volver a CIALPA para cerrar la sesión.</p>`,
      tiempos: `
        <p>El tiempo total se calcula entre el inicio del relevamiento en CIALPA y el cierre registrado en CIALPA. Si hubo pausas largas, problemas de conectividad o interrupciones, descríbalas en observaciones.</p>
        <p>Estos tiempos permiten estimar duración promedio por escuela, carga diaria de trabajo, complejidad por tipo de local y necesidades de personal para la encuesta grande.</p>`,
      modulos: `
        <p>Cuando el relevamiento sea complejo, registre tiempos por módulo: identificación, exteriores, servicios, electricidad, bloques, áreas de recreación, aulas, dependencias, laboratorios, talleres, sanitarios, evidencias y revisión final.</p>
        <p>No cierre el relevamiento con módulos abiertos sin explicación.</p>`,
      incidencias: `
        <p>Registre incidencia ante escuela cerrada, responsable ausente, rechazo, falta de conectividad, error de app, ubicación incorrecta, GPS no disponible, problema de seguridad o interrupción operativa.</p>
        <p>Todo cierre parcial o reprogramación debe incluir motivo, módulo pendiente, fecha tentativa y observación breve.</p>`,
      cierre: `
        <ol>
          <li>Confirme que el cuestionario externo terminó o que el cierre parcial está justificado.</li>
          <li>Cierre módulos pendientes.</li>
          <li>Registre folio externo o último registro disponible.</li>
          <li>Indique si el relevamiento fue completo, parcial o con incidencia.</li>
          <li>Presione <strong>Finalizar relevamiento</strong>.</li>
          <li>Verifique que el estado de la escuela cambie correctamente.</li>
        </ol>`,
      calidad: `
        <ul>
          <li>Código y nombre de escuela coinciden con la asignación.</li>
          <li>Coordenadas dentro del rango esperado para Paraguay.</li>
          <li>Inicio y cierre registrados.</li>
          <li>Aplicativo externo usado o apertura manual documentada.</li>
          <li>Incidencias cargadas.</li>
          <li>Folio externo registrado cuando exista.</li>
          <li>Observación final clara.</li>
        </ul>`,
      errores: `
        <h4>No aparecen escuelas</h4>
        <p>Revise filtros, actualice datos y reinicie sesión. Si persiste, reporte al administrador para revisar la hoja de escuelas seleccionadas.</p>
        <h4>El botón Aplicar encuesta no abre la app externa</h4>
        <p>Abra manualmente la app externa, continúe el relevamiento y registre observación técnica.</p>
        <h4>Se perdió conectividad</h4>
        <p>Continúe si el aplicativo externo lo permite. Registre incidencia si afecta el avance o la sincronización.</p>
        <h4>Quedó una sesión abierta</h4>
        <p>Ingrese nuevamente a la escuela y cierre la sesión si corresponde. Si no puede hacerlo, avise al supervisor.</p>`
    };
    return contents[id] || '<p>Contenido no disponible. Consulte la versión completa del manual.</p>';
  }

  return {
    toggle,
    open,
    close,
    scrollToSection,
    search,
    renderModal,
    SECTIONS,
  };
})();
