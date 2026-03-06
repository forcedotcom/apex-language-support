/**
 * Attribute-based refinement with minimum or maximum numeric values for product search.
 */
global class RangeRefinementInput {

  /**
   * Type of search attribute for the refinement. Values are: Custom Standard PricebookEntry
   */
  global String attributeType;

  /**
   * Maximum value for range refinement.
   */
  global String max;

  /**
   * Minimum value for range refinement.
   */
  global String min;

  /**
   * Developer name of the attribute for the refinement.
   */
  global String nameOrId;

  /**
   * Type of the refinement. Values is: Range
   */
  global String type;

}