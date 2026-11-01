// Classement flottant des communes du département sélectionné : top 5, par prix croissants ou décroissants
import { activeScale, currentType } from './store.js';
import { esc, fmt } from './utils.js';

const TOP = 5;

const root = document.getElementById('ranking');
const sub = document.getElementById('ranking-sub');
const list = document.getElementById('ranking-list');
const sortButtons = [...root.querySelectorAll('[data-order]')];

let order = 'desc'; // desc : les plus chères en premier
let state = null; // { depName, items: [{ code, nom, price }] }

function render() {
  if (!state) return;
  const sorted = [...state.items].sort((a, b) => order === 'desc' ? b.price - a.price : a.price - b.price);
  sub.textContent = `${state.depName} · ${currentType().label}`;
  sortButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.order === order)));
  list.innerHTML = sorted.slice(0, TOP).map((it, i) => `
    <li class="ranking-item" data-code="${esc(it.code)}">
      <span class="ranking-rank">${i + 1}</span>
      <span class="ranking-name">${esc(it.nom)}</span>
      <span class="ranking-price"><span class="dot" style="background:${activeScale().color(it.price)}"></span>${fmt(it.price)} €/m²</span>
    </li>`).join('');
}

// onPick(code) est appelé au clic sur une commune du classement
export function initRanking(onPick) {
  sortButtons.forEach(b => b.addEventListener('click', () => { order = b.dataset.order; render(); }));
  list.addEventListener('click', e => {
    const li = e.target.closest('[data-code]');
    if (li) onPick(li.dataset.code);
  });
}

// items : communes avec un prix pour le type de bien filtré
export function showRanking(depName, items) {
  state = { depName, items };
  root.hidden = false;
  render();
}

export function hideRanking() {
  state = null;
  root.hidden = true;
}
