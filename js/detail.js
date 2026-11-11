// Fenêtre de détail d'une commune : chiffres clés, courbes d'évolution, ventes par mois, répartition par type
// et comparaison avec le département et la France. Tout est calculé sur le type de bien choisi dans la fenêtre.
import { fetchMonthly, fetchTerritoryDetails } from './api.js';
import { barChart, hBarChart, lineChart, monthLabelLong } from './charts.js';
import { MIN_PLAUSIBLE_PRICE, PROPERTY_TYPES } from './config.js';
import { filter } from './store.js';
import { esc, fmt } from './utils.js';

// Une couleur par territoire (mêmes couleurs dans tous les graphiques de la fenêtre)
const COLORS = { commune: '#2a78d6', departement: '#eb6834', france: '#1baf7a' };
const NEUTRAL = '#64748b';
const TREND_MONTHS = 12;

const dialog = document.getElementById('detail');
const title = document.getElementById('detail-title');
const sub = document.getElementById('detail-sub');
const typesEl = document.getElementById('detail-types');
const body = document.getElementById('detail-body');

let token = 0; // invalide les chargements en retard quand on ouvre une autre commune
let state = null; // { commune, dep, typeId, data }

const DASH = '<span class="text-slate-300">—</span>';
const pct = v => `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')} %`;
const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;

export function initDetail() {
  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-detail-close]')) dialog.close();
  });
  typesEl.addEventListener('click', e => {
    const b = e.target.closest('[data-type]');
    if (!b || !state) return;
    state.typeId = b.dataset.type;
    renderTypes();
    if (state.data) render();
  });
  // Redessine les graphiques quand la largeur change (fenêtre redimensionnée)
  let lastWidth = 0;
  new ResizeObserver(() => {
    const w = Math.round(body.clientWidth);
    if (state?.data && Math.abs(w - lastWidth) > 2) { lastWidth = w; drawCharts(); }
  }).observe(body);
}

// Un type de bien sans aucune vente dans la commune est grisé (rien à afficher)
const hasSales = (id) => state.data?.cw?.[PROPERTY_TYPES[id].column] != null;

function renderTypes() {
  typesEl.innerHTML = Object.entries(PROPERTY_TYPES).map(([id, t]) => {
    const empty = state.data && !hasSales(id);
    return `<button type="button" class="chip" data-type="${id}" aria-pressed="${id === state.typeId}"${empty ? ' disabled title="Aucune vente de ce type dans cette commune"' : ''}>${esc(t.label)}</button>`;
  }).join('');
}

// commune : { nom, code } ; dep : { nom, code }
export async function openDetail(commune, dep) {
  const t = ++token;
  state = { commune, dep, typeId: filter.type, data: null };
  title.textContent = commune.nom;
  sub.textContent = `Code INSEE ${commune.code} · ${dep.nom} (${dep.code})`;
  renderTypes();
  body.innerHTML = '<div class="panel-skeleton h-40"></div><div class="panel-skeleton h-64"></div>';
  if (!dialog.open) dialog.showModal();
  try {
    const [cw, dw, nw, cm, dm, nm] = await Promise.all([
      fetchTerritoryDetails(commune.code, 'commune'),
      fetchTerritoryDetails(dep.code, 'departement'),
      fetchTerritoryDetails('nation', 'nation'),
      fetchMonthly(commune.code, 'commune'),
      fetchMonthly(dep.code, 'departement'),
      fetchMonthly('nation', 'nation')
    ]);
    if (t !== token) return;
    state.data = { cw, dw, nw, cm, dm, nm };
    if (cw && !hasSales(state.typeId)) state.typeId = 'all'; // le type filtré sur la carte n'existe pas ici
    renderTypes();
    render();
  } catch (err) {
    console.error(err);
    if (t === token) body.innerHTML = '<p class="chart-empty">Données indisponibles pour le moment.</p>';
  }
}

// Valeurs d'une colonne mensuelle alignées sur la liste de mois (null si le mois manque)
const align = (months, rows, column, min = -Infinity) => {
  const byMonth = new Map(rows.map(r => [r.annee_mois, r[column]]));
  return months.map(m => {
    const v = byMonth.get(m) ?? null;
    return v != null && v >= min ? v : null;
  });
};

function stat(label, value, hint) {
  return `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-hint">${hint}</div></div>`;
}

function compute() {
  const { cw, dw, nw, cm, dm, nm } = state.data;
  const t = PROPERTY_TYPES[state.typeId];
  const months = nm.map(r => r.annee_mois);
  return {
    t, months,
    price: cw?.[t.column] ?? null, sales: cw?.[t.salesColumn] ?? null,
    depPrice: dw?.[t.column] ?? null, frPrice: nw?.[t.column] ?? null,
    // médianes mensuelles aberrantes (quelques ventes à surface faussée) : ignorées plutôt que tracées à ~0 €/m²
    cPrice: align(months, cm, t.monthlyColumn, MIN_PLAUSIBLE_PRICE),
    dPrice: align(months, dm, t.monthlyColumn, MIN_PLAUSIBLE_PRICE),
    fPrice: align(months, nm, t.monthlyColumn, MIN_PLAUSIBLE_PRICE),
    cSales: align(months, cm, t.monthlySalesColumn)
  };
}

function render() {
  const c = compute();
  const { cw } = state.data;
  const last = c.cPrice.slice(-TREND_MONTHS).filter(v => v != null);
  const prev = c.cPrice.slice(-2 * TREND_MONTHS, -TREND_MONTHS).filter(v => v != null);
  const trend = last.length >= 3 && prev.length >= 3 ? (mean(last) / mean(prev) - 1) * 100 : null;
  const sales12 = c.cSales.slice(-TREND_MONTHS).reduce((s, v) => s + (v ?? 0), 0);
  const vsDep = c.price != null && c.depPrice ? (c.price / c.depPrice - 1) * 100 : null;
  const period = c.months.length ? `${monthLabelLong(c.months[0])} – ${monthLabelLong(c.months.at(-1))}` : '';

  if (!cw) {
    body.innerHTML = '<p class="chart-empty">Aucune vente enregistrée pour cette commune.</p>';
    return;
  }

  body.innerHTML = `
    <div class="kpis">
      ${stat('Prix médian', c.price == null ? DASH : `${fmt(c.price)} €/m²`, c.price == null ? 'Aucune vente de ce type' : esc(c.t.label))}
      ${stat('Ventes enregistrées', c.sales == null ? DASH : fmt(c.sales), esc(period))}
      ${stat('Écart avec le département', vsDep == null ? DASH : pct(vsDep), c.depPrice ? `Département : ${fmt(c.depPrice)} €/m²` : '')}
      ${stat('Évolution sur 12 mois', trend == null ? DASH : pct(trend), `${fmt(sales12)} ventes sur les 12 derniers mois`)}
    </div>
    <div class="charts">
      <section class="chart-card col-span-full">
        <h3 class="chart-title">Évolution du prix médian au m²</h3>
        <p class="chart-sub">Médiane mensuelle, ${esc(c.t.label.toLowerCase())}. Elle varie beaucoup quand il y a peu de ventes.</p>
        <div class="chart-legend">
          <span><i style="background:${COLORS.commune}"></i>${esc(state.commune.nom)}</span>
          <span><i style="background:${COLORS.departement}"></i>${esc(state.dep.nom)}</span>
          <span><i style="background:${COLORS.france}"></i>France</span>
        </div>
        <div id="chart-price"></div>
      </section>
      <section class="chart-card">
        <h3 class="chart-title">Ventes par mois</h3>
        <p class="chart-sub">Nombre de ventes, ${esc(c.t.label.toLowerCase())}</p>
        <div id="chart-sales"></div>
      </section>
      <section class="chart-card">
        <h3 class="chart-title">Répartition par type de bien</h3>
        <p class="chart-sub">Nombre de ventes sur la période</p>
        <div id="chart-types"></div>
      </section>
      <section class="chart-card col-span-full">
        <h3 class="chart-title">Comparaison des prix médians</h3>
        <p class="chart-sub">€/m², ${esc(c.t.label.toLowerCase())}, toute la période</p>
        <div id="chart-compare"></div>
      </section>
    </div>
    <details class="data-table">
      <summary>Voir les données mensuelles en tableau</summary>
      <div class="data-table-scroll">
        <table>
          <thead><tr><th>Mois</th><th>${esc(state.commune.nom)}</th><th>${esc(state.dep.nom)}</th><th>France</th><th>Ventes</th></tr></thead>
          <tbody>${c.months.map((m, i) => i).reverse().map(i => `<tr><td>${esc(monthLabelLong(c.months[i]))}</td>
            <td>${c.cPrice[i] == null ? '—' : fmt(c.cPrice[i])}</td><td>${c.dPrice[i] == null ? '—' : fmt(c.dPrice[i])}</td>
            <td>${c.fPrice[i] == null ? '—' : fmt(c.fPrice[i])}</td><td>${c.cSales[i] ?? '—'}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </details>
    <p class="detail-foot">Source : DVF (Etalab), data.gouv.fr. Médianes des prix de vente au m² des appartements, maisons et locaux.</p>`;
  drawCharts();
}

function drawCharts() {
  const c = compute();
  const { cw } = state.data;
  const unit = '€/m²';
  lineChart(document.getElementById('chart-price'), {
    labels: c.months,
    unit,
    series: [
      { name: state.commune.nom, color: COLORS.commune, values: c.cPrice },
      { name: state.dep.nom, color: COLORS.departement, values: c.dPrice },
      { name: 'France', color: COLORS.france, values: c.fPrice }
    ]
  });
  barChart(document.getElementById('chart-sales'), { labels: c.months, values: c.cSales, color: COLORS.commune, name: 'Ventes' });
  hBarChart(document.getElementById('chart-types'), {
    rows: ['appartement', 'maison', 'local'].map(id => {
      const t = PROPERTY_TYPES[id];
      const n = cw?.[t.salesColumn];
      const med = cw?.[t.column];
      return { label: t.label, value: n ?? null, text: n == null ? '—' : `${fmt(n)} · ${fmt(med)} €/m²`, color: NEUTRAL, tip: `${t.label} : ${n ?? 0} ventes` };
    })
  });
  hBarChart(document.getElementById('chart-compare'), {
    rows: [
      { label: state.commune.nom, value: c.price, color: COLORS.commune },
      { label: state.dep.nom, value: c.depPrice, color: COLORS.departement },
      { label: 'France', value: c.frPrice, color: COLORS.france }
    ].map(r => ({ ...r, text: r.value == null ? '—' : `${fmt(r.value)} €/m²`, tip: r.label }))
  });
}
