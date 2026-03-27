/**
 * Product item mapped to the order item summary.
 */
global class OrderItemSummaryProduct {

  /**
   * Specifies whether the context user can view the product ( true ) or not ( false ).
   */
  global Boolean canViewProduct;

  /**
   * Error code for the product with errors.
   */
  global String errorCode;

  /**
   * Error message for the product with errors.
   */
  global String errorMessage;

  /**
   * Map of the product fields queried.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * Associated product media.
   */
  global ConnectApi.ProductMedia media;

  /**
   * Summary of the product attributes.
   */
  global ConnectApi.ProductAttributeSetSummary productAttributes;

  /**
   * ID of the product.
   */
  global String productId;

}