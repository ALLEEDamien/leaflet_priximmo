// Filtre par type de bien : boutons ronds à côté de la barre de recherche
// « Tous » est actif par défaut ; cliquer sur le bouton actif d'un type y revient
import { DEFAULT_TYPE } from './config.js';

// onChange(typeId) est appelé avec l'identifiant du type choisi (clé de PROPERTY_TYPES)
export function initFilters(onChange) {
  const buttons = [...document.querySelectorAll('[data-type]')];
  let current = DEFAULT_TYPE;

  const render = () => buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === current)));

  buttons.forEach(b => b.addEventListener('click', () => {
    const next = current === b.dataset.type ? DEFAULT_TYPE : b.dataset.type;
    if (next === current) return; // « Tous » déjà actif
    current = next;
    render();
    onChange(current);
  }));
  render();
}
