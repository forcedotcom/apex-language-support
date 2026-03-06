/**
 * Represents the limiting expression input for an activation.
 */
global class AttributeLimitingExpressionInput {

  /**
   * Name of the attribute.
   */
  global String attributeName;

  /**
   * Name of the entity.
   */
  global String entityName;

  /**
   * The sort order for filtering. FilterSortOrderAsc FilterSortOrderDesc
   */
  global FilterSortOrderEnum order;

  /**
   * Query path configuration input.
   */
  global List < ConnectApi.QueryPathInputConfig > queryPathConfig;

  /**
   * Type of attribute.
   */
  global String type;

}