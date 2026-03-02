/**
 * Authorize a payment, capture an authorized payment, and refund an authorized payment.
 */
public class Payments {

  public static ConnectApi.AuthorizationResponse authorize(ConnectApi.AuthorizationRequest authorizePayment) {}

  public static ConnectApi.PostAuthorizationResponse postAuth(ConnectApi.PostAuthRequest postAuthorizePayment) {}

  public static ConnectApi.AuthorizationReversalResponse reverseAuthorization(ConnectApi.AuthorizationReversalRequest AuthReversalInput, String authorizationId) {}

  public static ConnectApi.CaptureResponse capture(ConnectApi.CaptureRequest AuthCaptureInput, String authorizationId) {}

  public static ConnectApi.ReferencedRefundResponse refund(ConnectApi.ReferencedRefundRequest ReferencedRefundInput, String paymentId) {}

  public static ConnectApi.SaleResponse sale(ConnectApi.SaleRequest sale) {}

  public static ConnectApi.PaymentMethodTokenizationResponse tokenizePaymentMethod(ConnectApi.PaymentMethodTokenizationRequest tokenizePaymentMethodInput) {}

}