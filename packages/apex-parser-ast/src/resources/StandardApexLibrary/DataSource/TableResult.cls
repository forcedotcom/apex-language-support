/**
 * Contains the results of a search or query.
 */
global class TableResult {
    /**
     * errorMessage
     * String
     */
    global String errorMessage;
    /**
     * Query token that’s used for server-driven paging to determine and fetch the subsequent batch of results. This token is passed back to the Apex data source on subsequent queries in the queryMoreToken property on the QueryContext.
     * String
     */
    global String queryMoreToken;
    /**
     * Rows of data.
     * List<Map<String, Object>>
     */
    global List rows;
    /**
     * Whether the search or query was successful.
     * Boolean
     */
    global Boolean success;
    /**
     * Name of the table that was queried.
     * String
     */
    global String tableName;
    /**
     * The total number of rows that meet the query criteria, even when the external system is requested to return a smaller batch size.
     * Integer
     */
    global Integer totalSize;

    global Boolean equals(Object obj) { return false; }

    /**
     * Returns failed search or query results with the provided error message.
     * @return The returned TableResult has these property values.
     * Property Value
     * success false
     * errorMessage errorMessage
     * tableName null
     * rows null
     * rows.size() 0
     */
    global static DataSource.TableResult error(String errorMessage) { return null; }

    /**
     * Returns the subset of data rows that meet the query criteria, and the number of rows in the table, in a TableResult.
     */
    global static DataSource.TableResult get(DataSource.QueryContext c, List rows) { return null; }

    /**
     * Returns the subset of data rows that meet the query criteria, and the number of rows in the table, in a TableResult.
     */
    global static DataSource.TableResult get(DataSource.TableSelection tableSelection, List rows) { return null; }

    /**
     * Returns a subset of data rows in a TableResult with the provided property values.
     */
    global static DataSource.TableResult get(Boolean success, String errorMessage, String tableName, List rows) { return null; }

    /**
     * Returns a subset of data rows in a TableResult with the provided property values and the number of rows in the table.
     */
    global static DataSource.TableResult get(Boolean success, String errorMessage, String tableName, List rows, Integer totalSize) { return null; }

    global static DataSource.TableResult get(Boolean success, String errorMessage, String tableName, List rows, Integer totalSize, String queryMoreToken) { return null; }

    global Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}