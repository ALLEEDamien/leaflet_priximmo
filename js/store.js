// État partagé : prix médians au m² indexés par code (départements : 2-3 caractères, communes : 5),
// type de bien actuellement filtré et échelles de couleurs
import { createScale } from './colors.js';
import { DEFAULT_TYPE, PROPERTY_TYPES } from './config.js';

export const prices = {};
export const sales = {}; // nombre de ventes par commune pour le type de bien filtré
export const addPrices = more => Object.assign(prices, more);
export const addSales = more => Object.assign(sales, more);
export const resetPrices = () => {
  for (const k of Object.keys(prices)) delete prices[k];
  for (const k of Object.keys(sales)) delete sales[k];
};

export const filter = { type: DEFAULT_TYPE };
export const currentType = () => PROPERTY_TYPES[filter.type];

// Une échelle pour les départements, une pour les communes du département sélectionné (null sinon)
export const scales = { departments: createScale([]), communes: null };
export const setDepartmentScale = values => { scales.departments = createScale(values); };
export const setCommuneScale = values => { scales.communes = values ? createScale(values, { spread: true }) : null; };
// Échelle de ce que l'utilisateur regarde : les communes si un département est sélectionné
export const activeScale = () => scales.communes ?? scales.departments;
