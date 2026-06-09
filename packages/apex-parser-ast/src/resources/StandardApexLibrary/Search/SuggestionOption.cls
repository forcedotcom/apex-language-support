/**
 * Options that narrow record and article suggestion results returned from a call to System.Search.suggest( String , String , Search.SuggestionOption) .
 */
global class SuggestionOption {

  global SuggestionOption() {}

  /**
   * Set filters that narrow Salesforce Knowledge article results in a call to System.Search.suggest( String , String , Search.SuggestionOption) .
   * @param knowledgeSuggestionFilter An object containing filters that narrow the search results.
   */
  global void setFilter(Search.KnowledegeSuggestionFilter knowledgeSuggestionFilter) {}

  /**
   * The maximum number of record or article suggestions to retrieve.
   * @param limit The maximum number of record or article suggestions to retrieve.
   */
  global void setLimit(Integer limit) {}

  global Object clone() {}

}