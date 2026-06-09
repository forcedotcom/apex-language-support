/**
 * Get sort rules for the live search index. Get product search suggestions. Search products.
 */
global class CommerceSearch {

  global CommerceSearch() {}

  global static ConnectApi.SortRulesCollection getSortRules(String webstoreId) {}

  global static ConnectApi.ProductSearchSuggestionsResults getSuggestions(String webstoreId, String effectiveAccountId, String searchTerm, Integer maxResults) {}

  global static ConnectApi.ProductSearchSuggestionsResults getSuggestions(String webstoreId, String effectiveAccountId, String searchTerm, Integer maxResults, Boolean includeSuggestedProducts, Integer maxSuggestedProducts) {}

  global static ConnectApi.ProductSearchSuggestionsResults getSuggestions(String webstoreId, String effectiveAccountId, String searchTerm, Integer maxResults, Boolean includeSuggestedProducts, Integer maxSuggestedProducts, List<String> suggestedFields) {}

  global static ConnectApi.ProductSearchSuggestionsResults getSuggestions(String webstoreId, String effectiveAccountId, String searchTerm, Integer maxResults, Boolean includeSuggestedProducts, Integer maxSuggestedProducts, List<String> suggestedFields, Boolean includeSuggestedTerms, String popularProductsCategoryId) {}

  global static ConnectApi.ProductSearchResults searchProducts(String webstoreId, String effectiveAccountId, ConnectApi.ProductSearchInput productSearchInput) {}

  global Object clone() {}

}