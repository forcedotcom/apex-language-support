/**
 * Abstract base class for the QueryContext and SearchContext classes.
 */
global abstract class ReadContext {
    /**
     * Maximum number of rows that the query can return.
     * Integer
     */
    global Integer maxResults { get; set; }
    /**
     * Describes the external system’s tables to query.
     * List<DataSource.Table>
     */
    global List metadata { get; set; }
    /**
     * The starting row offset into the query’s result set. Used for client-driven paging.
     * Integer
     */
    global Integer offset { get; set; }
    global Integer startRowNumZeroOffset { get; set; }

    global virtual Boolean equals(Object obj) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}