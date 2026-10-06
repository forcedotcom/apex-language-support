/**
 * Extend this class to enable your Salesforce org to sync the external system’s schema and to handle queries, searches, and write operations (upsert and delete) of the external data. This class extends the DataSourceUtil class and inherits its methods.
 * Usage
 * Your DataSource.Connection and DataSource.Provider classes compose a custom adapter for Salesforce Connect.
 * Changing the sync method on the DataSource.Connection class doesn’t automatically resync any external objects.
 * Example
 * global class SampleDataSourceConnection extends DataSource.Connection {
 *     global SampleDataSourceConnection(DataSource.ConnectionParams connectionParams) {
 *     }
 *
 *     override global List<DataSource.Table> sync() {
 *         List<DataSource.Table> tables = new List<DataSource.Table>();
 *         List<DataSource.Column> columns;
 *         columns = new List<DataSource.Column>();
 *         columns.add(DataSource.Column.text('Name', 255));
 *         columns.add(DataSource.Column.text('ExternalId', 255));
 *         columns.add(DataSource.Column.url('DisplayUrl'));
 *         tables.add(DataSource.Table.get('Sample', 'Title', columns));
 *         return tables;
 *     }
 *
 *     override global DataSource.TableResult query(DataSource.QueryContext c) {
 *         return DataSource.TableResult.get(c, DataSource.QueryUtils.process(c, getRows()));
 *     }
 *
 *     override global List<DataSource.TableResult> search(DataSource.SearchContext c) {
 *         List<DataSource.TableResult> results = new List<DataSource.TableResult>();
 *         for (DataSource.TableSelection tableSelection : c.tableSelections) {
 *             results.add(DataSource.TableResult.get(tableSelection, getRows()));
 *         }
 *         return results;
 *     }
 *
 *     // Helper method to get record values from the external system for the Sample table.
 *     private List<Map<String, Object>> getRows () {
 *         // Get row field values for the Sample table from the external system via a callout.
 *         HttpResponse response = makeGetCallout();
 *         // Parse the JSON response and populate the rows.
 *         Map<String, Object> m = (Map<String, Object>)JSON.deserializeUntyped(
 *                 response.getBody());
 *         Map<String, Object> error = (Map<String, Object>)m.get('error');
 *         if (error != null) {
 *             throwException(string.valueOf(error.get('message')));
 *         }
 *         List<Map<String,Object>> rows = new List<Map<String,Object>>();
 *         List<Object> jsonRows = (List<Object>)m.get('value');
 *         if (jsonRows == null) {
 *             rows.add(foundRow(m));
 *         } else {
 *             for (Object jsonRow : jsonRows) {
 *                 Map<String,Object> row = (Map<String,Object>)jsonRow;
 *                 rows.add(foundRow(row));
 *             }
 *         }
 *         return rows;
 *     }
 *
 *     global override List<DataSource.UpsertResult> upsertRows(DataSource.UpsertContext
 *             context) {
 *        if (context.tableSelected == 'Sample') {
 *            List<DataSource.UpsertResult> results = new List<DataSource.UpsertResult>();
 *            List<Map<String, Object>> rows = context.rows;
 *
 *            for (Map<String, Object> row : rows){
 *               // Make a callout to insert or update records in the external system.
 *               HttpResponse response;
 *               // Determine whether to insert or update a record.
 *               if (row.get('ExternalId') == null){
 *                  // Send a POST HTTP request to insert new external record.
 *                  // Make an Apex callout and get HttpResponse.
 *                  response = makePostCallout(
 *                      '{"name":"' + row.get('Name') + '","ExternalId":"' +
 *                      row.get('ExternalId') + '"');
 *               }
 *               else {
 *                  // Send a PUT HTTP request to update an existing external record.
 *                  // Make an Apex callout and get HttpResponse.
 *                  response = makePutCallout(
 *                      '{"name":"' + row.get('Name') + '","ExternalId":"' +
 *                      row.get('ExternalId') + '"',
 *                      String.valueOf(row.get('ExternalId')));
 *               }
 *
 *               // Check the returned response.
 *               // First, deserialize it.
 *               Map<String, Object> m = (Map<String, Object>)JSON.deserializeUntyped(
 *                       response.getBody());
 *               if (response.getStatusCode() == 200){
 *                   results.add(DataSource.UpsertResult.success(
 *                           String.valueOf(m.get('id'))));
 *               }
 *               else {
 *                  results.add(DataSource.UpsertResult.failure(
 *                                  String.valueOf(m.get('id')),
 *                      'The callout resulted in an error: ' +
 *                      response.getStatusCode()));
 *               }
 *            }
 *            return results;
 *        }
 *        return null;
 *     }
 *
 *     global override List<DataSource.DeleteResult> deleteRows(DataSource.DeleteContext
 *             context) {
 *        if (context.tableSelected == 'Sample'){
 *            List<DataSource.DeleteResult> results = new List<DataSource.DeleteResult>();
 *            for (String externalId : context.externalIds){
 *               HttpResponse response = makeDeleteCallout(externalId);
 *               if (response.getStatusCode() == 200){
 *                  results.add(DataSource.DeleteResult.success(externalId));
 *               }
 *               else {
 *                  results.add(DataSource.DeleteResult.failure(externalId,
 *                              'Callout delete error:'
 *                              + response.getBody()));
 *               }
 *            }
 *            return results;
 *        }
 *        return null;
 *      }
 *
 *     // Helper methods
 *
 *     // Make a GET callout
 *      private static HttpResponse makeGetCallout() {
 *          HttpResponse response;
 *          // Make callout
 *          // ...
 *          return response;
 *      }
 *
 *      // Populate a row based on values from the external system.
 *      private Map<String,Object> foundRow(Map<String,Object> foundRow) {
 *         Map<String,Object> row = new Map<String,Object>();
 *         row.put('ExternalId', string.valueOf(foundRow.get('Id')));
 *         row.put('DisplayUrl', string.valueOf(foundRow.get('DisplayUrl')));
 *         row.put('Name', string.valueOf(foundRow.get('Name')));
 *         return row;
 *     }
 *
 *      // Make a POST callout
 *      private static HttpResponse makePostCallout(String jsonBody) {
 *          HttpResponse response;
 *          // Make callout
 *          // ...
 *          return response;
 *      }
 *
 *      // Make a PUT callout
 *      private static HttpResponse makePutCallout(String jsonBody, String externalID) {
 *          HttpResponse response;
 *          // Make callout
 *          // ...
 *          return response;
 *      }
 *
 *      // Make a DELETE callout
 *      private static HttpResponse makeDeleteCallout(String externalID) {
 *          HttpResponse response;
 *          // Make callout
 *          // ...
 *          return response;
 *      }
 * }
 */
global abstract class Connection extends DataSource.DataSourceUtil {
    global Connection() { }

    /**
     * Invoked when external object records are deleted via the Salesforce user interface, APIs, or Apex.
     * @return The results of the delete operation.
     */
    global virtual List deleteRows(DataSource.DeleteContext deleteContext) { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global void logWarning(String msg) { }

    /**
     * Invoked by a SOQL query of an external object. A SOQL query is generated and executed when a user visits an external object’s list view or record detail page in Salesforce. Returns the results of the query.
     */
    global virtual DataSource.TableResult query(DataSource.QueryContext queryContext) { return null; }

    /**
     * Invoked by a SOSL query of an external object or when a user performs a Salesforce global search that also searches external objects. Returns the results of the query.
     */
    global virtual List search(DataSource.SearchContext searchContext) { return null; }

    /**
     * Invoked when an administrator clicks Validate and Sync on the external data source detail page. Returns a list of tables that describe the external system’s schema.
     * @return Each returned table can be used to create an external object in Salesforce. On the Validate External Data Source page, the administrator views the list of returned tables and selects which tables to sync. When the administrator clicks Sync, an external object is created for each selected table. Each column within the selected tables also becomes a field in the external object.
     */
    global abstract List sync();

    global void throwException(String msg) { }

    global override virtual String toString() { return null; }

    /**
     * Invoked when external object records are created or updated via the Salesforce user interface, APIs, or Apex.
     * @return The results of the upsert operation.
     */
    global virtual List upsertRows(DataSource.UpsertContext upsertContext) { return null; }
}