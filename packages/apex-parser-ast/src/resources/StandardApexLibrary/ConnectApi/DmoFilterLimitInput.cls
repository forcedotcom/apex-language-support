/**
 * Represents the DMO filter limit input.
 */
global class DmoFilterLimitInput {

  /**
   * Name of the attribute.
   */
  global String attributeName;

  /**
   * Max number of values to return.
   */
  global Integer maxNumberOfValues;

  /**
   * The sort order for filtering. FilterSortOrderAsc FilterSortOrderDesc
   */
  global FilterSortOrderEnum order;

}