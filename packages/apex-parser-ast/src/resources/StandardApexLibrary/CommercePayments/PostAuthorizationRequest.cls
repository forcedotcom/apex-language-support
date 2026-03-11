/**
 * Sends information about a postauthorization request to a gateway adapter during a service call.
 */
global class PostAuthorizationRequest extends BaseRequest {

  global PostAuthorizationRequest(Double amount) {}

  global String accountId;

  global Double amount;

  global String comments;

  global String currencyIsoCode;

  global PostAuthApiPaymentMethodRequest paymentMethod;

}