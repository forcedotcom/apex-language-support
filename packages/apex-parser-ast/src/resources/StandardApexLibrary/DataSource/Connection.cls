/**
 * Extend this class to enable your Salesforce org to sync the external system’s schema and to handle queries, searches, and write operations (upsert and delete) of the external data. This class extends the DataSourceUtil class and inherits its methods.
 */
global class Connection {

  global Connection() {}

  /**
   * Invoked when external object records are deleted via the Salesforce user interface, APIs, or Apex.
   * @param deleteContext Contains context information about the delete request.
   * @return List<DataSource.DeleteResult>
   */
  global List<DataSource.DeleteResult> deleteRows(DataSource.DeleteContext deleteContext) {}

  /**
   * Invoked by a SOQL query of an external object. A SOQL query is generated and executed when a user visits an external object’s list view or record detail page in Salesforce. Returns the results of the query.
   * @param queryContext Represents the query to run against a data table.
   * @return DataSource.TableResult
   */
  global DataSource.TableResult query(DataSource.QueryContext queryContext) {}

  /**
   * Invoked by a SOSL query of an external object or when a user performs a Salesforce global search that also searches external objects. Returns the results of the query.
   * @param searchContext Represents the query to run against an external data table.
   * @return List<DataSource.TableResult>
   */
  global List<DataSource.TableResult> search(DataSource.SearchContext searchContext) {}

  /**
   * Invoked when an administrator clicks Validate and Sync on the external data source detail page. Returns a list of tables that describe the external system’s schema.
   * @return List<DataSource.Table>
   */
  global List<DataSource.Table> sync() {}

  /**
   * Invoked when external object records are created or updated via the Salesforce user interface, APIs, or Apex.
   * @param upsertContext Contains context information about the upsert request.
   * @return List<DataSource.UpsertResult>
   */
  global List<DataSource.UpsertResult> upsertRows(DataSource.UpsertContext upsertContext) {}

  global Object clone() {}

  global void logWarning(String msg) {}

  global void throwException(String msg) {}

}