/**
 * Stores data about a request to tokenize a card payment method. The tokenization process occurs in the payment gateway. This process replaces sensitive customer data, such as a card number or CVV, with unique identification symbols. The symbols are used while the data is handled by Salesforce, the payment gateway, and the customer bank, allowing Salesforce to store the token without storing sensitive customer data.
 */
global class PaymentMethodTokenizationRequest {

  global PaymentMethodTokenizationRequest(String paymentGatewayId) {}

  /**
   * Maintains the integrity of lists of type PaymentMethodTokenizationRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals method in Java.
   * @param obj External object whose key is to be validated.
   * @return Boolean
   */
  global Boolean equals(Object obj) {}

  /**
   * Maintains the integrity of lists of type PaymentMethodTokenizationRequest by determining the uniquness of the external object records in a list.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Converts a date to a string.
   * @return String
   */
  global String toString() {}

}