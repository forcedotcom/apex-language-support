/**
 * Details about a product.
 */
global class ProductDetailsOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * List of variation attributes that define variations of the product.
   */
  global List < ConnectApi.ProductVariationAttributeOutputRepresentation > attributes;

  /**
   * Currency ISO code.
   */
  global String currencyIsoCode;

  /**
   * For bundle products only: an array of the individual products that are a part of the bundle. Only applicable for B2B or D2C stores. />
   */
  global List < ConnectApi.ProductBundleChildAttributeOutputRepresentation > childItems;

  /**
   * Description of the product.
   */
  global String description;

  /**
   * List of the product’s fields.
   */
  global Map < String , String > fields;

  /**
   * List of the product’s image groups.
   */
  global List < ConnectApi.ProductImageGroupOutputRepresentation > imageGroups;

  /**
   * List price.
   */
  global Double listPrice;

  /**
   * Name.
   */
  global String name;

  /**
   * The product’s class. Possible values are: Bundle, Simple, Variation, Variation Parent, or Set.
   */
  global String productClass;

  /**
   * If one exists, purchase quantity rule for the product.
   */
  global Purchase Quantity Rule productQuantityRule;

  /**
   * Product ID.
   */
  global String productId;

  /**
   * Stock keeping unit.
   */
  global String stockKeepingUnit;

  /**
   * For bundles only: the total number of child products in a bundle. Only applicable for B2B or D2C stores. />
   */
  global Enum totalChildrenCount;

  /**
   * Unit price.
   */
  global Double unitPrice;

  /**
   * List of variations of the product.
   */
  global List < ConnectApi.ProductVariantOutputRepresentation > variants;

}