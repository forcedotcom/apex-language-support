/**
 * Represents the result of a payment processing operation.
 */
global class ProcessPaymentResult {

  public ProcessPaymentResult(RichMessaging.ProcessPaymentResultStatus resultStatus, String errorMessage) {}

  public ProcessPaymentResult(RichMessaging.ProcessPaymentResultStatus resultStatus) {}

  public String errorMessage;

  public RichMessaging.ProcessPaymentResultStatus resultStatus;

  global Object clone() {}

}