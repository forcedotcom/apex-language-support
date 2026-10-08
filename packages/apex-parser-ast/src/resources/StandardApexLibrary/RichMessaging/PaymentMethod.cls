/**
 * Represents a payment method.
 */
global class PaymentMethod {
    /**
     * The display name of the payment method.
     * String
     */
    @InvocableVariable
    global String displayName;
    /**
     * The network associated with the payment method.
     * String
     */
    @InvocableVariable
    global String network;
    /**
     * The payment type of the payment method.
     * String
     */
    @InvocableVariable
    global String paymentType;

    /**
     * Creates a new instance of the RichMessaging.PaymentMethod class.
     */
    global PaymentMethod(String network, String paymentType, String displayName) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}