/**
 * The class contains information about the alternative payment method that are required for a gateway to process the request.
 */
global class AlternativePaymentMethodRequest {

  global AlternativePaymentMethodRequest(String gatewayToken) {}

  global String accountId;

  global String email;

  global String gatewayToken;

  global String gatewayTokenDetails;

  global String name;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}