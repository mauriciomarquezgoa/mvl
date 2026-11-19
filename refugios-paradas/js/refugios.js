/* Refugios y Paradas de colectivos · Vicente López
   Datos: mvl → calculos3.refugios_paradas_27032026 (datos/refugios.js) */
(function () {
  // Colores de marca por tipo de refugio (campo "Tpologia")
  const COLORES = { NUEVOS: '#0096C2', CAJA: '#5F1F7B', CHICO: '#98CE17', GRANDE: '#97077D' };
  const colorDe = t => COLORES[t] || '#FFFFFF';

  const limpiar = v => (v == null ? '' : String(v).trim());
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sinAcentos = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const porNombre = (a, b) => a.localeCompare(b, 'es');

  const registros = window.REFUGIOS.map(([id, tipo, tipologia, calle, altura, barrio, lon, lat]) => ({
    id, tipo, tipologia, calle, altura, alturaN: parseInt(altura, 10) || null,
    barrio: limpiar(barrio).toUpperCase(),
    lat, lon, ubicado: lat != null && lon != null
  }));

  const COLUMNAS = [
    { k: 'id', t: 'ID', num: true },
    { k: 'calle', t: 'Calle' },
    { k: 'alturaN', t: 'Altura', num: true },
    { k: 'barrio', t: 'Barrio' },
    { k: 'tipo', t: 'Tipo de refugio' },
    { k: 'tipologia', t: 'Tipología' }
  ];

  // ---------- Mapa (solo Esri satelital) ----------
  const map = L.map('map', { zoomControl: false, maxZoom: 20, preferCanvas: true });
  L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19,
    opacity: 0.8, // opacidad 80 %: aclara un poco la imagen para que resalten las paradas
    attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics'
  }).addTo(map);

  const estilo = r => ({ radius: 7, color: '#FFFFFF', weight: 2, fillColor: colorDe(r.tipo), fillOpacity: 1 });
  const ESTILO_SEL = { radius: 12, weight: 4 };

  // Paradas cargadas en la misma ubicación (posibles duplicados)
  const porUbicacion = new Map();
  registros.filter(r => r.ubicado).forEach(r => {
    const k = `${r.lat},${r.lon}`;
    if (!porUbicacion.has(k)) porUbicacion.set(k, []);
    porUbicacion.get(k).push(r);
    r._mismaUbicacion = porUbicacion.get(k);
  });

  function popupDe(r) {
    const otros = (r._mismaUbicacion || []).filter(o => o !== r);
    const extra = otros.length
      ? `<div class="pop-extra"><strong>Misma ubicación</strong>${otros.map(o => `ID ${o.id} · ${esc(o.tipo)} · ${esc(o.tipologia)}`).join('<br>')}</div>` : '';
    return `<div class="pop-cab">
        <span class="mvl-pill" style="background:${colorDe(r.tipo)}">${esc(r.tipo)} · ${esc(r.tipologia)}</span>
        <h3>${esc(r.calle)} ${esc(r.altura)}</h3>
        <p>${esc(r.barrio)} · ID ${r.id}</p>
      </div>${extra}<div class="pop-franja"></div>`;
  }

  let seleccionado = null;
  registros.filter(r => r.ubicado).forEach(r => {
    r._capa = L.circleMarker([r.lat, r.lon], estilo(r))
      .bindTooltip(`${esc(r.calle)} ${esc(r.altura)}`, { direction: 'top', offset: [0, -6] })
      .bindPopup(() => popupDe(r), { maxWidth: 300, autoPanPadding: [20, 20] })
      .on('click', () => seleccionar(r, false))
      .on('popupclose', () => { if (seleccionado === r) deseleccionar(); });
  });
  const grupo = L.featureGroup().addTo(map);

  // ---------- Leyenda ----------
  const tipos = Object.keys(COLORES).filter(t => registros.some(r => r.tipo === t));
  function dibujarLeyenda() {
    document.getElementById('leyenda').innerHTML = '<h2>Tipo de refugio</h2>' + tipos.map(t =>
      `<div class="item"><span class="punto" style="background:${colorDe(t)}"></span>${esc(t)}` +
      `<span class="cant">${filtrados.filter(r => r.tipo === t).length}</span></div>`).join('');
  }

  // ---------- Filtros ----------
  const fBarrio = document.getElementById('fBarrio');
  const fCalle = document.getElementById('fCalle');
  const fTipo = document.getElementById('fTipo');
  const fTipologia = document.getElementById('fTipologia');
  const opciones = (sel, valores) => valores.forEach(v => sel.add(new Option(v, v)));
  opciones(fBarrio, [...new Set(registros.map(r => r.barrio))].filter(Boolean).sort(porNombre));
  opciones(fTipo, tipos);
  opciones(fTipologia, [...new Set(registros.map(r => r.tipologia))].filter(Boolean).sort(porNombre));

  function actualizarSugerencias() {
    const b = fBarrio.value;
    document.getElementById('listaCalles').innerHTML = [...new Set(registros
      .filter(r => !b || r.barrio === b).map(r => r.calle))].sort(porNombre)
      .map(c => `<option value="${esc(c)}">`).join('');
  }

  let filtrados = registros;
  function aplicarFiltros(encuadrar) {
    const b = fBarrio.value, t = fTipo.value, tp = fTipologia.value, c = sinAcentos(fCalle.value.trim());
    filtrados = registros.filter(r =>
      (!b || r.barrio === b) && (!t || r.tipo === t) && (!tp || r.tipologia === tp) &&
      (!c || sinAcentos(r.calle).includes(c)));

    grupo.clearLayers();
    filtrados.forEach(r => r._capa && grupo.addLayer(r._capa));
    if (seleccionado && !filtrados.includes(seleccionado)) deseleccionar();

    document.getElementById('nVisibles').textContent = filtrados.length;
    if (encuadrar && grupo.getLayers().length) map.fitBounds(grupo.getBounds(), { padding: [40, 40], maxZoom: 18 });
    dibujarLeyenda();
    dibujarTabla();
  }

  let temporizador;
  fCalle.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(() => aplicarFiltros(true), 200); });
  fBarrio.addEventListener('change', () => { actualizarSugerencias(); aplicarFiltros(true); });
  fTipo.addEventListener('change', () => aplicarFiltros(true));
  fTipologia.addEventListener('change', () => aplicarFiltros(true));
  document.getElementById('btnLimpiar').addEventListener('click', () => {
    fBarrio.value = ''; fCalle.value = ''; fTipo.value = ''; fTipologia.value = '';
    actualizarSugerencias();
    aplicarFiltros(true);
  });

  // ---------- Tabla ----------
  const thead = document.querySelector('#tabla thead tr');
  const tbody = document.querySelector('#tabla tbody');
  let orden = { k: 'calle', asc: true };

  COLUMNAS.forEach(c => {
    const th = document.createElement('th');
    th.dataset.k = c.k;
    th.innerHTML = `${esc(c.t)}<span class="flecha"></span>`;
    th.addEventListener('click', () => {
      orden = { k: c.k, asc: orden.k === c.k ? !orden.asc : true };
      dibujarTabla();
    });
    thead.appendChild(th);
  });

  function dibujarTabla() {
    const col = COLUMNAS.find(c => c.k === orden.k);
    const filas = filtrados.slice().sort((a, b) => {
      const va = a[orden.k], vb = b[orden.k];
      if (va == null || va === '') return 1; if (vb == null || vb === '') return -1;
      const d = col.num ? va - vb : porNombre(String(va), String(vb));
      return (orden.asc ? d : -d) || porNombre(a.calle, b.calle) || (a.alturaN - b.alturaN);
    });
    thead.querySelectorAll('th').forEach(th => {
      th.querySelector('.flecha').textContent = th.dataset.k === orden.k ? (orden.asc ? '▲' : '▼') : '';
    });

    const frag = document.createDocumentFragment();
    filas.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="num">${r.id}</td><td>${esc(r.calle)}</td><td class="num">${esc(r.altura)}</td>` +
        (r.barrio ? `<td>${esc(r.barrio)}</td>` : '<td class="sin-ubicacion">Sin ubicación</td>') +
        `<td><span class="tipo"><span class="punto" style="background:${colorDe(r.tipo)}"></span>${esc(r.tipo)}</span></td>` +
        `<td>${esc(r.tipologia)}</td>`;
      tr.addEventListener('click', () => seleccionar(r, true));
      if (r === seleccionado) tr.classList.add('sel');
      r._fila = tr;
      frag.appendChild(tr);
    });
    tbody.replaceChildren(frag);
    document.getElementById('sinResultados').hidden = filas.length > 0;
  }

  // ---------- Selección mapa ↔ tabla ----------
  function deseleccionar() {
    if (!seleccionado) return;
    seleccionado._capa?.setStyle(estilo(seleccionado));
    seleccionado._fila?.classList.remove('sel');
    seleccionado = null;
  }
  function seleccionar(r, desdeTabla) {
    if (seleccionado && seleccionado !== r) deseleccionar();
    seleccionado = r;
    r._fila?.classList.add('sel');
    if (!r._capa) return; // registro sin coordenadas
    r._capa.setStyle(ESTILO_SEL).bringToFront();
    if (desdeTabla) {
      map.setView(r._capa.getLatLng(), Math.max(map.getZoom(), 18));
      setTimeout(() => r._capa.openPopup(), 300);
    } else {
      r._fila?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ---------- Exportar CSV de lo filtrado ----------
  document.getElementById('btnCsv').addEventListener('click', () => {
    const campos = ['id', 'calle', 'altura', 'barrio', 'tipo', 'tipologia', 'lat', 'lon'];
    const celda = v => `"${limpiar(v).replace(/"/g, '""')}"`;
    const lineas = [campos.map(celda).join(';')].concat(filtrados.map(r => campos.map(k => celda(r[k])).join(';')));
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'refugios_paradas_vicente_lopez.csv' });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('nTotal').textContent = registros.length;
  actualizarSugerencias();
  aplicarFiltros(false);

  const encuadrarTodo = () => { map.invalidateSize(); map.fitBounds(grupo.getBounds(), { padding: [30, 30] }); };
  encuadrarTodo();
  window.addEventListener('load', encuadrarTodo);
  new ResizeObserver(() => map.invalidateSize()).observe(document.getElementById('map'));
})();
