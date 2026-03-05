/**
 * Sends data related to a card payment method to a gateway adapter during a sale service call.
 */
global class SaleApiPaymentMethodRequest {

  global SaleApiPaymentMethodRequest(commercepayments.CardPaymentMethodRequest cardPaymentMethodRequest) {}

  /**
   * Maintains the integrity of lists of type SaleApiPaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
   * @param obj 
   * @return Boolean
   */
  global Boolean equals(Object obj) {}

  /**
   * Maintains the integrity of lists of type SaleApiPaymentMethodRequest by determining the uniqueness of the external object records in a list.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Converts a date to a string.
   * @return String
   */
  global String toString() {}

}