/**
 * An instance of SearchContext is provided to the search method on your DataSource.Connection class. The instance corresponds to a search or SOSL request.
 */
global class SearchContext extends DataSource.ReadContext {
    global Integer maxResults { get; set; }
    global List metadata { get; set; }
    global Integer offset { get; set; }
    /**
     * The user-entered search string as a case-sensitive single phrase, with all non-alphanumeric characters removed.
     * <p>String
     */
    global String searchPhrase { get; set; }
    global Integer startRowNumZeroOffset { get; set; }
    /**
     * List of queries and their details. The details represent the FROM, ORDER BY, SELECT, and WHERE clauses in each SOQL or SOSL query.
     * <p>List<DataSource.TableSelection>
     */
    global List tableSelections { get; set; }

    /**
     * Creates an instance of the SearchContext class.
     */
    global Object SearchContext() { return null; }

    /**
     * Creates an instance of the SearchContext class with the specified parameter values.
     */
    global Object SearchContext(List metadata, Integer offset, Integer maxResults, List tableSelections, String searchPhrase) { return null; }

    global override Boolean equals(Object obj) { return false; }

    global override Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}