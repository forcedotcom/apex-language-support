/**
 * Authorize a payment, capture an authorized payment, and refund an authorized payment.
 */
global class Payments {

  global static ConnectApi.AuthorizationResponse authorize(ConnectApi.AuthorizationRequest authorizePayment) {}

  global static ConnectApi.PostAuthorizationResponse postAuth(ConnectApi.PostAuthRequest postAuthorizePayment) {}

  global static ConnectApi.AuthorizationReversalResponse reverseAuthorization(ConnectApi.AuthorizationReversalRequest AuthReversalInput, String authorizationId) {}

  global static ConnectApi.CaptureResponse capture(ConnectApi.CaptureRequest AuthCaptureInput, String authorizationId) {}

  global static ConnectApi.ReferencedRefundResponse refund(ConnectApi.ReferencedRefundRequest ReferencedRefundInput, String paymentId) {}

  global static ConnectApi.SaleResponse sale(ConnectApi.SaleRequest sale) {}

  global static ConnectApi.PaymentMethodTokenizationResponse tokenizePaymentMethod(ConnectApi.PaymentMethodTokenizationRequest tokenizePaymentMethodInput) {}

}