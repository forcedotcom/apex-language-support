/**
 * Contains customer details used in tax calculation.
 */
global with sharing class TaxCustomerDetailsRequest {
    /**
     * Customer account that contains the line items sent for tax calculation.
     * <p>String
     */
    global String accountId { get; set; }
    global String additionalTaxIdentificationDetails { get; set; }
    global String billingProfileId { get; set; }
    /**
     * Tax code used during tax calculation.
     * <p>String
     */
    global String code { get; set; }
    global String deliveryTerms { get; set; }
    global Datetime exemptionExpirationDate { get; set; }
    /**
     * Number used to qualify a line item for tax exemption.
     * <p>String
     */
    global String exemptionNo { get; set; }
    /**
     * Reason why a line item qualifies for tax exemption.
     * <p>String
     */
    global String exemptionReason { get; set; }
    global String exemptionStatus { get; set; }
    global String taxIdentificationNumber { get; set; }

    /**
     * Initializes the TaxCustomerDetailsRequest object. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global TaxCustomerDetailsRequest(String accountId, String code, String exemptionNo, String exemptionReason) { }

    /**
     * Maintains the integrity of lists of type TaxCustomerDetailsRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals() method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type TaxCustomerDetailsRequest by determining the uniqueness of the external objects in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a value to a string.
     */
    global override virtual String toString() { return null; }
}