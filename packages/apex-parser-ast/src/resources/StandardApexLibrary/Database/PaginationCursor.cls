/**
 * This class represents a pagination cursor that can traverse a SOQL query result set. It contains methods that fetch rows by page. It also contains a method that returns the total number of rows in the result set.
 * Usage
 * A pagination cursor is created when a SOQL query is executed on a Database.getPaginationCursor() or a Database.getPaginationCursorWithBinds() call. When the SOQL query is invoked, the corresponding rows are returned from the pagination cursor.
 * Use a pagination cursor for traversing human-viewable data, such as a list of records in a UI. The maximum number of rows per pagination cursor is 100,000, regardless of whether the operation is synchronous or asynchronous.
 * For a comparison between pagination cursors and standard cursors, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_cursors.htm" target="_blank" title="HTML (New Window)">Apex Cursors</a> in the Apex Developer Guide.
 * For Apex pagination cursor limits, see <a class="xref" href="https://developer.salesforce.com/docs/atlas.en-us.262.0.apexcode.meta/apexcode/apex_gov_limits.htm" target="_blank">Execution Governors and Limits </a>in the Apex Developer Guide.
 */
global class PaginationCursor {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Fetches the number of deleted rows within the specified range. The method counts only rows deleted after the creation of the pagination cursor. Calling the PaginationCursor.fetchDeleted() method counts against the SOQL query limit, and the rows fetched count against the SOQL query row limit.
     */
    global Integer fetchDeleted(Integer start, Integer pageSize) { return 0; }

    /**
     * Fetches a page of rows from the result set. By default, the method skips rows deleted after the creation of the pagination cursor. The method also returns information used to fetch the next page. Calling the PaginationCursor.fetchPage() method counts against the SOQL query limit, and the rows fetched count against the SOQL query row limit.
     * @return Contains the rows for the current page and the information used to fetch the next page.
     */
    global Database.CursorFetchResult fetchPage(Integer start, Integer pageSize) { return null; }

    /**
     * Gets the total number of rows in the SOQL query result set.
     */
    global Integer getNumRecords() { return 0; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }

    global enum DeleteFilter {
        DELETED_ROWS_ONLY,
        NO_DELETED_ROWS,
        NO_DELETED_SHARING_ROWS,
        NO_FILTER

    }
}