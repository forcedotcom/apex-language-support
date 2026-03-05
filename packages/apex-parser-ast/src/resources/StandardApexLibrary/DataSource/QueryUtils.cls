/**
 * Contains helper methods to locally filter, sort, and apply limit and offset clauses to data rows. This helper class is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
 */
global class QueryUtils {

  /**
   * Returns a subset of data rows after locally applying limit and offset clauses from the query. This helper method is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
   * @param queryContext Represents the query to run against a data table.
   * @param rows Rows of data.
   * @return List<Map<String,Object>>
   */
  public static List<Map<String,Object>> applyLimitAndOffset(DataSource.QueryContext queryContext, List<Map<String,Object>> rows) {}

  /**
   * Returns a subset of data rows after locally ordering and applying filters from the query. This helper method is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
   * @param queryContext queryContext
   * @param rows Rows of data.
   * @return List<Map<String,object>>
   */
  public static List<Map<String,object>> filter(DataSource.QueryContext queryContext, List<Map<String,Object>> rows) {}

  /**
   * Returns data rows after locally filtering, sorting, ordering, and applying limit and offset clauses from the query. This helper method is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
   * @param queryContext Represents the query to run against a data table.
   * @param rows Rows of data.
   * @return List<Map<String,object>>
   */
  public static List<Map<String,object>> process(DataSource.QueryContext queryContext, List<Map<String,Object>> rows) {}

  /**
   * Returns data rows after locally sorting and applying the order from the query. This helper method is provided for your convenience during early development and tests, but it isn’t supported for use in production environments.
   * @param queryContext Represents the query to run against a data table.
   * @param rows Rows of data.
   * @return List<Map<String,ject>>
   */
  public static List<Map<String,ject>> sort(DataSource.QueryContext queryContext, List<Map<String,object>> rows) {}

}