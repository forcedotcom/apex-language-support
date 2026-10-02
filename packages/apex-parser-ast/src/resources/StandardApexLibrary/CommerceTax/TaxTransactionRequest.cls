/**
 * Abstract class for storing customer details used in tax calculation and estimation requests.
 * <p>Usage
 * Specify the CommerceTax namespace when creating an instance of this class. The constructor of this class takes no arguments. For example, let's say you create an instance of CalculateTaxRequest class, which extends the TaxTransactionRequest class.
 */
global abstract with sharing class TaxTransactionRequest {
    /**
     * A list of addresses (such as Ship To and Sold To) used as part of the tax transaction.
     * <p>HeaderTaxAddressesRequest
     */
    global commercetax.HeaderTaxAddressesRequest addresses { get; set; }
    /**
     * Three-letter ISO 4217 currency code associated with the TaxTransactionRequest.
     * <p>String
     */
    global String currencyIsoCode { get; set; }
    /**
     * Customised tax contract to include additional attributes at the header level.
     * <p>Map<String, Object>
     */
    global Map customTaxAttributes { get; set; }
    /**
     * Customer information used in tax calculation.
     * <p>TaxCustomerDetailsRequest
     */
    global commercetax.TaxCustomerDetailsRequest customerDetails { get; set; }
    /**
     * Optional user-defined description for providing more information about the tax transaction request.
     * <p>String
     */
    global String description { get; set; }
    /**
     * Code for documents used to provide more information in the tax calculation process.
     * <p>String
     */
    global String documentCode { get; set; }
    /**
     * The date that the tax transaction takes effect. User-defined and used only for reporting purposes.
     * <p>Datetime
     */
    global Datetime effectiveDate { get; set; }
    /**
     * A list of line items on which tax will be calculated.
     * <p>List<TaxLineItemRequest>
     */
    global List lineItems { get; set; }
    /**
     * Identifier that combines the original invoice ID, previous tax transaction type, and tax engine ID, used in tax calculations for negative invoice lines.
     * <p>For example, a referenceDocumentCode parameter value 3ttxx00000004Bh_Debit-4wAxx0000000001EAA indicates 3ttxx00000004Bh is the original invoice ID and 4wAxx0000000001EAA is the tax engine ID.
     * <p>String
     */
    global String referenceDocumentCode { get; set; }
    /**
     * ID of an object related to the line items sent for tax calculation.
     * <p>String
     */
    global String referenceEntityId { get; set; }
    /**
     * Contains tax code information used in a tax calculation request.
     * <p>TaxSellerDetailsRequest
     */
    global commercetax.TaxSellerDetailsRequest sellerDetails { get; set; }
    /**
     * The date that the tax transaction occurred.
     * <p>Datetime
     */
    global Datetime transactionDate { get; set; }

    global Object TaxTransactionRequest(commercetax.HeaderTaxAddressesRequest addresses, String currencyIsoCode, commercetax.TaxCustomerDetailsRequest customerDetails, String description, String documentCode, String referenceDocumentCode, Datetime transactionDate, Datetime effectiveDate, List lineItems, String referenceEntityId, commercetax.TaxSellerDetailsRequest sellerDetails) { return null; }

    /**
     * Maintains the integrity of lists of type TaxTransactionRequest by determining the equality of external objects in a list. This method is dynamic and based on the equals() method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type TaxTransactionRequest by determining the uniqueness of the external object records in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a value to a string.
     */
    global override virtual String toString() { return null; }
}