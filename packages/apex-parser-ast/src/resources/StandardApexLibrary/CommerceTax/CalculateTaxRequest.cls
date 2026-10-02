/**
 * Represents a request to an external tax engine to calculate tax. Extends the TaxTransactionRequest class and is the top-level request class.
 * <p>Usage
 * Keep these considerations in mind when you use this class.
 * If the shouldVoidTax property value is set to true, then the operation returns a response with documentCode property value updated to referenceDocumentCode property value that was originally sent in the request payload. The response also includes the taxTransactionType property value as Void. This indicates that the document specified in the referenceDocumentCode property value is voided.
 * If document is locked or you can't void the tax transaction for any reason, then you can use the Tax Calculation request to perform another transaction such as a Credit Tax request. In this scenario, the response includes the documentCode property value that was sent in the request payload.
 * If the document that's mentioned in the referenceDocumentCode property value isn't available in the tax engine, then an error response occurs with ResultCode value as ReferenceDocumentCodeMissing.
 * <p>Example
 * See TaxEngineAdapter Example Implementation for more details on how to access information from the CalculateTaxRequest class.
 */
global with sharing class CalculateTaxRequest extends commercetax.TaxTransactionRequest implements commercetax.TaxEngineRequest {
    global commercetax.HeaderTaxAddressesRequest addresses { get; set; }
    global String currencyIsoCode { get; set; }
    global Map customTaxAttributes { get; set; }
    global commercetax.TaxCustomerDetailsRequest customerDetails { get; set; }
    global String description { get; set; }
    global String documentCode { get; set; }
    global Datetime effectiveDate { get; set; }
    /**
     * Indicates whether the tax calculation has to be committed or reported to government authorities.
     * <p>Boolean
     */
    global Boolean isCommit { get; set; }
    /**
     * Indicates whether header tax is enabled in the tax engine (true) or not (false).
     * <p>Boolean
     */
    global Boolean isHeaderTaxRequested { get; set; }
    global List lineItems { get; set; }
    global String referenceDocumentCode { get; set; }
    global String referenceEntityId { get; set; }
    global commercetax.TaxSellerDetailsRequest sellerDetails { get; set; }
    /**
     * Indicates whether to void the tax transaction associated with a document that's mentioned in the referenceDocumentCode property value with taxType property value set to Actual and isCommit property value set to true.
     * <p>Boolean
     */
    global Boolean shouldVoidTax { get; set; }
    /**
     * Shows whether the tax transaction is for a credit or debit transaction.
     * <p>TaxTransactionType
     */
    global commercetax.TaxTransactionType taxTransactionType { get; set; }
    /**
     * Shows whether the tax calculation is for estimated or actual tax wherein only actual tax can be submitted.
     * <p>CalculateTaxType
     */
    global commercetax.CalculateTaxType taxType { get; set; }
    global Datetime transactionDate { get; set; }

    /**
     * This constructor is intended for test usage only and throws an exception if used outside of the Apex test context.
     */
    global Object CalculateTaxRequest(commercetax.CalculateTaxType taxType) { return null; }

    /**
     * Maintains the integrity of lists of type CalculateTaxRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals() method in Java.
     */
    global override virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type CalculateTaxRequest by determining the uniqueness of the external object records in a list.
     */
    global override virtual Integer hashCode() { return 0; }

    /**
     * Converts a value to a string.
     */
    global override virtual String toString() { return null; }
}