/**
 * Use to respond with an error after receiving errors from the PaymentGatewayAdapter methods of the CommercePayments namespace, such as request-forbidden responses, custom validation errors, or expired API tokens.
 */
global class ErrorResponse {

  global ErrorResponse(commercetax.ResultCode resultCode, String errorCode, String errorMessage) {}

}