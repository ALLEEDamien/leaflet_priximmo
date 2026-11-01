// Échelle de couleurs dynamique : vert (prix bas) → jaune clair (milieu) → rouge foncé (prix haut)
import { fmt } from './utils.js';

const PALETTE = ['#1a9850', '#66bd63', '#d9ef8b', '#ffffbf', '#fdae61', '#d73027', '#7f0000']; // bas → haut
export const NO_DATA_COLOR = '#ccc';

// Arrondi « lisible » d'un seuil en €/m²
const nice = v => {
  const step = v >= 2000 ? 100 : v >= 500 ? 50 : 10;
  return Math.round(v / step) * step;
};

// Couleurs réparties sur la palette quand il y a moins de 7 classes
const pickColors = n => n === 1 ? [PALETTE[3]] : Array.from({ length: n }, (_, i) => PALETTE[Math.round(i * (PALETTE.length - 1) / (n - 1))]);

// Bornes de l'échelle « étalée » (communes), en €/m²
const MIN_PRICE = 1000; // bas de l'échelle, identique pour tous les départements
const TOP_COUNT = 5;    // nombre de prix les plus hauts moyennés pour fixer le haut de l'échelle
const TOP_OFFSET = 50;  // retranché à cette moyenne
const MIN_SPAN = 350;   // écart minimal entre le bas et le haut (50 €/m² par classe), si le haut calculé est trop bas
const round10 = v => Math.round(v / 10) * 10; // valeur finissant par 0
const mean = arr => arr.reduce((sum, v) => sum + v, 0) / arr.length;

// Deux modes, tous deux calculés sur les prix affichés :
// - par défaut : seuils par quantiles (autant de territoires par couleur), pour les départements
// - spread : classes de largeur égale entre deux extrémités, pour distinguer les communes très chères de celles
//   qui sont chères mais plus abordables :
//     bas = 1 000 pour tous les départements sans exception, haut = moyenne des 5 prix les plus hauts − 50 arrondie à une valeur
//     finissant par 0 ; au-delà, les prix prennent la couleur de la première / dernière classe
export function createScale(values, { spread = false } = {}) {
  const sorted = values.filter(v => v != null).sort((a, b) => a - b);
  const bounds = []; // bornes basses croissantes des classes 2 à n
  if (spread && sorted.length) {
    const lo = MIN_PRICE; // quoi qu'il arrive, même si les communes les moins chères dépassent 1 000 €
    const hi = Math.max(round10(mean(sorted.slice(-TOP_COUNT)) - TOP_OFFSET), lo + MIN_SPAN);
    for (let k = 1; k < PALETTE.length; k++) {
      const b = nice(lo + (hi - lo) * k / PALETTE.length);
      if (!bounds.length || b > bounds.at(-1)) bounds.push(b);
    }
  } else {
    for (let k = 1; k < PALETTE.length && sorted.length; k++) {
      const b = nice(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * k / PALETTE.length))]);
      if (b > sorted[0] && (!bounds.length || b > bounds.at(-1))) bounds.push(b);
    }
  }
  const n = bounds.length + 1;
  const palette = pickColors(n);

  const color = price => price == null ? NO_DATA_COLOR : palette[bounds.filter(b => price >= b).length];

  // Entrées de légende, de la plus haute à la plus basse classe
  const legendItems = () => {
    if (n === 1) return [{ color: palette[0], label: 'Prix uniforme' }];
    return palette.map((c, i) => {
      let label = `${fmt(bounds[i - 1])} – ${fmt(bounds[i])}`;
      if (i === 0) label = `< ${fmt(bounds[0])}`;
      else if (i === n - 1) label = `≥ ${fmt(bounds[n - 2])}`;
      return { color: c, label };
    }).reverse();
  };

  return { color, legendItems };
}
