/**
 * Details of composite product variations.
 */
global class CompositeCommerceVariationOutputRepresentation {

  /**
   * List of any errors that were returned, including the error code and error message.
   */
  global List < ConnectApi.ErrorResponse > errors;

  /**
   * IDs of the created product variations.
   */
  global List < String > productIds;

  /**
   * Indicates whether the product variations were successfully created ( true ) or not ( false ).
   */
  global Boolean success;

}