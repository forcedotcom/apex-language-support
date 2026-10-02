/**
 * Options that narrow record and article suggestion results returned from a call to System.Search.suggest(String, String, Search.SuggestionOption).
 */
global class SuggestionOption {
    Object SuggestionOption() { return null; }

    global Boolean equals(Object obj) { return false; }

    global Integer hashCode() { return 0; }

    global void setFilter(Object filter) { }

    /**
     * The maximum number of record or article suggestions to retrieve.
     * <p>Usage
     * By default, the System.Search.suggest(String, String, Search.SuggestionOption) method returns the 5 most relevant results. However, if your query is broad, it could match more than 5 results. If Search.SuggestionResults.hasMoreResults() returns true, there are more than 5 results. To retrieve them, call setLimit(Integer) to increase the number of suggestions results.
     * Search.SuggestionOption option = new Search.SuggestionOption();
     * option.setLimit(10);
     * Search.suggest('my query', 'mySObjectType', option);
     */
    global void setLimit(Integer limit) { }

    global String toString() { return null; }
}