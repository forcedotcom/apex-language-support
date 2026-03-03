/**
 * Get product prices.
 */
global class CommerceStorePricing {

  public static ConnectApi.ProductPrice getProductPrice(String webstoreId, String productId, String effectiveAccountId) {}

  public static ConnectApi.ProductPrice getProductPrice(String webstoreId, String productId, String effectiveAccountId, List< String > productSellingModelIds) {}

  public static ConnectApi.PricingResult getProductPrices(String webstoreId, String effectiveAccountId, List< String > productIds, String currencyIsoCode) {}

  public static ConnectApi.PricingResult getProductPrices(String webstoreId, String effectiveAccountId, ConnectApi.PricingInput pricingInput) {}

  public static ConnectApi.PricingResult getProductPrices(String webstoreId, String effectiveAccountId, ConnectApi.PricingInput pricingInput, String currencyIsoCode) {}

}