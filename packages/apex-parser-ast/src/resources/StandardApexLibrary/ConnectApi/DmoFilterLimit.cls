/**
 * Represents a DMO filter limit output.
 */
global class DmoFilterLimit {

  /**
   * Name of the attribute for the DMO filter limit.
   */
  global String attributeName;

  /**
   * Max number of values for the DMO filter limit.
   */
  global Integer maxNumberOfValues;

  /**
   * The sort order for filtering. FilterSortOrderAsc FilterSortOrderDesc
   */
  global FilterSortOrderEnum order;

}