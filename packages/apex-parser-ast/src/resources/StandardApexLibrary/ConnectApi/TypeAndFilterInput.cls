/**
 * Represents the wrapper for logical comparison filters.
 */
global class TypeAndFilterInput {

  global TypeAndFilterInput() {}

  /**
   * Filter for the entity.
   */
  global BaseComparisonInputRepresentation filter;

  /**
   * Name of the entity.
   */
  global String type;

  global Object clone() {}

}