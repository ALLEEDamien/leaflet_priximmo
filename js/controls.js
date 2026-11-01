// Contrôles Leaflet : encadré d'info au survol et légende des couleurs
import { activeScale, prices } from './store.js';
import { esc, fmt } from './utils.js';

export function addInfoControl(map) {
  const info = L.control();
  let hint = 'Survolez un département';

  info.onAdd = function () {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
  };
  // p : propriétés { nom, code } de l'entité survolée, ou rien pour l'état par défaut
  info.update = function (p) {
    this._div.innerHTML = p
      ? `<b>${esc(p.nom)} (${esc(p.code)})</b><br>${prices[p.code] != null ? fmt(prices[p.code]) + ' €/m²' : 'pas de donnée'}`
      : hint;
  };
  // Texte affiché quand rien n'est survolé
  info.setHint = function (text) {
    hint = text;
    this.update();
  };
  info.showMessage = function (text) { this._div.textContent = text; };
  info.addTo(map);
  return info;
}

export function addLegend(map) {
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const d = L.DomUtil.create('div', 'info legend');
    legend._title = L.DomUtil.create('div', 'legend-title', d);
    legend._scope = L.DomUtil.create('div', 'legend-scope', d);
    legend._body = L.DomUtil.create('div', '', d);
    return d;
  };
  legend.addTo(map);

  // Titre (type de bien) et portée de l'échelle (France ou département)
  legend.setTitle = (text, scope) => {
    legend._title.textContent = text;
    legend._scope.textContent = scope;
  };
  // Redessine les classes à partir de l'échelle active
  legend.update = () => {
    legend._body.innerHTML = activeScale().legendItems()
      .map(it => `<div><i style="background:${it.color}"></i>${it.label}</div>`).join('');
  };
  legend.update();
  return legend;
}
