/**
 * CIALPA — Relevamiento Escolar
 * manual.js — Manual / help module
 * Version: 2.0.0
 */

const ManualModule = (() => {
  'use strict';

  const SECTIONS = [
    { id: 'intro', title: '1. Introducción al Sistema' },
    { id: 'acceso', title: '2. Acceso y Login' },
    { id: 'mapa', title: '3. Uso del Mapa' },
    { id: 'encuesta', title: '4. Aplicar Encuesta' },
    { id: 'estados', title: '5. Estados de Relevamiento' },
    { id: 'incidencias', title: '6. Registro de Incidencias' },
    { id: 'jornada', title: '7. Mi Jornada' },
    { id: 'formulario', title: '8. Formulario MEC' },
    { id: 'sincronizacion', title: '9. Sincronización de Datos' },
    { id: 'roles', title: '10. Roles y Permisos' },
    { id: 'estadisticas', title: '11. Panel Estadístico' },
    { id: 'configuracion', title: '12. Configuración (Admin)' },
    { id: 'auditoria', title: '13. Auditoría (Admin)' },
    { id: 'errores', title: '14. Solución de Errores Comunes' },
    { id: 'contacto', title: '15. Soporte y Contacto' },
  ];

  let _isOpen = false;

  // ── Toggle manual drawer ──────────────────────────────────────────────────

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

  // ── Search ────────────────────────────────────────────────────────────────

  function search(query) {
    const q = (query || '').trim().toLowerCase();
    const container = document.getElementById('manual-content');
    if (!container) return;

    if (!q) {
      container.querySelectorAll('mark').forEach(m => {
        m.replaceWith(document.createTextNode(m.textContent));
      });
      container.querySelectorAll('.manual-section').forEach(s => s.style.display = '');
      return;
    }

    // Show only matching sections
    container.querySelectorAll('.manual-section').forEach(section => {
      const text = section.textContent.toLowerCase();
      section.style.display = text.includes(q) ? '' : 'none';
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderModal() {
    const existing = document.getElementById('modal-manual');
    if (existing) return; // already rendered

    const modal = document.createElement('div');
    modal.id = 'modal-manual';
    modal.className = 'modal modal--manual';
    modal.innerHTML = `
      <div class="modal__overlay" onclick="ManualModule.close()"></div>
      <div class="modal__panel modal__panel--drawer">
        <div class="modal__header">
          <h2>Manual de Usuario — CIALPA</h2>
          <div class="manual-header-actions">
            <input id="manual-search" type="text" class="form-control form-control-sm"
              placeholder="Buscar en el manual..." oninput="ManualModule.search(this.value)" />
            <a href="manual/index.html" target="_blank" class="btn btn-sm btn-outline">Ver completo</a>
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

    // Scroll spy
    const content = modal.querySelector('.manual-content');
    content.addEventListener('scroll', _onContentScroll);
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
      intro: `
        <p>Bienvenido al sistema <strong>CIALPA — Relevamiento Escolar</strong>, una plataforma web diseñada para gestionar el relevamiento de infraestructura y condiciones de establecimientos educativos en Paraguay.</p>
        <p>El sistema permite a los encuestadores registrar sus visitas a cada escuela, completar el formulario oficial del MEC, y registrar incidencias. Los supervisores y administradores pueden monitorear el avance en tiempo real.</p>
        <h4>Objetivos del sistema</h4>
        <ul>
          <li>Centralizar el seguimiento de visitas a escuelas.</li>
          <li>Registrar el inicio y cierre de cada sesión de relevamiento.</li>
          <li>Gestionar incidencias de campo.</li>
          <li>Proveer estadísticas de avance por departamento y encuestador.</li>
        </ul>`,
      acceso: `
        <p>Para acceder al sistema:</p>
        <ol>
          <li>Abrí el navegador y navegá a la URL de la aplicación.</li>
          <li>Ingresá tu <strong>usuario</strong> y <strong>contraseña</strong> provistos por el administrador.</li>
          <li>Hacé clic en <em>Ingresar</em>.</li>
        </ol>
        <p><strong>Nota:</strong> Si olvidaste tu contraseña, contactá al administrador.</p>
        <p>La sesión expira automáticamente a las 8 horas por seguridad. Si la sesión expiró, el sistema te redirigirá al login.</p>
        <h4>Cierre de sesión</h4>
        <p>Para cerrar sesión de forma segura, hacé clic en tu nombre en la parte superior derecha y seleccioná <em>Cerrar sesión</em>.</p>`,
      mapa: `
        <p>El módulo de <strong>Mapa</strong> muestra todas las escuelas de tu zona en un mapa interactivo.</p>
        <h4>Colores de los marcadores</h4>
        <ul>
          <li><span style="color:#6c757d">●</span> <strong>Gris:</strong> Pendiente de relevar.</li>
          <li><span style="color:#fd7e14">●</span> <strong>Naranja:</strong> En curso (sesión activa).</li>
          <li><span style="color:#28a745">●</span> <strong>Verde:</strong> Relevamiento finalizado.</li>
          <li><span style="color:#dc3545">●</span> <strong>Rojo:</strong> Con incidencia.</li>
        </ul>
        <h4>Filtros disponibles</h4>
        <ul>
          <li>Departamento, Distrito, Zona, Encuestador, Estado.</li>
          <li>Búsqueda por nombre o código de escuela.</li>
        </ul>
        <h4>Interacción</h4>
        <p>Hacé clic en un marcador para ver la información de la escuela. Desde el popup podés iniciar la encuesta directamente.</p>
        <p>Usá la lista lateral para navegar entre escuelas filtradas.</p>`,
      encuesta: `
        <p>Para aplicar una encuesta:</p>
        <ol>
          <li>Seleccioná la escuela desde el mapa o la lista.</li>
          <li>Hacé clic en <em>Aplicar Encuesta</em>.</li>
          <li>En el módulo <em>Aplicar Encuesta</em>, verificá los datos de la escuela.</li>
          <li>Hacé clic en <strong>Iniciar Encuesta</strong>. Esto registra el inicio de la sesión en el sistema.</li>
          <li>Se abrirá el formulario oficial del MEC en una nueva ventana.</li>
          <li>Completá el formulario del MEC.</li>
          <li>Al terminar, volvé a la aplicación y hacé clic en <strong>Finalizar Encuesta</strong>.</li>
        </ol>
        <p><strong>Importante:</strong> No cerrés la aplicación mientras el formulario está abierto, ya que la sesión quedaría abierta en el sistema.</p>`,
      estados: `
        <p>Cada escuela tiene uno de los siguientes estados:</p>
        <table class="manual-table">
          <tr><th>Estado</th><th>Significado</th></tr>
          <tr><td><span class="badge" style="background:#6c757d">Pendiente</span></td><td>Aún no fue relevada.</td></tr>
          <tr><td><span class="badge" style="background:#fd7e14">En Curso</span></td><td>Hay una sesión activa en este momento.</td></tr>
          <tr><td><span class="badge" style="background:#28a745">Finalizada</span></td><td>El relevamiento fue completado.</td></tr>
          <tr><td><span class="badge" style="background:#dc3545">Con Incidencia</span></td><td>Hubo un problema durante el relevamiento.</td></tr>
        </table>`,
      incidencias: `
        <p>Si encontrás un problema durante el relevamiento (escuela cerrada, director ausente, etc.):</p>
        <ol>
          <li>Hacé clic en <strong>Registrar Incidencia</strong> durante la sesión activa.</li>
          <li>Seleccioná el tipo de incidencia.</li>
          <li>Describí el problema en detalle.</li>
          <li>Asigná una prioridad (Alta / Media / Baja).</li>
          <li>Guardá la incidencia.</li>
        </ol>
        <p>Las incidencias quedan registradas y visibles para el supervisor, quien podrá coordinar una revisita.</p>
        <h4>Tipos de incidencia</h4>
        <ul>
          <li>Escuela cerrada</li>
          <li>Acceso bloqueado</li>
          <li>Director/a ausente</li>
          <li>Formulario incompleto</li>
          <li>Problema técnico</li>
          <li>Seguridad / riesgo</li>
          <li>Otra</li>
        </ul>`,
      jornada: `
        <p>El módulo <strong>Mi Jornada</strong> muestra un resumen de tu actividad diaria:</p>
        <ul>
          <li>Escuelas relevadas hoy.</li>
          <li>Tiempo total trabajado.</li>
          <li>Incidencias registradas.</li>
          <li>Historial de sesiones.</li>
        </ul>
        <p>Podés ver el detalle de cada sesión: hora de inicio, hora de cierre, duración, y observaciones.</p>`,
      formulario: `
        <p>El formulario oficial del <strong>MEC (Ministerio de Educación y Ciencias)</strong> se abre en una nueva ventana al iniciar la encuesta.</p>
        <p>URL del formulario: <a href="https://demo.mec.gov.py/demo_rue/login" target="_blank">demo.mec.gov.py</a></p>
        <p><strong>Pasos para completar el formulario:</strong></p>
        <ol>
          <li>Iniciá sesión con tus credenciales del MEC.</li>
          <li>Buscá la escuela por código o nombre.</li>
          <li>Completá todos los campos requeridos.</li>
          <li>Guardá el formulario antes de cerrar.</li>
          <li>Volvé a la aplicación CIALPA y cerrá la sesión.</li>
        </ol>`,
      sincronizacion: `
        <p>Los datos se sincronizan automáticamente con el servidor (Google Sheets) cada vez que realizás una acción (inicio de sesión, cierre de sesión, registro de incidencia).</p>
        <p>Si perdés la conexión a internet durante una sesión:</p>
        <ul>
          <li>No cerrés la aplicación.</li>
          <li>Esperá a que se restaure la conexión.</li>
          <li>El sistema reintentará automáticamente (hasta 3 veces).</li>
        </ul>
        <p><strong>Sin conexión:</strong> El sistema muestra una advertencia en la barra superior. No podés iniciar nuevas sesiones sin conexión.</p>`,
      roles: `
        <table class="manual-table">
          <tr><th>Rol</th><th>Permisos</th></tr>
          <tr>
            <td><strong>Encuestador</strong></td>
            <td>Ver mapa, aplicar encuestas, registrar incidencias, ver su jornada.</td>
          </tr>
          <tr>
            <td><strong>Supervisor</strong></td>
            <td>Todo lo anterior + ver estadísticas de todos los encuestadores.</td>
          </tr>
          <tr>
            <td><strong>Administrador</strong></td>
            <td>Acceso completo: configuración, gestión de encuestadores, auditoría.</td>
          </tr>
        </table>`,
      estadisticas: `
        <p>El panel estadístico (accesible a supervisores y administradores) muestra:</p>
        <ul>
          <li><strong>KPIs:</strong> Total, relevadas, en curso, pendientes, con incidencia, % de avance.</li>
          <li><strong>Gráfico de barras:</strong> Estado por departamento.</li>
          <li><strong>Gráfico de líneas:</strong> Progreso diario de relevamientos.</li>
          <li><strong>Donut:</strong> Distribución general de estados.</li>
          <li><strong>Ranking encuestadores:</strong> Escuelas relevadas, incidencias, tiempo promedio.</li>
        </ul>
        <p>Podés filtrar por rango de fechas, departamento y encuestador.</p>
        <p>Usá el botón <em>Exportar CSV</em> para descargar los datos.</p>`,
      configuracion: `
        <p><em>Exclusivo para administradores.</em></p>
        <p>En este módulo podés:</p>
        <ul>
          <li>Modificar parámetros del sistema (URL del formulario, textos, etc.).</li>
          <li>Gestionar encuestadores (crear, editar, desactivar).</li>
          <li>Asignar zonas a encuestadores.</li>
        </ul>`,
      auditoria: `
        <p><em>Exclusivo para administradores.</em></p>
        <p>El log de auditoría registra todas las acciones importantes del sistema:</p>
        <ul>
          <li>Inicios y cierres de sesión de usuarios.</li>
          <li>Inicio y cierre de sesiones de relevamiento.</li>
          <li>Cambios de configuración.</li>
          <li>Creación/edición/eliminación de encuestadores.</li>
        </ul>
        <p>Podés filtrar por usuario, acción y rango de fechas.</p>`,
      errores: `
        <h4>El botón "Iniciar Encuesta" no responde</h4>
        <p>Verificá que tengas conexión a internet y que hayas seleccionado una escuela.</p>
        <h4>"Credenciales inválidas" al login</h4>
        <p>Verificá usuario y contraseña. Si el problema persiste, contactá al administrador.</p>
        <h4>El formulario MEC no abre</h4>
        <p>Verificá que el navegador no esté bloqueando ventanas emergentes. Habilitá las ventanas emergentes para este sitio.</p>
        <h4>"Sesión expirada"</h4>
        <p>Las sesiones duran 8 horas. Volvé a ingresar con tu usuario y contraseña.</p>
        <h4>Error de conexión</h4>
        <p>El sistema reintenta automáticamente. Si el error persiste, verificá tu conexión a internet.</p>`,
      contacto: `
        <p>Para soporte técnico o consultas, contactá al equipo de CIALPA:</p>
        <ul>
          <li><strong>Email:</strong> soporte@cialpa.gov.py</li>
          <li><strong>Teléfono:</strong> (021) 000-000</li>
          <li><strong>Horario de atención:</strong> Lunes a viernes, 8:00 – 17:00 hs.</li>
        </ul>
        <p>Para reportar errores técnicos, incluí:</p>
        <ul>
          <li>Descripción del error.</li>
          <li>Pasos para reproducirlo.</li>
          <li>Captura de pantalla si es posible.</li>
          <li>Nombre de usuario y fecha/hora del error.</li>
        </ul>`,
    };
    return contents[id] || '<p>Contenido no disponible.</p>';
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
