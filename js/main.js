// Point d'entrée : assemble les modules
import { fetchCommunePrices, fetchDepartmentPrices, fetchDepartmentsGeo } from './api.js';
import { createChoropleth } from './choropleth.js';
import { addInfoControl, addLegend } from './controls.js';
import { initDetail, openDetail } from './detail.js';
import { initFilters } from './filters.js';
import { initMap } from './map.js';
import { initPanel, refreshPanel, showCommune } from './panel.js';
import { hideRanking, initRanking, showRanking } from './ranking.js';
import { initSearchbar } from './searchbar.js';
import { addPrices, currentType, filter, resetPrices, setCommuneScale, setDepartmentScale } from './store.js';

const map = initMap();
const info = addInfoControl(map);
const legend = addLegend(map);
initDetail();
initPanel({
  onDetail: (commune, depCode) => openDetail(commune, { code: depCode, nom: choropleth.selected()?.nom ?? depCode })
});

const choropleth = createChoropleth(map, info, {
  onCommuneClick: showCommune,
  onScaleChange: updateLegend,
  onCommunesChange: updateRanking
});
initRanking(code => choropleth.focusCommune(code));

// Classement : visible seulement quand les communes d'un département sont affichées
function updateRanking() {
  const dep = choropleth.selected();
  const items = choropleth.communeItems();
  if (dep && items.length) showRanking(dep.nom, items);
  else hideRanking();
}

// Légende : type de bien, portée de l'échelle (France ou département) et classes
function updateLegend() {
  const dep = choropleth.selected();
  legend.setTitle(`${currentType().label} · €/m²`, dep ? `Communes : ${dep.nom}` : 'Départements de France');
  legend.update();
}

// Changement de type de bien : recharge les prix (départements + communes affichées), recalcule les échelles, recolore
async function applyFilter(typeId) {
  filter.type = typeId;
  const { column } = currentType();
  const dep = choropleth.selected();
  try {
    const [departmentPrices, communePrices] = await Promise.all([
      fetchDepartmentPrices(column),
      dep ? fetchCommunePrices(dep.code, column) : {}
    ]);
    if (filter.type !== typeId) return; // l'utilisateur a re-cliqué entre-temps
    resetPrices();
    addPrices(departmentPrices);
    addPrices(communePrices);
    setDepartmentScale(Object.values(departmentPrices));
    if (dep) setCommuneScale(Object.values(communePrices));
    choropleth.restyle();
    updateLegend();
    updateRanking();
    refreshPanel();
  } catch (err) {
    console.error(err);
    info.showMessage('Chargement des prix impossible');
  }
}

try {
  const [geo, departmentPrices] = await Promise.all([fetchDepartmentsGeo(), fetchDepartmentPrices(currentType().column)]);
  addPrices(departmentPrices);
  setDepartmentScale(Object.values(departmentPrices));
  const layers = choropleth.addDepartments(geo);
  updateLegend();
  initSearchbar(layers, choropleth.selectDepartment);
  initFilters(applyFilter);
} catch (err) {
  console.error(err);
  info.showMessage('Chargement des départements impossible');
}
