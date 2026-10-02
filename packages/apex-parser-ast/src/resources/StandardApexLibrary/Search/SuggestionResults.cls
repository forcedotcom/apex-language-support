/**
 * Wraps the results returned by the Search.suggest(String, String, Search.SuggestionOption) method.
 */
global class SuggestionResults {
    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns a list of SuggestionResult objects from the response to a call to Search.suggest(String, String, Search.SuggestionOption).
     */
    global List getSuggestionResults() { return null; }

    /**
     * Indicates whether a call to System.Search.suggest(String, String, Search.SuggestionOption) has more results available than were returned.
     * <p>Usage
     * If a limit isn’t specified, 5 records are returned in calls to System.Search.suggest(String, String, Search.SuggestionOption). If there are more suggested records than the limit specified, a call to hasMoreResults() returns true.
     */
    global Boolean hasMoreResults() { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}