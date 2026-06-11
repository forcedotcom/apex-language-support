/**
 * Wraps the results returned by the Search.suggest(​String, String , Search.SuggestionOption) method.
 */
global class SuggestionResults {

  global SuggestionResults() {}

  /**
   * Returns a list of SuggestionResult objects from the response to a call to Search.suggest( String , String , Search.SuggestionOption) .
   * @return List<Search.SuggestionResult>
   */
  global List<Search.SuggestionResult> getSuggestionResults() {}

  /**
   * Indicates whether a call to System.Search.suggest( String , String , Search.SuggestionOption) has more results available than were returned.
   * @return Boolean
   */
  global Boolean hasMoreResults() {}

  global Object clone() {}

}