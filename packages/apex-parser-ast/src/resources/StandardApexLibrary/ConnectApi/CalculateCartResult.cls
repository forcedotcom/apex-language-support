/**
 * Result of a cart calculate request. Includes a cart summary with calculated cart values.
 */
global class CalculateCartResult extends ConnectApi.CommerceResultRepresentationBase {

  global CalculateCartResult() {}

  /**
   * A cart summary with calculated cart values.
   */
  global ConnectApi.CartSummary data;

  global Object clone() {}

}