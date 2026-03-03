/**
 * Get sort rules for the live search index. Get product search suggestions. Search products.
 */
global class CommerceSearch {

  public static ConnectApi.SortRulesCollection getSortRules(String webstoreId) {}

  public static ConnectApi.ProductSearchSuggestionsResults getSuggestions(String webstoreId, String effectiveAccountId, String searchTerm, Integer maxResults) {}

  public static ConnectApi.ProductSearchSuggestionsResults getSuggestions(String webstoreId, String effectiveAccountId, String searchTerm, Integer maxResults, Boolean includeSuggestedProducts, Integer maxSuggestedProducts) {}

  public static ConnectApi.ProductSearchResults searchProducts(String webstoreId, String effectiveAccountId, ConnectApi.ProductSearchInput productSearchInput) {}

}