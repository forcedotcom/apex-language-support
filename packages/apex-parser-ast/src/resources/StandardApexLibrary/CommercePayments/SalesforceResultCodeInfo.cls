/**
 * Stores Salesforce result code information from payment gateway adapters.
 * <p>Usage
 * The constructor of this class takes no arguments. For example:
 * CommercePayments.SalesforceResultCodeInfo srci = new CommercePayments.SalesforceResultCodeInfo();
 * Gateways can return the transaction result as either CustomMetadata or SalesforceResultCode.
 */
global with sharing class SalesforceResultCodeInfo {
    /**
     * Constructor for providing the customMetadataTypeInfo for the result of the transaction.
     */
    global SalesforceResultCodeInfo(commercepayments.CustomMetadataTypeInfo customMetadataTypeInfo) { }

    /**
     * Constructor that provides the salesforceResultCode for the transaction result.
     */
    global SalesforceResultCodeInfo(commercepayments.SalesforceResultCode salesforceResultCode) { }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    global override virtual String toString() { return null; }
}