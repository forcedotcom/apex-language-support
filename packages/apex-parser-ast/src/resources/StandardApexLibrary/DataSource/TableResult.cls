/**
 * Contains the results of a search or query.
 */
public class TableResult {

  /**
   * errorMessage
   * @param errorMessage 
   * @return DataSource.TableResult
   */
  public static DataSource.TableResult error(String errorMessage) {}

  /**
   * Returns a subset of data rows in a TableResult with the provided property values and the number of rows in the table.
   * @param success Whether the search or query was successful.
   * @param errorMessage errorMessage
   * @param tableName Name of the table that was queried.
   * @param String 
   * @param rows Rows of data.
   * @param totalSize The total number of rows that meet the query criteria, even when the external system is requested to return a smaller batch size.
   * @return DataSource.TableResult
   */
  public static DataSource.TableResult get(Boolean success, String errorMessage, String tableName, List<Map< String, Object >> rows, Integer totalSize) {}

  /**
   * Returns a subset of data rows in a TableResult with the provided property values and the number of rows in the table.
   * @param success Whether the search or query was successful.
   * @param errorMessage errorMessage
   * @param tableName Name of the table that was queried.
   * @param String 
   * @param rows Rows of data.
   * @return DataSource.TableResult
   */
  public static DataSource.TableResult get(Boolean success, String errorMessage, String tableName, List<Map< String, Object >> rows) {}

  /**
   * Returns a subset of data rows in a TableResult with the provided property values and the number of rows in the table.
   * @param queryContext 
   * @param String 
   * @param rows Rows of data.
   * @return DataSource.TableResult
   */
  public static DataSource.TableResult get(DataSource.QueryContext queryContext, List<Map< String, Object >> rows) {}

  /**
   * Returns a subset of data rows in a TableResult with the provided property values and the number of rows in the table.
   * @param tableSelection 
   * @param String 
   * @param rows Rows of data.
   * @return DataSource.TableResult
   */
  public static DataSource.TableResult get(DataSource.TableSelection tableSelection, List<Map< String, Object >> rows) {}

}