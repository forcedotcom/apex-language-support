/**
 * An instance of QueryContext is provided to the query method on your DataSource.Connection class. The instance corresponds to a SOQL request.
 */
global class QueryContext extends DataSource.ReadContext {
    global Integer maxResults { get; set; }
    global List metadata { get; set; }
    global Integer offset { get; set; }
    /**
     * Query token that’s used for server-driven paging to determine and fetch the subsequent batch of results.
     * <p>String
     */
    global String queryMoreToken { get; set; }
    global Integer startRowNumZeroOffset { get; set; }
    /**
     * Query details that represent the FROM, ORDER BY, SELECT, and WHERE clauses in a SOQL or SOSL query.
     * <p>DataSource.TableSelection
     */
    global DataSource.TableSelection tableSelection { get; set; }

    global Object QueryContext() { return null; }

    global override Boolean equals(Object obj) { return false; }

    /**
     * Creates an instance of the QueryContext class.
     */
    global static DataSource.QueryContext get(List metadata, Integer startRowNumZeroOffset, Integer maxResults, DataSource.TableSelection tableSelection) { return null; }

    global override Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}