/**
 * Get products, product categories, and product category paths.
 */
global class CommerceCatalog {

  global CommerceCatalog() {}

  global static ConnectApi.NavigationMenuItemCollection getCategoryMenuItems(String webstoreId, Boolean includeImageUrl, Boolean addHomeMenuItem, String publishStatus, String effectiveAccountId, Integer maxLevels, Integer maxItems) {}

  global static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List<String> fields, Boolean excludeFields, List<String> mediaGroups, Boolean excludeMedia, Boolean excludeEntitlementDetails, Boolean excludePrimaryProductCategory) {}

  global static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List<String> fields, Boolean excludeFields, List<String> mediaGroups, Boolean excludeMedia, Boolean excludeEntitlementDetails, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo) {}

  global static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List<String> fields, Boolean excludeFields, List<String> mediaGroups, Boolean excludeMedia, Boolean excludeEntitlementDetails, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule) {}

  global static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List<String> fields, Boolean excludeFields, List<String> mediaGroups, Boolean excludeMedia, Boolean excludeEntitlementDetails, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean excludeProductSellingModels) {}

  global static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List<String> fields, List<String> mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean excludeProductSellingModels) {}

  global static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List<String> fields, List<String> mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean excludeProductSellingModels, String noCache) {}

  global static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List<String> fields, List<String> mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean excludeProductSellingModels, Boolean excludeDynamicAttributeInfo, String noCache) {}

  global static ConnectApi.ProductCategoryDetail getProductCategory(String webstoreId, String productCategoryId, String effectiveAccountId, List<String> fields, Boolean excludeFields, List<String> mediaGroups, Boolean excludeMedia) {}

  global static ConnectApi.ProductCategoryDetailCollection getProductCategoryChildren(String webstoreId, String effectiveAccountId, String parentProductCategoryId, List<String> fields, Boolean excludeFields, List<String> mediaGroups, Boolean excludeMedia) {}

  global static ConnectApi.ProductCategoryPath getProductCategoryPath(String webstoreId, String productCategoryId) {}

  global static ConnectApi.ProductChildCollection getProductChildCollection(String webstoreId, String productId, String effectiveAccountId, List<String> fields, List<String> mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, String pageToken, Integer pageSize) {}

  global static ConnectApi.ProductChildCollection getProductChildCollection(String webstoreId, String productId, String effectiveAccountId, List<String> fields, List<String> mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean includeProductSellingModels, Boolean includeRequiredChildrenOnly, Boolean excludeDynamicAttributeInfo, String pageToken, Integer pageSize, String noCache) {}

  global static ConnectApi.ProductOverviewCollection getProducts(String webstoreId, String effectiveAccountId, List<String> ids, List<String> skus, List<String> fields, Boolean excludeMedia) {}

  global static ConnectApi.ProductOverviewCollection getProducts(String webstoreId, String effectiveAccountId, List<String> ids, List<String> skus, List<String> fields, Boolean excludeMedia, Boolean includeQuantityRule, Boolean includeProductSellingModels, Boolean includeAttributeSetInfo, Boolean includeGroupByAttributeVariationInfo) {}

  global static ConnectApi.ProductOverviewCollection getProducts(String webstoreId, String effectiveAccountId, List<String> ids, List<String> skus, List<String> fields, Boolean excludeMedia, Boolean includeQuantityRule, Boolean includeProductSellingModels, Boolean includeAttributeSetInfo, Boolean includeGroupByAttributeVariationInfo, String noCache) {}

  global Object clone() {}

}