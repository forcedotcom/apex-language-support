/**
 * Information about the tax transaction sent to the tax adapter as part of a tax calculation request.
 */
global class TaxTransactionRequest {

  /**
   * Addresses, including the Bill To address, Ship From address, Ship to address, and Sold To address.
   */
  global ConnectApi.TaxAddressesRequest addresses;

  /**
   * Three-letter ISO 4217 currency code associated with the payment group record.
   */
  global String currencyIsoCode;

  /**
   * Customer details for the tax calculation.
   */
  global ConnectApi.TaxCustomerDetailsRequest customerDetails;

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
   * The line items on which tax was calculated.
   */
  global List < ConnectApi.TaxLineItemRequest > lineItems;

  /**
   * The original document code. Used in case of subsequent transactions such as credit tax.
   */
  global String referenceDocumentCode;

  /**
   * ID of the reference entity used during tax calculation.
   */
  global String referenceEntityId;

  /**
   * The date that the tax transaction occurred.
   */
  global Datetime transactionDate;

}