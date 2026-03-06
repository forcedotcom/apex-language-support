/**
 * Order by parameter for object search.
 */
global class SearchOrderBy {

  /**
   * Field to sort the results by.
   */
  global String field;

  /**
   * Order direction. Values are: Ascending Descending Default value is Ascending .
   */
  global ConnectApi.SearchOrder order;

  /**
   * Null value order. Values are: Firsts —Null values are sorted first. Lasts —Null values are sorted last. Default value is Firsts .
   */
  global ConnectApi.OrderNulls orderNulls;

}