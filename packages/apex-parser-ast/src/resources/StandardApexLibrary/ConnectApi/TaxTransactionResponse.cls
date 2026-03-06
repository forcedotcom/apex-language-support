/**
 * Tax transaction output representation
 */
global class TaxTransactionResponse {

  /**
   * The Ship From, Ship To, and Sold To addresses used during tax calculation.
   */
  global ConnectApi.TaxAddressesResponse addresses;

  /**
   * Information about tax amount values on the line item.
   */
  global ConnectApi.TaxAmountDetailsResponse amountDetails;

  /**
   * Three-letter ISO 4217 currency code associated with the payment group record.
   */
  global String currencyIsoCode;

  /**
   * Information about whether the tax transaction failed or was successful.
   */
  global String description;

  /**
   * Document code.
   */
  global String documentCode;

  /**
   * The date that tax is applied to the taxed entity.
   */
  global Datetime effectiveDate;

  /**
   * A list of line items on which tax was calculated.
   */
  global List < ConnectApi.LineItemResponse > lineItems;

  /**
   * The original document code. Used in case of subsequent transactions such as credit tax.
   */
  global String referenceDocumentCode;

  /**
   * ID of the reference entity used during tax calculation.
   */
  global String referenceEntityId;

  /**
   * ID of the tax transaction.
   */
  global String taxTransactionId;

  /**
   * The date that the tax transaction occurred.
   */
  global Datetime transactionDate;

}