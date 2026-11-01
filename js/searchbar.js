// Barre de recherche de département : suggestions façon Google Maps
import { prices, scales } from './store.js';
import { esc, fmt, norm } from './utils.js';

const MAX_SUGGESTIONS = 8;
const PIN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

// layers : couches Leaflet des départements ; onSelect(layer) est appelé quand l'utilisateur en choisit un
export function initSearchbar(layers, onSelect) {
  const depts = layers
    .map(l => ({ l, nom: l.feature.properties.nom, code: l.feature.properties.code, key: norm(l.feature.properties.nom) }))
    .sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }));

  const input = document.getElementById('dep-search');
  const clearBtn = document.getElementById('search-clear');
  const list = document.getElementById('suggestions');
  let matches = [];
  let active = -1;

  // 0 = code exact, 1 = nom commence par, 2 = code commence par, 3 = nom contient, 9 = aucun
  const rank = (d, n) => {
    const c = d.code.toLowerCase();
    if (c === n) return 0;
    if (d.key.startsWith(n)) return 1;
    if (c.startsWith(n)) return 2;
    return d.key.includes(n) ? 3 : 9;
  };
  const match = q => {
    const n = norm(q);
    if (!n) return depts.slice(0, MAX_SUGGESTIONS);
    return depts.filter(d => rank(d, n) < 9).sort((a, b) => rank(a, n) - rank(b, n)).slice(0, MAX_SUGGESTIONS);
  };

  const suggestionHtml = (d, i) => {
    const p = prices[d.code];
    const price = p == null ? '' : `<span class="dot" style="background:${scales.departments.color(p)}"></span>${fmt(p)} €/m²`;
    return `<li class="suggestion${i === active ? ' active' : ''}" role="option" data-i="${i}">
      <span class="suggestion-pin">${PIN_ICON}</span>
      <span class="suggestion-name">${esc(d.nom)}<span class="suggestion-code">${d.code}</span></span>
      <span class="suggestion-price">${price}</span></li>`;
  };

  const render = () => {
    matches = match(input.value);
    active = matches.length ? 0 : -1;
    list.innerHTML = matches.length ? matches.map(suggestionHtml).join('') : '<li class="suggestions-empty">Aucun département trouvé</li>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const setActive = i => {
    active = (i + matches.length) % matches.length;
    [...list.children].forEach((li, k) => li.classList.toggle('active', k === active));
    list.children[active].scrollIntoView({ block: 'nearest' });
  };
  const choose = d => {
    if (!d) return;
    input.value = `${d.nom} (${d.code})`;
    clearBtn.hidden = false;
    close();
    input.blur();
    onSelect(d.l);
  };

  input.addEventListener('focus', render);
  input.addEventListener('input', () => { clearBtn.hidden = !input.value; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) render();
      else if (matches.length) setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      choose(matches[active]);
    } else if (e.key === 'Escape') {
      close();
      input.blur();
    }
  });
  list.addEventListener('mousedown', e => {
    e.preventDefault(); // garde le focus pour que le blur ne ferme pas la liste avant le clic
    const li = e.target.closest('[data-i]');
    if (li) choose(matches[Number(li.dataset.i)]);
  });
  input.addEventListener('blur', close);
  clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.hidden = true; input.focus(); });
}
