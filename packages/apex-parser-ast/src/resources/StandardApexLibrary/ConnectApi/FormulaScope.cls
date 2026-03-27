/**
 * Formula scope for a target.
 */
global class FormulaScope {

  /**
   * Map of context values for the scope. Note In version 52.0 and later, use the contextValuesMap property.
   */
  global Map < String , String > contextValues;

  /**
   * Map of context values for the scope.
   */
  global Map < String , Object> contextValuesMap;

  /**
   * List of fields of the scope.
   */
  global List < String > fields;

  /**
   * Formula of the scope.
   */
  global String formula;

}