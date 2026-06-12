/**
 * Represents the result of a payment processing operation.
 */
global class ProcessPaymentResult {

  global ProcessPaymentResult(RichMessaging.ProcessPaymentResultStatus resultStatus, String errorMessage) {}

  global ProcessPaymentResult(RichMessaging.ProcessPaymentResultStatus resultStatus) {}

  global String errorMessage;

  global RichMessaging.ProcessPaymentResultStatus resultStatus;

  global Object clone() {}

}