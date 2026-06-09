/**
 * Get product prices.
 */
global class CommerceStorePricing {

  global CommerceStorePricing() {}

  global static ConnectApi.ProductPrice getProductPrice(String webstoreId, String productId, String effectiveAccountId) {}

  global static ConnectApi.ProductPrice getProductPrice(String webstoreId, String productId, String effectiveAccountId, List<String> productSellingModelIds) {}

  global static ConnectApi.PricingResult getProductPrices(String webstoreId, String effectiveAccountId, List<String> productIds, String currencyIsoCode) {}

  global static ConnectApi.PricingResult getProductPrices(String webstoreId, String effectiveAccountId, ConnectApi.PricingInput pricingInput) {}

  global static ConnectApi.PricingResult getProductPrices(String webstoreId, String effectiveAccountId, ConnectApi.PricingInput pricingInput, String currencyIsoCode) {}

  global Object clone() {}

}