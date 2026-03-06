/**
 * Response class that stores information about a list of one or more line items on which the tax engine has calculated tax.
 */
global class LineItemResponse {

  /**
   * The Ship From, Ship To, and Sold To addresses used during tax calculation.
   */
  global ConnectApi.TaxAddressesResponse addresses;

  /**
   * Information about tax amount values on the line item.
   */
  global ConnectApi.TaxAmountDetailsResponse amountDetails;

  /**
   * The date that the tax calculation takes effect.
   */
  global Datetime effectiveDate;

  /**
   * System-generated number used to identify the tax line.
   */
  global String lineNumber;

  /**
   * Product code for the product related to the taxed line item.
   */
  global String productCode;

  /**
   * Quantity of the taxed line item.
   */
  global Double quantity;

  /**
   * Tax code for the taxed line item.
   */
  global String taxCode;

  /**
   * Tax details for each line item in a tax line item output.
   */
  global List < ConnectApi.TaxDetailsResponse > taxes;

}