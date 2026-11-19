/* Plazas y Parques · Vicente López
   Datos: mvl → plazas_parques.plazas_poligonos (datos/plazas_poligonos.js) */
(function () {
  const datos = window.PLAZAS;

  // Colores de marca por tipo de espacio
  const COLORES = {
    'PLAZA': '#97077D',
    'PLAZOLETA': '#98CE17',
    'PASEO': '#0096C2',
    'BOULEVARD': '#038C2A',
    'PASEO SEMIPUBLICO': '#5F1F7B',
    'PASAJE': '#01662A'
  };
  const colorDe = t => COLORES[t] || '#FFFFFF';

  // Correcciones de escritura del campo BARRIO (solo para mostrar y filtrar)
  const CORRECCIONES_BARRIO = { 'FOLRIDA OESTE': 'FLORIDA OESTE' };
  const limpiar = v => (v == null ? '' : String(v).trim());
  const barrioDe = p => { const b = limpiar(p.BARRIO).replace(/\s+/g, ' '); return CORRECCIONES_BARRIO[b] || b; };
  // La superficie viene mezclada: "421.62" (punto decimal) y "1.987,06" / "67,8" (coma decimal)
  const numero = v => {
    let s = limpiar(v);
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? null : Math.round(n * 100) / 100;
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sinAcentos = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

  // Columnas de la tabla
  const COLUMNAS = [
    { k: 'NOMBRE', t: 'Nombre' },
    { k: '_barrio', t: 'Barrio' },
    { k: 'ESPACIO', t: 'Tipo' },
    { k: 'DIRECCION', t: 'Dirección' },
    { k: '_sup', t: 'Superficie m²', num: true },
    { k: 'PATIO DE JUEGOS', t: 'Juegos', sn: true },
    { k: 'CANIL', t: 'Canil', sn: true },
    { k: 'SECTOR DEPORTIVO', t: 'Deportivo', sn: true },
    { k: 'ESTADO', t: 'Estado' },
    { k: 'ORDENANZA NRO', t: 'Ordenanza' }
  ];
  // Orden de los atributos en el popup
  const CAMPOS_POPUP = ['DIRECCION', 'LOCALIZACION', 'SUPERFICIE EN M2', 'PATIO DE JUEGOS', 'REJA PERIMETRAL',
    'REJA ZONA JUEGOS', 'SECTOR DEPORTIVO', 'CANIL', 'FUENTE', 'SISTEMA DE RIEGO', 'DESTACAMENTO', 'PLANCHA',
    'PLACERO', 'ORDENANZA NRO', 'RENOVACION', 'MAT GRAL', 'ESTADO', '2025'];

  // Registros normalizados
  const registros = datos.features.map(f => {
    const p = f.properties;
    return Object.assign({}, p, { _barrio: barrioDe(p), _sup: numero(p['SUPERFICIE EN M2']), _feature: f });
  });

  // ---------- Mapa (solo Esri satelital) ----------
  const map = L.map('map', { zoomControl: false, maxZoom: 20 });
  L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20, maxNativeZoom: 19,
    opacity: 0.8, // opacidad 80 %: aclara un poco la imagen para que resalten los polígonos
    attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics'
  }).addTo(map);

  const estilo = r => ({ color: colorDe(r.ESPACIO), weight: 2.5, fillColor: colorDe(r.ESPACIO), fillOpacity: 0.4 });
  const ESTILO_SEL = { color: '#FFFFFF', weight: 4, fillOpacity: 0.6 };

  let seleccionado = null;
  registros.forEach(r => {
    r._capa = L.geoJSON(r._feature, { style: () => estilo(r) })
      .bindTooltip(esc(limpiar(r.NOMBRE)), { sticky: true, direction: 'top' })
      .bindPopup(() => popupDe(r), { maxWidth: 320, autoPanPadding: [20, 20] })
      .on('click', () => seleccionar(r, false))
      .on('popupclose', () => { if (seleccionado === r) deseleccionar(); });
  });
  const grupo = L.featureGroup(registros.map(r => r._capa)).addTo(map);
  map.fitBounds(grupo.getBounds(), { padding: [20, 20] });

  function popupDe(r) {
    const filas = CAMPOS_POPUP
      .filter(k => limpiar(r[k]) && limpiar(r[k]) !== '.')
      .map(k => `<tr><th>${esc(k)}</th><td>${esc(limpiar(r[k]))}</td></tr>`).join('');
    return `<div class="pop-cab">
        <span class="mvl-pill" style="background:${colorDe(r.ESPACIO)}">${esc(limpiar(r.ESPACIO))}</span>
        <h3>${esc(limpiar(r.NOMBRE))}</h3>
        <p>${esc(r._barrio)}</p>
      </div>
      <div class="pop-tabla"><table>${filas}</table></div>
      <div class="pop-franja"></div>`;
  }

  // Leyenda
  const tiposPresentes = [...new Set(registros.map(r => limpiar(r.ESPACIO)))].filter(Boolean);
  document.getElementById('leyenda').innerHTML = '<h2>Tipo de espacio</h2>' + tiposPresentes.map(t =>
    `<div class="item"><span class="muestra" style="background:${colorDe(t)}66;border-color:${colorDe(t)}"></span>${esc(t)}</div>`).join('');

  // ---------- Filtros ----------
  const fBarrio = document.getElementById('fBarrio');
  const fNombre = document.getElementById('fNombre');
  const fEspacio = document.getElementById('fEspacio');
  const opciones = (sel, valores) => valores.forEach(v => sel.add(new Option(v, v)));
  opciones(fBarrio, [...new Set(registros.map(r => r._barrio))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')));
  opciones(fEspacio, tiposPresentes.slice().sort((a, b) => a.localeCompare(b, 'es')));

  let filtrados = registros;
  function aplicarFiltros(encuadrar) {
    const b = fBarrio.value, e = fEspacio.value, n = sinAcentos(fNombre.value.trim());
    filtrados = registros.filter(r =>
      (!b || r._barrio === b) &&
      (!e || limpiar(r.ESPACIO) === e) &&
      (!n || sinAcentos(limpiar(r.NOMBRE)).includes(n)));

    const visibles = new Set(filtrados);
    registros.forEach(r => visibles.has(r) ? grupo.addLayer(r._capa) : grupo.removeLayer(r._capa));
    if (seleccionado && !visibles.has(seleccionado)) deseleccionar();

    document.getElementById('nVisibles').textContent = filtrados.length;
    if (encuadrar && filtrados.length) map.fitBounds(grupo.getBounds(), { padding: [30, 30], maxZoom: 18 });
    dibujarTabla();
  }

  let temporizador;
  fNombre.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(() => aplicarFiltros(true), 200); });
  fBarrio.addEventListener('change', () => aplicarFiltros(true));
  fEspacio.addEventListener('change', () => aplicarFiltros(true));
  document.getElementById('btnLimpiar').addEventListener('click', () => {
    fBarrio.value = ''; fEspacio.value = ''; fNombre.value = '';
    aplicarFiltros(true);
  });

  // ---------- Tabla ----------
  const thead = document.querySelector('#tabla thead tr');
  const tbody = document.querySelector('#tabla tbody');
  let orden = { k: '_barrio', asc: true };

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

  function valorOrden(r, k) {
    const v = k === '_sup' ? r._sup : limpiar(r[k]);
    return v === null || v === '' ? null : v;
  }

  function dibujarTabla() {
    const col = COLUMNAS.find(c => c.k === orden.k);
    const filas = filtrados.slice().sort((a, b) => {
      const va = valorOrden(a, orden.k), vb = valorOrden(b, orden.k);
      if (va === null) return 1; if (vb === null) return -1;
      const d = col.num ? va - vb : String(va).localeCompare(String(vb), 'es');
      return (orden.asc ? d : -d) || limpiar(a.NOMBRE).localeCompare(limpiar(b.NOMBRE), 'es');
    });
    thead.querySelectorAll('th').forEach(th => {
      th.querySelector('.flecha').textContent = th.dataset.k === orden.k ? (orden.asc ? '▲' : '▼') : '';
    });

    tbody.innerHTML = '';
    filas.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = COLUMNAS.map(c => {
        if (c.k === 'ESPACIO') return `<td><span class="tipo"><i style="background:${colorDe(r.ESPACIO)}"></i>${esc(limpiar(r.ESPACIO))}</span></td>`;
        if (c.num) return `<td class="num">${r._sup === null ? '' : r._sup.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>`;
        const v = limpiar(r[c.k]);
        if (c.sn) return `<td class="${v.toUpperCase() === 'SI' ? 'si' : ''}">${esc(v)}</td>`;
        return `<td>${esc(v)}</td>`;
      }).join('');
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
    seleccionado._capa.setStyle(estilo(seleccionado));
    seleccionado._fila?.classList.remove('sel');
    seleccionado = null;
  }
  function seleccionar(r, desdeTabla) {
    if (seleccionado && seleccionado !== r) deseleccionar();
    seleccionado = r;
    r._capa.setStyle(ESTILO_SEL).bringToFront();
    r._fila?.classList.add('sel');
    if (desdeTabla) {
      map.fitBounds(r._capa.getBounds(), { padding: [60, 60], maxZoom: 18 });
      const centro = r._capa.getBounds().getCenter();
      setTimeout(() => r._capa.openPopup(centro), 300);
    } else {
      r._fila?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ---------- Exportar CSV de lo filtrado ----------
  document.getElementById('btnCsv').addEventListener('click', () => {
    const campos = Object.keys(datos.features[0].properties);
    const celda = v => `"${limpiar(v).replace(/"/g, '""')}"`;
    const lineas = [campos.map(celda).join(';')]
      .concat(filtrados.map(r => campos.map(k => celda(k === 'BARRIO' ? r._barrio : r[k])).join(';')));
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'plazas_vicente_lopez.csv' });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('nTotal').textContent = registros.length;
  aplicarFiltros(false);

  // Encuadre inicial una vez que el diseño de la página tiene su tamaño final
  const encuadrarTodo = () => { map.invalidateSize(); map.fitBounds(grupo.getBounds(), { padding: [20, 20] }); };
  window.addEventListener('load', encuadrarTodo);
  new ResizeObserver(() => map.invalidateSize()).observe(document.getElementById('map'));
})();
