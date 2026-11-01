// Accès aux données distantes (contours GeoJSON et prix DVF), toutes passées par le cache
import { API_URL, COMMUNES_GEOJSON_BASE, DEPARTMENTS_GEOJSON_URL, MONTHLY_API_URL, PAGE_SIZE } from './config.js';
import { cachedJson } from './cache.js';
import { norm } from './utils.js';

// ---- Contours ----
export const fetchDepartmentsGeo = () => cachedJson(DEPARTMENTS_GEOJSON_URL);

export function fetchCommunesGeo(code, nom) {
  const dir = code + '-' + norm(nom).replace(/[^a-z0-9]+/g, '-');
  return cachedJson(`${COMMUNES_GEOJSON_BASE}${dir}/communes-${dir}.geojson`);
}

// ---- Prix ----
// Prix médians { code: €/m² } de la colonne donnée pour un filtre donné, toutes pages récupérées en parallèle
async function fetchPrices(filter, column) {
  const url = p => `${API_URL}?${filter}&columns=code_geo,${column}&page_size=${PAGE_SIZE}&page=${p}`;
  const first = await cachedJson(url(1));
  const rest = await Promise.all(Array.from({ length: Math.ceil(first.meta.total / PAGE_SIZE) - 1 }, (_, i) => cachedJson(url(i + 2))));
  const rows = [first, ...rest].flatMap(r => r.data).filter(r => r[column] != null);
  return Object.fromEntries(rows.map(r => [r.code_geo, r[column]]));
}

export const fetchDepartmentPrices = column => fetchPrices('echelle_geo__exact=departement', column);

// Communes d'un département : intervalle de codes INSEE (97x → 5 chiffres commençant par 97x)
export function fetchCommunePrices(dep, column) {
  const [lo, hi] = dep.startsWith('97') ? [dep + '00', dep + '99'] : [dep + '000', dep + '999'];
  return fetchPrices(`echelle_geo__exact=commune&code_geo__greater=${lo}&code_geo__less=${hi}`, column);
}

// Ligne complète de statistiques (toute la période) d'un territoire ; scale : 'commune', 'departement' ou 'nation'
// (undefined si aucune vente)
export async function fetchTerritoryDetails(code, scale = 'commune') {
  const { data: [row] } = await cachedJson(`${API_URL}?echelle_geo__exact=${scale}&code_geo__exact=${code}&page_size=1`);
  return row;
}

export const fetchCommuneDetails = code => fetchTerritoryDetails(code, 'commune');

// Statistiques mensuelles d'un territoire, du plus ancien au plus récent : [{ annee_mois: '2021-07', ... }]
export async function fetchMonthly(code, scale = 'commune') {
  const { data } = await cachedJson(`${MONTHLY_API_URL}?echelle_geo__exact=${scale}&code_geo__exact=${code}&annee_mois__sort=asc&page_size=200`);
  return data;
}
