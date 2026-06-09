/**
 * Stores information about a sales request.
 */
global class SaleRequest {

  global SaleRequest(Double amount) {}

  global String accountId;

  global Double amount;

  global String comments;

  global String currencyIsoCode;

  global commercepayments.EnhancedPaymentDataInput enhancedPaymentData;

  global String paymentInitiationSourceId;

  global commercepayments.SaleApiPaymentMethodRequest paymentMethod;

  global Map<String,String> paymentMethodData;

  global Boolean submittedByMerchant;

  /**
   * Compares this object with the specified object and returns true if both objects are equal; otherwise, returns false .
   * @param obj 
   * @return Boolean
   */
  global Boolean equals(Object obj) {}

  /**
   * Maintains the integrity of lists of type SaleRequest by determining the uniqueness of the external object records in a list.
   * @return Integer
   */
  global Integer hashCode() {}

  /**
   * Converts a date to a string.
   * @return String
   */
  global String toString() {}

  global Object clone() {}

}