// Fonctions utilitaires pures (formatage, échappement, normalisation)

export const fmt = n => Number(n).toLocaleString('fr-FR');

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

// Minuscules sans accents, pour comparer des noms
export const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
