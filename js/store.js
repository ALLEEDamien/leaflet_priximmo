// État partagé : prix médians au m² indexés par code (départements : 2-3 caractères, communes : 5),
// type de bien actuellement filtré et échelles de couleurs
import { createScale } from './colors.js';
import { DEFAULT_TYPE, PROPERTY_TYPES } from './config.js';

export const prices = {};
export const addPrices = more => Object.assign(prices, more);
export const resetPrices = () => { for (const k of Object.keys(prices)) delete prices[k]; };

export const filter = { type: DEFAULT_TYPE };
export const currentType = () => PROPERTY_TYPES[filter.type];

// Une échelle pour les départements, une pour les communes du département sélectionné (null sinon)
export const scales = { departments: createScale([]), communes: null };
export const setDepartmentScale = values => { scales.departments = createScale(values); };
export const setCommuneScale = values => { scales.communes = values ? createScale(values, { spread: true }) : null; };
// Échelle de ce que l'utilisateur regarde : les communes si un département est sélectionné
export const activeScale = () => scales.communes ?? scales.departments;
