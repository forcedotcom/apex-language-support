/**
 * Contains methods to fetch records and to get the number of cursor rows returned from a SOQL query.
 * Usage
 * A cursor is created when a SOQL query is executed on a Database.getCursor() or a Database.getCursorWithBinds() call. When the SOQL query is invoked, the corresponding rows are returned from the cursor. The maximum number of rows per cursor is 50 million, regardless of the operation being synchronous or asynchronous.
 * Example
 * public with sharing class QueryChunkingQueueable implements Queueable {
 *     private Database.Cursor locator;
 *     private Integer position;
 *
 *     public QueryChunkingQueueable() {
 *         locator = Database.getCursor(
 *             'SELECT Id FROM Contact WHERE LastActivityDate = LAST_N_DAYS:400',
 *             AccessLevel.USER_MODE);
 *         position = 0;
 *     }
 *
 *     public void execute(QueueableContext ctx) {
 *         Integer remainingRows = locator.getNumRecords() - position;
 *         if (remainingRows == 0) {
 *             return; // Nothing to do
 *         }
 *
 *         // Take the minimum of batch size and remaining rows to avoid over-fetching
 *         Integer fetchSize = Math.min(200, remainingRows);
 *
 *         List<Contact> scope = locator.fetch(position, 200);
 *         position += scope.size();
 *         // do something, like archive or delete the scope list records
 *         if (position < locator.getNumRecords()) {
 *             // process the next chunk
 *             System.enqueueJob(this);
 *         }
 *     }
 * }
 */
global class Cursor {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Fetches cursor rows that correspond to the offset position and the specified record count. The maximum number of rows per cursor is 50 million, regardless of whether the operation is synchronous or asynchronous. Calling the Cursor.fetch() method counts against the SOQL query limit, and the rows fetched count against the SOQL query row limit. You can make a maximum of 100 Cursor.fetch() calls per transaction.
     * @return The list of sObjects from the SOQL query, starting from the specified position.
     */
    global List fetch(Integer start, Integer advanceBy) { return null; }

    /**
     * Gets the number of rows returned in an Apex cursor from a Cursor.fetch(position, count) operation.
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