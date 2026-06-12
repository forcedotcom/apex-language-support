/**
 * Perform functions related to repricing orders in Order Management.
 */
global class Repricing {

  global Repricing() {}

  global static ConnectApi.ProductDetailsOutputRepresentation productDetails(String webstoreId, String skuOrProductId, String effectiveAccountId, String currencyCode, String locale) {}

  global static ConnectApi.ProductSearchOutputRepresentation searchProducts(String webstoreId, String searchTerm, Integer pageParam, Integer pageSize, String effectiveAccountId, String facets) {}

  global Object clone() {}

}