/**
 * Represents the result of a payment processing operation.
 */
global class ProcessPaymentResult {
    /**
     * The error message associated with the payment processing result, if any.
     * <p>String
     */
    @InvocableVariable
    global String errorMessage;
    /**
     * The status of the payment processing result.
     * <p>RichMessaging.ProcessPaymentResultStatus
     */
    @InvocableVariable
    global RichMessaging.ProcessPaymentResultStatus resultStatus;
    @InvocableVariable
    global String successMessage;

    /**
     * Creates a new instance of the RichMessaging.ProcessPaymentResult class.
     */
    global ProcessPaymentResult(RichMessaging.ProcessPaymentResultStatus resultStatus) { }

    /**
     * Creates a new instance of the RichMessaging.ProcessPaymentResult class.
     */
    global ProcessPaymentResult(RichMessaging.ProcessPaymentResultStatus resultStatus, String errorMessage) { }

    global ProcessPaymentResult(RichMessaging.ProcessPaymentResultStatus resultStatus, String errorMessage, String successMessage) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}