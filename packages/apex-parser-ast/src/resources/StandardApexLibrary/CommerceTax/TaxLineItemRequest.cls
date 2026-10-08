/**
 * Contains line item details of a tax request.
 */
global with sharing class TaxLineItemRequest {
    /**
     * Contains the list of addresses of a line item.
     * commercetax.LineTaxAddressesRequest
     */
    global commercetax.LineTaxAddressesRequest addresses { get; set; }
    /**
     * Total amount (in a given currency) represented by a line item sent for tax calculation.
     * Double
     */
    global Double amount { get; set; }
    /**
     * Customised tax contract to include additional attributes at the line item level.
     * Map<String, Object>
     */
    global Map customTaxAttributes { get; set; }
    /**
     * User-defined description for a tax line item.
     * String
     */
    global String description { get; set; }
    /**
     * The date that a tax transaction takes effect on a line item. This is a user-defined date used for reporting only.
     * Datetime
     */
    global Datetime effectiveDate { get; set; }
    /**
     * Unique number used to identify a tax line item.
     * String
     */
    global String lineNumber { get; set; }
    /**
     * Catalog code for the product represented by the tax line item.
     * String
     */
    global String productCode { get; set; }
    /**
     * Unique identifier of a product that can be used to identify products that are exempted from tax.
     * String
     */
    global String productSKU { get; set; }
    /**
     * Number of units of a given product that the tax line item represents.
     * Double
     */
    global Double quantity { get; set; }
    /**
     * Identifier that combines the original invoice ID, previous tax transaction type, and tax engine ID, used in tax calculations for negative invoice lines.
     * For example, a referenceDocumentCode parameter value 3ttxx00000004Bh_Debit-4wAxx0000000001EAA indicates 3ttxx00000004Bh is the original invoice ID and 4wAxx0000000001EAA is the tax engine ID. The previous tax transaction type is always Debit for negative invoice lines.
     * String
     */
    global String referenceDocumentCode { get; set; }
    /**
     * Code used to identify how tax is calculated for a tax line item.
     * String
     */
    global String taxCode { get; set; }

    /**
     * Initializes the request for the tax line item. This constructor is intended for test usage and throws an exception if used outside of the Apex test context.
     */
    global TaxLineItemRequest(commercetax.LineTaxAddressesRequest addresses, Double amount, String description, String productCode, Double quantity, String lineNumber, String taxCode, Datetime effectiveDate) { }

    /**
     * Maintains the integrity of lists of type TaxLineItemRequest by determining the equality of external objects in a list. This method is dynamic and is based on the equals() method in Java.
     */
    global virtual Boolean equals(Object obj) { return false; }

    /**
     * Maintains the integrity of lists of type TaxLineItemRequest by determining the uniqueness of the external object records in a list.
     */
    global virtual Integer hashCode() { return 0; }

    /**
     * Converts a value to a string.
     */
    global override virtual String toString() { return null; }
}