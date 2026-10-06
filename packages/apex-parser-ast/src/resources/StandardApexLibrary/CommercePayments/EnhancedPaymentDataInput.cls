/**
 * Sends enhanced payment data, including Level 2 and Level 3 fields, to the gateway adapter as part of the service call.
 * Usage
 * Supported only for third-party payment gateways; not supported for native payments.
 */
global with sharing class EnhancedPaymentDataInput {
    /**
     * Map of gateway-specific or custom fields.
     * Map<String,String>
     */
    @AuraEnabled
    global Map additionalAttributes { get; set; }
    /**
     * Discount amount.
     * Double
     */
    global Double discountAmount { get; set; }
    /**
     * The total amount charged as duty or import or export tariffs on the transaction.
     * Double
     */
    global Double dutyAmount { get; set; }
    /**
     * Invoice number associated with the payment.
     * String
     */
    global String invoiceNumber { get; set; }
    /**
     * Collection of individual line items associated with the payment.
     * List<commercepayments.LineItemInput>
     */
    @AuraEnabled
    global List lineItems { get; set; }
    /**
     * Customer reference or identifier.
     * String
     */
    global String referenceId { get; set; }
    /**
     * Sales tax amount.
     * Double
     */
    global Double salesTaxAmount { get; set; }
    /**
     * Origin postal code.
     * String
     */
    global String shipFromZip { get; set; }
    /**
     * Destination country code.
     * String
     */
    global String shipToCountry { get; set; }
    /**
     * Destination postal code.
     * String
     */
    global String shipToZip { get; set; }
    /**
     * Shipping or freight amount.
     * Double
     */
    global Double shippingAmount { get; set; }
    /**
     * Percentage rate of tax applied to the transaction or line item.
     * Double
     */
    global Double taxRate { get; set; }
    /**
     * Total tax amount for the transaction.
     * Double
     */
    global Double totalTaxAmount { get; set; }

    global EnhancedPaymentDataInput() { }

    /**
     * Maintains the integrity of lists of type EnhancedPaymentDataInput by determining the equality of external objects in a list. This method is dynamic and based on the equals method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type EnhancedPaymentDataInput.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a date to a string.
     */
    global override virtual String toString() { return null; }
}