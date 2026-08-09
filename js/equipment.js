/** Home / gym equipment checklist helpers */

export const EQUIPMENT_KEYS = [
  "barbell",
  "plates",
  "rack",
  "flatBench",
  "dumbbells",
  "pullUpBar",
  "bands",
  "cables",
  "kettlebells",
  "machines",
  "landmine",
];

export const EQUIPMENT_LABELS = {
  barbell: "Barbell",
  plates: "Plates",
  rack: "Squat/bench rack or stands",
  flatBench: "Flat bench",
  dumbbells: "Dumbbells",
  pullUpBar: "Pull-up bar",
  bands: "Resistance bands",
  cables: "Cables / functional trainer",
  kettlebells: "Kettlebells",
  machines: "Machines (selectorized or plate)",
  landmine: "Landmine",
};

export function emptyEquipment() {
  return Object.fromEntries(EQUIPMENT_KEYS.map((k) => [k, false]));
}

export function fullEquipment() {
  return Object.fromEntries(EQUIPMENT_KEYS.map((k) => [k, true]));
}

/**
 * @param {"gym"|"home_barbell"|"db_only"|"minimal"} id
 * @returns {Record<string, boolean>}
 */
export function applyEquipmentPreset(id) {
  if (id === "gym") return fullEquipment();
  if (id === "home_barbell") {
    return {
      ...emptyEquipment(),
      barbell: true,
      plates: true,
      rack: true,
      flatBench: true,
      pullUpBar: true,
      dumbbells: true,
    };
  }
  if (id === "db_only") {
    return {
      ...emptyEquipment(),
      dumbbells: true,
      flatBench: true,
      bands: true,
      pullUpBar: true,
    };
  }
  if (id === "minimal") {
    return {
      ...emptyEquipment(),
      pullUpBar: true,
      bands: true,
    };
  }
  return fullEquipment();
}

/** null/undefined equipment = unrestricted (legacy commercial gym). */
export function isExerciseAvailable(ex, equipment) {
  if (equipment == null) return true;
  const req = ex?.requires;
  if (!req || !req.length) return true;
  return req.every((k) => equipment[k] === true);
}

export function filterExercises(exercises, equipment) {
  return (exercises || []).filter((ex) => isExerciseAvailable(ex, equipment));
}

export function missingEquipment(ex, equipment) {
  if (equipment == null) return [];
  const req = ex?.requires || [];
  return req.filter((k) => equipment[k] !== true);
}
