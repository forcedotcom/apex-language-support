/**
 * Interface used to process payment requests.
 */
global interface ProcessPaymentHandler {

  RichMessaging.ProcessPaymentResult processPaymentRequest(RichMessaging.ProcessPaymentRequest var1);

}