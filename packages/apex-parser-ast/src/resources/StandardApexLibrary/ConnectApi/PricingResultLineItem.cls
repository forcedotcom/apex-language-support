/**
 * Pricing result line item.
 */
global class PricingResultLineItem {

  global PricingResultLineItem() {}

  /**
   * Error code and message.
   */
  global ConnectApi.ErrorResponse error;

  /**
   * List price for the product.
   */
  global String listPrice;

  /**
   * Lowest unit price for the product.
   */
  global String lowestUnitPrice;

  /**
   * ID of the pricebook entry.
   */
  global String pricebookEntryId;

  /**
   * ID of the product to price.
   */
  global String productId;

  /**
   * Specifies whether the execution was successful ( true ) or not ( false ).
   */
  global Boolean success;

  /**
   * Unit price for the product.
   */
  global String unitPrice;

  global Object clone() {}

  global String getContractId() {}

  global String getContractItemPriceId() {}

  global ConnectApi.ErrorResponse getError() {}

  global String getListPrice() {}

  global String getLowestUnitPrice() {}

  global String getPricebookEntryId() {}

  global String getProductId() {}

  global Boolean getSuccess() {}

  global String getUnitPrice() {}

  global void setContractId(String value) {}

  global void setContractItemPriceId(String value) {}

  global void setError(ConnectApi.ErrorResponse value) {}

  global void setListPrice(String value) {}

  global void setLowestUnitPrice(String value) {}

  global void setPricebookEntryId(String value) {}

  global void setProductId(String value) {}

  global void setSuccess(Boolean value) {}

  global void setUnitPrice(String value) {}

}