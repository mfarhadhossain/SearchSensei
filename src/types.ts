// src/types.ts

export interface SensitivityTerm {
  entity_type: string; // Category from the taxonomy
  text: string; // Detected entity text
  replace: string; // Placeholder for replacement
  abstract: string; // Abstracted version of the entity
}
