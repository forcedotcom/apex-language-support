/**
 * An instance of QueryContext is provided to the query method on your DataSource.Connection class. The instance corresponds to a SOQL request.
 */
public class QueryContext {

  /**
   * Creates an instance of the QueryContext class.
   * @param metadata List of table metadata that describes the external system’s tables to query.
   * @param offset Used for client-driven paging. Specifies the starting row offset into the query’s result set.
   * @param maxResults Used for client-driven paging. Specifies the maximum number of rows to return in each batch.
   * @param tableSelection Query details that represent the FROM , ORDER BY , SELECT , and WHERE clauses in a SOQL or SOSL query.
   * @return DataSource.QueryContext
   */
  public static DataSource.QueryContext get(List<DataSource.Table> metadata, Integer offset, Integer maxResults, DataSource.TableSelection tableSelection) {}

}