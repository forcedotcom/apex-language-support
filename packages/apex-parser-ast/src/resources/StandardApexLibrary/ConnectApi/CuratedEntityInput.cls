/**
 * Represents the input details for a curated entity.
 */
global class CuratedEntityInput {

  global CuratedEntityInput() {}

  /**
   * DMO label of the curated entity.
   */
  global String label;

  /**
   * DMO API name of the curated entity.
   */
  global String name;

  global Object clone() {}

}