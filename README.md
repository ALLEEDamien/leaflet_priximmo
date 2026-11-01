# Prix immobiliers en France

Carte interactive des prix de l'immobilier au m² en France, des départements jusqu'aux communes, construite avec **Leaflet** à partir de données ouvertes de l'État.

Cliquez sur un département pour colorer ses communes, filtrez par type de bien, consultez le classement des communes les plus ou moins chères, puis ouvrez la fiche détaillée d'une commune avec ses graphiques.

## Fonctionnalités

- **Carte des départements** (métropole et DOM) colorée selon le prix médian au m², avec une légende.
- **Communes d'un département** : un clic sur un département, ou une recherche, zoome dessus et colore ses communes.
- **Barre de recherche** de département, avec suggestions (nom ou code, sans tenir compte des accents) et navigation au clavier.
- **Filtre par type de bien** : tous (appartements et maisons), appartements, maisons, locaux commerciaux.
- **Échelle de couleurs dynamique**, recalculée selon le type de bien et le département affiché.
- **Classement** des 5 communes les plus chères ou les moins chères du département.
- **Panneau d'une commune** : prix médian, comparaison avec le département, ventes par type de bien.
- **Fenêtre de détail** : chiffres clés, évolution mensuelle du prix (commune, département, France), ventes par mois, répartition par type de bien, comparaison, et tableau des données.
- **Chargement à la demande** avec cache dans le navigateur : on ne télécharge que ce que l'utilisateur consulte, une seule fois.

## Données et sources

| Donnée | Source |
|---|---|
| Prix médians au m² (par département, commune, mois) | [Statistiques DVF](https://www.data.gouv.fr/fr/datasets/statistiques-dvf/), issues des Demandes de valeurs foncières (Etalab, data.gouv.fr), via l'API tabulaire de data.gouv.fr |
| Contours des départements et des communes | [gregoiredavid/france-geojson](https://github.com/gregoiredavid/france-geojson) (versions simplifiées) |
| Fond de carte (style OSM Bright) | [OpenFreeMap](https://openfreemap.org), données [OpenMapTiles](https://openmaptiles.org/) et © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright) |

Les prix sont des **médianes** de prix de vente au m² sur la période disponible (de juillet 2021 à juin 2026 pour les statistiques mensuelles). Pour une petite commune, elles reposent parfois sur très peu de ventes et peuvent varier fortement d'un mois à l'autre.

## Technologies

- [Leaflet](https://leafletjs.com/) 1.9 pour la carte, et [MapLibre GL](https://maplibre.org/) avec son plugin pour Leaflet pour le fond de carte vectoriel
- JavaScript natif en modules ES, sans framework ni étape de compilation
- [Tailwind CSS](https://tailwindcss.com/) 3 pour le style
- Graphiques en SVG écrits à la main (aucune bibliothèque de graphiques)
- Un petit serveur Python (`server.py`) pour le développement local

## Lancer le projet

Prérequis : Python 3 (pour le serveur local) et, seulement si vous modifiez le style, Node.js.

```bash
python server.py        # puis ouvrir http://localhost:8000
```

Un serveur est nécessaire : ouvrir `index.html` directement dans le navigateur ne fonctionne pas (modules ES, appels à des API, fond de carte). `server.py` accepte un port en argument (`python server.py 3000`).

### Modifier le style

Le CSS compilé (`css/style.css`) est fourni. Pour le régénérer après une modification de `css/input.css` ou des classes Tailwind :

```bash
npm install
npm run build      # compilation unique
npm run watch      # recompilation à chaque sauvegarde
```

## Structure du projet

```
index.html           structure de la page
server.py            serveur local (fichiers statiques + identifiant de session)
css/input.css        styles Tailwind (source)
css/style.css        CSS compilé
js/
  main.js            point d'entrée, assemble les modules
  config.js          URLs des sources, types de bien, paramètres du cache
  api.js             accès aux données (contours GeoJSON, prix DVF)
  cache.js           cache navigateur (Cache API)
  store.js           état partagé (prix, filtre, échelles)
  colors.js          échelles de couleurs
  map.js             création de la carte et du fond
  controls.js        encadré de survol et légende
  choropleth.js      couches des départements et des communes
  searchbar.js       barre de recherche
  filters.js         filtre par type de bien
  ranking.js         classement des communes
  panel.js           panneau d'une commune
  detail.js          fenêtre de détail d'une commune
  charts.js          graphiques SVG
  utils.js           fonctions utilitaires
```

Chaque module a une seule responsabilité et ne communique avec les autres que par ses imports et exports.

## Comment ça marche

- **Chargement à la demande** : au démarrage, seuls les contours des départements et leurs 97 prix sont chargés. Les communes d'un département, leurs prix et les statistiques détaillées ne sont demandés qu'à la sélection.
- **Cache** : chaque réponse est conservée 30 jours dans le cache du navigateur. `server.py` expose `/__session`, un identifiant différent à chaque lancement du serveur : quand il change, le cache est vidé. Un simple rechargement de la page ne le vide pas.
- **Échelle des départements** : 7 couleurs réparties par quantiles, donc à peu près autant de départements par couleur.
- **Échelle des communes** : 7 classes de largeur égale. Le bas est fixé à 1 000 €/m² pour tous les départements. Le haut est la moyenne des 5 prix les plus élevés moins 50 €, arrondie à la dizaine. Les prix au-delà prennent la couleur la plus foncée.

## Limites connues

- Le fichier de contours des communes peut être un peu en retard sur les fusions de communes récentes : les communes concernées s'affichent en gris.
- Mayotte n'est pas disponible dans les contours de départements utilisés.
- Paris est affiché comme une seule commune (pas par arrondissement).
- Il n'y a pas de bouton pour revenir à la vue France après avoir sélectionné un département, sauf à recharger la page.
