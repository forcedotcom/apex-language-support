/**
 * Options that narrow record and article suggestion results returned from a call to System.Search.suggest( String , String , Search.SuggestionOption) .
 */
public class SuggestionOption {

  /**
   * Set filters that narrow Salesforce Knowledge article results in a call to System.Search.suggest( String , String , Search.SuggestionOption) .
   * @param knowledgeSuggestionFilter An object containing filters that narrow the search results.
   */
  public void setFilter(Search.KnowledegeSuggestionFilter knowledgeSuggestionFilter) {}

  /**
   * The maximum number of record or article suggestions to retrieve.
   * @param limit The maximum number of record or article suggestions to retrieve.
   */
  public void setLimit(Integer limit) {}

}