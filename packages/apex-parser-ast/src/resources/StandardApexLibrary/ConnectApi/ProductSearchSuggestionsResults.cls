/**
 * Product search suggestions results.
 */
global class ProductSearchSuggestionsResults {

  global ProductSearchSuggestionsResults() {}

  /**
   * Suggestions based on the user’s recent searches.
   */
  global List < ConnectApi.SearchSuggestion > recentSearchSuggestions;

  global Object clone() {}

  global List<ConnectApi.AbstractSearchSuggestion> getRecentSearchSuggestions() {}

  global void setRecentSearchSuggestions(List<ConnectApi.AbstractSearchSuggestion> value) {}

}