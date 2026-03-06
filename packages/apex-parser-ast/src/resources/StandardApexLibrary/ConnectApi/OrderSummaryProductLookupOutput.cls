/**
 * Order summary product lookup output.
 */
global class OrderSummaryProductLookupOutput {

  /**
   * Specifies whether the context user can view the product (true) or not (false).
   */
  global Boolean canViewProduct;

  /**
   * Error code captured during product load.
   */
  global String errorCode;

  /**
   * Error message captured during product load.
   */
  global String errorMessage;

  /**
   * Map of requested product fields.
   */
  global Map < String , ConnectApi.RecordField > fields;

  /**
   * Id of the product
   */
  global String id;

  /**
   * Associated product media.
   */
  global ConnectApi.ProductMedia media;

  /**
   * Variation attributes (color, size, and so on) associated with the product.
   */
  global Map < String , ConnectApi.OrderSummaryProductAttribute > variationAttributes;

}