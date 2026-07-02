(() => {
  "use strict";

  const STORAGE_KEY = "cialpa_ficha_grafica_settings";
  const LOCAL_FICHAS_KEY = "cialpa_fichas_graficas";
  const DATA_INDEX_URL = "data/locales_index.json";
  const MAP_CENTER = [-23.4, -58.0];

  const state = {
    settings: { endpointUrl: "", token: "", userName: "" },
    index: null,
    locales: [],
    selectedLocal: null,
    ficha: null,
    map: null,
    localMarker: null,
    drawControl: null,
    drawnItems: null,
    predioLayer: null,
    elementLayer: null,
    guideLayer: null,
    distanceLayer: null,
    elementMarkers: new Map(),
    sidebarPinned: false
  };

  const $ = (id) => document.getElementById(id);

  function setChoiceValue(id, value, dispatch = true) {
    const input = $(id);
    if (!input) return;
    input.value = value || "";
    refreshChoiceButtons(document, id);
    if (dispatch) input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function refreshChoiceButtons(root = document, onlyTarget = null) {
    const scope = root?.querySelectorAll ? root : document;
    scope.querySelectorAll("[data-choice-target][data-choice-value]").forEach((button) => {
      const target = button.dataset.choiceTarget;
      if (onlyTarget && target !== onlyTarget) return;
      const input = $(target);
      const active = Boolean(input) && String(input.value || "") === String(button.dataset.choiceValue || "");
      button.classList.toggle("choice-button--active", active);
      button.setAttribute("aria-pressed", String(active));
      if (input) button.disabled = Boolean(input.disabled || button.dataset.choiceDisabled === "true");
    });
  }

  function renderChoiceButtons(containerId, targetId, choices, emptyLabel = null, config = {}) {
    const container = $(containerId);
    const input = $(targetId);
    if (!container || !input) return;
    const normalized = choices.map((choice) => typeof choice === "string" ? { value: choice, label: choice } : choice);
    const allChoices = emptyLabel === null ? normalized : [{ value: "", label: emptyLabel, disabled: Boolean(config.disableEmpty) }, ...normalized];
    container.replaceChildren();
    allChoices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = choice.label;
      button.dataset.choiceTarget = targetId;
      button.dataset.choiceValue = choice.value || "";
      if (choice.disabled) button.dataset.choiceDisabled = "true";
      button.disabled = Boolean(input.disabled || choice.disabled);
      container.appendChild(button);
    });
    refreshChoiceButtons(container, targetId);
  }

  function text(value) {
    return value === null || value === undefined || value === "" ? "-" : String(value);
  }

  function uid(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function readSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state.settings = { ...state.settings, ...JSON.parse(raw) };
    } catch (_) {}
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    updateStatus();
  }

  function updateStatus(message) {
    const pill = $("statusPill");
    if (!pill) return;
    const online = Boolean(state.settings.endpointUrl);
    pill.dataset.state = online ? "online" : "offline";
    pill.textContent = message || (online ? "Endpoint configurado" : "Guardado local");
  }

  async function init() {
    readSettings();
    bindEvents();
    initMap();
    updateSettingsForm();
    updateStatus();
    await loadIndex();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-choice-target][data-choice-value]");
      if (!button || button.disabled) return;
      setChoiceValue(button.dataset.choiceTarget, button.dataset.choiceValue);
    });

    $("settingsBtn")?.addEventListener("click", () => $("settingsDialog")?.showModal());
    $("sidebarToggleBtn")?.addEventListener("click", () => toggleSidebar(true));
    $("saveSettingsBtn")?.addEventListener("click", () => {
      state.settings.endpointUrl = $("endpointInput").value.trim();
      state.settings.token = $("tokenInput").value.trim();
      state.settings.userName = $("userInput").value.trim();
      saveSettings();
      $("settingsDialog")?.close();
    });

    $("dptoSelect")?.addEventListener("change", onDepartamentoChange);
    $("distSelect")?.addEventListener("change", renderLocales);
    $("searchLocal")?.addEventListener("input", renderLocales);
    $("drawPolygonBtn")?.addEventListener("click", startDrawing);
    $("clearDrawBtn")?.addEventListener("click", clearPredio);
    $("centerLocalBtn")?.addEventListener("click", centerSelectedLocal);
    $("saveBtn")?.addEventListener("click", saveFicha);
    $("exportBtn")?.addEventListener("click", exportFicha);
    $("addBloqueBtn")?.addEventListener("click", addBloque);
    $("addEspacioBtn")?.addEventListener("click", addEspacio);
    $("addAreaBtn")?.addEventListener("click", addArea);
    $("addElementoBtn")?.addEventListener("click", addElemento);
    $("espacioTipo")?.addEventListener("change", updateSanitarioControls);
    ["cercadoPresencia", "cercadoTipo", "cercadoPorcentaje"].forEach((id) => {
      $(id)?.addEventListener("input", syncCercado);
      $(id)?.addEventListener("change", syncCercado);
    });
  }

  function updateSettingsForm() {
    $("endpointInput").value = state.settings.endpointUrl || "";
    $("tokenInput").value = state.settings.token || "";
    $("userInput").value = state.settings.userName || "";
  }

  function initMap() {
    state.map = L.map("map", { zoomControl: true }).setView(MAP_CENTER, 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(state.map);

    state.drawnItems = new L.FeatureGroup();
    state.elementLayer = new L.FeatureGroup();
    state.guideLayer = new L.FeatureGroup();
    state.distanceLayer = new L.FeatureGroup();
    state.map.addLayer(state.drawnItems);
    state.map.addLayer(state.distanceLayer);
    state.map.addLayer(state.guideLayer);
    state.map.addLayer(state.elementLayer);
    state.map.on(L.Draw.Event.CREATED, (event) => {
      setPredioLayer(event.layer);
    });
    state.map.on("movestart zoomstart dragstart", () => {
      if (!state.sidebarPinned) collapseSidebar();
    });
  }

  function toggleSidebar(pin) {
    const sidebar = $("leftSidebar");
    const btn = $("sidebarToggleBtn");
    if (!sidebar) return;
    const collapsed = sidebar.classList.toggle("sidebar--collapsed");
    if (pin) state.sidebarPinned = !collapsed;
    btn?.setAttribute("aria-expanded", String(!collapsed));
    setTimeout(() => state.map?.invalidateSize(), 220);
  }

  function collapseSidebar() {
    const sidebar = $("leftSidebar");
    if (!sidebar || sidebar.classList.contains("sidebar--collapsed")) return;
    sidebar.classList.add("sidebar--collapsed");
    $("sidebarToggleBtn")?.setAttribute("aria-expanded", "false");
    setTimeout(() => state.map?.invalidateSize(), 220);
  }

  function expandSidebar() {
    const sidebar = $("leftSidebar");
    if (!sidebar) return;
    sidebar.classList.remove("sidebar--collapsed");
    $("sidebarToggleBtn")?.setAttribute("aria-expanded", "true");
    setTimeout(() => state.map?.invalidateSize(), 220);
  }

  async function loadIndex() {
    try {
      const response = await fetch(DATA_INDEX_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.index = await response.json();
      renderChoiceButtons(
        "dptoChoices",
        "dptoSelect",
        state.index.departamentos.map((dpto) => ({
          value: dpto.slug,
          label: `${dpto.dpto_desc} (${dpto.total})`
        })),
        "- Seleccione -"
      );
      $("localesHint").textContent = `Indice cargado: ${state.index.total_locales} locales.`;
    } catch (error) {
      $("localesHint").textContent = `No se pudo cargar el indice de locales: ${error.message}`;
    }
  }

  async function onDepartamentoChange() {
    const dpto = state.index?.departamentos?.find((item) => item.slug === $("dptoSelect").value);
    $("localesList").replaceChildren();
    $("distSelect").disabled = true;
    setChoiceValue("distSelect", "", false);
    renderChoiceButtons("distChoices", "distSelect", [], "Seleccione un departamento", { disableEmpty: true });
    $("searchLocal").disabled = true;
    state.locales = [];
    if (!dpto?.archivo) return;

    $("localesHint").textContent = "Cargando locales...";
    try {
      const response = await fetch(`data/${dpto.archivo}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.locales = await response.json();
      $("distSelect").disabled = false;
      renderChoiceButtons(
        "distChoices",
        "distSelect",
        (dpto.distritos || []).map((dist) => ({ value: dist.dist, label: dist.dist_desc })),
        "Todos los distritos"
      );
      $("searchLocal").disabled = false;
      renderLocales();
    } catch (error) {
      $("localesHint").textContent = `No se pudieron cargar locales: ${error.message}`;
    }
  }

  function filteredLocales() {
    const dist = $("distSelect").value;
    const q = $("searchLocal").value.trim().toLowerCase();
    return state.locales
      .filter((local) => !dist || local.dist === dist)
      .filter((local) => {
        if (!q) return true;
        return [local.nombre, local.fid, local.barloc, local.dist_desc]
          .some((value) => String(value || "").toLowerCase().includes(q));
      })
      .slice(0, 100);
  }

  function renderLocales() {
    const list = $("localesList");
    list.replaceChildren();
    const locales = filteredLocales();
    locales.forEach((local) => {
      const item = document.createElement("li");
      item.tabIndex = 0;
      item.dataset.fid = local.fid;
      item.innerHTML = `<strong></strong><small></small>`;
      item.querySelector("strong").textContent = local.nombre || `Local ${local.fid}`;
      item.querySelector("small").textContent = `FID ${local.fid} - ${local.dist_desc || ""} - ${local.barloc || ""}`;
      item.addEventListener("click", () => selectLocal(local));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter") selectLocal(local);
      });
      list.appendChild(item);
    });
    $("localesHint").textContent = `${locales.length} locales visibles${state.locales.length > 100 ? " (max. 100)" : ""}.`;
  }

  function selectLocal(local) {
    state.selectedLocal = local;
    state.ficha = loadLocalFicha(local) || newFicha(local);
    document.querySelectorAll(".locales-list li").forEach((li) => {
      li.classList.toggle("active", String(li.dataset.fid) === String(local.fid));
    });
    $("fichaPanel").classList.remove("hidden");
    $("arquitecturaPanel").classList.remove("hidden");
    expandSidebar();
    $("localTitle").textContent = local.nombre || `Local ${local.fid}`;
    $("localMeta").textContent = `FID ${local.fid} - ${local.dpto_desc} / ${local.dist_desc} - ${local.barloc || ""}`;
    renderFicha();
    centerSelectedLocal();
  }

  function newFicha(local) {
    return {
      ficha: {
        id_ficha: `FG_${local.fid}`,
        cialpa_session_id: "",
        codigo_local: "",
        fid_local: local.fid,
        departamento: local.dpto_desc,
        distrito: local.dist_desc,
        localidad: local.barloc,
        nombre_local: local.nombre,
        lat: local.lat,
        lon: local.lon,
        predio_geojson: null,
        estado: "borrador",
        creado_por: state.settings.userName || "",
        observaciones: ""
      },
      bloques: [],
      areas_recreacion: [],
      elementos: [],
      cercado: null,
      distancias: { criterio: "centro_a_centro" }
    };
  }

  function renderFicha() {
    renderPredio();
    renderBloques();
    renderAreas();
    renderElementos();
    renderCercado();
    updateSanitarioControls();
    updateMetrics();
  }

  function renderPredio() {
    state.drawnItems.clearLayers();
    state.predioLayer = null;
    const geojson = state.ficha?.ficha?.predio_geojson;
    if (!geojson) return;
    try {
      const layer = L.geoJSON(typeof geojson === "string" ? JSON.parse(geojson) : geojson).getLayers()[0];
      if (layer) setPredioLayer(layer, false);
    } catch (_) {}
  }

  function centerSelectedLocal() {
    const local = state.selectedLocal;
    if (!local || !state.map) return;
    const latLng = [Number(local.lat), Number(local.lon)];
    state.map.setView(latLng, 18);
    if (state.localMarker) state.map.removeLayer(state.localMarker);
    state.localMarker = L.marker(latLng).addTo(state.map);
    state.localMarker.bindPopup(text(local.nombre)).openPopup();
  }

  function startDrawing() {
    if (!state.selectedLocal) return;
    const drawer = new L.Draw.Polygon(state.map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: { color: "#1f6f8b", weight: 2 }
    });
    drawer.enable();
  }

  function setPredioLayer(layer, update = true) {
    state.drawnItems.clearLayers();
    state.predioLayer = layer;
    state.drawnItems.addLayer(layer);
    if (update && state.ficha) {
      state.ficha.ficha.predio_geojson = layer.toGeoJSON();
      state.ficha.ficha.estado = "predio_registrado";
    }
    updateMetrics();
  }

  function clearPredio() {
    if (!state.ficha) return;
    state.drawnItems.clearLayers();
    state.predioLayer = null;
    state.ficha.ficha.predio_geojson = null;
    state.ficha.ficha.estado = "borrador";
    updateMetrics();
  }

  function updateMetrics() {
    const layer = state.predioLayer;
    let vertices = 0;
    let areaText = "- m2";
    if (layer) {
      const latLngs = layer.getLatLngs()[0] || [];
      vertices = latLngs.length;
      areaText = `${Math.round(L.GeometryUtil.geodesicArea(latLngs)).toLocaleString("es-PY")} m2`;
    }
    $("metricVertices").textContent = vertices;
    $("metricArea").textContent = areaText;
    $("metricEstado").textContent = state.ficha?.ficha?.estado || "borrador";
  }

  function addBloque() {
    if (!state.ficha) return;
    const nombre = $("bloqueNombre").value.trim();
    if (!nombre) return setSaveStatus("Ingrese nombre del bloque.", true);
    state.ficha.bloques.push({
      id_bloque: uid("BLQ"),
      numero: state.ficha.bloques.length + 1,
      nombre,
      plantas: $("bloquePlantas").value.trim(),
      largo_m: $("bloqueLargo").value,
      ancho_m: $("bloqueAncho").value,
      espacios: []
    });
    ["bloqueNombre", "bloquePlantas", "bloqueLargo", "bloqueAncho"].forEach((id) => ($(id).value = ""));
    renderBloques();
  }

  function renderBloques() {
    const list = $("bloquesList");
    const input = $("espacioBloque");
    const current = input?.value || "";
    const blockChoices = [];
    list.replaceChildren();
    state.ficha.bloques.forEach((bloque) => {
      list.appendChild(entityItem(`${bloque.nombre} (${bloque.largo_m || "-"} x ${bloque.ancho_m || "-"} m)`, () => {
        state.ficha.bloques = state.ficha.bloques.filter((b) => b.id_bloque !== bloque.id_bloque);
        renderBloques();
      }));
      blockChoices.push({ value: bloque.id_bloque, label: bloque.nombre });
    });
    renderChoiceButtons(
      "espacioBloqueChoices",
      "espacioBloque",
      blockChoices,
      blockChoices.length ? null : "Agregue un bloque primero",
      { disableEmpty: true }
    );
    const nextValue = blockChoices.some((choice) => choice.value === current) ? current : (blockChoices[0]?.value || "");
    setChoiceValue("espacioBloque", nextValue, false);
    renderEspacios();
    renderElementoParents();
  }

  function addEspacio() {
    if (!state.ficha) return;
    const bloque = state.ficha.bloques.find((b) => b.id_bloque === $("espacioBloque").value);
    if (!bloque) return setSaveStatus("Agregue o seleccione un bloque.", true);
    const nombre = $("espacioNombre").value.trim();
    if (!nombre) return setSaveStatus("Ingrese nombre o numero del espacio.", true);
    bloque.espacios = bloque.espacios || [];
    bloque.espacios.push({
      id_espacio: uid("ESP"),
      tipo: $("espacioTipo").value,
      nombre,
      situacion: $("espacioSituacion").value,
      largo: $("espacioLargo").value,
      ancho: $("espacioAncho").value,
      unidad: $("espacioTipo").value === "Sanitario" ? "cm" : "m",
      artefactos_sanitarios: selectedFixtures()
    });
    ["espacioNombre", "espacioLargo", "espacioAncho"].forEach((id) => ($(id).value = ""));
    clearFixtures();
    renderEspacios();
    renderElementoParents();
  }

  function renderEspacios() {
    const list = $("espaciosList");
    list.replaceChildren();
    state.ficha.bloques.forEach((bloque) => {
      (bloque.espacios || []).forEach((espacio) => {
        const fixtures = (espacio.artefactos_sanitarios || []).length
          ? ` [${espacio.artefactos_sanitarios.join(", ")}]`
          : "";
        list.appendChild(entityItem(`${bloque.nombre}: ${espacio.tipo} - ${espacio.nombre}${fixtures}`, () => {
          bloque.espacios = bloque.espacios.filter((e) => e.id_espacio !== espacio.id_espacio);
          renderEspacios();
          renderElementoParents();
        }));
      });
    });
  }

  function updateSanitarioControls() {
    const isSanitario = $("espacioTipo")?.value === "Sanitario";
    $("sanitarioFixtures")?.classList.toggle("hidden", !isSanitario);
  }

  function selectedFixtures() {
    if ($("espacioTipo")?.value !== "Sanitario") return [];
    return Array.from(document.querySelectorAll("#sanitarioFixtures input:checked"))
      .map((input) => input.value);
  }

  function clearFixtures() {
    document.querySelectorAll("#sanitarioFixtures input").forEach((input) => {
      input.checked = false;
    });
  }

  function addArea() {
    if (!state.ficha) return;
    const nombre = $("areaNombre").value.trim();
    if (!nombre) return setSaveStatus("Ingrese nombre del area.", true);
    state.ficha.areas_recreacion.push({
      id_area: uid("ARE"),
      nombre,
      tipo: $("areaTipo").value.trim(),
      largo_m: $("areaLargo").value,
      ancho_m: $("areaAncho").value
    });
    ["areaNombre", "areaTipo", "areaLargo", "areaAncho"].forEach((id) => ($(id).value = ""));
    renderAreas();
  }

  function renderAreas() {
    const list = $("areasList");
    list.replaceChildren();
    state.ficha.areas_recreacion.forEach((area) => {
      list.appendChild(entityItem(`${area.nombre} - ${area.tipo || "Area"}`, () => {
        state.ficha.areas_recreacion = state.ficha.areas_recreacion.filter((a) => a.id_area !== area.id_area);
        renderAreas();
      }));
    });
  }

  function addElemento() {
    if (!state.ficha) return;
    const nombre = $("elementoNombre").value.trim();
    if (!nombre) return setSaveStatus("Ingrese nombre del elemento.", true);
    const center = state.map.getCenter();
    state.ficha.elementos.push({
      id_elemento: uid("ELE"),
      nombre,
      tipo: $("elementoTipo").value,
      parent_espacio_id: $("elementoParent").value,
      lat: Number(center.lat.toFixed(7)),
      lon: Number(center.lng.toFixed(7)),
      atributos: { medicion_distancia: "centro_a_centro" }
    });
    $("elementoNombre").value = "";
    setChoiceValue("elementoTipo", "equipamiento", false);
    setChoiceValue("elementoParent", "", false);
    renderElementos();
  }

  function renderElementos() {
    const list = $("elementosList");
    list.replaceChildren();
    state.elementLayer.clearLayers();
    state.elementMarkers.clear();
    state.ficha.elementos.forEach((elemento) => {
      const item = document.createElement("li");
      const span = document.createElement("span");
      const controls = document.createElement("div");
      const parentChoices = document.createElement("div");
      const remove = document.createElement("button");
      span.textContent = `${elementIconText(elemento.tipo)} ${elemento.nombre} - ${elementTypeLabel(elemento.tipo)} - ${labelForParent(elemento.parent_espacio_id)}`;
      parentChoices.className = "entity-choice-grid";
      [{ id: "", label: "Exterior" }, ...espacioOptions()].forEach((opt) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `choice-button ${String(elemento.parent_espacio_id || "") === String(opt.id || "") ? "choice-button--active" : ""}`;
        button.textContent = opt.label;
        button.addEventListener("click", () => {
          elemento.parent_espacio_id = opt.id || "";
          renderElementos();
        });
        parentChoices.appendChild(button);
      });
      remove.type = "button";
      remove.textContent = "Quitar";
      remove.addEventListener("click", () => {
        state.ficha.elementos = state.ficha.elementos.filter((e) => e.id_elemento !== elemento.id_elemento);
        renderElementos();
      });
      controls.className = "entity-controls";
      controls.append(parentChoices, remove);
      item.append(span, controls);
      list.appendChild(item);
      renderElementMarker(elemento);
    });
    renderDistances();
  }

  function renderElementoParents() {
    const input = $("elementoParent");
    if (!input) return;
    const current = input.value;
    const parentChoices = [{ value: "", label: "Exterior / sin espacio" }, ...espacioOptions().map((opt) => ({ value: opt.id, label: opt.label }))];
    renderChoiceButtons("elementoParentChoices", "elementoParent", parentChoices);
    const nextValue = parentChoices.some((choice) => choice.value === current) ? current : "";
    setChoiceValue("elementoParent", nextValue, false);
  }

  function espacioOptions() {
    const options = [];
    state.ficha?.bloques?.forEach((bloque) => {
      (bloque.espacios || []).forEach((espacio) => {
        options.push({ id: espacio.id_espacio, label: `${bloque.nombre}: ${espacio.tipo} ${espacio.nombre}` });
      });
    });
    return options;
  }

  function labelForParent(id) {
    if (!id) return "Exterior";
    return espacioOptions().find((opt) => opt.id === id)?.label || "Espacio no encontrado";
  }

  function elementTypeLabel(type) {
    return {
      equipamiento: "Equipamiento",
      escalera: "Escalera",
      rampa: "Rampa",
      dano_estructural: "Daño estructural",
      acometida: "Acometida",
      mastil: "Mastil",
      otro: "Otro"
    }[type] || "Elemento";
  }

  function elementIconText(type) {
    return {
      escalera: "ESC",
      rampa: "RMP",
      dano_estructural: "DEF",
      acometida: "ACM",
      mastil: "MST"
    }[type] || "ELM";
  }

  function elementIcon(type) {
    const cssType = type || "default";
    return L.divIcon({
      className: `element-icon element-icon--${cssType}`,
      html: `<span>${elementIconText(type)}</span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function renderElementMarker(elemento) {
    const lat = Number(elemento.lat || state.map.getCenter().lat);
    const lon = Number(elemento.lon || state.map.getCenter().lng);
    const marker = L.marker([lat, lon], {
      draggable: true,
      icon: elementIcon(elemento.tipo)
    }).addTo(state.elementLayer);
    marker.bindTooltip(`${elemento.nombre} (${elementTypeLabel(elemento.tipo)})`, { direction: "top" });
    marker.on("drag", () => renderAlignmentGuides(marker, elemento));
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      elemento.lat = Number(pos.lat.toFixed(7));
      elemento.lon = Number(pos.lng.toFixed(7));
      state.guideLayer.clearLayers();
      renderDistances();
    });
    state.elementMarkers.set(elemento.id_elemento, marker);
  }

  function renderAlignmentGuides(activeMarker, activeElement) {
    state.guideLayer.clearLayers();
    const activePoint = state.map.latLngToLayerPoint(activeMarker.getLatLng());
    const tolerance = 8;
    state.elementMarkers.forEach((marker, id) => {
      if (id === activeElement.id_elemento) return;
      const point = state.map.latLngToLayerPoint(marker.getLatLng());
      if (Math.abs(point.x - activePoint.x) <= tolerance) drawGuideLine(point.x, "vertical");
      if (Math.abs(point.y - activePoint.y) <= tolerance) drawGuideLine(point.y, "horizontal");
    });
  }

  function drawGuideLine(value, orientation) {
    const size = state.map.getSize();
    const points = orientation === "vertical"
      ? [L.point(value, 0), L.point(value, size.y)]
      : [L.point(0, value), L.point(size.x, value)];
    const latLngs = points.map((point) => state.map.layerPointToLatLng(point));
    L.polyline(latLngs, {
      color: "#d92d20",
      weight: 1,
      dashArray: "6,6",
      interactive: false
    }).addTo(state.guideLayer);
  }

  function renderDistances() {
    state.distanceLayer.clearLayers();
    const markers = Array.from(state.elementMarkers.values());
    for (let i = 0; i < markers.length; i++) {
      for (let j = i + 1; j < markers.length; j++) {
        const a = markers[i].getLatLng();
        const b = markers[j].getLatLng();
        const meters = a.distanceTo(b);
        const line = L.polyline([a, b], {
          color: "#15546b",
          weight: 1,
          opacity: 0.45,
          dashArray: "2,8",
          interactive: false
        }).addTo(state.distanceLayer);
        line.bindTooltip(`${meters.toFixed(1)} m centro-centro`, {
          direction: "center"
        });
      }
    }
    const legend = $("distanceLegend");
    if (legend) {
      legend.textContent = "Distancias visibles: centro a centro entre iconos puntuales. Para borde a borde se requiere geometria de ambos objetos.";
    }
  }

  function renderCercado() {
    const c = state.ficha.cercado || {};
    $("cercadoPresencia").value = c.presencia || "";
    $("cercadoTipo").value = c.tipo || "";
    $("cercadoPorcentaje").value = c.porcentaje_cubierto || "";
    refreshChoiceButtons(document, "cercadoPresencia");
  }

  function syncCercado() {
    if (!state.ficha) return;
    state.ficha.cercado = {
      presencia: $("cercadoPresencia").value,
      tipo: $("cercadoTipo").value.trim(),
      porcentaje_cubierto: $("cercadoPorcentaje").value
    };
  }

  function entityItem(label, onDelete) {
    const item = document.createElement("li");
    const span = document.createElement("span");
    const btn = document.createElement("button");
    span.textContent = label;
    btn.type = "button";
    btn.textContent = "Quitar";
    btn.addEventListener("click", onDelete);
    item.append(span, btn);
    return item;
  }

  function localStore() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_FICHAS_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function loadLocalFicha(local) {
    return localStore()[`FG_${local.fid}`] || null;
  }

  function persistLocal() {
    const store = localStore();
    store[state.ficha.ficha.id_ficha] = state.ficha;
    localStorage.setItem(LOCAL_FICHAS_KEY, JSON.stringify(store));
  }

  async function saveFicha() {
    if (!state.ficha) return;
    syncCercado();
    state.ficha.distancias = { criterio: "centro_a_centro", nota: "Elementos puntuales medidos desde el icono/centroide. Borde a borde requiere geometria en ambos objetos." };
    state.ficha.ficha.actualizado_en = new Date().toISOString();
    state.ficha.ficha.creado_por = state.settings.userName || state.ficha.ficha.creado_por || "";
    persistLocal();

    if (!state.settings.endpointUrl) {
      setSaveStatus("Ficha guardada localmente en este navegador.");
      return;
    }

    try {
      const payload = {
        action: "ficha_upsert",
        token: state.settings.token || undefined,
        ...state.ficha
      };
      const response = await fetch(state.settings.endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || result.ok === false || result.status === "error") {
        throw new Error(result.error || result.message || `HTTP ${response.status}`);
      }
      setSaveStatus("Ficha guardada en backend y respaldo local actualizado.");
    } catch (error) {
      setSaveStatus(`Guardada localmente, pero fallo el backend: ${error.message}`, true);
    }
  }

  function exportFicha() {
    if (!state.ficha) return;
    syncCercado();
    state.ficha.distancias = { criterio: "centro_a_centro", nota: "Elementos puntuales medidos desde el icono/centroide. Borde a borde requiere geometria en ambos objetos." };
    const blob = new Blob([JSON.stringify(state.ficha, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.ficha.ficha.id_ficha}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function setSaveStatus(message, isError = false) {
    const el = $("saveStatus");
    el.textContent = message;
    el.style.color = isError ? "#b42318" : "#23834f";
  }

  document.addEventListener("DOMContentLoaded", init);
})();
