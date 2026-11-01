// Panneau flottant des données d'une commune (clic sur la carte)
import { PROPERTY_TYPES } from './config.js';
import { fetchCommuneDetails } from './api.js';
import { activeScale, currentType, filter, prices } from './store.js';
import { esc, fmt } from './utils.js';

const CLOSE_BTN = '<button class="panel-close" data-close aria-label="Fermer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
const DASH = '<span class="text-slate-300">—</span>';

const panel = document.getElementById('panel');
const message = text => `<p class="px-5 py-6 text-sm text-slate-500 m-0">${text}</p>`;

const closePanel = () => { panel.hidden = true; document.body.classList.remove('panel-open'); };
const openPanel = html => { panel.innerHTML = html; panel.hidden = false; document.body.classList.add('panel-open'); };

// onDetail(commune, codeDépartement) est appelé au clic sur « Voir toutes les données »
export function initPanel({ onDetail }) {
  panel.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closePanel();
    else if (e.target.closest('[data-detail]') && last) onDetail(...last);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
}

function comparisonBadge(price, depPrice) {
  if (!depPrice) return '';
  const diff = Math.round((price / depPrice - 1) * 100);
  let cls = 'badge-flat';
  let txt = 'Dans la moyenne du département';
  if (diff >= 2) { cls = 'badge-up'; txt = `+${diff} % par rapport au département`; }
  else if (diff <= -2) { cls = 'badge-down'; txt = `${diff} % par rapport au département`; }
  return `<div class="panel-badge ${cls}">${txt} (${fmt(depPrice)} €/m²)</div>`;
}

// Ligne du tableau pour un type de bien ; le type filtré est mis en gras
const tableLine = (row, typeId) => {
  const t = PROPERTY_TYPES[typeId];
  const nb = row[t.salesColumn];
  const med = row[t.column];
  const cls = filter.type === typeId ? ' class="font-semibold text-slate-900"' : '';
  return `<tr${cls}><td>${t.label}</td><td>${nb ?? DASH}</td><td>${med == null ? DASH : fmt(med) + ' €'}</td></tr>`;
};

let last = null; // dernière commune affichée, pour réafficher le panneau quand le filtre change
export function refreshPanel() {
  if (last && !panel.hidden) showCommune(...last);
}

export async function showCommune({ nom, code }, depCode) {
  last = [{ nom, code }, depCode];
  const head = `<div class="panel-head"><div><h2 class="panel-title">${esc(nom)}</h2><div class="panel-sub">Code INSEE ${esc(code)} · Département ${esc(depCode)}</div></div>${CLOSE_BTN}</div>`;
  openPanel(head + '<div class="panel-skeleton"></div>');
  try {
    const row = await fetchCommuneDetails(code);
    if (panel.hidden || !panel.innerHTML.includes(`Code INSEE ${code}`)) return; // panneau fermé ou autre commune entre-temps
    if (!row) {
      openPanel(head + message('Aucune vente enregistrée pour cette commune.'));
      return;
    }
    const type = currentType();
    const price = row[type.column];
    const priceBlock = price == null
      ? message(`Aucune vente de ${type.label.toLowerCase()} enregistrée ici.`)
      : `<div class="panel-type">${type.label}</div>
      <div class="panel-price"><span class="dot" style="background:${activeScale().color(price)}"></span><span class="panel-price-value">${fmt(price)} €</span><span class="panel-price-unit">/m² médian</span></div>
      ${comparisonBadge(price, prices[depCode])}`;
    openPanel(`${head}
      ${priceBlock}
      <table class="panel-table">
        <thead><tr><th>Type de bien</th><th>Ventes</th><th>Médiane m²</th></tr></thead>
        <tbody>${tableLine(row, 'appartement')}${tableLine(row, 'maison')}${tableLine(row, 'local')}</tbody>
      </table>
      <button type="button" class="panel-detail-btn" data-detail>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
        Voir toutes les données
      </button>
      <div class="panel-foot">Source : DVF (Etalab) · data.gouv.fr · ventes sur toute la période disponible</div>`);
  } catch (err) {
    console.error(err);
    openPanel(head + message('Données indisponibles pour le moment.'));
  }
}
