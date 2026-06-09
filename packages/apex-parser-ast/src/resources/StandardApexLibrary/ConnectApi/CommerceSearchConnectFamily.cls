/**
 * Search products by search term or category in a webstore.
 */
global class CommerceSearchConnectFamily {

  global CommerceSearchConnectFamily() {}

  global static ConnectApi.CommerceProductSearchResults searchProducts(String webstoreId, String searchTerm, List<String> searchFields, String categoryId, String sortRuleId, String grouping, List<String> fields, String refinements, Integer page, Integer pageSize, String effectiveAccountId, List<String> effectiveBuyerGroupIds, Boolean includeQuantityRule, Boolean includeProductVariationInfo) {}

  global Object clone() {}

}