/**
 * Abstract class that contains methods for setting tax fields based on the external tax provider's response. Response classes that extend AbstractTransactionResponse inherit these methods.
 */
global abstract with sharing class AbstractTransactionResponse {
    global Object AbstractTransactionResponse() { return null; }

    global virtual Boolean equals(Object o) { return false; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Uses an instance of AddressesResponse to set the values of tax address fields.
     */
    global void setAddresses(commercetax.AddressesResponse addresses) { }

    /**
     * Uses an instance of AmountDetailsResponse to set tax amount fields such as exemption amount and tax amount.
     */
    global void setAmountDetails(commercetax.AmountDetailsResponse amountDetails) { }

    /**
     * Sets the currencyIsoCode field.
     */
    global void setCurrencyIsoCode(String currencyIsoCode) { }

    /**
     * Uses an instance of CustomTaxAttributesResponse class to include additional attributes in the tax response at the header level.
     */
    global void setCustomTaxAttributes(commercetax.CustomTaxAttributesResponse customTaxAttributes) { }

    /**
     * Sets the Description field.
     */
    global void setDescription(String dscptn) { }

    /**
     * Sets the DocumentCode field. Document codes are often used to reference tax documents that the external tax engine uses in the tax calculation process. Document code acts as a unique link to chain-related transactions, such as amendment or refunds.
     */
    global void setDocumentCode(String documentCode) { }

    /**
     * Sets the EffectiveDate field. Effective Date fields are optional fields that store the date that a transaction takes effect. We provide these fields only for recordkeeping purposes – for example, if you must report an effective date to an external general ledger system. Salesforce doesn't use them to calculate any tax or payment values.
     */
    global void setEffectiveDate(Datetime effectiveDate) { }

    /**
     * Uses an instance of the LineItemResponse class to set a list of line items. Each line item represents an item sent to an external tax engine for tax calculation.
     */
    global void setLineItems(List lineItems) { }

    /**
     * Sets the ReferenceDocumentCode field. Use this field to store the code of an additional document used in the tax calculation process. For example, use this field in case of a refund for a previously taxed purchase.
     */
    global void setReferenceDocumentCode(String referenceDocumentCode) { }

    /**
     * Sets the ID of a reference entity. In Commerce Tax, a reference entity represents a record related to the items sent to the external tax engine for tax calculation. For example, if you sent order items for tax calculation, you could define the parent order as the reference entity.
     */
    global void setReferenceEntityId(String referenceEntityId) { }

    /**
     * Sets the TaxTransactionId field using the ID of a tax transaction record. In Commerce Tax, a tax transaction record stores information about a specific tax calculation process.
     */
    global void setTaxTransactionId(String taxTrxnId) { }

    /**
     * Sets the TransactionDate field.
     */
    global void setTransactionDate(Datetime transactionDate) { }

    global override virtual String toString() { return null; }
}