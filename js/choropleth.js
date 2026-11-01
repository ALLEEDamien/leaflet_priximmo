// Couches colorées de la carte : départements, puis communes du département sélectionné
import { fetchCommunePrices, fetchCommunesGeo } from './api.js';
import { NO_DATA_COLOR } from './colors.js';
import { addPrices, currentType, prices, scales, setCommuneScale } from './store.js';

// onCommuneClick(properties, codeDépartement) est appelé au clic sur une commune ;
// onScaleChange() quand l'échelle de couleurs (donc la légende) a changé ;
// onCommunesChange() quand les communes affichées changent (chargées ou retirées)
export function createChoropleth(map, info, { onCommuneClick, onScaleChange, onCommunesChange }) {
  let selectedCode = null;
  let selectedName = null;
  let departmentLayer = null;
  let communeLayer = null;

  // Département sélectionné : transparent (on voit ses communes) ; les autres s'estompent car la légende concerne les communes
  const departmentStyle = f => {
    if (f.properties.code === selectedCode) return { fillOpacity: 0, weight: 2, color: '#334155' };
    if (selectedCode) return { fillColor: NO_DATA_COLOR, weight: 1, color: '#fff', fillOpacity: .35 };
    return { fillColor: scales.departments.color(prices[f.properties.code]), weight: 1, color: '#fff', fillOpacity: .8 };
  };

  const communeStyle = f => ({ fillColor: scales.communes.color(prices[f.properties.code]), weight: .5, color: '#fff', fillOpacity: .85 });

  // Ajoute la couche des départements et renvoie ses couches (une par département)
  function addDepartments(geo) {
    departmentLayer = L.geoJSON(geo, {
      style: departmentStyle,
      onEachFeature: (f, l) => l.on({
        mouseover: e => { e.target.setStyle({ weight: 3, color: '#333' }); info.update(f.properties); },
        mouseout: e => { departmentLayer.resetStyle(e.target); info.update(); },
        click: e => selectDepartment(e.target)
      })
    }).addTo(map);
    return departmentLayer.getLayers();
  }

  // Sélection d'un département : zoom + coloration de ses communes avec une échelle propre à ce département
  async function selectDepartment(l) {
    const { code, nom } = l.feature.properties;
    selectedCode = code;
    selectedName = nom;
    setCommuneScale(null); // en attendant les prix des communes, la légende reste celle des départements
    onScaleChange();
    departmentLayer.setStyle(departmentStyle);
    if (communeLayer) { map.removeLayer(communeLayer); communeLayer = null; }
    onCommunesChange();
    map.fitBounds(l.getBounds());
    info.setHint('Survolez une commune');
    info.update(l.feature.properties);
    try {
      const column = currentType().column;
      const [geoC, firstPrices] = await Promise.all([fetchCommunesGeo(code, nom), fetchCommunePrices(code, column)]);
      if (selectedCode !== code) return; // l'utilisateur a changé de département entre-temps
      // le filtre a changé pendant le chargement : on récupère les prix du nouveau type
      const pricesC = column === currentType().column ? firstPrices : await fetchCommunePrices(code, currentType().column);
      if (selectedCode !== code) return;
      addPrices(pricesC);
      setCommuneScale(Object.values(pricesC));
      onScaleChange();
      communeLayer = L.geoJSON(geoC, {
        style: communeStyle,
        onEachFeature: (f, c) => c.on({
          mouseover: e => { e.target.setStyle({ weight: 2, color: '#333' }); info.update(f.properties); },
          mouseout: e => { communeLayer.resetStyle(e.target); info.update(); },
          click: () => onCommuneClick(f.properties, code)
        })
      }).addTo(map);
      onCommunesChange();
    } catch (err) {
      console.error(err);
      info.showMessage(`Communes de ${nom} indisponibles`);
    }
  }

  // Recolore les couches existantes après un changement de prix ou d'échelle (filtre de type de bien)
  function restyle() {
    if (departmentLayer) departmentLayer.setStyle(departmentStyle);
    if (communeLayer) communeLayer.setStyle(communeStyle);
  }

  // Département sélectionné { code, nom } ou null
  const selected = () => (selectedCode ? { code: selectedCode, nom: selectedName } : null);

  // Communes affichées qui ont un prix pour le type de bien filtré : [{ code, nom, price }]
  const communeItems = () => (communeLayer ? communeLayer.getLayers() : [])
    .map(c => ({ code: c.feature.properties.code, nom: c.feature.properties.nom, price: prices[c.feature.properties.code] }))
    .filter(it => it.price != null);

  // Zoome sur une commune affichée et ouvre son panneau
  function focusCommune(code) {
    const layer = communeLayer?.getLayers().find(c => c.feature.properties.code === code);
    if (!layer) return;
    map.fitBounds(layer.getBounds(), { maxZoom: 12 });
    onCommuneClick(layer.feature.properties, selectedCode);
  }

  return { addDepartments, selectDepartment, restyle, selected, communeItems, focusCommune };
}
