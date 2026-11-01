// Graphiques SVG sans dépendance : courbes, barres verticales (SVG) et barres horizontales (HTML)
// Marques fines, grille discrète, ligne de repère + infobulle au survol, étiquettes directes en bout de courbe
import { esc, fmt } from './utils.js';

const MARGIN = { top: 12, right: 100, bottom: 28, left: 56 };
const LABEL_MAX = 13; // longueur max d'une étiquette directe (le nom complet reste dans l'infobulle et la légende)
const HEIGHT = 240;
const MIN_WIDTH = 300;

export const monthLabel = ym => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', '');
};
export const monthLabelLong = ym => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

// Graduations « rondes » couvrant [min, max]
function niceScale(min, max, ticks = 4, integer = false) {
  const span = max - min || max || 1;
  const raw = span / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= raw);
  if (integer) step = Math.max(1, Math.ceil(step)); // compteurs : pas de demi-vente
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step };
}

const frame = (el, svg) => {
  el.innerHTML = `<div class="chart-wrap">${svg}<div class="chart-tip" hidden></div></div>`;
  const wrap = el.firstElementChild;
  const tip = wrap.querySelector('.chart-tip');
  return {
    wrap,
    show(html, x, y) {
      tip.innerHTML = html;
      tip.hidden = false;
      const w = tip.offsetWidth;
      tip.style.left = `${Math.max(4, Math.min(x + 14, wrap.clientWidth - w - 4))}px`;
      tip.style.top = `${Math.max(0, y)}px`;
    },
    hide() { tip.hidden = true; }
  };
};

const shorten = s => s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1)}…` : s;

const empty = el => { el.innerHTML = '<p class="chart-empty">Pas assez de données pour ce graphique.</p>'; };

// Évite que des étiquettes se chevauchent : espace minimal de `gap` px entre positions verticales
function spread(items, gap) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) sorted[i].y = Math.max(sorted[i].y, sorted[i - 1].y + gap);
  return sorted;
}

// series : [{ name, color, values }] (values alignées sur labels, null = pas de donnée)
export function lineChart(el, { labels, series, unit = '€/m²', height = HEIGHT }) {
  const W = Math.max(el.clientWidth, MIN_WIDTH);
  const all = series.flatMap(s => s.values).filter(v => v != null);
  if (!all.length) return empty(el);

  const { lo, hi, step } = niceScale(Math.min(...all), Math.max(...all));
  const iw = W - MARGIN.left - MARGIN.right;
  const ih = height - MARGIN.top - MARGIN.bottom;
  const n = labels.length;
  const x = i => MARGIN.left + (n === 1 ? iw / 2 : i * iw / (n - 1));
  const y = v => MARGIN.top + ih - (v - lo) / (hi - lo) * ih;

  let g = '';
  for (let v = lo; v <= hi + step / 1e6; v += step) {
    g += `<line class="chart-grid" x1="${MARGIN.left}" x2="${W - MARGIN.right}" y1="${y(v)}" y2="${y(v)}"/>`
      + `<text class="chart-axis" x="${MARGIN.left - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  }
  const every = Math.ceil(n / Math.max(2, Math.floor(iw / 80))); // une date tous les ~80 px
  labels.forEach((l, i) => {
    if (i % every === 0) g += `<text class="chart-axis" x="${x(i)}" y="${height - 8}" text-anchor="middle">${monthLabel(l)}</text>`;
  });

  // Une courbe par série, interrompue là où il manque des données
  let paths = '';
  series.forEach(s => {
    let d = '';
    s.values.forEach((v, i) => { d += v == null ? '' : `${d && s.values[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; });
    paths += `<path class="chart-line" d="${d}" style="stroke:${s.color}"/>`;
  });

  // Étiquettes directes en bout de courbe
  const ends = series.map(s => {
    const i = s.values.findLastIndex(v => v != null);
    return i < 0 ? null : { s, i, y: y(s.values[i]) };
  }).filter(Boolean);
  const labelsSvg = spread(ends, 14).map(e =>
    `<circle cx="${x(e.i) + 12}" cy="${e.y - 3}" r="4" style="fill:${e.s.color}"/>`
    + `<text class="chart-label" x="${x(e.i) + 20}" y="${e.y}">${esc(shorten(e.s.name))}</text>`).join('');

  const cross = `<line class="chart-cross" y1="${MARGIN.top}" y2="${MARGIN.top + ih}" visibility="hidden"/>`
    + series.map(s => `<circle class="chart-dot" r="5" visibility="hidden" style="fill:${s.color}"/>`).join('');

  const ui = frame(el, `<svg class="chart-svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-label="Courbes en ${esc(unit)}">
    ${g}${paths}${labelsSvg}${cross}<rect class="chart-hit" x="${MARGIN.left}" y="${MARGIN.top}" width="${iw}" height="${ih}"/></svg>`);

  const svg = ui.wrap.querySelector('svg');
  const line = svg.querySelector('.chart-cross');
  const dots = [...svg.querySelectorAll('.chart-dot')];
  const hit = svg.querySelector('.chart-hit');
  const leave = () => { line.setAttribute('visibility', 'hidden'); dots.forEach(d => d.setAttribute('visibility', 'hidden')); ui.hide(); };
  hit.addEventListener('pointerleave', leave);
  hit.addEventListener('pointermove', e => {
    const px = e.clientX - svg.getBoundingClientRect().left;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - MARGIN.left) / iw * (n - 1))));
    line.setAttribute('x1', x(i));
    line.setAttribute('x2', x(i));
    line.setAttribute('visibility', 'visible');
    let rows = '';
    series.forEach((s, k) => {
      const v = s.values[i];
      dots[k].setAttribute('visibility', v == null ? 'hidden' : 'visible');
      if (v != null) {
        dots[k].setAttribute('cx', x(i));
        dots[k].setAttribute('cy', y(v));
      }
      rows += `<div class="chart-tip-row"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}<b>${v == null ? '—' : fmt(v) + ' ' + esc(unit)}</b></div>`;
    });
    ui.show(`<div class="chart-tip-title">${esc(monthLabelLong(labels[i]))}</div>${rows}`, x(i), MARGIN.top);
  });
}

// Barres verticales ancrées sur zéro ; values alignées sur labels (null = pas de donnée)
export function barChart(el, { labels, values, color, name, unit = 'ventes', height = HEIGHT }) {
  const W = Math.max(el.clientWidth, MIN_WIDTH);
  const present = values.filter(v => v != null);
  if (!present.length) return empty(el);

  const { hi, step } = niceScale(0, Math.max(...present), 4, true);
  const m = { ...MARGIN, right: 16 };
  const iw = W - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const n = labels.length;
  const band = iw / n;
  const bw = Math.max(2, Math.min(band * 0.72, 28));
  const y = v => m.top + ih - v / hi * ih;

  let g = '';
  for (let v = 0; v <= hi + step / 1e6; v += step) {
    g += `<line class="chart-grid" x1="${m.left}" x2="${W - m.right}" y1="${y(v)}" y2="${y(v)}"/>`
      + `<text class="chart-axis" x="${m.left - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  }
  const every = Math.ceil(n / Math.max(2, Math.floor(iw / 80))); // une date tous les ~80 px
  labels.forEach((l, i) => {
    if (i % every === 0) g += `<text class="chart-axis" x="${m.left + band * (i + .5)}" y="${height - 8}" text-anchor="middle">${monthLabel(l)}</text>`;
  });

  const r = Math.min(3, bw / 2);
  let bars = '';
  let hits = '';
  values.forEach((v, i) => {
    const bx = m.left + band * (i + .5) - bw / 2;
    if (v) {
      const top = y(v);
      bars += `<path class="chart-bar" data-i="${i}" style="fill:${color}" d="M${bx},${y(0)}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + bw - r}Q${bx + bw},${top} ${bx + bw},${top + r}V${y(0)}Z"/>`;
    }
    hits += `<rect class="chart-hit" data-i="${i}" x="${m.left + band * i}" y="${m.top}" width="${band}" height="${ih}"/>`;
  });

  const ui = frame(el, `<svg class="chart-svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-label="Barres : ${esc(name)}">
    ${g}${bars}<line class="chart-base" x1="${m.left}" x2="${W - m.right}" y1="${y(0)}" y2="${y(0)}"/>${hits}</svg>`);

  const svg = ui.wrap.querySelector('svg');
  svg.addEventListener('pointerleave', () => { svg.querySelectorAll('.chart-bar.on').forEach(b => b.classList.remove('on')); ui.hide(); });
  svg.addEventListener('pointermove', e => {
    const hit = e.target.closest('[data-i]');
    if (!hit) return;
    const i = Number(hit.dataset.i);
    svg.querySelectorAll('.chart-bar.on').forEach(b => b.classList.remove('on'));
    svg.querySelector(`.chart-bar[data-i="${i}"]`)?.classList.add('on');
    const v = values[i];
    ui.show(`<div class="chart-tip-title">${esc(monthLabelLong(labels[i]))}</div>
      <div class="chart-tip-row"><span class="dot" style="background:${color}"></span>${esc(name)}<b>${v == null ? '—' : fmt(v) + ' ' + esc(unit)}</b></div>`,
    m.left + band * (i + .5), m.top);
  });
}

// Barres horizontales en HTML : rows = [{ label, value, text, color, tip }]
export function hBarChart(el, { rows }) {
  const max = Math.max(...rows.map(r => r.value ?? 0));
  if (!(max > 0)) return empty(el);
  el.innerHTML = `<div class="hbars">${rows.map(r => `
    <div class="hbar" title="${esc(r.tip ?? '')}">
      <span class="hbar-label">${esc(r.label)}</span>
      <span class="hbar-track">${r.value == null ? '' : `<span class="hbar-fill" style="width:${Math.max(1.5, r.value / max * 100)}%;background:${r.color}"></span>`}</span>
      <span class="hbar-value">${esc(r.text)}</span>
    </div>`).join('')}</div>`;
}
