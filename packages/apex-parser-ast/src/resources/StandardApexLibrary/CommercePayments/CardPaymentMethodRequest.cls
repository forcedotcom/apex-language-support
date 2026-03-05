/**
 * Sends data related to a card payment method to a gateway adapter during a service call.
 */
global class CardPaymentMethodRequest {

  global CardPaymentMethodRequest(commercepayments.CardCategory cardCategory) {}

  /**
   * Maintains the integrity of lists of type CardPaymentMethodRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
   * @param obj External object whose key is to be validated.
   * @return Boolean
   */
  global Boolean equals(Object obj) {}

  /**
   * Maintains the integrity of lists of type CardPaymentMethodRequest .
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Converts a date to a string.
   * @return String
   */
  global String toString() {}

}