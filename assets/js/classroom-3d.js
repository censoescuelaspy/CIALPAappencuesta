/**
 * CIALPA, Relevamiento Escolar
 * classroom-3d.js, ensayo de visor 3D para aula activa
 * Version: 2.6.197
 */

const Classroom3DModule = (() => {
  'use strict';

  const _states = new WeakMap();
  const COLORS = {
    floor: 0xe8eef6,
    floorLine: 0xb8c4d6,
    wall: 0xf8fafc,
    wallEdge: 0x93a4ba,
    primary: 0xe84c22,
    secondary: 0x173f68,
    board: 0x166534,
    window: 0x60a5fa,
    door: 0xb45309,
    electric: 0xf59e0b,
    danger: 0xdc2626,
    neutral: 0x64748b,
  };

  function mount(root = document.querySelector('[data-classroom-3d]'), model = null) {
    const target = root?.querySelector ? root : document.querySelector('[data-classroom-3d]');
    if (!target) return false;
    _bindRoot(target);
    return refresh(target, model);
  }

  function refresh(root = document.querySelector('[data-classroom-3d]'), model = null) {
    const target = root?.querySelector ? root : document.querySelector('[data-classroom-3d]');
    if (!target) return false;
    const data = model || _modelFromMec();
    _renderStats(target, data);
    if (!data) {
      _showEmpty(target, 'Seleccione o cree un aula para ver el ensayo 3D.');
      return false;
    }
    if (!window.THREE) {
      _showEmpty(target, 'Three.js no esta disponible. El croquis 2D sigue operativo.');
      return false;
    }
    const state = _ensureState(target);
    state.model = data;
    _buildScene(state, data);
    _resize(state);
    _renderFrame(state);
    _startLoop(state);
    return true;
  }

  function _modelFromMec() {
    try {
      return window.MecFormModule?.getActiveClassroom3DModel?.() || null;
    } catch (err) {
      console.warn('No se pudo leer el modelo 3D del aula:', err);
      return null;
    }
  }

  function _bindRoot(root) {
    if (root.dataset.classroom3dBound === 'true') return;
    root.dataset.classroom3dBound = 'true';
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-classroom-3d-action]');
      if (!button) return;
      const action = _buttonAction(button);
      const state = _states.get(root);
      if (action === 'refresh') {
        refresh(root);
        return;
      }
      if (!state) return;
      if (action === 'perspective') state.view = 'perspective';
      if (action === 'top') state.view = 'top';
      if (action === 'rotate-left') {
        state.view = 'perspective';
        state.angle -= Math.PI / 8;
      }
      if (action === 'rotate-right') {
        state.view = 'perspective';
        state.angle += Math.PI / 8;
      }
      _updateActionState(root, state.view);
      _renderFrame(state);
    });
  }

  function _ensureState(root) {
    let state = _states.get(root);
    const viewport = root.querySelector('[data-classroom-3d-viewport]');
    if (state && state.viewport === viewport) return state;
    viewport.innerHTML = '';
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.dataset.classroom3dCanvas = 'true';
    renderer.domElement.setAttribute('aria-label', 'Vista 3D del aula activa');
    renderer.domElement.tabIndex = 0;
    viewport.appendChild(renderer.domElement);
    state = {
      root,
      viewport,
      scene,
      camera,
      renderer,
      roomGroup: new THREE.Group(),
      angle: -Math.PI / 4,
      zoom: 1,
      view: 'perspective',
      frame: null,
      dragging: false,
      lastX: 0,
      model: null,
      dirty: true,
    };
    _bindCanvasControls(state);
    _states.set(root, state);
    return state;
  }

  function _bindCanvasControls(state) {
    const canvas = state.renderer.domElement;
    canvas.addEventListener('pointerdown', event => {
      state.dragging = true;
      state.lastX = event.clientX;
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!state.dragging) return;
      const dx = event.clientX - state.lastX;
      state.lastX = event.clientX;
      state.view = 'perspective';
      state.angle += dx * 0.008;
      state.dirty = true;
      _updateActionState(state.root, state.view);
    });
    const stop = event => {
      state.dragging = false;
      canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      state.zoom = Math.max(0.62, Math.min(1.8, state.zoom + Math.sign(event.deltaY) * 0.08));
      state.dirty = true;
    }, { passive: false });
    window.addEventListener('resize', () => {
      _resize(state);
      state.dirty = true;
    });
  }

  function _buildScene(state, model) {
    const scene = state.scene;
    scene.clear();
    scene.background = new THREE.Color(0xf3f6fb);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb8c4d6, 1.05);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.25);
    sun.position.set(8, 10, 6);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdbeafe, 0.45);
    fill.position.set(-8, 5, -8);
    scene.add(fill);

    const group = new THREE.Group();
    state.roomGroup = group;
    scene.add(group);
    _addRoomShell(group, model);
    (model.objects || []).forEach(object => _addObject(group, object, model));
    _addOriginMarker(group, model);
    state.dirty = true;
    _updateActionState(state.root, state.view);
  }

  function _addRoomShell(group, model) {
    const { length, width, height } = model.dimensions;
    const floorMat = new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.88 });
    const floor = _box(length, 0.08, width, floorMat);
    floor.position.y = -0.04;
    floor.receiveShadow = true;
    group.add(floor);
    _addGrid(group, length, width);

    const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.92, transparent: true, opacity: 0.92 });
    const back = _box(length, height, 0.12, wallMat);
    back.position.set(0, height / 2, -width / 2);
    group.add(back);
    const left = _box(0.12, height, width, wallMat);
    left.position.set(-length / 2, height / 2, 0);
    group.add(left);
    const right = _box(0.12, height, width, wallMat);
    right.position.set(length / 2, height / 2, 0);
    group.add(right);
    const frontLine = _box(length, 0.08, 0.08, new THREE.MeshStandardMaterial({ color: COLORS.wallEdge, roughness: 0.75 }));
    frontLine.position.set(0, 0.04, width / 2);
    group.add(frontLine);
    [floor, back, left, right].forEach(mesh => _addEdges(group, mesh, COLORS.wallEdge));
  }

  function _addGrid(group, length, width) {
    const mat = new THREE.LineBasicMaterial({ color: COLORS.floorLine, transparent: true, opacity: 0.42 });
    const points = [];
    const step = 1;
    for (let x = -length / 2; x <= length / 2 + 0.001; x += step) {
      points.push(new THREE.Vector3(x, 0.012, -width / 2), new THREE.Vector3(x, 0.012, width / 2));
    }
    for (let z = -width / 2; z <= width / 2 + 0.001; z += step) {
      points.push(new THREE.Vector3(-length / 2, 0.012, z), new THREE.Vector3(length / 2, 0.012, z));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.LineSegments(geom, mat));
  }

  function _addObject(group, object, model) {
    const type = object.type;
    if (type === 'door') return _addDoor(group, object, model);
    if (type === 'window') return _addWallPanel(group, object, model, COLORS.window, 1.45, 0.72, 'window');
    if (type === 'board') return _addWallPanel(group, object, model, COLORS.board, 1.35, 0.82, 'board');
    if (type === 'outlet') return _addWallPoint(group, object, model, COLORS.electric, 0.36);
    if (type === 'switchboard') return _addWallPanel(group, object, model, COLORS.electric, 1.2, 0.58, 'switchboard');
    if (type === 'light') return _addCeilingLight(group, object, model);
    if (type === 'fan') return _addFan(group, object, model);
    if (type === 'ac') return _addWallPanel(group, object, model, 0xe2e8f0, 2.35, 0.45, 'ac');
    if (type === 'damage') return _addDamage(group, object);
    if (type === 'stair') return _addStair(group, object);
    if (type === 'wall') return _addPartition(group, object);
    return _addMarker(group, object, COLORS.neutral);
  }

  function _addDoor(group, object, model) {
    const side = _nearestWall(object, model);
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.door, roughness: 0.72 });
    const width = Math.max(.75, Math.min(1.3, object.w || .9));
    const door = side.axis === 'x' ? _box(0.06, 2.05, width, mat) : _box(width, 2.05, 0.06, mat);
    door.position.copy(_wallPosition(object, model, side, 1.025, 0.035));
    group.add(door);
    _addEdges(group, door, 0x7c2d12);
    const matFloor = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5, transparent: true, opacity: 0.8 });
    const swing = _box(width, 0.02, 0.08, matFloor);
    swing.position.set(object.x, 0.035, object.z);
    swing.rotation.y = _rad(object.rotationDeg || 0);
    group.add(swing);
  }

  function _addWallPanel(group, object, model, color, y, height, kind) {
    const side = _nearestWall(object, model);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: kind === 'window' ? 0.22 : 0.76,
      metalness: 0,
      transparent: kind === 'window',
      opacity: kind === 'window' ? 0.58 : 1,
    });
    const panelW = Math.max(.45, Math.min(2.2, object.w || .8));
    const panel = side.axis === 'x' ? _box(0.055, height, panelW, mat) : _box(panelW, height, 0.055, mat);
    panel.position.copy(_wallPosition(object, model, side, y, 0.04));
    group.add(panel);
    _addEdges(group, panel, kind === 'board' ? 0x052e16 : COLORS.secondary);
  }

  function _addWallPoint(group, object, model, color, y) {
    const side = _nearestWall(object, model);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
    const point = side.axis === 'x' ? _box(0.06, 0.16, 0.16, mat) : _box(0.16, 0.16, 0.06, mat);
    point.position.copy(_wallPosition(object, model, side, y, 0.045));
    group.add(point);
  }

  function _addCeilingLight(group, object, model) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xfff7ad, emissive: 0xfacc15, emissiveIntensity: 0.45, roughness: 0.25 });
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), mat);
    light.position.set(object.x, model.dimensions.height - 0.12, object.z);
    group.add(light);
    const glow = new THREE.PointLight(0xfff3b0, 0.35, 4);
    glow.position.copy(light.position);
    group.add(glow);
  }

  function _addFan(group, object, model) {
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.secondary, roughness: 0.45 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16), mat);
    hub.position.set(object.x, model.dimensions.height - 0.2, object.z);
    group.add(hub);
    for (let i = 0; i < 3; i++) {
      const blade = _box(0.7, 0.025, 0.09, mat);
      blade.position.copy(hub.position);
      blade.rotation.y = (Math.PI * 2 / 3) * i;
      group.add(blade);
    }
  }

  function _addDamage(group, object) {
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.danger, roughness: 0.6 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), mat);
    cone.position.set(object.x, 0.24, object.z);
    cone.rotation.y = Math.PI / 4;
    group.add(cone);
  }

  function _addStair(group, object) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.82 });
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const step = _box(Math.max(.55, object.w || .8), 0.08 * (i + 1), 0.18, mat);
      step.position.set(object.x, 0.04 * (i + 1), object.z + (i - 1.5) * 0.18);
      step.rotation.y = _rad(object.rotationDeg || 0);
      group.add(step);
    }
  }

  function _addPartition(group, object) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.9 });
    const wall = _box(Math.max(.18, object.w), 1.8, Math.max(.08, object.d), mat);
    wall.position.set(object.x, 0.9, object.z);
    wall.rotation.y = _rad(object.rotationDeg || 0);
    group.add(wall);
    _addEdges(group, wall, COLORS.wallEdge);
  }

  function _addMarker(group, object, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 12), mat);
    marker.position.set(object.x, 0.09, object.z);
    group.add(marker);
  }

  function _addOriginMarker(group, model) {
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.primary });
    const xAxis = _box(model.dimensions.length, 0.015, 0.015, mat);
    xAxis.position.set(0, 0.03, model.dimensions.width / 2 + 0.18);
    group.add(xAxis);
  }

  function _nearestWall(object, model) {
    const { length, width } = model.dimensions;
    const distances = [
      { side: 'left', axis: 'x', distance: Math.abs(object.x + length / 2) },
      { side: 'right', axis: 'x', distance: Math.abs(length / 2 - object.x) },
      { side: 'back', axis: 'z', distance: Math.abs(object.z + width / 2) },
      { side: 'front', axis: 'z', distance: Math.abs(width / 2 - object.z) },
    ];
    return distances.sort((a, b) => a.distance - b.distance)[0];
  }

  function _wallPosition(object, model, side, y, offset) {
    const { length, width } = model.dimensions;
    if (side.side === 'left') return new THREE.Vector3(-length / 2 + offset, y, _clamp(object.z, -width / 2 + .3, width / 2 - .3));
    if (side.side === 'right') return new THREE.Vector3(length / 2 - offset, y, _clamp(object.z, -width / 2 + .3, width / 2 - .3));
    if (side.side === 'back') return new THREE.Vector3(_clamp(object.x, -length / 2 + .3, length / 2 - .3), y, -width / 2 + offset);
    return new THREE.Vector3(_clamp(object.x, -length / 2 + .3, length / 2 - .3), y, width / 2 - offset);
  }

  function _box(w, h, d, material) {
    return new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.01, w), Math.max(0.01, h), Math.max(0.01, d)), material);
  }

  function _addEdges(group, mesh, color) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.62 })
    );
    edges.position.copy(mesh.position);
    edges.rotation.copy(mesh.rotation);
    edges.scale.copy(mesh.scale);
    group.add(edges);
  }

  function _resize(state) {
    const rect = state.viewport.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || state.viewport.clientWidth || 640));
    const height = Math.max(260, Math.round(rect.height || state.viewport.clientHeight || 360));
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(width, height, false);
    state.dirty = true;
  }

  function _renderFrame(state) {
    if (!state.model) return;
    const { length, width, height } = state.model.dimensions;
    const span = Math.max(length, width, height * 2);
    if (state.view === 'top') {
      state.camera.position.set(0.001, span * 1.55 * state.zoom, 0.001);
      state.camera.lookAt(0, 0, 0);
      state.camera.fov = 32;
    } else {
      const radius = span * 1.12 * state.zoom;
      state.camera.position.set(Math.cos(state.angle) * radius, Math.max(4.6, height * 1.75), Math.sin(state.angle) * radius);
      state.camera.lookAt(0, Math.min(1.1, height * .35), 0);
      state.camera.fov = 38;
    }
    state.camera.updateProjectionMatrix();
    state.renderer.render(state.scene, state.camera);
    state.dirty = false;
  }

  function _startLoop(state) {
    if (state.frame) return;
    const loop = () => {
      if (!document.body.contains(state.root)) {
        state.frame = null;
        return;
      }
      if (state.view === 'perspective' && !state.dragging) {
        state.angle += 0.0015;
        state.dirty = true;
      }
      if (state.dirty) _renderFrame(state);
      state.frame = requestAnimationFrame(loop);
    };
    state.frame = requestAnimationFrame(loop);
  }

  function _renderStats(root, model) {
    const target = root.querySelector('[data-classroom-3d-stats]');
    if (!target) return;
    if (!model) {
      target.innerHTML = '<span>Sin aula activa.</span>';
      return;
    }
    const metrics = model.metrics || {};
    const dims = model.dimensions || {};
    const issues = metrics.issues || [];
    target.innerHTML = `
      <div><span>Area</span><strong>${_fmt(dims.area)} m2</strong></div>
      <div><span>Dimensiones</span><strong>${_fmt(dims.length)} x ${_fmt(dims.width)} m</strong></div>
      <div><span>Altura ensayo</span><strong>${_fmt(dims.height)} m</strong></div>
      <div><span>Aberturas</span><strong>${metrics.doors || 0} pta. / ${metrics.windows || 0} vent.</strong></div>
      <div><span>Electricidad</span><strong>${metrics.outlets || 0} TC / ${metrics.lights || 0} luz</strong></div>
      <div><span>Confort</span><strong>${metrics.fans || 0} vent. / ${metrics.ac || 0} AA</strong></div>
      <div class="mec-classroom-3d__review ${issues.length ? 'mec-classroom-3d__review--warn' : 'mec-classroom-3d__review--ok'}">
        <span>Revision</span>
        <strong>${issues.length ? `${issues.length} alerta(s)` : 'Sin alertas basicas'}</strong>
        ${issues.length ? `<small>${issues.slice(0, 3).map(_escape).join(' ')}</small>` : '<small>Ensayo visual generado desde el croquis.</small>'}
      </div>`;
  }

  function _showEmpty(root, message) {
    const viewport = root.querySelector('[data-classroom-3d-viewport]');
    if (!viewport) return;
    viewport.innerHTML = `<div class="mec-classroom-3d__empty">${_escape(message)}</div>`;
  }

  function _updateActionState(root, view) {
    root.querySelectorAll('[data-classroom-3d-action]').forEach(button => {
      const action = _buttonAction(button);
      const active = action === view;
      button.classList.toggle('btn-primary', active || action === 'refresh');
      button.classList.toggle('btn-outline', !active && action !== 'refresh');
      if (action === 'perspective' || action === 'top') button.setAttribute('aria-pressed', String(active));
    });
  }

  function _buttonAction(button) {
    return button?.getAttribute('data-classroom-3d-action') || button?.dataset?.classroom3dAction || '';
  }

  function _fmt(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0';
    return number >= 10 ? number.toFixed(1) : number.toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
  }

  function _rad(value) {
    return (Number(value) || 0) * Math.PI / 180;
  }

  function _clamp(value, min, max) {
    const number = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : 0));
  }

  function _escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  return { mount, refresh };
})();

window.Classroom3DModule = Classroom3DModule;
