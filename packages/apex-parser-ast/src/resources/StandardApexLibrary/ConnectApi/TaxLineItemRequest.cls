/**
 * A list of line items passed to the tax engine for tax calculation.
 */
global class TaxLineItemRequest {

  /**
   * Addresses, including the Bill To address, Ship From address, Ship To address, and Sold To address.
   */
  global ConnectApi.TaxAddressesRequest addresses;

  /**
   * Amount of the line item.
   */
  global Double amount;

  /**
   * Description of the line item.
   */
  global String description;

  /**
   * Date to apply the tax calculation to the line item.
   */
  global Datetime effectiveDate;

  /**
   * Legal entity that's related to the tax treatment.
   */
  global String legalEntity;

  /**
   * Line number of the line item.
   */
  global String lineNumber;

  /**
   * Product code of the line item.
   */
  global String productCode;

  /**
   * ID of the product.
   */
  global String productId;

  /**
   * Unique identifier of a product that can be used to identify products that are exempted from tax.
   */
  global String productSKU;

  /**
   * Quantity of the line item.
   */
  global Double quantity;

  /**
   * Tax code for the line item.
   */
  global String taxCode;

  /**
   * Unit price of the product.
   */
  global Double unitPrice;

}