/**
 * The applied order for object search.
 */
global class SearchAppliedOrderBy {

  /**
   * Field used to sort the results.
   */
  global String field;

  /**
   * Order direction. Values are: Ascending Descending
   */
  global ConnectApi.OrderDirection order;

  /**
   * Null value order. Values are: Firsts —Null values are sorted first. Lasts —Null values are sorted last.
   */
  global ConnectApi.OrderNulls orderNulls;

}