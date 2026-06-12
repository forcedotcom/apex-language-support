/**
 * An entity's label.
 */
global class EntityLabel {

  global EntityLabel() {}

  /**
   * Localized singular label of the entity.
   */
  global String label;

  /**
   * Localized plural label of the entity.
   */
  global String labelPlural;

  global Object clone() {}

}