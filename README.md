# MVL · Salidas web

Salidas web de la Municipalidad de Vicente López con la marca MVL (Brandbook v2.0).

## Plazas y Parques

[`plazas-parques/`](plazas-parques/) — mapa satelital (Esri) con los polígonos de plazas y parques,
tabla de datos y filtros por barrio, nombre y tipo de espacio.

- Abrir `plazas-parques/index.html` en el navegador (funciona sin servidor).
- Datos: base `mvl`, `plazas_parques.plazas_poligonos`, exportados a `plazas-parques/datos/plazas_poligonos.js`
  (EPSG:32721 → EPSG:4326). Si la tabla cambia, hay que volver a exportarla.

## Efectores de Salud

[`salud-efectores/`](salud-efectores/) — mapa satelital (Esri) con los efectores de salud municipales,
tabla de datos y filtros por barrio y efector.

- Abrir `salud-efectores/index.html` en el navegador (funciona sin servidor).
- Datos: base `mvl`, `salud.salud_efectores_kml`, exportados a `salud-efectores/datos/efectores.js`
  (EPSG:32721 → EPSG:4326). Si la tabla cambia, hay que volver a exportarla.
