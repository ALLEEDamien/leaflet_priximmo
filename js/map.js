// Création de la carte Leaflet et du fond de plan vectoriel (style OSM Bright, rendu par MapLibre GL)
import { BASEMAP_STYLE_URL } from './config.js';

export function initMap() {
  const map = L.map('map', { zoomControl: false }).setView([46.6, 2.5], 6);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.maplibreGL({
    style: BASEMAP_STYLE_URL,
    attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> '
      + '&copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> '
      + 'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(map);
  return map;
}
