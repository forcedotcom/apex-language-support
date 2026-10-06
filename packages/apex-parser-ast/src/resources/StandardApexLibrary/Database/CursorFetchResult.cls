/**
 * This class encapsulates the result of a PaginationCursor.fetchPage() call. It contains methods that get the rows for the current page, the start index of the next page, and the number of deleted rows skipped during the fetch operation. It also contains a method that indicates whether the pagination cursor has fetched all available rows in the result set.
 */
global class CursorFetchResult {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Gets the start index required to fetch the next page of results. Use this value as the start parameter in the call to PaginationCursor.fetchPage(start, pageSize) to fetch the next page of results.
     */
    global Integer getNextIndex() { return 0; }

    /**
     * Gets the number of deleted rows that were skipped during the fetch operation.
     */
    global Integer getNumDeletedRecords() { return 0; }

    /**
     * Gets the list of records that comprise the rows on the current page.
     * @return The list of sObjects from the SOQL query for the current page.
     */
    global List getRecords() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Returns true if the pagination cursor has reached either the page size passed to PaginationCursor.fetchPage(start, pageSize) or the end of the result set. Otherwise returns false.
     */
    global Boolean isDone() { return false; }

    global override virtual String toString() { return null; }
}