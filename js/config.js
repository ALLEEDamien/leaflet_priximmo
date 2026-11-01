// Constantes de configuration : sources de données et paramètres du cache

// Contours des départements (métropole + DOM) - dépôt gregoiredavid/france-geojson
export const DEPARTMENTS_GEOJSON_URL =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson';

// Contours simplifiés des communes, un dossier par département : 33-gironde/communes-33-gironde.geojson
export const COMMUNES_GEOJSON_BASE =
  'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/';

// Fond de carte : style OSM Bright (OpenMapTiles), servi gratuitement et sans clé par OpenFreeMap.
// Pour utiliser le style hébergé par MapTiler à la place :
// 'https://api.maptiler.com/maps/bright-v2/style.json?key=VOTRE_CLE'
export const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';

// API tabulaire data.gouv.fr sur le jeu « Statistiques DVF »
export const API_URL = 'https://tabular-api.data.gouv.fr/api/resources/851d342f-9c96-41c1-924a-11a7a7aae8a6/data/';

// Types de bien filtrables : colonne de prix médian €/m² et colonne du nombre de ventes
const type = (suffix, label) => ({
  label,
  column: `med_prix_m2_whole_${suffix}`, salesColumn: `nb_ventes_whole_${suffix}`, // toute la période
  monthlyColumn: `med_prix_m2_${suffix}`, monthlySalesColumn: `nb_ventes_${suffix}` // par mois
});
export const PROPERTY_TYPES = {
  all: type('apt_maison', 'Appartements et maisons'),
  appartement: type('appartement', 'Appartements'),
  maison: type('maison', 'Maisons'),
  local: type('local', 'Locaux commerciaux')
};
export const DEFAULT_TYPE = 'all';
// Même jeu, statistiques mensuelles (60 derniers mois) pour les communes, départements et la France
export const MONTHLY_API_URL = 'https://tabular-api.data.gouv.fr/api/resources/03fba98d-885b-43c0-8986-d299cabc29da/data/';
export const PAGE_SIZE = 200;

export const CACHE_NAME = 'immo-v1';
export const CACHE_TTL = 30 * 24 * 3600 * 1000; // 30 jours
