/* Efectores de Salud · Vicente López
   Datos: mvl → salud.salud_efectores_kml (datos/efectores.js) */
(function () {
  const datos = window.EFECTORES;
  const MAGENTA = '#97077D';

  const limpiar = v => (v == null ? '' : String(v).trim());
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sinAcentos = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const direccion = r => [limpiar(r.calle), limpiar(r.altura)].filter(Boolean).join(' ');

  const COLUMNAS = [
    { k: 'Efectores', t: 'Efector' },
    { k: 'Barrio', t: 'Barrio' },
    { k: 'calle', t: 'Calle' },
    { k: 'altura', t: 'Altura', num: true }
  ];

  // Ícono de línea (corazón con pulso), blanco sobre círculo magenta
  const SVG_SALUD = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"/><path d="M3.5 12h4l2-3 3 6 2-3h6"/></svg>';

  const registros = datos.features.map(f => Object.assign({}, f.properties, { _feature: f }));

  // Varios efectores comparten el mismo predio (misma geometría): se agrupan
  const predios = new Map();
  registros.forEach(r => {
    const clave = JSON.stringify(r._feature.geometry.coordinates);
    if (!predios.has(clave)) predios.set(clave, []);
    predios.get(clave).push(r);
    r._predio = predios.get(clave);
  });

  // ---------- Mapa (solo Esri satelital) ----------
  const map = L.map('map', { zoomControl: false, maxZoom: 20 });
  L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19,
    opacity: 0.8, // opacidad 80 %: aclara un poco la imagen para que resalten los efectores
    attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics'
  }).addTo(map);

  const ESTILO = { color: MAGENTA, weight: 2.5, fillColor: MAGENTA, fillOpacity: 0.35 };
  const ESTILO_SEL = { color: '#FFFFFF', weight: 4, fillColor: MAGENTA, fillOpacity: 0.6 };

  function icono(r, sel) {
    const n = r._predio.length > 1 ? `<span class="n">${r._predio.length}</span>` : '';
    return L.divIcon({
      className: '', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14],
      html: `<div class="marcador-salud${sel ? ' sel' : ''}">${SVG_SALUD}${n}</div>`
    });
  }

  function popupDe(r) {
    const otros = r._predio.filter(o => o !== r);
    const extra = otros.length
      ? `<div class="pop-extra"><strong>En el mismo predio</strong>${otros.map(o => esc(limpiar(o.Efectores))).join('<br>')}</div>` : '';
    return `<div class="pop-cab">
        <span class="mvl-pill">${esc(limpiar(r.Barrio))}</span>
        <h3>${esc(limpiar(r.Efectores))}</h3>
        <p>${esc(direccion(r))}</p>
      </div>${extra}<div class="pop-franja"></div>`;
  }

  let seleccionado = null;
  registros.forEach(r => {
    const poligono = L.geoJSON(r._feature, { style: ESTILO, interactive: false });
    const centro = poligono.getBounds().getCenter();
    r._poligono = poligono;
    r._marcador = L.marker(centro, { icon: icono(r, false), title: limpiar(r.Efectores), riseOnHover: true })
      .bindTooltip(esc(limpiar(r.Efectores)), { direction: 'top', offset: [0, -14] })
      .bindPopup(() => popupDe(r), { maxWidth: 300, autoPanPadding: [20, 20] })
      .on('click', () => seleccionar(r, false))
      .on('popupclose', () => { if (seleccionado === r) deseleccionar(); });
    r._capa = L.layerGroup([poligono, r._marcador]);
  });
  const grupo = L.layerGroup(registros.map(r => r._capa)).addTo(map);
  const limites = () => L.latLngBounds(filtrados.map(r => r._marcador.getLatLng()));

  // ---------- Filtros ----------
  const fBarrio = document.getElementById('fBarrio');
  const fEfector = document.getElementById('fEfector');
  [...new Set(registros.map(r => limpiar(r.Barrio)))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))
    .forEach(b => fBarrio.add(new Option(b, b)));

  function actualizarSugerencias() {
    const b = fBarrio.value;
    document.getElementById('listaEfectores').innerHTML = registros
      .filter(r => !b || limpiar(r.Barrio) === b)
      .map(r => limpiar(r.Efectores)).sort((x, y) => x.localeCompare(y, 'es'))
      .map(n => `<option value="${esc(n)}">`).join('');
  }

  let filtrados = registros;
  function aplicarFiltros(encuadrar) {
    const b = fBarrio.value, n = sinAcentos(fEfector.value.trim());
    filtrados = registros.filter(r =>
      (!b || limpiar(r.Barrio) === b) &&
      (!n || sinAcentos(limpiar(r.Efectores)).includes(n)));

    const visibles = new Set(filtrados);
    registros.forEach(r => visibles.has(r) ? grupo.addLayer(r._capa) : grupo.removeLayer(r._capa));
    if (seleccionado && !visibles.has(seleccionado)) deseleccionar();

    document.getElementById('nVisibles').textContent = filtrados.length;
    if (encuadrar && filtrados.length) map.fitBounds(limites(), { padding: [50, 50], maxZoom: 18 });
    dibujarTabla();
  }

  let temporizador;
  fEfector.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(() => aplicarFiltros(true), 200); });
  fBarrio.addEventListener('change', () => { actualizarSugerencias(); aplicarFiltros(true); });
  document.getElementById('btnLimpiar').addEventListener('click', () => {
    fBarrio.value = ''; fEfector.value = '';
    actualizarSugerencias();
    aplicarFiltros(true);
  });

  // ---------- Tabla ----------
  const thead = document.querySelector('#tabla thead tr');
  const tbody = document.querySelector('#tabla tbody');
  let orden = { k: 'Barrio', asc: true };

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
      const d = col.num ? va - vb : limpiar(va).localeCompare(limpiar(vb), 'es');
      return (orden.asc ? d : -d) || limpiar(a.Efectores).localeCompare(limpiar(b.Efectores), 'es');
    });
    thead.querySelectorAll('th').forEach(th => {
      th.querySelector('.flecha').textContent = th.dataset.k === orden.k ? (orden.asc ? '▲' : '▼') : '';
    });

    tbody.innerHTML = '';
    filas.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="efector">${esc(limpiar(r.Efectores))}</td><td>${esc(limpiar(r.Barrio))}</td>` +
        `<td>${esc(limpiar(r.calle))}</td><td class="num">${esc(limpiar(r.altura))}</td>`;
      tr.addEventListener('click', () => seleccionar(r, true));
      if (r === seleccionado) tr.classList.add('sel');
      r._fila = tr;
      tbody.appendChild(tr);
    });
    document.getElementById('sinResultados').hidden = filas.length > 0;
  }

  // ---------- Selección mapa ↔ tabla ----------
  function deseleccionar() {
    if (!seleccionado) return;
    seleccionado._poligono.setStyle(ESTILO);
    seleccionado._marcador.setIcon(icono(seleccionado, false));
    seleccionado._fila?.classList.remove('sel');
    seleccionado = null;
  }
  function seleccionar(r, desdeTabla) {
    if (seleccionado && seleccionado !== r) deseleccionar();
    seleccionado = r;
    r._poligono.setStyle(ESTILO_SEL);
    r._marcador.setIcon(icono(r, true)).setZIndexOffset(1000);
    r._fila?.classList.add('sel');
    if (desdeTabla) {
      map.fitBounds(r._poligono.getBounds(), { padding: [80, 80], maxZoom: 19 });
      setTimeout(() => r._marcador.openPopup(), 350);
    } else {
      r._fila?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ---------- Exportar CSV de lo filtrado ----------
  document.getElementById('btnCsv').addEventListener('click', () => {
    const campos = ['id', 'Efectores', 'Barrio', 'calle', 'altura'];
    const celda = v => `"${limpiar(v).replace(/"/g, '""')}"`;
    const lineas = [campos.map(celda).join(';')].concat(filtrados.map(r => campos.map(k => celda(r[k])).join(';')));
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'efectores_salud_vicente_lopez.csv' });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('nTotal').textContent = registros.length;
  actualizarSugerencias();
  aplicarFiltros(false);

  const encuadrarTodo = () => { map.invalidateSize(); map.fitBounds(limites(), { padding: [40, 40] }); };
  encuadrarTodo();
  window.addEventListener('load', encuadrarTodo);
  new ResizeObserver(() => map.invalidateSize()).observe(document.getElementById('map'));
})();
