/**
 * Sends the list of individual line items associated with the payment to the gateway adapter.
 */
global class LineItemInput {

  global LineItemInput() {}

  global Map<String,String> additionalAttributes;

  global String commodityCode;

  global String description;

  global Double discount;

  global Boolean discountIndicator;

  global Double dutyAmount;

  global String grossNetIndicator;

  global String lineItemId;

  global Double lineItemTotal;

  global String name;

  global Integer quantity;

  global Double shippingAmount;

  global String sku;

  global Double taxAmount;

  global Double taxRate;

  global Double unitPrice;

  global String uom;

  global Boolean equals(Object obj) {}

  global Integer hashCode() {}

  global String toString() {}

  global Object clone() {}

}