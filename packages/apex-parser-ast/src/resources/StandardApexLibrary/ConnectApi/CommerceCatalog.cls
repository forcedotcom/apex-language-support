/**
 * Get products, product categories, and product category paths.
 */
public class CommerceCatalog {

  public static ConnectApi.NavigationMenuItemCollection getCategoryMenuItems(String webstoreId, Boolean includeImageUrl, Boolean addHomeMenuItem, String publishStatus, String effectiveAccountId, Integer maxLevels, Integer maxItems) {}

  public static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List< String > fields, Boolean excludeFields, List< String > mediaGroups, Boolean excludeMedia, Boolean excludeEntitlementDetails, Boolean excludePrimaryProductCategory) {}

  public static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List< String > fields, Boolean excludeFields, List< String > mediaGroups, Boolean excludeMedia, Boolean excludeEntitlementDetails, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo) {}

  public static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List< String > fields, Boolean excludeFields, List< String > mediaGroups, Boolean excludeMedia, Boolean excludeEntitlementDetails, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule) {}

  public static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List< String > fields, Boolean excludeFields, List< String > mediaGroups, Boolean excludeMedia, Boolean excludeEntitlementDetails, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean excludeProductSellingModels) {}

  public static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List< String > fields, List< String > mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean excludeProductSellingModels) {}

  public static ConnectApi.ProductDetail getProduct(String webstoreId, String productId, String effectiveAccountId, List< String > fields, List< String > mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludePrimaryProductCategory, Boolean excludeVariationInfo, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean excludeProductSellingModels, String noCache) {}

  public static ConnectApi.ProductCategoryDetail getProductCategory(String webstoreId, String productCategoryId, String effectiveAccountId, List< String > fields, Boolean excludeFields, List< String > mediaGroups, Boolean excludeMedia) {}

  public static ConnectApi.ProductCategoryDetailCollection getProductCategoryChildren(String webstoreId, String effectiveAccountId, String parentProductCategoryId, List< String > fields, Boolean excludeFields, List< String > mediaGroups, Boolean excludeMedia) {}

  public static ConnectApi.ProductCategoryPath getProductCategoryPath(String webstoreId, String productCategoryId) {}

  public static ConnectApi.ProductChildCollection getProductChildCollection(String webstoreId, String productId, String effectiveAccountId, List< String > fields, List< String > mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, String pageToken, Integer pageSize) {}

  public static ConnectApi.ProductChildCollection getProductChildCollection(String webstoreId, String productId, String effectiveAccountId, List< String > fields, List< String > mediaGroups, Boolean excludeFields, Boolean excludeMedia, Boolean excludeAttributeSetInfo, Boolean excludeQuantityRule, Boolean includeProductSellingModels, Boolean includeRequiredChildrenOnly, Boolean excludeDynamicAttributeInfo, String pageToken, Integer pageSize, String noCache) {}

  public static ConnectApi.ProductOverviewCollection getProducts(String webstoreId, String effectiveAccountId, List< String > ids, List< String > skus, List< String > fields, Boolean excludeMedia) {}

  public static ConnectApi.ProductOverviewCollection getProducts(String webstoreId, String effectiveAccountId, List< String > ids, List< String > skus, List< String > fields, Boolean excludeMedia, Boolean includeQuantityRule, Boolean includeProductSellingModels, Boolean includeAttributeSetInfo, Boolean includeGroupByAttributeVariationInfo) {}

  public static ConnectApi.ProductOverviewCollection getProducts(String webstoreId, String effectiveAccountId, List< String > ids, List< String > skus, List< String > fields, Boolean excludeMedia, Boolean includeQuantityRule, Boolean includeProductSellingModels, Boolean includeAttributeSetInfo, Boolean includeGroupByAttributeVariationInfo, String noCache) {}

}