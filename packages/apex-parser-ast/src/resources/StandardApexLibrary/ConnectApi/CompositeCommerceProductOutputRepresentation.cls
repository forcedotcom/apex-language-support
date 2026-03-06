/**
 * Details of a composite product.
 */
global class CompositeCommerceProductOutputRepresentation {

  /**
   * List of any errors that were returned, including the error code and error message.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * ID of the product record created.
   */
  global String productId;

  /**
   * Indicates whether the product was successfully created ( true ) or not ( false ).
   */
  global Boolean success;

}